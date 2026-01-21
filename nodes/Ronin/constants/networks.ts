/**
 * Ronin Network Configuration Constants
 * Includes mainnet and testnet configurations
 */

export interface NetworkConfig {
	name: string;
	chainId: number;
	rpcUrl: string;
	wssUrl: string;
	explorerUrl: string;
	explorerApiUrl: string;
	bridgeUrl: string;
	explorer: string; // Alias for explorerUrl
	nativeCurrency: {
		name: string;
		symbol: string;
		decimals: number;
	};
}

export const RONIN_MAINNET: NetworkConfig = {
	name: 'Ronin Mainnet',
	chainId: 2020,
	rpcUrl: 'https://api.roninchain.com/rpc',
	wssUrl: 'wss://api.roninchain.com/ws',
	explorerUrl: 'https://app.roninchain.com',
	explorerApiUrl: 'https://api.roninchain.com',
	bridgeUrl: 'https://bridge.roninchain.com',
	explorer: 'https://app.roninchain.com',
	nativeCurrency: {
		name: 'RON',
		symbol: 'RON',
		decimals: 18,
	},
};

export const SAIGON_TESTNET: NetworkConfig = {
	name: 'Saigon Testnet',
	chainId: 2021,
	rpcUrl: 'https://saigon-testnet.roninchain.com/rpc',
	wssUrl: 'wss://saigon-testnet.roninchain.com/ws',
	explorerUrl: 'https://saigon-app.roninchain.com',
	explorerApiUrl: 'https://saigon-testnet.roninchain.com',
	bridgeUrl: 'https://saigon-bridge.roninchain.com',
	explorer: 'https://saigon-app.roninchain.com',
	nativeCurrency: {
		name: 'RON',
		symbol: 'RON',
		decimals: 18,
	},
};

export const NETWORKS: Record<string, NetworkConfig> = {
	mainnet: RONIN_MAINNET,
	testnet: SAIGON_TESTNET,
};

// Aliases for backward compatibility
export const MAINNET = RONIN_MAINNET;
export const TESTNET = SAIGON_TESTNET;

/**
 * API Endpoints
 */
export const API_ENDPOINTS = {
	// Skynet REST API
	SKYNET_MAINNET: 'https://api-gateway.skymavis.com',
	SKYNET_TESTNET: 'https://api-gateway.skymavis.com/testnet',
	
	// GraphQL endpoints
	GRAPHQL_MAINNET: 'https://graphql-gateway.axieinfinity.com/graphql',
	GRAPHQL_TESTNET: 'https://graphql-gateway-testnet.skymavis.com/graphql',
	
	// Marketplace API
	MARKETPLACE_MAINNET: 'https://marketplace-api.skymavis.com',
	MARKETPLACE_TESTNET: 'https://marketplace-api-testnet.skymavis.com',
	
	// Mavis Hub
	MAVIS_HUB: 'https://hub.skymavis.com/api',
	
	// Game APIs
	AXIE_API: 'https://game-api.axie.technology/api/v1',
	AXIE_GRAPHQL: 'https://graphql-gateway.axieinfinity.com/graphql',
};

/**
 * Get network configuration by name
 */
export function getNetworkConfig(network: string): NetworkConfig {
	const config = NETWORKS[network];
	if (!config) {
		throw new Error(`Unknown network: ${network}. Supported networks: ${Object.keys(NETWORKS).join(', ')}`);
	}
	return config;
}

/**
 * Get RPC URL for a network
 */
export function getRpcUrl(network: string, customUrl?: string): string {
	if (network === 'custom' && customUrl) {
		return customUrl;
	}
	return getNetworkConfig(network).rpcUrl;
}

/**
 * Get Chain ID for a network
 */
export function getChainId(network: string): number {
	return getNetworkConfig(network).chainId;
}
