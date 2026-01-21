/**
 * Ronin Token Definitions and Utilities
 */

export interface TokenInfo {
	symbol: string;
	name: string;
	decimals: number;
	address: string;
	logoUri?: string;
	isNative?: boolean;
}

/**
 * Mainnet Token Definitions
 */
export const MAINNET_TOKENS: Record<string, TokenInfo> = {
	RON: {
		symbol: 'RON',
		name: 'Ronin',
		decimals: 18,
		address: '0x0000000000000000000000000000000000000000',
		isNative: true,
	},
	WRON: {
		symbol: 'WRON',
		name: 'Wrapped RON',
		decimals: 18,
		address: '0xe514d9deb7966c8be0ca922de8a064264ea6bcd4',
	},
	WETH: {
		symbol: 'WETH',
		name: 'Wrapped Ether',
		decimals: 18,
		address: '0xc99a6a985ed2cac1ef41640596c5a5f9f4e19ef5',
	},
	AXS: {
		symbol: 'AXS',
		name: 'Axie Infinity Shard',
		decimals: 18,
		address: '0x97a9107c1793bc407d6f527b77e7fff4d812bece',
	},
	SLP: {
		symbol: 'SLP',
		name: 'Smooth Love Potion',
		decimals: 0,
		address: '0xa8754b9fa15fc18bb59458815510e40a12cd2014',
	},
	USDC: {
		symbol: 'USDC',
		name: 'USD Coin',
		decimals: 6,
		address: '0x0b7007c13325c48911f73a2dad5fa5dcbf808adc',
	},
	PIXEL: {
		symbol: 'PIXEL',
		name: 'Pixels',
		decimals: 18,
		address: '0x7eae20d11ef8c779433eb24503def900b9d28ad7',
	},
	APRS: {
		symbol: 'APRS',
		name: 'Apeiron',
		decimals: 18,
		address: '0x875e6adc48ca8cc0dd26a2efc1babb8c4ba40b0e',
	},
	AGG: {
		symbol: 'AGG',
		name: 'Aggregator',
		decimals: 18,
		address: '0x24a5a0a4b441e54bd16c81e9d54c3d40e8e00e05',
	},
};

/**
 * Testnet Token Definitions
 */
export const TESTNET_TOKENS: Record<string, TokenInfo> = {
	RON: {
		symbol: 'RON',
		name: 'Ronin (Testnet)',
		decimals: 18,
		address: '0x0000000000000000000000000000000000000000',
		isNative: true,
	},
	WRON: {
		symbol: 'WRON',
		name: 'Wrapped RON (Testnet)',
		decimals: 18,
		address: '0xa959726154953bae111746e265e6d754f48570e6',
	},
	WETH: {
		symbol: 'WETH',
		name: 'Wrapped Ether (Testnet)',
		decimals: 18,
		address: '0x29c6f8349a028e1bdfc68bfa08bdee7bc5d47e16',
	},
	AXS: {
		symbol: 'AXS',
		name: 'Axie Infinity Shard (Testnet)',
		decimals: 18,
		address: '0x3c4e17b9056272ce1b49f6900d8cfd6171a1869d',
	},
	SLP: {
		symbol: 'SLP',
		name: 'Smooth Love Potion (Testnet)',
		decimals: 0,
		address: '0x82f5483623d636bc3deba8ae67e1751b098254d4',
	},
	USDC: {
		symbol: 'USDC',
		name: 'USD Coin (Testnet)',
		decimals: 6,
		address: '0x067fbff8990c58ab90bae3c97241c5d736053f77',
	},
};

export const TOKENS: Record<string, Record<string, TokenInfo>> = {
	mainnet: MAINNET_TOKENS,
	testnet: TESTNET_TOKENS,
};

/**
 * Get token info by symbol
 */
export function getToken(network: string, symbol: string): TokenInfo | undefined {
	const networkTokens = TOKENS[network];
	if (!networkTokens) {
		return undefined;
	}
	return networkTokens[symbol.toUpperCase()];
}

/**
 * Get token by address
 */
export function getTokenByAddress(network: string, address: string): TokenInfo | undefined {
	const networkTokens = TOKENS[network];
	if (!networkTokens) {
		return undefined;
	}
	const normalizedAddress = address.toLowerCase();
	return Object.values(networkTokens).find(
		(token) => token.address.toLowerCase() === normalizedAddress
	);
}

/**
 * Get all tokens for a network
 */
export function getAllTokens(network: string): TokenInfo[] {
	const networkTokens = TOKENS[network];
	if (!networkTokens) {
		return [];
	}
	return Object.values(networkTokens);
}

/**
 * Popular trading pairs on Katana
 */
export const KATANA_PAIRS = [
	{ tokenA: 'RON', tokenB: 'WETH' },
	{ tokenA: 'RON', tokenB: 'AXS' },
	{ tokenA: 'RON', tokenB: 'SLP' },
	{ tokenA: 'RON', tokenB: 'USDC' },
	{ tokenA: 'WETH', tokenB: 'AXS' },
	{ tokenA: 'WETH', tokenB: 'SLP' },
	{ tokenA: 'WETH', tokenB: 'USDC' },
	{ tokenA: 'AXS', tokenB: 'SLP' },
];

/**
 * Token list for dropdowns
 */
export const TOKEN_LIST = [
	{ name: 'RON', symbol: 'RON', value: 'RON', address: '0x0000000000000000000000000000000000000000' },
	{ name: 'Wrapped RON', symbol: 'WRON', value: 'WRON', address: '0xe514d9deb7966c8be0ca922de8a064264ea6bcd4' },
	{ name: 'Wrapped Ether', symbol: 'WETH', value: 'WETH', address: '0xc99a6a985ed2cac1ef41640596c5a5f9f4e19ef5' },
	{ name: 'Axie Infinity Shards', symbol: 'AXS', value: 'AXS', address: '0x97a9107c1793bc407d6f527b77e7fff4d812bece' },
	{ name: 'Smooth Love Potion', symbol: 'SLP', value: 'SLP', address: '0xa8754b9fa15fc18bb59458815510e40a12cd2014' },
	{ name: 'USD Coin', symbol: 'USDC', value: 'USDC', address: '0x0b7007c13325c48911f73a2dad5fa5dcbf808adc' },
	{ name: 'Pixels', symbol: 'PIXEL', value: 'PIXEL', address: '0x7eae20d11ef8c779433eb24503def900b9d28ad7' },
	{ name: 'Apeiron', symbol: 'APRS', value: 'APRS', address: '0x875e6adc48ca8cc0dd26a2efc1babb8c4ba40b0e' },
	{ name: 'Custom Token', symbol: 'CUSTOM', value: 'custom', address: '' },
];

/**
 * Trading pairs alias
 */
export const TRADING_PAIRS = KATANA_PAIRS;
