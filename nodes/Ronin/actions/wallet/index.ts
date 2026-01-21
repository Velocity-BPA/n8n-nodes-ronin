import { INodeProperties, IExecuteFunctions } from 'n8n-workflow';
import { createRoninClient } from '../../transport/roninClient';
import { createSkynetClient } from '../../transport/skynetApi';
import { normalizeAddress, hexToRonin, isValidAddress, roninToHex } from '../../utils/addressUtils';
import { weiToRon, formatUnits } from '../../utils/unitConverter';
import { TOKENS, TOKEN_LIST } from '../../constants/tokens';

export const walletOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['wallet'],
			},
		},
		options: [
			{ name: 'Get RON Balance', value: 'getRonBalance', description: 'Get RON balance of an address', action: 'Get RON balance' },
			{ name: 'Get Token Balance', value: 'getTokenBalance', description: 'Get token balance of an address', action: 'Get token balance' },
			{ name: 'Get All Token Balances', value: 'getAllBalances', description: 'Get all token balances', action: 'Get all token balances' },
			{ name: 'Transfer RON', value: 'transferRon', description: 'Transfer RON to an address', action: 'Transfer RON' },
			{ name: 'Transfer Token', value: 'transferToken', description: 'Transfer tokens to an address', action: 'Transfer token' },
			{ name: 'Get Wallet NFTs', value: 'getWalletNfts', description: 'Get NFTs owned by wallet', action: 'Get wallet NFTs' },
			{ name: 'Get Transaction History', value: 'getTransactionHistory', description: 'Get transaction history', action: 'Get transaction history' },
			{ name: 'Validate Address', value: 'validateAddress', description: 'Validate a Ronin address', action: 'Validate address' },
			{ name: 'Convert Address', value: 'convertAddress', description: 'Convert between ronin: and 0x format', action: 'Convert address' },
			{ name: 'Get Wallet Stats', value: 'getWalletStats', description: 'Get wallet statistics', action: 'Get wallet stats' },
		],
		default: 'getRonBalance',
	},
];

export const walletFields: INodeProperties[] = [
	// Address field for most operations
	{
		displayName: 'Address',
		name: 'address',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'ronin:1234... or 0x1234...',
		description: 'Ronin wallet address (supports both ronin: and 0x format)',
		displayOptions: {
			show: {
				resource: ['wallet'],
				operation: ['getRonBalance', 'getTokenBalance', 'getAllBalances', 'getWalletNfts', 'getTransactionHistory', 'validateAddress', 'convertAddress', 'getWalletStats'],
			},
		},
	},
	// Token address for token operations
	{
		displayName: 'Token',
		name: 'tokenAddress',
		type: 'options',
		default: '',
		options: TOKEN_LIST.map(t => ({ name: `${t.name} (${t.symbol})`, value: t.address })),
		description: 'Token to check balance for',
		displayOptions: {
			show: {
				resource: ['wallet'],
				operation: ['getTokenBalance'],
			},
		},
	},
	// Transfer fields
	{
		displayName: 'To Address',
		name: 'toAddress',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'ronin:1234... or 0x1234...',
		description: 'Recipient address',
		displayOptions: {
			show: {
				resource: ['wallet'],
				operation: ['transferRon', 'transferToken'],
			},
		},
	},
	{
		displayName: 'Amount',
		name: 'amount',
		type: 'string',
		default: '',
		required: true,
		placeholder: '1.5',
		description: 'Amount to transfer',
		displayOptions: {
			show: {
				resource: ['wallet'],
				operation: ['transferRon', 'transferToken'],
			},
		},
	},
	{
		displayName: 'Token',
		name: 'transferTokenAddress',
		type: 'options',
		default: '',
		options: TOKEN_LIST.map(t => ({ name: `${t.name} (${t.symbol})`, value: t.address })),
		description: 'Token to transfer',
		displayOptions: {
			show: {
				resource: ['wallet'],
				operation: ['transferToken'],
			},
		},
	},
	// Pagination for NFTs and history
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 20,
		description: 'Maximum number of results to return',
		displayOptions: {
			show: {
				resource: ['wallet'],
				operation: ['getWalletNfts', 'getTransactionHistory'],
			},
		},
	},
	{
		displayName: 'Offset',
		name: 'offset',
		type: 'number',
		default: 0,
		description: 'Number of results to skip',
		displayOptions: {
			show: {
				resource: ['wallet'],
				operation: ['getWalletNfts', 'getTransactionHistory'],
			},
		},
	},
];

