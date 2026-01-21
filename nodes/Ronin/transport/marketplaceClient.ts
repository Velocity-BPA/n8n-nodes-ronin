/**
 * Mavis Marketplace Client
 * Client for interacting with Mavis Market API
 */

import axios, { AxiosInstance } from 'axios';
import { ethers } from 'ethers';
import { IExecuteFunctions, ILoadOptionsFunctions } from 'n8n-workflow';
import { API_ENDPOINTS } from '../constants/networks';
import { normalizeAddress } from '../utils/addressUtils';
import { RoninClient } from './roninClient';

/**
 * Listing data structure
 */
export interface Listing {
	id: string;
	maker: string;
	token: {
		address: string;
		id: string;
	};
	price: string;
	priceUsd: string;
	paymentToken: string;
	expiredAt: number;
	createdAt: number;
	status: 'active' | 'sold' | 'cancelled';
}

/**
 * Order data structure
 */
export interface Order {
	maker: string;
	kind: number;
	assets: Array<{
		erc: number;
		addr: string;
		id: string;
		quantity: string;
	}>;
	expiredAt: number;
	paymentToken: string;
	startedAt: number;
	basePrice: string;
	endedAt: number;
	endedPrice: string;
	expectedState: string;
	nonce: number;
	marketFeePercentage: number;
}

/**
 * Marketplace client options
 */
export interface MarketplaceClientOptions {
	apiEndpoint?: string;
	apiKey?: string;
}

/**
 * Marketplace API Client
 */
export class MarketplaceClient {
	private httpClient: AxiosInstance;
	private roninClient?: RoninClient;

	constructor(options: MarketplaceClientOptions = {}) {
		this.httpClient = axios.create({
			baseURL: options.apiEndpoint || API_ENDPOINTS.MARKETPLACE_MAINNET,
			headers: {
				'Content-Type': 'application/json',
				...(options.apiKey ? { 'X-API-Key': options.apiKey } : {}),
			},
		});
	}

	/**
	 * Set Ronin client for transaction operations
	 */
	setRoninClient(client: RoninClient): void {
		this.roninClient = client;
	}

	/**
	 * Get listing by ID
	 */
	async getListing(listingId: string): Promise<Listing> {
		const response = await this.httpClient.get(`/v1/orders/${listingId}`);
		return response.data;
	}

	/**
	 * Get active listings
	 */
	async getActiveListings(params: {
		contractAddress?: string;
		tokenIds?: string[];
		maker?: string;
		from?: number;
		size?: number;
		sort?: string;
		minPrice?: string;
		maxPrice?: string;
	}): Promise<{ total: number; data: Listing[] }> {
		const response = await this.httpClient.get('/v1/orders', {
			params: {
				...params,
				status: 'active',
			},
		});
		return response.data;
	}

	/**
	 * Get listings by user
	 */
	async getListingsByUser(
		userAddress: string,
		params?: { from?: number; size?: number; status?: string }
	): Promise<{ total: number; data: Listing[] }> {
		const normalizedAddress = normalizeAddress(userAddress);
		
		const response = await this.httpClient.get('/v1/orders', {
			params: {
				...params,
				maker: normalizedAddress,
			},
		});
		return response.data;
	}

	/**
	 * Get listings by collection
	 */
	async getListingsByCollection(
		contractAddress: string,
		params?: {
			from?: number;
			size?: number;
			sort?: string;
			minPrice?: string;
			maxPrice?: string;
		}
	): Promise<{ total: number; data: Listing[] }> {
		const normalizedAddress = normalizeAddress(contractAddress);
		
		const response = await this.httpClient.get('/v1/orders', {
			params: {
				...params,
				contractAddress: normalizedAddress,
				status: 'active',
			},
		});
		return response.data;
	}

	/**
	 * Get recent sales
	 */
	async getRecentSales(params?: {
		contractAddress?: string;
		from?: number;
		size?: number;
	}): Promise<{ total: number; data: unknown[] }> {
		const response = await this.httpClient.get('/v1/sales', { params });
		return response.data;
	}

