/**
 * Mavis Hub Actions for Ronin n8n Node
 */

import { INodeProperties, IExecuteFunctions, IDataObject } from 'n8n-workflow';
import { createMavisClient } from '../../transport/mavisClient';
import { normalizeAddress, hexToRonin } from '../../utils/addressUtils';

export const mavisHubOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['mavisHub'] } },
		options: [
			{ name: 'Get Games', value: 'getGames', description: 'Get available games', action: 'Get games' },
			{ name: 'Get Game Info', value: 'getGameInfo', description: 'Get game details', action: 'Get game info' },
			{ name: 'Get Player Stats', value: 'getPlayerStats', description: 'Get player stats', action: 'Get player stats' },
			{ name: 'Get Achievements', value: 'getAchievements', description: 'Get achievements', action: 'Get achievements' },
			{ name: 'Get Inventory', value: 'getInventory', description: 'Get inventory', action: 'Get inventory' },
			{ name: 'Get Rewards', value: 'getRewards', description: 'Get rewards', action: 'Get rewards' },
			{ name: 'Get Leaderboard', value: 'getLeaderboard', description: 'Get leaderboard', action: 'Get leaderboard' },
			{ name: 'Get Tournaments', value: 'getTournaments', description: 'Get tournaments', action: 'Get tournaments' },
		],
		default: 'getGames',
	},
];

export const mavisHubFields: INodeProperties[] = [
	{
		displayName: 'Game ID',
		name: 'gameId',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'axie-infinity',
		displayOptions: { show: { resource: ['mavisHub'], operation: ['getGameInfo', 'getPlayerStats', 'getAchievements', 'getInventory', 'getRewards', 'getLeaderboard', 'getTournaments'] } },
	},
	{
		displayName: 'Player Address',
		name: 'playerAddress',
		type: 'string',
		required: true,
		default: '',
		displayOptions: { show: { resource: ['mavisHub'], operation: ['getPlayerStats', 'getAchievements', 'getInventory', 'getRewards'] } },
	},
	{
		displayName: 'Period',
		name: 'period',
		type: 'options',
		options: [
			{ name: 'Daily', value: 'daily' },
			{ name: 'Weekly', value: 'weekly' },
			{ name: 'Monthly', value: 'monthly' },
			{ name: 'All Time', value: 'allTime' },
		],
		default: 'weekly',
		displayOptions: { show: { resource: ['mavisHub'], operation: ['getLeaderboard'] } },
	},
	{
		displayName: 'Status',
		name: 'status',
		type: 'options',
		options: [
			{ name: 'Upcoming', value: 'upcoming' },
			{ name: 'Active', value: 'active' },
			{ name: 'Completed', value: 'completed' },
		],
		default: 'active',
		displayOptions: { show: { resource: ['mavisHub'], operation: ['getTournaments'] } },
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 20,
		displayOptions: { show: { resource: ['mavisHub'], operation: ['getGames', 'getLeaderboard', 'getTournaments'] } },
	},
];

export async function executeMavisHub(this: IExecuteFunctions, index: number): Promise<IDataObject> {
	const operation = this.getNodeParameter('operation', index) as string;
	const mavisClient = await createMavisClient(this);

	switch (operation) {
		case 'getGames': {
			const limit = this.getNodeParameter('limit', index) as number;
			const result = await mavisClient.getAvailableGames({ size: limit });
			return { total: result.total, games: result.games };
		}
		case 'getGameInfo': {
			const gameId = this.getNodeParameter('gameId', index) as string;
			const gameInfo = await mavisClient.getGame(gameId);
			return { gameId, ...gameInfo };
		}
		case 'getPlayerStats': {
			const gameId = this.getNodeParameter('gameId', index) as string;
			const playerAddress = normalizeAddress(this.getNodeParameter('playerAddress', index) as string);
			const stats = await mavisClient.getPlayerStats(gameId, playerAddress);
			return { gameId, playerAddress: hexToRonin(playerAddress), stats };
		}
		case 'getAchievements': {
			const gameId = this.getNodeParameter('gameId', index) as string;
			const playerAddress = normalizeAddress(this.getNodeParameter('playerAddress', index) as string);
			const result = await mavisClient.getPlayerAchievements(gameId, { gameId: gameId });
			return { gameId, playerAddress: hexToRonin(playerAddress), total: result.total, achievements: result.achievements };
		}
		case 'getInventory': {
			const gameId = this.getNodeParameter('gameId', index) as string;
			const playerAddress = normalizeAddress(this.getNodeParameter('playerAddress', index) as string);
			const result = await mavisClient.getPlayerInventory(gameId, { gameId: gameId });
			return { gameId, playerAddress: hexToRonin(playerAddress), total: result.total, items: result.items };
		}
		case 'getRewards': {
			const gameId = this.getNodeParameter('gameId', index) as string;
			const playerAddress = normalizeAddress(this.getNodeParameter('playerAddress', index) as string);
			const result = await mavisClient.getPlayerRewards(gameId, { gameId: gameId });
			return { gameId, playerAddress: hexToRonin(playerAddress), total: result.total, rewards: result.rewards };
		}
		case 'getLeaderboard': {
			const gameId = this.getNodeParameter('gameId', index) as string;
			const period = this.getNodeParameter('period', index) as 'daily' | 'weekly' | 'monthly' | 'allTime';
			const limit = this.getNodeParameter('limit', index) as number;
			const result = await mavisClient.getLeaderboard(gameId, { period, size: limit });
			return { gameId, period, total: result.total, entries: result.entries };
		}
		case 'getTournaments': {
			const gameId = this.getNodeParameter('gameId', index) as string;
			const status = this.getNodeParameter('status', index) as 'upcoming' | 'active' | 'completed';
			const limit = this.getNodeParameter('limit', index) as number;
			const result = await mavisClient.getTournaments(gameId, { status, size: limit });
			return { gameId, status, total: result.total, tournaments: result.tournaments };
		}
		default: throw new Error(`Unknown operation: ${operation}`);
	}
}
