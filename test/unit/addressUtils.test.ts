/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import {
	isRoninAddress,
	isHexAddress,
	roninToHex,
	hexToRonin,
	normalizeAddress,
	validateAddress,
} from '../../nodes/Ronin/utils/addressUtils';

describe('addressUtils', () => {
	const validRoninAddress = 'ronin:1234567890abcdef1234567890abcdef12345678';
	const validHexAddress = '0x1234567890abcdef1234567890abcdef12345678';
	const invalidAddress = 'invalid-address';

	describe('isRoninAddress', () => {
		it('should return true for valid ronin addresses', () => {
			expect(isRoninAddress(validRoninAddress)).toBe(true);
		});

		it('should return false for hex addresses', () => {
			expect(isRoninAddress(validHexAddress)).toBe(false);
		});

		it('should return false for invalid addresses', () => {
			expect(isRoninAddress(invalidAddress)).toBe(false);
		});
	});

	describe('isHexAddress', () => {
		it('should return true for valid hex addresses', () => {
			expect(isHexAddress(validHexAddress)).toBe(true);
		});

		it('should return false for ronin addresses', () => {
			expect(isHexAddress(validRoninAddress)).toBe(false);
		});

		it('should return false for invalid addresses', () => {
			expect(isHexAddress(invalidAddress)).toBe(false);
		});
	});

	describe('roninToHex', () => {
		it('should convert ronin address to hex', () => {
			const result = roninToHex(validRoninAddress);
			expect(result).toBe(validHexAddress);
		});

		it('should return hex address unchanged', () => {
			const result = roninToHex(validHexAddress);
			expect(result).toBe(validHexAddress);
		});
	});

	describe('hexToRonin', () => {
		it('should convert hex address to ronin', () => {
			const result = hexToRonin(validHexAddress);
			expect(result).toBe(validRoninAddress);
		});

		it('should return ronin address unchanged', () => {
			const result = hexToRonin(validRoninAddress);
			expect(result).toBe(validRoninAddress);
		});
	});

	describe('normalizeAddress', () => {
		it('should normalize ronin address to hex', () => {
			const result = normalizeAddress(validRoninAddress);
			expect(result.startsWith('0x')).toBe(true);
		});

		it('should keep hex address as hex', () => {
			const result = normalizeAddress(validHexAddress);
			expect(result.startsWith('0x')).toBe(true);
		});
	});

	describe('validateAddress', () => {
		it('should return valid for correct ronin address', () => {
			const result = validateAddress(validRoninAddress);
			expect(result.valid).toBe(true);
		});

		it('should return valid for correct hex address', () => {
			const result = validateAddress(validHexAddress);
			expect(result.valid).toBe(true);
		});

		it('should return invalid for incorrect address', () => {
			const result = validateAddress(invalidAddress);
			expect(result.valid).toBe(false);
		});
	});
});
