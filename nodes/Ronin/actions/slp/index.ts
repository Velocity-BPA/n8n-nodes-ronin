import { INodeProperties, IExecuteFunctions } from 'n8n-workflow';
import { createRoninClient } from '../../transport/roninClient';
import { createSkynetClient } from '../../transport/skynetApi';
import { normalizeAddress, hexToRonin } from '../../utils/addressUtils';
import { MAINNET_CONTRACTS } from '../../constants/contracts';
import { formatSlp } from '../../utils/unitConverter';

export const slpOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['slp'],
			},
		},
		options: [
			{ name: 'Get Balance', value: 'getBalance', description: 'Get SLP balance', action: 'Get SLP balance' },
			{ name: 'Transfer', value: 'transfer', description: 'Transfer SLP tokens', action: 'Transfer SLP' },
			{ name: 'Get Claimable', value: 'getClaimable', description: 'Get claimable SLP amount', action: 'Get claimable SLP' },
			{ name: 'Claim SLP', value: 'claim', description: 'Claim earned SLP', action: 'Claim SLP' },
			{ name: 'Get Earnings History', value: 'getEarnings', description: 'Get SLP earnings history', action: 'Get earnings history' },
			{ name: 'Get Token Info', value: 'getTokenInfo', description: 'Get SLP token information', action: 'Get token info' },
		],
		default: 'getBalance',
	},
];

export const slpFields: INodeProperties[] = [
	{
		displayName: 'Address',
		name: 'address',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'ronin:1234... or 0x1234...',
		description: 'Wallet address',
		displayOptions: {
			show: {
				resource: ['slp'],
				operation: ['getBalance', 'getClaimable', 'claim', 'getEarnings'],
			},
		},
	},
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
				resource: ['slp'],
				operation: ['transfer'],
			},
		},
	},
	{
		displayName: 'Amount',
		name: 'amount',
		type: 'number',
		default: 0,
		required: true,
		description: 'Amount of SLP to transfer (whole numbers only)',
		displayOptions: {
			show: {
				resource: ['slp'],
				operation: ['transfer'],
			},
		},
	},
];

export async function executeSlp(this: IExecuteFunctions, index: number): Promise<unknown> {
	const operation = this.getNodeParameter('operation', index) as string;
	const roninClient = await createRoninClient(this);

	switch (operation) {
		case 'getBalance': {
			const address = this.getNodeParameter('address', index) as string;
			const balance = await roninClient.getTokenBalance(MAINNET_CONTRACTS.SLP, address);
			
			return {
				address: hexToRonin(normalizeAddress(address)),
				token: 'SLP',
				tokenAddress: MAINNET_CONTRACTS.SLP,
				balance: balance.raw,
				formatted: formatSlp(balance.raw),
			};
		}

		case 'transfer': {
			const toAddress = this.getNodeParameter('toAddress', index) as string;
			const amount = this.getNodeParameter('amount', index) as number;
			
			// SLP has 0 decimals, so amount is the raw value
			const result = await roninClient.transferToken(
				MAINNET_CONTRACTS.SLP,
				toAddress,
				amount.toString()
			);
			
			return {
				success: true,
				txHash: result.hash,
				from: result.from,
				to: hexToRonin(normalizeAddress(toAddress)),
				amount: formatSlp(amount.toString()),
				blockNumber: result.blockNumber,
			};
		}

		case 'getClaimable': {
			const address = this.getNodeParameter('address', index) as string;
			const skynetClient = await createSkynetClient(this);
			
			const claimInfo = await skynetClient.getSlpClaimInfo(address);
			
			return {
				address: hexToRonin(normalizeAddress(address)),
				claimableAmount: claimInfo.claimable,
				formatted: formatSlp(claimInfo.claimable),
				lastClaimTimestamp: claimInfo.lastClaimed,
				nextClaimAvailable: claimInfo.lastClaimed 
					? new Date((claimInfo.lastClaimed + 14 * 24 * 60 * 60) * 1000).toISOString()
					: 'Now',
			};
		}

		case 'claim': {
			const address = this.getNodeParameter('address', index) as string;
			
			// Note: Claiming SLP requires signature from game server
			// This is a simplified implementation
			return {
				address: hexToRonin(normalizeAddress(address)),
				message: 'SLP claiming requires game server authentication. Use the Axie Infinity app to claim.',
				claimUrl: 'https://app.axieinfinity.com/games/claim-slp',
			};
		}

		case 'getEarnings': {
			const address = this.getNodeParameter('address', index) as string;
			const skynetClient = await createSkynetClient(this);
			
			// Get battle history to estimate earnings
			const battles = await skynetClient.getBattleHistory(address, 50);
			
			return {
				address: hexToRonin(normalizeAddress(address)),
				recentBattles: Array.isArray(battles) ? battles.length : 0,
				message: 'Detailed earnings history requires game API integration',
				estimatedDailyEarnings: 'Varies based on MMR and win rate',
			};
		}

		case 'getTokenInfo': {
			return {
				name: 'Smooth Love Potion',
				symbol: 'SLP',
				address: MAINNET_CONTRACTS.SLP,
				decimals: 0,
				description: 'In-game currency for Axie Infinity, earned through battles and used for breeding',
				totalSupply: 'Dynamic - minted through gameplay, burned for breeding',
				website: 'https://axieinfinity.com',
			};
		}

		default:
			throw new Error(`Unknown operation: ${operation}`);
	}
}
