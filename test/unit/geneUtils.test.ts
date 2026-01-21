/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import {
	isValidGene,
	decodeGenes,
	getAxieClass,
	calculatePurity,
} from '../../nodes/Ronin/utils/geneUtils';

describe('geneUtils', () => {
	// Sample gene strings for testing
	const validGene256 = '0x' + '1'.repeat(64);
	const validGene512 = '0x' + '1'.repeat(128);

	describe('isValidGene', () => {
		it('should return true for valid 256-bit gene', () => {
			expect(isValidGene(validGene256)).toBe(true);
		});

		it('should return true for valid 512-bit gene', () => {
			expect(isValidGene(validGene512)).toBe(true);
		});

		it('should return false for invalid gene', () => {
			expect(isValidGene('invalid')).toBe(false);
		});

		it('should return false for empty string', () => {
			expect(isValidGene('')).toBe(false);
		});
	});

	describe('getAxieClass', () => {
		it('should return a valid class string', () => {
			const result = getAxieClass(0);
			expect(typeof result).toBe('string');
		});
	});

	describe('decodeGenes', () => {
		it('should decode valid genes', () => {
			const result = decodeGenes(validGene256);
			expect(result).toBeDefined();
			expect(result.class).toBeDefined();
		});

		it('should handle invalid genes gracefully', () => {
			expect(() => decodeGenes('invalid')).not.toThrow();
		});
	});

	describe('calculatePurity', () => {
		it('should return a number between 0 and 100', () => {
			const decoded = decodeGenes(validGene256);
			const purity = calculatePurity(decoded);
			expect(purity).toBeGreaterThanOrEqual(0);
			expect(purity).toBeLessThanOrEqual(100);
		});
	});
});
