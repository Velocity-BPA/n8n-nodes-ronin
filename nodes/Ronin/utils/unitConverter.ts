/**
 * Unit Conversion Utilities for Ronin
 * Handle conversion between wei, gwei, RON, and other denominations
 */

import { ethers } from 'ethers';

/**
 * Unit denominations
 */
export const UNITS = {
	wei: 0,
	kwei: 3,
	mwei: 6,
	gwei: 9,
	szabo: 12,
	finney: 15,
	ether: 18,
	ron: 18, // RON uses same decimals as ETH
} as const;

export type Unit = keyof typeof UNITS;

/**
 * Convert from wei to RON
 * @param wei Amount in wei (string or bigint)
 * @returns Amount in RON as string
 */
export function weiToRon(wei: string | bigint): string {
	return ethers.formatEther(wei);
}

/**
 * Convert from RON to wei
 * @param ron Amount in RON
 * @returns Amount in wei as bigint
 */
export function ronToWei(ron: string | number): bigint {
	return ethers.parseEther(ron.toString());
}

/**
 * Convert from wei to gwei
 * @param wei Amount in wei
 * @returns Amount in gwei as string
 */
export function weiToGwei(wei: string | bigint): string {
	return ethers.formatUnits(wei, 'gwei');
}

/**
 * Convert from gwei to wei
 * @param gwei Amount in gwei
 * @returns Amount in wei as bigint
 */
export function gweiToWei(gwei: string | number): bigint {
	return ethers.parseUnits(gwei.toString(), 'gwei');
}

/**
 * Format units with custom decimals
 * @param value Value in smallest unit
 * @param decimals Number of decimals
 * @returns Formatted value as string
 */
export function formatUnits(value: string | bigint, decimals: number): string {
	return ethers.formatUnits(value, decimals);
}

/**
 * Parse units with custom decimals
 * @param value Value in human-readable format
 * @param decimals Number of decimals
 * @returns Value in smallest unit as bigint
 */
export function parseUnits(value: string | number, decimals: number): bigint {
	return ethers.parseUnits(value.toString(), decimals);
}

/**
 * Format RON balance for display
 * @param wei Balance in wei
 * @param precision Decimal places to show
 * @returns Formatted balance string
 */
export function formatRonBalance(wei: string | bigint, precision: number = 4): string {
	const ron = weiToRon(wei);
	const num = parseFloat(ron);
	return num.toFixed(precision);
}

/**
 * Format token balance based on decimals
 * @param balance Raw balance
 * @param decimals Token decimals
 * @param precision Display precision
 * @returns Formatted balance string
 */
export function formatTokenBalance(
	balance: string | bigint,
	decimals: number,
	precision: number = 4
): string {
	const formatted = formatUnits(balance, decimals);
	const num = parseFloat(formatted);
	return num.toFixed(precision);
}

/**
 * Convert between units
 * @param value Value to convert
 * @param fromUnit Source unit
 * @param toUnit Target unit
 * @returns Converted value as string
 */
export function convertUnits(
	value: string | number,
	fromUnit: Unit,
	toUnit: Unit
): string {
	const fromDecimals = UNITS[fromUnit];
	const toDecimals = UNITS[toUnit];
	
	// Convert to wei first
	const wei = ethers.parseUnits(value.toString(), fromDecimals);
	
	// Convert from wei to target unit
	return ethers.formatUnits(wei, toDecimals);
}

/**
 * Parse gas price string
 * @param gasPrice Gas price string (can include unit suffix)
 * @returns Gas price in wei as bigint
 */
export function parseGasPrice(gasPrice: string): bigint {
	const lowerPrice = gasPrice.toLowerCase().trim();
	
	if (lowerPrice.endsWith('gwei')) {
		const value = lowerPrice.replace('gwei', '').trim();
		return gweiToWei(value);
	}
	
	if (lowerPrice.endsWith('wei')) {
		const value = lowerPrice.replace('wei', '').trim();
		return BigInt(value);
	}
	
	// Assume gwei if no unit specified
	return gweiToWei(gasPrice);
}

/**
 * Format gas price for display
 * @param wei Gas price in wei
 * @returns Formatted gas price string with unit
 */
export function formatGasPrice(wei: string | bigint): string {
	const gwei = weiToGwei(wei);
	return `${parseFloat(gwei).toFixed(2)} gwei`;
}

/**
 * Calculate transaction fee
 * @param gasLimit Gas limit
 * @param gasPrice Gas price in wei
 * @returns Transaction fee in RON
 */
export function calculateTxFee(
	gasLimit: string | bigint,
	gasPrice: string | bigint
): string {
	const fee = BigInt(gasLimit) * BigInt(gasPrice);
	return weiToRon(fee);
}

/**
 * Check if value is valid number string
 * @param value Value to check
 * @returns True if valid number
 */
export function isValidNumber(value: string): boolean {
	try {
		const num = parseFloat(value);
		return !isNaN(num) && isFinite(num);
	} catch {
		return false;
	}
}

/**
 * Safe BigInt conversion
 * @param value Value to convert
 * @returns BigInt value or 0n if invalid
 */
export function safeBigInt(value: string | number | bigint): bigint {
	try {
		if (typeof value === 'bigint') return value;
		if (typeof value === 'number') return BigInt(Math.floor(value));
		return BigInt(value);
	} catch {
		return BigInt(0);
	}
}

/**
 * Format large numbers with commas
 * @param value Number to format
 * @returns Formatted string with commas
 */
export function formatWithCommas(value: string | number): string {
	const parts = value.toString().split('.');
	parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
	return parts.join('.');
}

/**
 * Format USD value
 * @param value USD value
 * @param precision Decimal places
 * @returns Formatted USD string
 */
export function formatUsd(value: number, precision: number = 2): string {
	return `$${formatWithCommas(value.toFixed(precision))}`;
}

/**
 * Calculate percentage
 * @param value Current value
 * @param total Total value
 * @param precision Decimal places
 * @returns Percentage string
 */
export function calculatePercentage(
	value: number,
	total: number,
	precision: number = 2
): string {
	if (total === 0) return '0';
	const percentage = (value / total) * 100;
	return percentage.toFixed(precision);
}

/**
 * SLP token doesn't use decimals (0 decimals)
 */
export function formatSlp(amount: string | bigint): string {
	return amount.toString();
}

/**
 * Parse SLP amount (no decimals)
 */
export function parseSlp(amount: string | number): bigint {
	return BigInt(Math.floor(Number(amount)));
}
