/**
 * Mavis Hub Client
 * Client for Mavis Hub gaming platform API
 */

import axios, { AxiosInstance } from 'axios';
import { IExecuteFunctions, ILoadOptionsFunctions } from 'n8n-workflow';
import { normalizeAddress } from '../utils/addressUtils';

/**
 * Game info structure
 */
export interface GameInfo {
	id: string;
	name: string;
	slug: string;
	description: string;
	genre: string[];
	developer: string;
	publisher: string;
	website: string;
	thumbnail: string;
	banner: string;
	status: 'live' | 'beta' | 'alpha' | 'coming_soon';
	platforms: string[];
	blockchain: {
		tokenAddress?: string;
		nftContracts?: string[];
	};
	stats: {
		players: number;
		dailyActive: number;
		totalTransactions: number;
	};
}

/**
 * Player stats structure
 */
export interface PlayerStats {
	address: string;
	gamesPlayed: string[];
	totalPlayTime: number;
	achievements: number;
	rewards: {
		token: string;
		amount: string;
	}[];
	joinedAt: number;
}

/**
 * Achievement structure
 */
export interface Achievement {
	id: string;
	name: string;
	description: string;
	icon: string;
	game: string;
	rarity: 'common' | 'rare' | 'epic' | 'legendary';
	unlockedAt?: number;
	progress?: number;
	maxProgress?: number;
}

/**
 * Reward structure
 */
export interface Reward {
	id: string;
	type: 'token' | 'nft' | 'item';
	name: string;
	amount: string;
	token?: string;
	nftContract?: string;
	nftTokenId?: string;
	claimable: boolean;
	expiresAt?: number;
	claimedAt?: number;
}

/**
 * Inventory item
 */
export interface InventoryItem {
	id: string;
	game: string;
	type: string;
	name: string;
	description: string;
	rarity: string;
	image: string;
	attributes: Record<string, unknown>;
	equipped: boolean;
	tradeable: boolean;
}

/**
 * Mavis Hub client options
 */
export interface MavisClientOptions {
	apiEndpoint: string;
	clientId: string;
	clientSecret?: string;
	accessToken?: string;
}

/**
 * Mavis Hub Client
 */
export class MavisClient {
	private httpClient: AxiosInstance;
	private clientId: string;
	private accessToken?: string;

	constructor(options: MavisClientOptions) {
		this.clientId = options.clientId;
		this.accessToken = options.accessToken;

		this.httpClient = axios.create({
			baseURL: options.apiEndpoint,
			headers: {
				'Content-Type': 'application/json',
				'X-Client-Id': options.clientId,
				...(options.accessToken
					? { Authorization: `Bearer ${options.accessToken}` }
					: {}),
			},
		});
	}

	/**
	 * Set access token
	 */
	setAccessToken(token: string): void {
		this.accessToken = token;
		this.httpClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
	}

	/**
	 * Get available games
	 */
	async getAvailableGames(params?: {
		status?: string;
		genre?: string;
		from?: number;
		size?: number;
	}): Promise<{ total: number; games: GameInfo[] }> {
		const response = await this.httpClient.get('/v1/games', { params });
		return response.data;
	}

	/**
	 * Get game by ID or slug
	 */
	async getGame(idOrSlug: string): Promise<GameInfo> {
		const response = await this.httpClient.get(`/v1/games/${idOrSlug}`);
		return response.data;
	}

	/**
	 * Get game stats
	 */
	async getGameStats(gameId: string): Promise<{
		totalPlayers: number;
		dailyActive: number;
		weeklyActive: number;
		monthlyActive: number;
		totalTransactions: number;
		volume24h: string;
	}> {
		const response = await this.httpClient.get(`/v1/games/${gameId}/stats`);
		return response.data;
	}

	/**
	 * Get player stats
	 */
	async getPlayerStats(
		playerAddress: string,
		gameId?: string
	): Promise<PlayerStats> {
		const normalizedAddress = normalizeAddress(playerAddress);
		
		const response = await this.httpClient.get(
			`/v1/players/${normalizedAddress}/stats`,
			{ params: { gameId } }
		);
		return response.data;
	}

	/**
	 * Get player achievements
	 */
	async getPlayerAchievements(
		playerAddress: string,
		params?: {
			gameId?: string;
			status?: 'unlocked' | 'locked' | 'all';
			from?: number;
			size?: number;
		}
	): Promise<{ total: number; achievements: Achievement[] }> {
		const normalizedAddress = normalizeAddress(playerAddress);
		
		const response = await this.httpClient.get(
			`/v1/players/${normalizedAddress}/achievements`,
			{ params }
		);
		return response.data;
	}

