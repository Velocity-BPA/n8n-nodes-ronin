import { INodeProperties, IExecuteFunctions } from 'n8n-workflow';
import { createSkynetClient } from '../../transport/skynetApi';
import { normalizeAddress, hexToRonin } from '../../utils/addressUtils';
import { getMmrTier } from '../../utils/axieUtils';

export const battleOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['battle'],
			},
		},
		options: [
			{ name: 'Get Battle History', value: 'getBattleHistory', description: 'Get battle history for address', action: 'Get battle history' },
			{ name: 'Get Leaderboard', value: 'getLeaderboard', description: 'Get arena leaderboard', action: 'Get leaderboard' },
			{ name: 'Get MMR', value: 'getMmr', description: 'Get MMR for address', action: 'Get MMR' },
			{ name: 'Get Win Rate', value: 'getWinRate', description: 'Calculate win rate', action: 'Get win rate' },
		],
		default: 'getBattleHistory',
	},
];

export const battleFields: INodeProperties[] = [
	{
		displayName: 'Address',
		name: 'address',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'ronin:... or 0x...',
		displayOptions: {
			show: {
				resource: ['battle'],
				operation: ['getBattleHistory', 'getMmr', 'getWinRate'],
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
				resource: ['battle'],
				operation: ['getBattleHistory', 'getLeaderboard'],
			},
		},
	},
	{
		displayName: 'Offset',
		name: 'offset',
		type: 'number',
		default: 0,
		displayOptions: {
			show: {
				resource: ['battle'],
				operation: ['getLeaderboard'],
			},
		},
	},
];

export async function executeBattle(this: IExecuteFunctions, index: number): Promise<unknown> {
	const operation = this.getNodeParameter('operation', index) as string;
	const skynetClient = await createSkynetClient(this);

	switch (operation) {
		case 'getBattleHistory': {
			const address = this.getNodeParameter('address', index) as string;
			const limit = this.getNodeParameter('limit', index) as number;

			const battles = await skynetClient.getBattleHistory(address, limit);
			return {
				address: hexToRonin(normalizeAddress(address)),
				total: Array.isArray(battles) ? battles.length : 0,
				battles: battles || [],
			};
		}

		case 'getLeaderboard': {
			const limit = this.getNodeParameter('limit', index) as number;
			const offset = this.getNodeParameter('offset', index) as number;

			const leaderboard = await skynetClient.getLeaderboard(offset, limit);
			return {
				offset,
				limit,
				players: leaderboard || [],
			};
		}

		case 'getMmr': {
			const address = this.getNodeParameter('address', index) as string;
			
			// Get recent battles to estimate MMR
			const battles = await skynetClient.getBattleHistory(address, 10) as Array<{ winner?: string }>;
			
			// Simple MMR estimation based on win rate
			const wins = Array.isArray(battles) ? battles.filter((b) => 
				b.winner && b.winner.toLowerCase() === normalizeAddress(address).toLowerCase()
			).length : 0;
			
			const estimatedMmr = 1000 + (wins * 50);
			const tier = getMmrTier(estimatedMmr);

			return {
				address: hexToRonin(normalizeAddress(address)),
				estimatedMmr,
				tier: tier.name,
				tierMinMmr: tier.minMmr,
				tierMaxMmr: tier.maxMmr,
				note: 'MMR is estimated based on recent battles',
			};
		}

		case 'getWinRate': {
			const address = this.getNodeParameter('address', index) as string;

			const battles = await skynetClient.getBattleHistory(address, 100) as Array<{ winner?: string }>;
			
			if (!Array.isArray(battles) || battles.length === 0) {
				return {
					address: hexToRonin(normalizeAddress(address)),
					totalBattles: 0,
					wins: 0,
					losses: 0,
					winRate: 0,
				};
			}

			const normalizedAddr = normalizeAddress(address).toLowerCase();
			const wins = battles.filter((b) => b.winner && b.winner.toLowerCase() === normalizedAddr).length;
			const losses = battles.length - wins;
			const winRate = (wins / battles.length) * 100;

			return {
				address: hexToRonin(normalizeAddress(address)),
				totalBattles: battles.length,
				wins,
				losses,
				winRate: winRate.toFixed(2) + '%',
			};
		}

		default:
			throw new Error(`Unknown operation: ${operation}`);
	}
}
