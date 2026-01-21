/**
 * Axie Gene Decoding Utilities
 * Parse and decode Axie Infinity gene strings
 */

import { 
	AXIE_CLASSES, 
	AxieClass, 
	BODY_PARTS, 
	BodyPart, 
	BASE_STATS, 
	PART_STAT_BONUS,
	CLASS_HEX 
} from '../constants/axieData';

/**
 * Gene structure for an Axie part
 */
export interface PartGene {
	d: { id: string; name: string; class: string }; // Dominant
	r1: { id: string; name: string; class: string }; // Recessive 1
	r2: { id: string; name: string; class: string }; // Recessive 2
}

/**
 * Decoded Axie genes structure
 */
export interface DecodedGenes {
	class: AxieClass;
	region: string;
	tag: string;
	bodySkin: string;
	pattern: { d: string; r1: string; r2: string };
	color: { d: string; r1: string; r2: string };
	eyes: PartGene;
	ears: PartGene;
	mouth: PartGene;
	horn: PartGene;
	back: PartGene;
	tail: PartGene;
}

/**
 * Axie stats structure
 */
export interface AxieStats {
	hp: number;
	speed: number;
	skill: number;
	morale: number;
}

/**
 * Convert hex gene string to binary
 * @param hexGene Hex gene string (256-bit)
 * @returns Binary string
 */
export function hexToBinary(hexGene: string): string {
	// Remove 0x prefix if present
	const cleanHex = hexGene.startsWith('0x') ? hexGene.slice(2) : hexGene;
	
	// Convert each hex character to 4-bit binary
	let binary = '';
	for (const char of cleanHex) {
		binary += parseInt(char, 16).toString(2).padStart(4, '0');
	}
	
	return binary.padStart(256, '0');
}

/**
 * Get class from binary gene
 * @param binaryGene Binary gene string
 * @returns Axie class
 */
export function getClassFromGene(binaryGene: string): AxieClass {
	const classBits = binaryGene.slice(0, 4);
	const className = CLASS_HEX[classBits];
	
	if (!className || !AXIE_CLASSES.includes(className as AxieClass)) {
		return 'beast'; // Default fallback
	}
	
	return className as AxieClass;
}

/**
 * Decode gene part from binary
 * @param partBinary Binary string for part (12 bits)
 * @returns Part gene info
 */
function decodePartGene(partBinary: string): PartGene {
	// Each part has 4 bits for class and 6 bits for part ID
	// Repeated 3 times for d, r1, r2
	
	const decodePart = (bits: string) => {
		const classBits = bits.slice(0, 4);
		const partIdBits = bits.slice(4, 10);
		
		const partClass = CLASS_HEX[classBits] || 'unknown';
		const partId = parseInt(partIdBits, 2).toString();
		
		return {
			id: partId,
			name: `part-${partId}`,
			class: partClass,
		};
	};
	
	return {
		d: decodePart(partBinary.slice(0, 12)),
		r1: decodePart(partBinary.slice(12, 24)),
		r2: decodePart(partBinary.slice(24, 36)),
	};
}

/**
 * Decode full Axie genes
 * @param geneHex Hex gene string (256-bit)
 * @returns Decoded genes object
 */
export function decodeGenes(geneHex: string): DecodedGenes {
	const binary = hexToBinary(geneHex);
	
	// Class (bits 0-3)
	const axieClass = getClassFromGene(binary);
	
	// Region (bits 4-8)
	const region = parseInt(binary.slice(4, 9), 2).toString();
	
	// Tag (bits 9-12)
	const tag = parseInt(binary.slice(9, 13), 2).toString();
	
	// Body skin (bits 13-16)
	const bodySkin = parseInt(binary.slice(13, 17), 2).toString();
	
	// Pattern (bits 17-22) - d, r1, r2
	const pattern = {
		d: parseInt(binary.slice(17, 23), 2).toString(),
		r1: parseInt(binary.slice(23, 29), 2).toString(),
		r2: parseInt(binary.slice(29, 35), 2).toString(),
	};
	
	// Color (bits 35-50) - d, r1, r2
	const color = {
		d: parseInt(binary.slice(35, 41), 2).toString(),
		r1: parseInt(binary.slice(41, 47), 2).toString(),
		r2: parseInt(binary.slice(47, 53), 2).toString(),
	};
	
	// Body parts start at bit 64
	let offset = 64;
	const partSize = 36; // 12 bits x 3 (d, r1, r2)
	
	const eyes = decodePartGene(binary.slice(offset, offset + partSize));
	offset += partSize;
	
	const mouth = decodePartGene(binary.slice(offset, offset + partSize));
	offset += partSize;
	
	const ears = decodePartGene(binary.slice(offset, offset + partSize));
	offset += partSize;
	
	const horn = decodePartGene(binary.slice(offset, offset + partSize));
	offset += partSize;
	
	const back = decodePartGene(binary.slice(offset, offset + partSize));
	offset += partSize;
	
	const tail = decodePartGene(binary.slice(offset, offset + partSize));
	
	return {
		class: axieClass,
		region,
		tag,
		bodySkin,
		pattern,
		color,
		eyes,
		ears,
		mouth,
		horn,
		back,
		tail,
	};
}

