/**
 * Axie Infinity Game Data Constants
 * Includes classes, parts, body parts, and gene definitions
 */

/**
 * Axie Classes
 */
export const AXIE_CLASSES = [
	'beast',
	'bug',
	'bird',
	'plant',
	'aquatic',
	'reptile',
	'mech',
	'dawn',
	'dusk',
] as const;

export type AxieClass = typeof AXIE_CLASSES[number];

/**
 * Class Advantages (Rock-Paper-Scissors mechanics)
 */
export const CLASS_ADVANTAGES: Record<string, string[]> = {
	beast: ['plant', 'reptile', 'dusk'],
	bug: ['beast', 'mech', 'dawn'],
	bird: ['bug', 'aquatic', 'dawn'],
	plant: ['bird', 'aquatic', 'dawn'],
	aquatic: ['beast', 'bug', 'mech'],
	reptile: ['bird', 'plant', 'aquatic'],
	mech: ['beast', 'bug', 'bird'],
	dawn: ['plant', 'reptile', 'aquatic'],
	dusk: ['bug', 'bird', 'beast'],
};

/**
 * Body Parts
 */
export const BODY_PARTS = [
	'eyes',
	'ears',
	'back',
	'mouth',
	'horn',
	'tail',
] as const;

export type BodyPart = typeof BODY_PARTS[number];

/**
 * Part Genes Structure
 * Each body part has dominant, recessive1, and recessive2 genes
 */
export interface PartGenes {
	d: string;  // Dominant
	r1: string; // Recessive 1
	r2: string; // Recessive 2
}

/**
 * Axie Stats Base Values by Class
 */
export const BASE_STATS: Record<string, { hp: number; speed: number; skill: number; morale: number }> = {
	beast: { hp: 31, speed: 35, skill: 31, morale: 43 },
	bug: { hp: 35, speed: 31, skill: 35, morale: 39 },
	bird: { hp: 27, speed: 43, skill: 35, morale: 35 },
	plant: { hp: 43, speed: 31, skill: 31, morale: 35 },
	aquatic: { hp: 39, speed: 39, skill: 35, morale: 27 },
	reptile: { hp: 39, speed: 35, skill: 31, morale: 35 },
	mech: { hp: 31, speed: 39, skill: 43, morale: 27 },
	dawn: { hp: 35, speed: 35, skill: 39, morale: 31 },
	dusk: { hp: 43, speed: 27, skill: 35, morale: 35 },
};

/**
 * Part Stat Bonuses by Class
 */
export const PART_STAT_BONUS: Record<string, { hp: number; speed: number; skill: number; morale: number }> = {
	beast: { hp: 0, speed: 1, skill: 0, morale: 3 },
	bug: { hp: 1, speed: 0, skill: 0, morale: 3 },
	bird: { hp: 0, speed: 3, skill: 0, morale: 1 },
	plant: { hp: 3, speed: 0, skill: 0, morale: 1 },
	aquatic: { hp: 1, speed: 3, skill: 0, morale: 0 },
	reptile: { hp: 3, speed: 1, skill: 0, morale: 0 },
	mech: { hp: 1, speed: 0, skill: 3, morale: 0 },
	dawn: { hp: 0, speed: 0, skill: 3, morale: 1 },
	dusk: { hp: 3, speed: 0, skill: 1, morale: 0 },
};

/**
 * Breeding Cost Constants
 */
export const BREEDING_COSTS = {
	// AXS cost per breed (fixed)
	AXS_PER_BREED: 0.5,
	
	// SLP cost increases with breed count
	SLP_BY_BREED_COUNT: [
		900,   // Breed 1
		1350,  // Breed 2
		2250,  // Breed 3
		3600,  // Breed 4
		5850,  // Breed 5
		9450,  // Breed 6
		15300, // Breed 7 (max)
	],
	
	// Maximum breed count per Axie
	MAX_BREED_COUNT: 7,
};

/**
 * Arena Season Info
 */
export interface SeasonInfo {
	id: number;
	name: string;
	startTime: number;
	endTime: number;
}

/**
 * MMR Tiers
 */
export const MMR_TIERS = [
	{ name: 'Egg', minMmr: 0, maxMmr: 799 },
	{ name: 'Chick', minMmr: 800, maxMmr: 999 },
	{ name: 'Hare', minMmr: 1000, maxMmr: 1099 },
	{ name: 'Boar', minMmr: 1100, maxMmr: 1299 },
	{ name: 'Wolf', minMmr: 1300, maxMmr: 1499 },
	{ name: 'Bear', minMmr: 1500, maxMmr: 1799 },
	{ name: 'Tiger', minMmr: 1800, maxMmr: 2099 },
	{ name: 'Dragon', minMmr: 2100, maxMmr: 2399 },
	{ name: 'Challenger', minMmr: 2400, maxMmr: Infinity },
];

/**
 * Get MMR tier by rating
 */
export function getMmrTier(mmr: number): { name: string; minMmr: number; maxMmr: number } {
	for (const tier of MMR_TIERS) {
		if (mmr >= tier.minMmr && mmr <= tier.maxMmr) {
			return tier;
		}
	}
	return MMR_TIERS[0];
}

/**
 * Land Types in Lunacia
 */
export const LAND_TYPES = [
	'savannah',
	'forest',
	'arctic',
	'mystic',
	'genesis',
] as const;

export type LandType = typeof LAND_TYPES[number];

/**
 * Land Rarity by Type
 */
export const LAND_RARITY: Record<string, number> = {
	savannah: 1,
	forest: 2,
	arctic: 3,
	mystic: 4,
	genesis: 5,
};

/**
 * Axie Part Abilities (sample structure)
 */
export interface AxieAbility {
	id: string;
	name: string;
	class: AxieClass;
	bodyPart: BodyPart;
	damage: number;
	shield: number;
	energy: number;
	description: string;
}

/**
 * Gene Hex Positions
 * Helps decode the 256-bit gene string
 */
export const GENE_POSITIONS = {
	CLASS: { start: 0, length: 4 },
	REGION: { start: 4, length: 5 },
	TAG: { start: 9, length: 4 },
	BODY_SKIN: { start: 13, length: 4 },
	PATTERN: { start: 17, length: 6 },
	COLOR: { start: 23, length: 4 },
	EYES: { start: 27, length: 12 },
	MOUTH: { start: 39, length: 12 },
	EARS: { start: 51, length: 12 },
	HORN: { start: 63, length: 12 },
	BACK: { start: 75, length: 12 },
	TAIL: { start: 87, length: 12 },
};

/**
 * Class Hex Values
 */
export const CLASS_HEX: Record<string, string> = {
	'0000': 'beast',
	'0001': 'bug',
	'0010': 'bird',
	'0011': 'plant',
	'0100': 'aquatic',
	'0101': 'reptile',
	'1000': 'mech',
	'1001': 'dawn',
	'1010': 'dusk',
};