	/**
	 * Get player rewards
	 */
	async getPlayerRewards(
		playerAddress: string,
		params?: {
			gameId?: string;
			claimable?: boolean;
			from?: number;
			size?: number;
		}
	): Promise<{ total: number; rewards: Reward[] }> {
		const normalizedAddress = normalizeAddress(playerAddress);
		
		const response = await this.httpClient.get(
			`/v1/players/${normalizedAddress}/rewards`,
			{ params }
		);
		return response.data;
	}

	/**
	 * Claim reward
	 */
	async claimReward(
		playerAddress: string,
		rewardId: string
	): Promise<{
		success: boolean;
		txHash?: string;
		reward: Reward;
	}> {
		const normalizedAddress = normalizeAddress(playerAddress);
		
		const response = await this.httpClient.post(
			`/v1/players/${normalizedAddress}/rewards/${rewardId}/claim`
		);
		return response.data;
	}

	/**
	 * Get player inventory
	 */
	async getPlayerInventory(
		playerAddress: string,
		params?: {
			gameId?: string;
			type?: string;
			from?: number;
			size?: number;
		}
	): Promise<{ total: number; items: InventoryItem[] }> {
		const normalizedAddress = normalizeAddress(playerAddress);
		
		const response = await this.httpClient.get(
			`/v1/players/${normalizedAddress}/inventory`,
			{ params }
		);
		return response.data;
	}

	/**
	 * Link game account
	 */
	async linkGameAccount(params: {
		gameId: string;
		playerId: string;
		signature: string;
	}): Promise<{
		success: boolean;
		linkedAt: number;
	}> {
		const response = await this.httpClient.post('/v1/accounts/link', params);
		return response.data;
	}

	/**
	 * Get linked accounts
	 */
	async getLinkedAccounts(
		playerAddress: string
	): Promise<
		Array<{
			gameId: string;
			playerId: string;
			linkedAt: number;
		}>
	> {
		const normalizedAddress = normalizeAddress(playerAddress);
		
		const response = await this.httpClient.get(
			`/v1/players/${normalizedAddress}/accounts`
		);
		return response.data;
	}

	/**
	 * Get game leaderboard
	 */
	async getLeaderboard(
		gameId: string,
		params?: {
			metric?: string;
			period?: 'daily' | 'weekly' | 'monthly' | 'allTime';
			from?: number;
			size?: number;
		}
	): Promise<{
		total: number;
		entries: Array<{
			rank: number;
			address: string;
			name?: string;
			score: number;
			change?: number;
		}>;
	}> {
		const response = await this.httpClient.get(
			`/v1/games/${gameId}/leaderboard`,
			{ params }
		);
		return response.data;
	}

	/**
	 * Get tournaments
	 */
	async getTournaments(
		gameId?: string,
		params?: {
			status?: 'upcoming' | 'active' | 'completed';
			from?: number;
			size?: number;
		}
	): Promise<{
		total: number;
		tournaments: Array<{
			id: string;
			name: string;
			game: string;
			startTime: number;
			endTime: number;
			prizePool: string;
			participants: number;
			maxParticipants: number;
			status: string;
		}>;
	}> {
		const response = await this.httpClient.get('/v1/tournaments', {
			params: { ...params, gameId },
		});
		return response.data;
	}

	/**
	 * Get match history
	 */
	async getMatchHistory(
		playerAddress: string,
		gameId: string,
		params?: {
			from?: number;
			size?: number;
		}
	): Promise<{
		total: number;
		matches: Array<{
			id: string;
			game: string;
			players: string[];
			winner?: string;
			score?: Record<string, number>;
			duration: number;
			playedAt: number;
		}>;
	}> {
		const normalizedAddress = normalizeAddress(playerAddress);
		
		const response = await this.httpClient.get(
			`/v1/players/${normalizedAddress}/matches`,
			{ params: { ...params, gameId } }
		);
		return response.data;
	}

	/**
	 * Get platform stats
	 */
	async getPlatformStats(): Promise<{
		totalGames: number;
		totalPlayers: number;
		dailyActive: number;
		totalTransactions: number;
		volume24h: string;
	}> {
		const response = await this.httpClient.get('/v1/stats');
		return response.data;
	}
}

/**
 * Create Mavis Hub client from n8n credentials
 */
export async function createMavisClient(
	context: IExecuteFunctions | ILoadOptionsFunctions,
	credentialsName: string = 'mavisHub'
): Promise<MavisClient> {
	const credentials = await context.getCredentials(credentialsName);

	return new MavisClient({
		apiEndpoint: credentials.hubApiEndpoint as string,
		clientId: credentials.clientId as string,
		clientSecret: credentials.clientSecret as string,
		accessToken: credentials.accessToken as string | undefined,
	});
}
