/**
 * Axie Infinity Utilities
 * Helper functions for Axie operations
 */

import { BREEDING_COSTS, MMR_TIERS, CLASS_ADVANTAGES, AxieClass } from '../constants/axieData';
import { decodeGenes, calculateStats, calculatePurity, DecodedGenes, AxieStats } from './geneUtils';

/**
 * Axie data structure
 */
export interface Axie {
	id: string;
	name?: string;
	class: AxieClass;
	genes: string;
	bornAt: number;
	matronId: string;
	sireId: string;
	breedCount: number;
	owner: string;
	stage: number;
	image?: string;
}

/**
 * Breeding info structure
 */
export interface BreedingInfo {
	canBreed: boolean;
	axsCost: number;
	slpCost: number;
	totalCostUsd?: number;
	cooldownEnd?: number;
	reason?: string;
}

/**
 * Check if an Axie can breed
 * @param axie Axie to check
 * @returns Breeding eligibility info
 */
export function canBreed(axie: Axie): BreedingInfo {
	// Check breed count
	if (axie.breedCount >= BREEDING_COSTS.MAX_BREED_COUNT) {
		return {
			canBreed: false,
			axsCost: 0,
			slpCost: 0,
			reason: 'Maximum breed count reached (7)',
		};
	}
	
	// Check if adult (stage 4)
	if (axie.stage < 4) {
		return {
			canBreed: false,
			axsCost: 0,
			slpCost: 0,
			reason: 'Axie must be an adult to breed',
		};
	}
	
	// Calculate costs
	const slpCost = BREEDING_COSTS.SLP_BY_BREED_COUNT[axie.breedCount] || 0;
	const axsCost = BREEDING_COSTS.AXS_PER_BREED;
	
	return {
		canBreed: true,
		axsCost,
		slpCost,
	};
}

/**
 * Calculate breeding cost for two Axies
 * @param axie1 First parent
 * @param axie2 Second parent
 * @returns Total breeding cost
 */
export function calculateBreedingCost(
	axie1: Axie,
	axie2: Axie
): { axsCost: number; slpCost: number } {
	const slp1 = BREEDING_COSTS.SLP_BY_BREED_COUNT[axie1.breedCount] || 0;
	const slp2 = BREEDING_COSTS.SLP_BY_BREED_COUNT[axie2.breedCount] || 0;
	
	return {
		axsCost: BREEDING_COSTS.AXS_PER_BREED,
		slpCost: slp1 + slp2,
	};
}

/**
 * Check if two Axies can breed together
 * @param axie1 First parent
 * @param axie2 Second parent
 * @returns Whether they can breed and reason if not
 */
export function canBreedTogether(
	axie1: Axie,
	axie2: Axie
): { canBreed: boolean; reason?: string } {
	// Can't breed with self
	if (axie1.id === axie2.id) {
		return { canBreed: false, reason: 'Cannot breed Axie with itself' };
	}
	
	// Can't breed with direct family
	if (axie1.id === axie2.matronId || axie1.id === axie2.sireId) {
		return { canBreed: false, reason: 'Cannot breed with parent' };
	}
	
	if (axie2.id === axie1.matronId || axie2.id === axie1.sireId) {
		return { canBreed: false, reason: 'Cannot breed with parent' };
	}
	
	// Can't breed siblings
	if (
		axie1.matronId === axie2.matronId &&
		axie1.sireId === axie2.sireId &&
		axie1.matronId !== '0' &&
		axie1.sireId !== '0'
	) {
		return { canBreed: false, reason: 'Cannot breed siblings' };
	}
	
	// Check individual breed eligibility
	const breed1 = canBreed(axie1);
	if (!breed1.canBreed) {
		return { canBreed: false, reason: `Axie ${axie1.id}: ${breed1.reason}` };
	}
	
	const breed2 = canBreed(axie2);
	if (!breed2.canBreed) {
		return { canBreed: false, reason: `Axie ${axie2.id}: ${breed2.reason}` };
	}
	
	return { canBreed: true };
}

/**
 * Get Axie age in days
 * @param bornAt Birth timestamp
 * @returns Age in days
 */
export function getAxieAge(bornAt: number): number {
	const now = Math.floor(Date.now() / 1000);
	const ageSeconds = now - bornAt;
	return Math.floor(ageSeconds / (24 * 60 * 60));
}

/**
 * Get Axie stage name
 * @param stage Stage number
 * @returns Stage name
 */
export function getStageName(stage: number): string {
	const stages: Record<number, string> = {
		1: 'Egg',
		2: 'Larva',
		3: 'Petite',
		4: 'Adult',
	};
	return stages[stage] || 'Unknown';
}

/**
 * Calculate class advantage
 * @param attackerClass Attacker's class
 * @param defenderClass Defender's class
 * @returns Damage multiplier
 */