	/**
	 * Get price history
	 */
	async getPriceHistory(
		contractAddress: string,
		tokenId: string,
		params?: { from?: number; to?: number }
	): Promise<unknown[]> {
		const normalizedAddress = normalizeAddress(contractAddress);
		
		const response = await this.httpClient.get(
			`/v1/tokens/${normalizedAddress}/${tokenId}/price-history`,
			{ params }
		);
		return response.data;
	}

	/**
	 * Get offers for NFT
	 */
	async getOffers(
		contractAddress: string,
		tokenId: string
	): Promise<{ total: number; data: unknown[] }> {
		const normalizedAddress = normalizeAddress(contractAddress);
		
		const response = await this.httpClient.get(
			`/v1/tokens/${normalizedAddress}/${tokenId}/offers`
		);
		return response.data;
	}

	/**
	 * Get marketplace stats
	 */
	async getMarketplaceStats(): Promise<{
		totalVolume: string;
		volume24h: string;
		totalSales: number;
		sales24h: number;
		totalListings: number;
		uniqueSellers: number;
		uniqueBuyers: number;
	}> {
		const response = await this.httpClient.get('/v1/stats');
		return response.data;
	}

	/**
	 * Get floor price for collection
	 */
	async getFloorPrice(contractAddress: string): Promise<{
		floorPrice: string;
		floorPriceUsd: string;
		paymentToken: string;
	}> {
		const normalizedAddress = normalizeAddress(contractAddress);
		
		const response = await this.httpClient.get(
			`/v1/collections/${normalizedAddress}/floor-price`
		);
		return response.data;
	}

	/**
	 * Get collection volume
	 */
	async getCollectionVolume(
		contractAddress: string,
		params?: { period?: '24h' | '7d' | '30d' | 'all' }
	): Promise<{
		volume: string;
		volumeUsd: string;
		sales: number;
	}> {
		const normalizedAddress = normalizeAddress(contractAddress);
		
		const response = await this.httpClient.get(
			`/v1/collections/${normalizedAddress}/volume`,
			{ params }
		);
		return response.data;
	}

	/**
	 * Create order signature
	 */
	private async signOrder(order: Order): Promise<string> {
		if (!this.roninClient) {
			throw new Error('Ronin client required for signing orders');
		}

		const wallet = this.roninClient.getWallet();
		if (!wallet) {
			throw new Error('Wallet required for signing orders');
		}

		// EIP-712 typed data
		const domain = {
			name: 'MarketGateway',
			version: '1',
			chainId: 2020,
			verifyingContract: '0xfff9ce5f71ca6178d3beecedb61e7eff1602950e',
		};

		const types = {
			Asset: [
				{ name: 'erc', type: 'uint8' },
				{ name: 'addr', type: 'address' },
				{ name: 'id', type: 'uint256' },
				{ name: 'quantity', type: 'uint256' },
			],
			Order: [
				{ name: 'maker', type: 'address' },
				{ name: 'kind', type: 'uint8' },
				{ name: 'assets', type: 'Asset[]' },
				{ name: 'expiredAt', type: 'uint256' },
				{ name: 'paymentToken', type: 'address' },
				{ name: 'startedAt', type: 'uint256' },
				{ name: 'basePrice', type: 'uint256' },
				{ name: 'endedAt', type: 'uint256' },
				{ name: 'endedPrice', type: 'uint256' },
				{ name: 'expectedState', type: 'uint256' },
				{ name: 'nonce', type: 'uint256' },
				{ name: 'marketFeePercentage', type: 'uint256' },
			],
		};

		const signature = await wallet.signTypedData(domain, types, order);
		return signature;
	}