export async function executeWallet(this: IExecuteFunctions, index: number): Promise<unknown> {
	const operation = this.getNodeParameter('operation', index) as string;
	const roninClient = await createRoninClient(this);

	switch (operation) {
		case 'getRonBalance': {
			const address = this.getNodeParameter('address', index) as string;
			const balance = await roninClient.getRonBalance(address);
			return {
				address: hexToRonin(normalizeAddress(address)),
				balance: balance.formatted,
				balanceWei: balance.wei,
				balanceRon: balance.ron,
			};
		}

		case 'getTokenBalance': {
			const address = this.getNodeParameter('address', index) as string;
			const tokenAddress = this.getNodeParameter('tokenAddress', index) as string;
			const balance = await roninClient.getTokenBalance(tokenAddress, address);
			return {
				address: hexToRonin(normalizeAddress(address)),
				token: balance.symbol,
				balance: balance.formatted,
				balanceRaw: balance.raw,
				decimals: balance.decimals,
			};
		}

		case 'getAllBalances': {
			const address = this.getNodeParameter('address', index) as string;
			const normalizedAddr = normalizeAddress(address);
			
			const balances = [];
			
			// Get RON balance
			const ronBalance = await roninClient.getRonBalance(address);
			balances.push({
				token: 'RON',
				symbol: 'RON',
				balance: ronBalance.formatted,
				balanceRaw: ronBalance.wei,
			});

			// Get token balances
			for (const token of TOKEN_LIST) {
				if (token.value === 'custom' || token.value === 'RON') continue;
				try {
					const balance = await roninClient.getTokenBalance(token.address, normalizedAddr);
					if (parseFloat(balance.raw) > 0) {
						balances.push({
							token: token.name,
							symbol: token.symbol,
							balance: balance.formatted,
							balanceRaw: balance.raw,
						});
					}
				} catch {
					// Skip tokens that fail
				}
			}

			return {
				address: hexToRonin(normalizedAddr),
				balances,
			};
		}

		case 'transferRon': {
			const toAddress = this.getNodeParameter('toAddress', index) as string;
			const amount = this.getNodeParameter('amount', index) as string;
			const result = await roninClient.transferRon(toAddress, amount);
			return {
				success: true,
				txHash: result.hash,
				from: result.from,
				to: hexToRonin(normalizeAddress(toAddress)),
				amount,
				blockNumber: result.blockNumber,
			};
		}

		case 'transferToken': {
			const toAddress = this.getNodeParameter('toAddress', index) as string;
			const amount = this.getNodeParameter('amount', index) as string;
			const tokenAddress = this.getNodeParameter('transferTokenAddress', index) as string;
			const result = await roninClient.transferToken(tokenAddress, toAddress, amount);
			return {
				success: true,
				txHash: result.hash,
				from: result.from,
				to: hexToRonin(normalizeAddress(toAddress)),
				amount,
				token: tokenAddress,
				blockNumber: result.blockNumber,
			};
		}

		case 'getWalletNfts': {
			const address = this.getNodeParameter('address', index) as string;
			const limit = this.getNodeParameter('limit', index) as number;
			const offset = this.getNodeParameter('offset', index) as number;
			
			const skynetClient = await createSkynetClient(this);
			const axies = await skynetClient.getAxiesByOwner(address, offset, limit);
			
			return {
				address: hexToRonin(normalizeAddress(address)),
				total: axies.total,
				nfts: axies.results,
			};
		}

		case 'getTransactionHistory': {
			const address = this.getNodeParameter('address', index) as string;
			const limit = this.getNodeParameter('limit', index) as number;
			
			// Note: This would typically use an indexer API
			// Simplified implementation
			return {
				address: hexToRonin(normalizeAddress(address)),
				message: 'Transaction history requires indexer API integration',
				limit,
			};
		}

		case 'validateAddress': {
			const address = this.getNodeParameter('address', index) as string;
			const isValid = isValidAddress(address);
			return {
				address,
				isValid,
				normalized: isValid ? normalizeAddress(address) : null,
				roninFormat: isValid ? hexToRonin(normalizeAddress(address)) : null,
			};
		}

		case 'convertAddress': {
			const address = this.getNodeParameter('address', index) as string;
			if (!isValidAddress(address)) {
				throw new Error('Invalid address format');
			}
			const normalized = normalizeAddress(address);
			return {
				original: address,
				hex: normalized,
				ronin: hexToRonin(normalized),
			};
		}

		case 'getWalletStats': {
			const address = this.getNodeParameter('address', index) as string;
			const skynetClient = await createSkynetClient(this);
			
			const [ronBalance, axies] = await Promise.all([
				roninClient.getRonBalance(address),
				skynetClient.getAxiesByOwner(address, 0, 1),
			]);

			return {
				address: hexToRonin(normalizeAddress(address)),
				ronBalance: ronBalance.formatted,
				totalAxies: axies.total,
			};
		}

		default:
			throw new Error(`Unknown operation: ${operation}`);
	}
}
