import { INodeProperties, IExecuteFunctions } from 'n8n-workflow';
import { ethers } from 'ethers';
import { createRoninClient } from '../../transport/roninClient';
import { normalizeAddress, hexToRonin } from '../../utils/addressUtils';
import { MAINNET_CONTRACTS, ERC20_ABI } from '../../constants/contracts';
import { formatUnits, parseUnits } from '../../utils/unitConverter';

export const axsOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['axs'],
			},
		},
		options: [
			{ name: 'Get Balance', value: 'getBalance', description: 'Get AXS balance', action: 'Get AXS balance' },
			{ name: 'Transfer', value: 'transfer', description: 'Transfer AXS', action: 'Transfer AXS' },
			{ name: 'Get Token Info', value: 'getTokenInfo', description: 'Get AXS token information', action: 'Get token info' },
		],
		default: 'getBalance',
	},
];

export const axsFields: INodeProperties[] = [
	{
		displayName: 'Address',
		name: 'address',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'ronin:... or 0x...',
		displayOptions: {
			show: {
				resource: ['axs'],
				operation: ['getBalance'],
			},
		},
	},
	{
		displayName: 'To Address',
		name: 'toAddress',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'ronin:... or 0x...',
		displayOptions: {
			show: {
				resource: ['axs'],
				operation: ['transfer'],
			},
		},
	},
	{
		displayName: 'Amount',
		name: 'amount',
		type: 'string',
		default: '',
		required: true,
		placeholder: '10.5',
		description: 'Amount of AXS to transfer',
		displayOptions: {
			show: {
				resource: ['axs'],
				operation: ['transfer'],
			},
		},
	},
];

export async function executeAxs(this: IExecuteFunctions, index: number): Promise<unknown> {
	const operation = this.getNodeParameter('operation', index) as string;
	const roninClient = await createRoninClient(this);

	const AXS_DECIMALS = 18;

	switch (operation) {
		case 'getBalance': {
			const address = this.getNodeParameter('address', index) as string;
			const normalizedAddress = normalizeAddress(address);

			const axsContract = new ethers.Contract(
				MAINNET_CONTRACTS.AXS,
				ERC20_ABI,
				roninClient.getProvider()
			);

			const balance = await axsContract.balanceOf(normalizedAddress);

			return {
				address: hexToRonin(normalizedAddress),
				raw: balance.toString(),
				formatted: formatUnits(balance.toString(), AXS_DECIMALS),
				symbol: 'AXS',
				decimals: AXS_DECIMALS,
			};
		}

		case 'transfer': {
			const toAddress = this.getNodeParameter('toAddress', index) as string;
			const amount = this.getNodeParameter('amount', index) as string;
			
			let signer;
			try {
				signer = roninClient.getSigner();
			} catch {
				throw new Error('Private key required for transfer operations');
			}

			const normalizedTo = normalizeAddress(toAddress);
			const amountWei = parseUnits(amount, AXS_DECIMALS);

			const axsContract = new ethers.Contract(
				MAINNET_CONTRACTS.AXS,
				ERC20_ABI,
				signer
			);

			const tx = await axsContract.transfer(normalizedTo, amountWei);
			const receipt = await tx.wait();

			return {
				success: true,
				txHash: receipt.hash,
				to: hexToRonin(normalizedTo),
				amount,
				gasUsed: receipt.gasUsed.toString(),
			};
		}

		case 'getTokenInfo': {
			const axsContract = new ethers.Contract(
				MAINNET_CONTRACTS.AXS,
				ERC20_ABI,
				roninClient.getProvider()
			);

			const [name, symbol, decimals, totalSupply] = await Promise.all([
				axsContract.name(),
				axsContract.symbol(),
				axsContract.decimals(),
				axsContract.totalSupply(),
			]);

			return {
				address: MAINNET_CONTRACTS.AXS,
				name,
				symbol,
				decimals: Number(decimals),
				totalSupply: formatUnits(totalSupply.toString(), Number(decimals)),
				description: 'Axie Infinity Shards - Governance token for Axie Infinity',
			};
		}

		default:
			throw new Error(`Unknown operation: ${operation}`);
	}
}
