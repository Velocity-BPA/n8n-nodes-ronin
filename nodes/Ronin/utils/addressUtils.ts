/**
 * Ronin Address Utilities
 * Handle conversion between ronin: and 0x address formats
 */

import { ethers } from 'ethers';

/**
 * Ronin address prefix
 */
export const RONIN_PREFIX = 'ronin:';

/**
 * Check if address is in ronin: format
 */
export function isRoninFormat(address: string): boolean {
	return address.toLowerCase().startsWith(RONIN_PREFIX);
}

/**
 * Check if address is in 0x format
 */
export function isHexFormat(address: string): boolean {
	return address.toLowerCase().startsWith('0x');
}

/**
 * Convert ronin: address to 0x format
 * @param address Address in ronin: format
 * @returns Address in 0x format
 */
export function roninToHex(address: string): string {
	if (isHexFormat(address)) {
		return address.toLowerCase();
	}
	
	if (!isRoninFormat(address)) {
		throw new Error(`Invalid address format: ${address}. Expected ronin: or 0x prefix.`);
	}
	
	const hexAddress = '0x' + address.slice(RONIN_PREFIX.length);
	
	// Validate the resulting address
	if (!ethers.isAddress(hexAddress)) {
		throw new Error(`Invalid Ronin address: ${address}`);
	}
	
	return hexAddress.toLowerCase();
}

/**
 * Convert 0x address to ronin: format
 * @param address Address in 0x format
 * @returns Address in ronin: format
 */
export function hexToRonin(address: string): string {
	if (isRoninFormat(address)) {
		return address.toLowerCase();
	}
	
	if (!isHexFormat(address)) {
		throw new Error(`Invalid address format: ${address}. Expected ronin: or 0x prefix.`);
	}
	
	// Validate the address
	if (!ethers.isAddress(address)) {
		throw new Error(`Invalid Ethereum address: ${address}`);
	}
	
	return RONIN_PREFIX + address.slice(2).toLowerCase();
}

/**
 * Normalize address to 0x format (accepts both formats)
 * @param address Address in any format
 * @returns Address in 0x format (checksummed)
 */
export function normalizeAddress(address: string): string {
	const hexAddress = isRoninFormat(address) ? roninToHex(address) : address;
	
	if (!ethers.isAddress(hexAddress)) {
		throw new Error(`Invalid address: ${address}`);
	}
	
	return ethers.getAddress(hexAddress);
}

/**
 * Validate address (accepts both formats)
 * @param address Address to validate
 * @returns True if valid, false otherwise
 */
export function isValidAddress(address: string): boolean {
	try {
		const hexAddress = isRoninFormat(address) ? roninToHex(address) : address;
		return ethers.isAddress(hexAddress);
	} catch {
		return false;
	}
}

/**
 * Get checksummed address
 * @param address Address in any format
 * @returns Checksummed 0x address
 */
export function getChecksumAddress(address: string): string {
	const hexAddress = normalizeAddress(address);
	return ethers.getAddress(hexAddress);
}

/**
 * Compare two addresses (format-agnostic)
 * @param address1 First address
 * @param address2 Second address
 * @returns True if addresses are equal
 */
export function addressesEqual(address1: string, address2: string): boolean {
	try {
		const hex1 = normalizeAddress(address1).toLowerCase();
		const hex2 = normalizeAddress(address2).toLowerCase();
		return hex1 === hex2;
	} catch {
		return false;
	}
}

/**
 * Format address for display
 * @param address Address in any format
 * @param format Target format ('ronin' or 'hex')
 * @returns Formatted address
 */
export function formatAddress(address: string, format: 'ronin' | 'hex' = 'ronin'): string {
	const normalized = normalizeAddress(address);
	
	if (format === 'ronin') {
		return hexToRonin(normalized);
	}
	
	return normalized;
}

/**
 * Shorten address for display
 * @param address Address in any format
 * @param chars Number of characters to show at start/end
 * @returns Shortened address (e.g., "ronin:1234...5678")
 */
export function shortenAddress(address: string, chars: number = 4): string {
	const normalized = normalizeAddress(address);
	const prefix = normalized.slice(0, chars + 2); // Include 0x
	const suffix = normalized.slice(-chars);
	return `${prefix}...${suffix}`;
}

/**
 * Generate a new wallet address
 * @returns Object with address in both formats and private key
 */
export function generateWallet(): {
	address: string;
	roninAddress: string;
	privateKey: string;
} {
	const wallet = ethers.Wallet.createRandom();
	return {
		address: wallet.address,
		roninAddress: hexToRonin(wallet.address),
		privateKey: wallet.privateKey,
	};
}

/**
 * Derive address from private key
 * @param privateKey Private key
 * @returns Object with addresses in both formats
 */
export function deriveAddressFromPrivateKey(privateKey: string): {
	address: string;
	roninAddress: string;
} {
	const wallet = new ethers.Wallet(privateKey);
	return {
		address: wallet.address,
		roninAddress: hexToRonin(wallet.address),
	};
}

/**
 * Check if address is a contract (requires provider)
 * @param address Address to check
 * @param provider Ethers provider
 * @returns True if address is a contract
 */
export async function isContract(
	address: string,
	provider: ethers.Provider
): Promise<boolean> {
	const code = await provider.getCode(normalizeAddress(address));
	return code !== '0x';
}

/**
 * Zero address constant
 */
export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
export const ZERO_RONIN_ADDRESS = 'ronin:0000000000000000000000000000000000000000';
