/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import { RONIN_MAINNET, SAIGON_TESTNET } from '../../nodes/Ronin/constants/networks';
import { MAINNET_CONTRACTS, TESTNET_CONTRACTS } from '../../nodes/Ronin/constants/contracts';
import { KNOWN_TOKENS } from '../../nodes/Ronin/constants/tokens';

describe('Ronin Node Integration', () => {
	describe('Network Configuration', () => {
		it('should have valid mainnet configuration', () => {
			expect(RONIN_MAINNET).toBeDefined();
			expect(RONIN_MAINNET.chainId).toBe(2020);
			expect(RONIN_MAINNET.rpcUrl).toContain('roninchain.com');
		});

		it('should have valid testnet configuration', () => {
			expect(SAIGON_TESTNET).toBeDefined();
			expect(SAIGON_TESTNET.chainId).toBe(2021);
			expect(SAIGON_TESTNET.rpcUrl).toContain('saigon');
		});
	});

	describe('Contract Addresses', () => {
		it('should have mainnet contract addresses', () => {
			expect(MAINNET_CONTRACTS).toBeDefined();
			expect(MAINNET_CONTRACTS.WRON).toBeDefined();
			expect(MAINNET_CONTRACTS.WETH).toBeDefined();
			expect(MAINNET_CONTRACTS.AXS).toBeDefined();
			expect(MAINNET_CONTRACTS.SLP).toBeDefined();
		});

		it('should have testnet contract addresses', () => {
			expect(TESTNET_CONTRACTS).toBeDefined();
		});

		it('should have valid address format', () => {
			const addressRegex = /^0x[a-fA-F0-9]{40}$/;
			expect(MAINNET_CONTRACTS.WRON).toMatch(addressRegex);
			expect(MAINNET_CONTRACTS.AXS).toMatch(addressRegex);
		});
	});

	describe('Token Configuration', () => {
		it('should have known tokens defined', () => {
			expect(KNOWN_TOKENS).toBeDefined();
			expect(Object.keys(KNOWN_TOKENS).length).toBeGreaterThan(0);
		});

		it('should have RON token', () => {
			expect(KNOWN_TOKENS.RON || KNOWN_TOKENS.WRON).toBeDefined();
		});

		it('should have AXS token', () => {
			expect(KNOWN_TOKENS.AXS).toBeDefined();
		});

		it('should have SLP token', () => {
			expect(KNOWN_TOKENS.SLP).toBeDefined();
		});
	});

	describe('Node Structure', () => {
		it('should export main node class', async () => {
			const { Ronin } = await import('../../nodes/Ronin/Ronin.node');
			expect(Ronin).toBeDefined();
		});

		it('should export trigger node class', async () => {
			const { RoninTrigger } = await import('../../nodes/Ronin/RoninTrigger.node');
			expect(RoninTrigger).toBeDefined();
		});
	});
});
