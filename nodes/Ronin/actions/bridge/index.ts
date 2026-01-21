import { INodeProperties, IExecuteFunctions } from 'n8n-workflow';
import { createBridgeClient } from '../../transport/bridgeClient';
import { normalizeAddress, hexToRonin } from '../../utils/addressUtils';

export const bridgeOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['bridge'],
			},
		},
		options: [
			{ name: 'Get Status', value: 'getStatus', description: 'Get bridge operational status', action: 'Get bridge status' },
			{ name: 'Get Supported Tokens', value: 'getSupportedTokens', description: 'Get tokens supported by bridge', action: 'Get supported tokens' },
			{ name: 'Get History', value: 'getHistory', description: 'Get bridge transaction history', action: 'Get bridge history' },
			{ name: 'Estimate Fee', value: 'estimateFee', description: 'Estimate bridge fee for transfer', action: 'Estimate bridge fee' },
		],
		default: 'getStatus',
	},
];

export const bridgeFields: INodeProperties[] = [
	{
		displayName: 'Address',
		name: 'address',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'ronin:... or 0x...',
		displayOptions: {
			show: {
				resource: ['bridge'],
				operation: ['getHistory'],
			},
		},
	},
	{
		displayName: 'Token Symbol',
		name: 'tokenSymbol',
		type: 'options',
		default: 'ETH',
		options: [
			{ name: 'ETH', value: 'ETH' },
			{ name: 'WETH', value: 'WETH' },
			{ name: 'USDC', value: 'USDC' },
			{ name: 'AXS', value: 'AXS' },
			{ name: 'SLP', value: 'SLP' },
		],
		displayOptions: {
			show: {
				resource: ['bridge'],
				operation: ['estimateFee'],
			},
		},
	},
	{
		displayName: 'Amount',
		name: 'amount',
		type: 'string',
		default: '1',
		description: 'Amount to transfer',
		displayOptions: {
			show: {
				resource: ['bridge'],
				operation: ['estimateFee'],
			},
		},
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 20,
		displayOptions: {
			show: {
				resource: ['bridge'],
				operation: ['getHistory'],
			},
		},
	},
];

export async function executeBridge(this: IExecuteFunctions, index: number): Promise<unknown> {
	const operation = this.getNodeParameter('operation', index) as string;
	const bridgeClient = await createBridgeClient(this);

	switch (operation) {
		case 'getStatus': {
			const status = await bridgeClient.getBridgeStatus();
			return {
				operational: status.operational,
				depositEnabled: status.depositEnabled,
				withdrawalEnabled: status.withdrawalEnabled,
				maintenanceMessage: status.maintenanceMessage || null,
			};
		}

		case 'getSupportedTokens': {
			const tokens = await bridgeClient.getSupportedTokens();
			return {
				tokens: tokens.map((token) => ({
					symbol: token.symbol,
					name: token.name,
					roninAddress: token.roninAddress,
					ethereumAddress: token.ethereumAddress,
					decimals: token.decimals,
				})),
			};
		}

		case 'getHistory': {
			const address = this.getNodeParameter('address', index) as string;
			const limit = this.getNodeParameter('limit', index) as number;

			const history = await bridgeClient.getBridgeHistory(normalizeAddress(address));
			const transactions = history.transactions || [];

			return {
				address: hexToRonin(normalizeAddress(address)),
				total: history.total,
				transactions: transactions.slice(0, limit).map((tx) => ({
					txHash: tx.txHash,
					type: tx.type,
					token: tx.token,
					amount: tx.amount,
					status: tx.status,
					createdAt: tx.createdAt,
				})),
			};
		}

		case 'estimateFee': {
			const tokenSymbol = this.getNodeParameter('tokenSymbol', index) as string;
			const amount = this.getNodeParameter('amount', index) as string;

			const feeEstimate = await bridgeClient.estimateBridgeFee({
				type: 'withdrawal',
				token: tokenSymbol,
				amount,
			});

			return {
				token: tokenSymbol,
				amount,
				bridgeFee: feeEstimate.bridgeFee,
				gasFee: feeEstimate.gasFee,
				totalFee: feeEstimate.totalFee,
				estimatedTime: feeEstimate.estimatedTime,
				estimatedTimeFormatted: `${Math.round(feeEstimate.estimatedTime / 60)} minutes`,
			};
		}

		default:
			throw new Error(`Unknown operation: ${operation}`);
	}
}