/**
 * Calculate Axie stats based on genes
 * @param genes Decoded genes
 * @returns Calculated stats
 */
export function calculateStats(genes: DecodedGenes): AxieStats {
	// Start with base stats for the class
	const baseStats = BASE_STATS[genes.class] || BASE_STATS.beast;
	
	const stats: AxieStats = {
		hp: baseStats.hp,
		speed: baseStats.speed,
		skill: baseStats.skill,
		morale: baseStats.morale,
	};
	
	// Add bonuses for each part based on part class
	const parts: BodyPart[] = ['eyes', 'ears', 'mouth', 'horn', 'back', 'tail'];
	
	for (const part of parts) {
		const partGene = genes[part];
		if (partGene && partGene.d) {
			const partClass = partGene.d.class;
			const bonus = PART_STAT_BONUS[partClass] || { hp: 0, speed: 0, skill: 0, morale: 0 };
			
			stats.hp += bonus.hp;
			stats.speed += bonus.speed;
			stats.skill += bonus.skill;
			stats.morale += bonus.morale;
		}
	}
	
	return stats;
}

/**
 * Calculate gene purity
 * Returns percentage of parts that match the Axie's class
 * @param genes Decoded genes
 * @returns Purity percentage (0-100)
 */
export function calculatePurity(genes: DecodedGenes): number {
	const axieClass = genes.class;
	let matchingParts = 0;
	const totalParts = 6;
	
	const parts: BodyPart[] = ['eyes', 'ears', 'mouth', 'horn', 'back', 'tail'];
	
	for (const part of parts) {
		const partGene = genes[part];
		if (partGene && partGene.d && partGene.d.class === axieClass) {
			matchingParts++;
		}
	}
	
	return (matchingParts / totalParts) * 100;
}

/**
 * Get dominant parts from genes
 * @param genes Decoded genes
 * @returns Array of dominant part info
 */
export function getDominantParts(genes: DecodedGenes): Array<{
	part: BodyPart;
	id: string;
	class: string;
}> {
	const parts: BodyPart[] = ['eyes', 'ears', 'mouth', 'horn', 'back', 'tail'];
	
	return parts.map((part) => ({
		part,
		id: genes[part].d.id,
		class: genes[part].d.class,
	}));
}

/**
 * Check if genes are valid
 * @param geneHex Hex gene string
 * @returns True if valid
 */
export function isValidGene(geneHex: string): boolean {
	try {
		// Remove 0x prefix if present
		const cleanHex = geneHex.startsWith('0x') ? geneHex.slice(2) : geneHex;
		
		// Should be 64 hex characters (256 bits)
		if (cleanHex.length !== 64) {
			return false;
		}
		
		// Should only contain valid hex characters
		if (!/^[0-9a-fA-F]+$/.test(cleanHex)) {
			return false;
		}
		
		// Try to decode
		decodeGenes(geneHex);
		return true;
	} catch {
		return false;
	}
}

/**
 * Calculate breeding probability for offspring trait
 * @param parent1Gene Part gene from parent 1
 * @param parent2Gene Part gene from parent 2
 * @returns Probability map for each possible gene
 */
export function calculateBreedingProbability(
	parent1Gene: PartGene,
	parent2Gene: PartGene
): Map<string, number> {
	const probabilities = new Map<string, number>();
	
	// Dominant has 37.5% chance from each parent
	// R1 has 9.375% chance from each parent
	// R2 has 3.125% chance from each parent
	
	const weights = {
		d: 0.375,
		r1: 0.09375,
		r2: 0.03125,
	};
	
	const allGenes = [
		{ gene: parent1Gene.d, weight: weights.d },
		{ gene: parent1Gene.r1, weight: weights.r1 },
		{ gene: parent1Gene.r2, weight: weights.r2 },
		{ gene: parent2Gene.d, weight: weights.d },
		{ gene: parent2Gene.r1, weight: weights.r1 },
		{ gene: parent2Gene.r2, weight: weights.r2 },
	];
	
	for (const { gene, weight } of allGenes) {
		const key = `${gene.class}-${gene.id}`;
		const currentProb = probabilities.get(key) || 0;
		probabilities.set(key, currentProb + weight);
	}
	
	return probabilities;
}

/**
 * Format genes for display
 * @param genes Decoded genes
 * @returns Formatted string
 */
export function formatGenesForDisplay(genes: DecodedGenes): string {
	const parts = getDominantParts(genes);
	const partStrings = parts.map((p) => `${p.part}: ${p.class}`);
	
	return `Class: ${genes.class}\nParts:\n${partStrings.join('\n')}`;
}
