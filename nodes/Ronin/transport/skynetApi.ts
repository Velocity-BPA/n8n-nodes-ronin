/**
 * Skynet API Client
 * REST and GraphQL client for Ronin/Axie Infinity APIs
 */

import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { GraphQLClient, gql } from 'graphql-request';
import { IExecuteFunctions, ILoadOptionsFunctions } from 'n8n-workflow';
import { API_ENDPOINTS } from '../constants/networks';
import { normalizeAddress, hexToRonin } from '../utils/addressUtils';

/**
 * Skynet client options
 */
export interface SkynetClientOptions {
	apiEndpoint: string;
	apiKey: string;
	appId?: string;
}

/**
 * Axie GraphQL response types
 */
export interface AxieResponse {
	id: string;
	name: string;
	class: string;
	genes: string;
	breedCount: number;
	image: string;
	stage: number;
	owner: string;
	bornAt?: number;
	matronId?: string;
	sireId?: string;
	matronClass?: string;
	sireClass?: string;
	children?: Array<{ id: string }>;
	parts: Array<{
		id: string;
		name: string;
		class: string;
		type: string;
	}>;
	stats: {
		hp: number;
		speed: number;
		skill: number;
		morale: number;
	};
	auction?: {
		currentPrice: string;
		currentPriceUSD: string;
	};
}

/**
 * Collection stats response
 */
export interface CollectionStats {
	floorPrice: string;
	volume24h: string;
	volumeTotal: string;
	totalSupply: number;
	holders: number;
	listings: number;
}

/**
 * Skynet API Client class
 */
export class SkynetClient {
	private httpClient: AxiosInstance;
	private graphqlClient: GraphQLClient;
	private apiKey: string;

	constructor(options: SkynetClientOptions) {
		this.apiKey = options.apiKey;

		// Setup HTTP client
		this.httpClient = axios.create({
			baseURL: options.apiEndpoint,
			headers: {
				'X-API-Key': options.apiKey,
				'Content-Type': 'application/json',
			},
		});

		// Setup GraphQL client
		this.graphqlClient = new GraphQLClient(API_ENDPOINTS.GRAPHQL_MAINNET, {
			headers: {
				'X-API-Key': options.apiKey,
			},
		});
	}

	/**
	 * Make HTTP request
	 */
	async request<T>(config: AxiosRequestConfig): Promise<T> {
		const response = await this.httpClient.request<T>(config);
		return response.data;
	}