export function getClassAdvantage(
	attackerClass: AxieClass,
	defenderClass: AxieClass
): number {
	const advantages = CLASS_ADVANTAGES[attackerClass] || [];
	
	if (advantages.includes(defenderClass)) {
		return 1.15; // 15% bonus damage
	}
	
	// Check if defender has advantage
	const defenderAdvantages = CLASS_ADVANTAGES[defenderClass] || [];
	if (defenderAdvantages.includes(attackerClass)) {
		return 0.85; // 15% reduced damage
	}
	
	return 1.0; // Neutral
}

/**
 * Calculate win probability based on stats
 * @param axie1Stats Stats of first Axie team
 * @param axie2Stats Stats of second Axie team
 * @returns Win probability for team 1
 */
export function estimateWinProbability(
	axie1Stats: AxieStats,
	axie2Stats: AxieStats
): number {
	const score1 = 
		axie1Stats.hp * 1.0 + 
		axie1Stats.speed * 1.2 + 
		axie1Stats.skill * 1.1 + 
		axie1Stats.morale * 0.9;
	
	const score2 = 
		axie2Stats.hp * 1.0 + 
		axie2Stats.speed * 1.2 + 
		axie2Stats.skill * 1.1 + 
		axie2Stats.morale * 0.9;
	
	const total = score1 + score2;
	return total > 0 ? (score1 / total) * 100 : 50;
}

/**
 * Get MMR tier for ranking
 * @param mmr Match Making Rating
 * @returns Tier info
 */
export function getMmrTier(mmr: number): {
	name: string;
	minMmr: number;
	maxMmr: number;
	rank: number;
} {
	for (let i = 0; i < MMR_TIERS.length; i++) {
		const tier = MMR_TIERS[i];
		if (mmr >= tier.minMmr && mmr <= tier.maxMmr) {
			return { ...tier, rank: i + 1 };
		}
	}
	return { ...MMR_TIERS[0], rank: 1 };
}

/**
 * Calculate potential offspring stats range
 * @param parent1Genes Parent 1 decoded genes
 * @param parent2Genes Parent 2 decoded genes
 * @returns Min and max stats for offspring
 */
export function estimateOffspringStats(
	parent1Genes: DecodedGenes,
	parent2Genes: DecodedGenes
): { min: AxieStats; max: AxieStats; average: AxieStats } {
	// This is a simplified estimation
	const stats1 = calculateStats(parent1Genes);
	const stats2 = calculateStats(parent2Genes);
	
	return {
		min: {
			hp: Math.min(stats1.hp, stats2.hp) - 4,
			speed: Math.min(stats1.speed, stats2.speed) - 4,
			skill: Math.min(stats1.skill, stats2.skill) - 4,
			morale: Math.min(stats1.morale, stats2.morale) - 4,
		},
		max: {
			hp: Math.max(stats1.hp, stats2.hp) + 4,
			speed: Math.max(stats1.speed, stats2.speed) + 4,
			skill: Math.max(stats1.skill, stats2.skill) + 4,
			morale: Math.max(stats1.morale, stats2.morale) + 4,
		},
		average: {
			hp: Math.round((stats1.hp + stats2.hp) / 2),
			speed: Math.round((stats1.speed + stats2.speed) / 2),
			skill: Math.round((stats1.skill + stats2.skill) / 2),
			morale: Math.round((stats1.morale + stats2.morale) / 2),
		},
	};
}

/**
 * Get Axie image URL
 * @param axieId Axie ID
 * @returns Image URL
 */
export function getAxieImageUrl(axieId: string): string {
	return `https://axiecdn.axieinfinity.com/axies/${axieId}/axie/axie-full-transparent.png`;
}

/**
 * Get Axie marketplace URL
 * @param axieId Axie ID
 * @returns Marketplace URL
 */
export function getAxieMarketUrl(axieId: string): string {
	return `https://app.axieinfinity.com/marketplace/axies/${axieId}`;
}

/**
 * Format Axie for display
 * @param axie Axie data
 * @returns Formatted summary string
 */
export function formatAxieSummary(axie: Axie): string {
	const genes = decodeGenes(axie.genes);
	const stats = calculateStats(genes);
	const purity = calculatePurity(genes);
	const age = getAxieAge(axie.bornAt);
	
	return `
Axie #${axie.id}
Class: ${axie.class}
Stage: ${getStageName(axie.stage)}
Age: ${age} days
Breed Count: ${axie.breedCount}/7
Purity: ${purity.toFixed(1)}%
Stats: HP ${stats.hp} | Speed ${stats.speed} | Skill ${stats.skill} | Morale ${stats.morale}
	`.trim();
}

/**
 * Parse Axie ID from various formats
 * @param input Axie ID or URL
 * @returns Normalized Axie ID
 */
export function parseAxieId(input: string): string {
	// If it's a URL, extract the ID
	const urlMatch = input.match(/axies?[\/:](\d+)/i);
	if (urlMatch) {
		return urlMatch[1];
	}
	
	// If it's just a number (possibly with # prefix)
	const numMatch = input.match(/^#?(\d+)$/);
	if (numMatch) {
		return numMatch[1];
	}
	
	throw new Error(`Invalid Axie ID format: ${input}`);
}