	/**
	 * Create listing (requires Ronin client)
	 */
	async createListing(params: {
		contractAddress: string;
		tokenId: string;
		price: string;
		paymentToken?: string;
		expirationDays?: number;
	}): Promise<{ orderId: string; signature: string }> {
		if (!this.roninClient) {
			throw new Error('Ronin client required for creating listings');
		}

		const wallet = this.roninClient.getWallet();
		if (!wallet) {
			throw new Error('Wallet required for creating listings');
		}

		const maker = await wallet.getAddress();
		const now = Math.floor(Date.now() / 1000);
		const expiredAt = now + (params.expirationDays || 7) * 24 * 60 * 60;

		const order: Order = {
			maker,
			kind: 1, // Sell order
			assets: [
				{
					erc: 721,
					addr: normalizeAddress(params.contractAddress),
					id: params.tokenId,
					quantity: '1',
				},
			],
			expiredAt,
			paymentToken: params.paymentToken || '0xc99a6a985ed2cac1ef41640596c5a5f9f4e19ef5', // WETH
			startedAt: now,
			basePrice: ethers.parseEther(params.price).toString(),
			endedAt: expiredAt,
			endedPrice: ethers.parseEther(params.price).toString(),
			expectedState: '0',
			nonce: Date.now(),
			marketFeePercentage: 425, // 4.25%
		};

		const signature = await this.signOrder(order);

		// Submit to API
		const response = await this.httpClient.post('/v1/orders', {
			order,
			signature,
		});

		return {
			orderId: response.data.id,
			signature,
		};
	}

	/**
	 * Cancel listing (requires Ronin client)
	 */
	async cancelListing(listingId: string): Promise<{ success: boolean; txHash?: string }> {
		if (!this.roninClient) {
			throw new Error('Ronin client required for cancelling listings');
		}

		// Get listing details first
		const listing = await this.getListing(listingId);
		
		// Cancel on-chain
		// Note: This would interact with marketplace contract
		// Simplified implementation
		const response = await this.httpClient.delete(`/v1/orders/${listingId}`);
		
		return {
			success: true,
			txHash: response.data.txHash,
		};
	}

	/**
	 * Buy NFT (requires Ronin client)
	 */
	async buyNft(listingId: string): Promise<{
		success: boolean;
		txHash: string;
	}> {
		if (!this.roninClient) {
			throw new Error('Ronin client required for buying NFTs');
		}

		// Get listing details
		const listing = await this.getListing(listingId);
		
		// Execute purchase on-chain
		// Note: This would interact with marketplace contract
		// Simplified - would need actual contract interaction
		const response = await this.httpClient.post(`/v1/orders/${listingId}/buy`);
		
		return {
			success: true,
			txHash: response.data.txHash,
		};
	}

	/**
	 * Make offer on NFT
	 */
	async makeOffer(params: {
		contractAddress: string;
		tokenId: string;
		price: string;
		paymentToken?: string;
		expirationDays?: number;
	}): Promise<{ offerId: string }> {
		if (!this.roninClient) {
			throw new Error('Ronin client required for making offers');
		}

		const wallet = this.roninClient.getWallet();
		if (!wallet) {
			throw new Error('Wallet required for making offers');
		}

		const maker = await wallet.getAddress();
		const now = Math.floor(Date.now() / 1000);
		const expiredAt = now + (params.expirationDays || 7) * 24 * 60 * 60;

		const order: Order = {
			maker,
			kind: 0, // Buy order (offer)
			assets: [
				{
					erc: 721,
					addr: normalizeAddress(params.contractAddress),
					id: params.tokenId,
					quantity: '1',
				},
			],
			expiredAt,
			paymentToken: params.paymentToken || '0xc99a6a985ed2cac1ef41640596c5a5f9f4e19ef5', // WETH
			startedAt: now,
			basePrice: ethers.parseEther(params.price).toString(),
			endedAt: expiredAt,
			endedPrice: ethers.parseEther(params.price).toString(),
			expectedState: '0',
			nonce: Date.now(),
			marketFeePercentage: 425, // 4.25%
		};

		const signature = await this.signOrder(order);

		const response = await this.httpClient.post('/v1/offers', {
			order,
			signature,
		});

		return {
			offerId: response.data.id,
		};
	}
}

/**
 * Create marketplace client from n8n credentials
 */
export async function createMarketplaceClient(
	context: IExecuteFunctions | ILoadOptionsFunctions,
	roninClient?: RoninClient
): Promise<MarketplaceClient> {
	let apiKey: string | undefined;
	
	try {
		const credentials = await context.getCredentials('roninApi');
		apiKey = credentials.apiKey as string;
	} catch {
		// API key is optional
	}

	const client = new MarketplaceClient({ apiKey });
	
	if (roninClient) {
		client.setRoninClient(roninClient);
	}

	return client;
}
