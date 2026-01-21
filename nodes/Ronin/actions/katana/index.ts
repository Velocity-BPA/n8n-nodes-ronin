import { INodeProperties, IExecuteFunctions } from 'n8n-workflow';
import { ethers } from 'ethers';
import { createRoninClient } from '../../transport/roninClient';
import { normalizeAddress, hexToRonin } from '../../utils/addressUtils';
import { MAINNET_CONTRACTS, KATANA_ROUTER_ABI, ERC20_ABI } from '../../constants/contracts';
import { formatUnits, parseUnits } from '../../utils/unitConverter';

export const katanaOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['katana'],
			},
		},
		options: [
			{ name: 'Get Quote', value: 'getQuote', description: 'Get swap quote', action: 'Get swap quote' },
			{ name: 'Swap Tokens', value: 'swap', description: 'Swap tokens on Katana', action: 'Swap tokens' },
			{ name: 'Get Supported Pairs', value: 'getSupportedPairs', description: 'Get trading pairs', action: 'Get supported pairs' },
		],
		default: 'getQuote',
	},
];

export const katanaFields: INodeProperties[] = [
	{
		displayName: 'Token In',
		name: 'tokenIn',
		type: 'options',
		default: MAINNET_CONTRACTS.WRON,
		options: [
			{ name: 'WRON', value: MAINNET_CONTRACTS.WRON },
			{ name: 'WETH', value: MAINNET_CONTRACTS.WETH },
			{ name: 'AXS', value: MAINNET_CONTRACTS.AXS },
			{ name: 'SLP', value: MAINNET_CONTRACTS.SLP },
			{ name: 'USDC', value: MAINNET_CONTRACTS.USDC },
		],
		displayOptions: {
			show: {
				resource: ['katana'],
				operation: ['getQuote', 'swap'],
			},
		},
	},
	{
		displayName: 'Token Out',
		name: 'tokenOut',
		type: 'options',
		default: MAINNET_CONTRACTS.WETH,
		options: [
			{ name: 'WRON', value: MAINNET_CONTRACTS.WRON },
			{ name: 'WETH', value: MAINNET_CONTRACTS.WETH },
			{ name: 'AXS', value: MAINNET_CONTRACTS.AXS },
			{ name: 'SLP', value: MAINNET_CONTRACTS.SLP },
			{ name: 'USDC', value: MAINNET_CONTRACTS.USDC },
		],
		displayOptions: {
			show: {
				resource: ['katana'],
				operation: ['getQuote', 'swap'],
			},
		},
	},
	{
		displayName: 'Amount In',
		name: 'amountIn',
		type: 'string',
		default: '1',
		required: true,
		displayOptions: {
			show: {
				resource: ['katana'],
				operation: ['getQuote', 'swap'],
			},
		},
	},
	{
		displayName: 'Slippage (%)',
		name: 'slippage',
		type: 'number',
		default: 0.5,
		description: 'Maximum slippage tolerance',
		displayOptions: {
			show: {
				resource: ['katana'],
				operation: ['swap'],
			},
		},
	},
];

