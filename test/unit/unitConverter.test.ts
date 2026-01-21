/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import {
	weiToRon,
	ronToWei,
	formatUnits,
	parseUnits,
	weiToEther,
	etherToWei,
} from '../../nodes/Ronin/utils/unitConverter';

describe('unitConverter', () => {
	describe('weiToRon', () => {
		it('should convert wei to RON', () => {
			const result = weiToRon('1000000000000000000');
			expect(result).toBe('1.0');
		});

		it('should handle zero', () => {
			const result = weiToRon('0');
			expect(result).toBe('0.0');
		});

		it('should handle large numbers', () => {
			const result = weiToRon('1000000000000000000000');
			expect(result).toBe('1000.0');
		});
	});

	describe('ronToWei', () => {
		it('should convert RON to wei', () => {
			const result = ronToWei('1');
			expect(result.toString()).toBe('1000000000000000000');
		});

		it('should handle decimal values', () => {
			const result = ronToWei('0.5');
			expect(result.toString()).toBe('500000000000000000');
		});

		it('should handle zero', () => {
			const result = ronToWei('0');
			expect(result.toString()).toBe('0');
		});
	});

	describe('formatUnits', () => {
		it('should format with 18 decimals by default', () => {
			const result = formatUnits('1000000000000000000');
			expect(result).toBe('1.0');
		});

		it('should format with custom decimals', () => {
			const result = formatUnits('1000000', 6);
			expect(result).toBe('1.0');
		});

		it('should handle SLP (0 decimals)', () => {
			const result = formatUnits('100', 0);
			expect(result).toBe('100');
		});
	});

	describe('parseUnits', () => {
		it('should parse with 18 decimals by default', () => {
			const result = parseUnits('1');
			expect(result.toString()).toBe('1000000000000000000');
		});

		it('should parse with custom decimals', () => {
			const result = parseUnits('1', 6);
			expect(result.toString()).toBe('1000000');
		});
	});

	describe('weiToEther', () => {
		it('should convert wei to ether', () => {
			const result = weiToEther('1000000000000000000');
			expect(result).toBe('1.0');
		});
	});

	describe('etherToWei', () => {
		it('should convert ether to wei', () => {
			const result = etherToWei('1');
			expect(result.toString()).toBe('1000000000000000000');
		});
	});
});