	/**
	 * Make GraphQL request
	 */
	async graphql<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
		return this.graphqlClient.request<T>(query, variables);
	}

	/**
	 * Get Axie by ID
	 */
	async getAxie(axieId: string): Promise<AxieResponse> {
		const query = gql`
			query GetAxie($axieId: ID!) {
				axie(axieId: $axieId) {
					id
					name
					class
					genes
					breedCount
					image
					stage
					owner
					bornAt
					matronId
					sireId
					matronClass
					sireClass
					children {
						id
					}
					parts {
						id
						name
						class
						type
					}
					stats {
						hp
						speed
						skill
						morale
					}
					auction {
						currentPrice
						currentPriceUSD
					}
				}
			}
		`;

		const result = await this.graphql<{ axie: AxieResponse }>(query, { axieId });
		return result.axie;
	}

	/**
	 * Get Axies by owner
	 */
	async getAxiesByOwner(
		owner: string,
		from: number = 0,
		size: number = 24
	): Promise<{ total: number; results: AxieResponse[] }> {
		const normalizedOwner = normalizeAddress(owner);
		
		const query = gql`
			query GetAxiesByOwner($owner: String!, $from: Int!, $size: Int!) {
				axies(owner: $owner, from: $from, size: $size) {
					total
					results {
						id
						name
						class
						genes
						breedCount
						image
						stage
						owner
						parts {
							id
							name
							class
							type
						}
						stats {
							hp
							speed
							skill
							morale
						}
					}
				}
			}
		`;

		const result = await this.graphql<{
			axies: { total: number; results: AxieResponse[] };
		}>(query, { owner: normalizedOwner, from, size });

		return result.axies;
	}

	/**
	 * Search Axies
	 */
	async searchAxies(criteria: {
		classes?: string[];
		parts?: string[];
		breedCount?: number[];
		numMystic?: number[];
		pureness?: number[];
		from?: number;
		size?: number;
		sort?: string;
		auctionType?: string;
	}): Promise<{ total: number; results: AxieResponse[] }> {
		const query = gql`
			query SearchAxies($criteria: AxieSearchCriteria!) {
				axies(criteria: $criteria) {
					total
					results {
						id
						name
						class
						genes
						breedCount
						image
						stage
						owner
						parts {
							id
							name
							class
							type
						}
						stats {
							hp
							speed
							skill
							morale
						}
						auction {
							currentPrice
							currentPriceUSD
						}
					}
				}
			}
		`;

		const result = await this.graphql<{
			axies: { total: number; results: AxieResponse[] };
		}>(query, { criteria });

		return result.axies;
	}

	/**
	 * Get Land by token ID
	 */
	async getLand(tokenId: string): Promise<unknown> {
		const query = gql`
			query GetLand($tokenId: ID!) {
				land(tokenId: $tokenId) {
					tokenId
					owner
					landType
					row
					col
					plotIndex
					itemSlots
				}
			}
		`;

		const result = await this.graphql<{ land: unknown }>(query, { tokenId });
		return result.land;
	}

	/**
	 * Get Lands by owner
	 */
	async getLandsByOwner(owner: string): Promise<unknown[]> {
		const normalizedOwner = normalizeAddress(owner);
		
		const query = gql`
			query GetLandsByOwner($owner: String!) {
				lands(owner: $owner) {
					results {
						tokenId
						owner
						landType
						row
						col
						plotIndex
					}
				}
			}
		`;

		const result = await this.graphql<{ lands: { results: unknown[] } }>(
			query,
			{ owner: normalizedOwner }
		);

		return result.lands.results;
	}

	/**
	 * Get marketplace listings
	 */
	async getMarketplaceListings(params: {
		contractAddress?: string;
		owner?: string;
		from?: number;
		size?: number;
		sort?: string;
	}): Promise<{ total: number; results: unknown[] }> {
		return this.request({
			method: 'GET',
			url: '/marketplace/listings',
			params,
		});
	}

	/**
	 * Get collection stats
	 */
	async getCollectionStats(contractAddress: string): Promise<CollectionStats> {
		const normalizedAddress = normalizeAddress(contractAddress);
		
		return this.request({
			method: 'GET',
			url: `/collections/${normalizedAddress}/stats`,
		});
	}

	/**
	 * Get NFT metadata
	 */
	async getNftMetadata(
		contractAddress: string,
		tokenId: string
	): Promise<unknown> {
		const normalizedAddress = normalizeAddress(contractAddress);
		
		return this.request({
			method: 'GET',
			url: `/nft/${normalizedAddress}/${tokenId}`,
		});
	}

	/**
	 * Get wallet NFTs
	 */
	async getWalletNfts(
		walletAddress: string,
		params?: { contractAddress?: string; from?: number; size?: number }
	): Promise<{ total: number; results: unknown[] }> {
		const normalizedAddress = normalizeAddress(walletAddress);
		
		return this.request({
			method: 'GET',
			url: `/wallets/${normalizedAddress}/nfts`,
			params,
		});
	}

	/**
	 * Get wallet activity
	 */
	async getWalletActivity(
		walletAddress: string,
		params?: { from?: number; size?: number; type?: string }
	): Promise<{ total: number; results: unknown[] }> {
		const normalizedAddress = normalizeAddress(walletAddress);
		
		return this.request({
			method: 'GET',
			url: `/wallets/${normalizedAddress}/activity`,
			params,
		});
	}

	/**
	 * Get battle history
	 */
	async getBattleHistory(
		roninAddress: string,
		limit: number = 20
	): Promise<unknown[]> {
		const query = gql`
			query GetBattleHistory($owner: String!, $limit: Int!) {
				battleLogs(owner: $owner, limit: $limit) {
					id
					winner
					loser
					winnerTeam
					loserTeam
					createdAt
				}
			}
		`;

		const normalizedAddress = normalizeAddress(roninAddress);
		const result = await this.graphql<{ battleLogs: unknown[] }>(query, {
			owner: normalizedAddress,
			limit,
		});

		return result.battleLogs;
	}

	/**
	 * Get leaderboard
	 */
	async getLeaderboard(
		offset: number = 0,
		limit: number = 100
	): Promise<unknown[]> {
		const query = gql`
			query GetLeaderboard($offset: Int!, $limit: Int!) {
				leaderboard(offset: $offset, limit: $limit) {
					owner
					name
					elo
					rank
					wins
					losses
				}
			}
		`;

		const result = await this.graphql<{ leaderboard: unknown[] }>(query, {
			offset,
			limit,
		});

		return result.leaderboard;
	}

	/**
	 * Get SLP claiming info
	 */
	async getSlpClaimInfo(roninAddress: string): Promise<{
		claimable: string;
		lastClaimed: number;
		nextClaimTime: number;
	}> {
		const normalizedAddress = normalizeAddress(roninAddress);
		
		return this.request({
			method: 'GET',
			url: `/slp/${normalizedAddress}/claim-info`,
		});
	}

	/**
	 * Get token prices
	 */
	async getTokenPrices(): Promise<{
		ron: number;
		axs: number;
		slp: number;
		weth: number;
	}> {
		return this.request({
			method: 'GET',
			url: '/prices',
		});
	}
}

/**
 * Create Skynet client from n8n credentials
 */
export async function createSkynetClient(
	context: IExecuteFunctions | ILoadOptionsFunctions,
	credentialsName: string = 'roninApi'
): Promise<SkynetClient> {
	const credentials = await context.getCredentials(credentialsName);
	
	const apiEndpoint = credentials.apiEndpoint === 'custom'
		? credentials.customApiUrl as string
		: credentials.apiEndpoint as string;

	return new SkynetClient({
		apiEndpoint,
		apiKey: credentials.apiKey as string,
		appId: credentials.appId as string | undefined,
	});
}