export async function executeKatana(this: IExecuteFunctions, index: number): Promise<unknown> {
	const operation = this.getNodeParameter('operation', index) as string;
	const roninClient = await createRoninClient(this);
	const provider = roninClient.getProvider();

	switch (operation) {
		case 'getQuote': {
			const tokenIn = this.getNodeParameter('tokenIn', index) as string;
			const tokenOut = this.getNodeParameter('tokenOut', index) as string;
			const amountIn = this.getNodeParameter('amountIn', index) as string;

			// Get token decimals
			const tokenInContract = new ethers.Contract(tokenIn, ERC20_ABI, provider);
			const tokenOutContract = new ethers.Contract(tokenOut, ERC20_ABI, provider);
			
			const [tokenInDecimals, tokenOutDecimals, tokenInSymbol, tokenOutSymbol] = await Promise.all([
				tokenInContract.decimals(),
				tokenOutContract.decimals(),
				tokenInContract.symbol(),
				tokenOutContract.symbol(),
			]);

			const amountInWei = parseUnits(amountIn, Number(tokenInDecimals));

			// Get quote from router
			const router = new ethers.Contract(
				MAINNET_CONTRACTS.KATANA_ROUTER,
				KATANA_ROUTER_ABI,
				provider
			);

			const path = [tokenIn, tokenOut];
			const amounts = await router.getAmountsOut(amountInWei, path) as bigint[];

			const amountOut = formatUnits(amounts[1].toString(), Number(tokenOutDecimals));

			return {
				tokenIn: tokenInSymbol,
				tokenOut: tokenOutSymbol,
				amountIn,
				amountOut,
				rate: (parseFloat(amountOut) / parseFloat(amountIn)).toFixed(6),
				path,
			};
		}

		case 'swap': {
			const tokenIn = this.getNodeParameter('tokenIn', index) as string;
			const tokenOut = this.getNodeParameter('tokenOut', index) as string;
			const amountIn = this.getNodeParameter('amountIn', index) as string;
			const slippage = this.getNodeParameter('slippage', index) as number;

			let signer;
			try {
				signer = roninClient.getSigner();
			} catch {
				throw new Error('Private key required for swap operations');
			}

			// Get token decimals
			const tokenInContract = new ethers.Contract(tokenIn, ERC20_ABI, provider);
			const tokenOutContract = new ethers.Contract(tokenOut, ERC20_ABI, provider);
			
			const [tokenInDecimals, tokenOutDecimals] = await Promise.all([
				tokenInContract.decimals(),
				tokenOutContract.decimals(),
			]);

			const amountInWei = parseUnits(amountIn, Number(tokenInDecimals));

			// Get quote first
			const router = new ethers.Contract(
				MAINNET_CONTRACTS.KATANA_ROUTER,
				KATANA_ROUTER_ABI,
				signer
			);

			const path = [tokenIn, tokenOut];
			const amounts = await router.getAmountsOut(amountInWei, path) as bigint[];
			const expectedOut = amounts[1];

			// Calculate minimum out with slippage
			const slippageFactor = BigInt(Math.floor((100 - slippage) * 100));
			const amountOutMin = (expectedOut * slippageFactor) / BigInt(10000);

			// Approve token spend
			const tokenInSigner = new ethers.Contract(tokenIn, ERC20_ABI, signer);
			const approveTx = await tokenInSigner.approve(MAINNET_CONTRACTS.KATANA_ROUTER, amountInWei);
			await approveTx.wait();

			// Execute swap
			const deadline = Math.floor(Date.now() / 1000) + 600; // 10 min
			const walletAddress = await signer.getAddress();

			const tx = await router.swapExactTokensForTokens(
				amountInWei,
				amountOutMin,
				path,
				walletAddress,
				deadline
			);

			const receipt = await tx.wait();

			return {
				success: true,
				txHash: receipt.hash,
				amountIn,
				expectedAmountOut: formatUnits(expectedOut.toString(), Number(tokenOutDecimals)),
				minAmountOut: formatUnits(amountOutMin.toString(), Number(tokenOutDecimals)),
				gasUsed: receipt.gasUsed.toString(),
			};
		}

		case 'getSupportedPairs': {
			const pairs = [
				{ tokenA: 'WRON', tokenB: 'WETH' },
				{ tokenA: 'WRON', tokenB: 'AXS' },
				{ tokenA: 'WRON', tokenB: 'SLP' },
				{ tokenA: 'WRON', tokenB: 'USDC' },
				{ tokenA: 'WETH', tokenB: 'AXS' },
				{ tokenA: 'WETH', tokenB: 'SLP' },
				{ tokenA: 'WETH', tokenB: 'USDC' },
				{ tokenA: 'AXS', tokenB: 'SLP' },
			];

			return {
				routerAddress: MAINNET_CONTRACTS.KATANA_ROUTER,
				factoryAddress: MAINNET_CONTRACTS.KATANA_FACTORY,
				pairs,
			};
		}

		default:
			throw new Error(`Unknown operation: ${operation}`);
	}
}
