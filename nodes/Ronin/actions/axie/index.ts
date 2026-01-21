import { INodeProperties, IExecuteFunctions } from 'n8n-workflow';
import { createSkynetClient } from '../../transport/skynetApi';
import { normalizeAddress, hexToRonin } from '../../utils/addressUtils';
import { decodeGenes, calculateStats, calculatePurity } from '../../utils/geneUtils';
import { getClassAdvantage, getAxieImageUrl, getAxieMarketUrl, parseAxieId } from '../../utils/axieUtils';
import { BREEDING_COSTS, AxieClass } from '../../constants/axieData';

export const axieOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['axie'],
			},
		},
		options: [
			{ name: 'Get Axie Info', value: 'getAxieInfo', description: 'Get complete Axie information', action: 'Get Axie info' },
			{ name: 'Get Axie Genes', value: 'getAxieGenes', description: 'Decode Axie genes', action: 'Get Axie genes' },
			{ name: 'Get Axie Stats', value: 'getAxieStats', description: 'Calculate Axie stats from genes', action: 'Get Axie stats' },
			{ name: 'Get Axie Parts', value: 'getAxieParts', description: 'Get Axie body parts', action: 'Get Axie parts' },
			{ name: 'Get Axies by Owner', value: 'getAxiesByOwner', description: 'Get Axies owned by address', action: 'Get Axies by owner' },
			{ name: 'Search Axies', value: 'searchAxies', description: 'Search marketplace Axies', action: 'Search Axies' },
			{ name: 'Get Axie Children', value: 'getAxieChildren', description: 'Get offspring of Axie', action: 'Get Axie children' },
			{ name: 'Get Axie Parents', value: 'getAxieParents', description: 'Get parents of Axie', action: 'Get Axie parents' },
			{ name: 'Get Breeding Info', value: 'getBreedingInfo', description: 'Get breeding eligibility and cost', action: 'Get breeding info' },
			{ name: 'Calculate Purity', value: 'calculatePurity', description: 'Calculate gene purity percentage', action: 'Calculate purity' },
			{ name: 'Get Class Advantage', value: 'getClassAdvantage', description: 'Get battle class advantage', action: 'Get class advantage' },
		],
		default: 'getAxieInfo',
	},
];

export const axieFields: INodeProperties[] = [
	{
		displayName: 'Axie ID',
		name: 'axieId',
		type: 'string',
		default: '',
		required: true,
		placeholder: '12345 or #12345',
		description: 'Axie ID number',
		displayOptions: {
			show: {
				resource: ['axie'],
				operation: ['getAxieInfo', 'getAxieGenes', 'getAxieStats', 'getAxieParts', 'getAxieChildren', 'getAxieParents', 'getBreedingInfo', 'calculatePurity'],
			},
		},
	},
	{
		displayName: 'Owner Address',
		name: 'ownerAddress',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'ronin:... or 0x...',
		description: 'Wallet address',
		displayOptions: {
			show: {
				resource: ['axie'],
				operation: ['getAxiesByOwner'],
			},
		},
	},
	{
		displayName: 'Attacker Class',
		name: 'attackerClass',
		type: 'options',
		default: 'beast',
		options: [
			{ name: 'Beast', value: 'beast' },
			{ name: 'Bug', value: 'bug' },
			{ name: 'Bird', value: 'bird' },
			{ name: 'Plant', value: 'plant' },
			{ name: 'Aquatic', value: 'aquatic' },
			{ name: 'Reptile', value: 'reptile' },
			{ name: 'Mech', value: 'mech' },
			{ name: 'Dawn', value: 'dawn' },
			{ name: 'Dusk', value: 'dusk' },
		],
		displayOptions: {
			show: {
				resource: ['axie'],
				operation: ['getClassAdvantage'],
			},
		},
	},
	{
		displayName: 'Defender Class',
		name: 'defenderClass',
		type: 'options',
		default: 'plant',
		options: [
			{ name: 'Beast', value: 'beast' },
			{ name: 'Bug', value: 'bug' },
			{ name: 'Bird', value: 'bird' },
			{ name: 'Plant', value: 'plant' },
			{ name: 'Aquatic', value: 'aquatic' },
			{ name: 'Reptile', value: 'reptile' },
			{ name: 'Mech', value: 'mech' },
			{ name: 'Dawn', value: 'dawn' },
			{ name: 'Dusk', value: 'dusk' },
		],
		displayOptions: {
			show: {
				resource: ['axie'],
				operation: ['getClassAdvantage'],
			},
		},
	},
	{
		displayName: 'Classes',
		name: 'classes',
		type: 'multiOptions',
		default: [],
		options: [
			{ name: 'Beast', value: 'beast' },
			{ name: 'Bug', value: 'bug' },
			{ name: 'Bird', value: 'bird' },
			{ name: 'Plant', value: 'plant' },
			{ name: 'Aquatic', value: 'aquatic' },
			{ name: 'Reptile', value: 'reptile' },
			{ name: 'Mech', value: 'mech' },
			{ name: 'Dawn', value: 'dawn' },
			{ name: 'Dusk', value: 'dusk' },
		],
		description: 'Filter by Axie classes',
		displayOptions: {
			show: {
				resource: ['axie'],
				operation: ['searchAxies'],
			},
		},
	},
	{
		displayName: 'Breed Count',
		name: 'breedCount',
		type: 'options',
		default: '',
		options: [
			{ name: 'Any', value: '' },
			{ name: '0 (Virgin)', value: '0' },
			{ name: '1', value: '1' },
			{ name: '2', value: '2' },
			{ name: '3', value: '3' },
			{ name: '4', value: '4' },
			{ name: '5', value: '5' },
			{ name: '6', value: '6' },
			{ name: '7 (Max)', value: '7' },
		],
		displayOptions: {
			show: {
				resource: ['axie'],
				operation: ['searchAxies'],
			},
		},
	},
	{
		displayName: 'Minimum Purity',
		name: 'minPurity',
		type: 'number',
		default: 0,
		description: 'Minimum purity percentage (0-100)',
		displayOptions: {
			show: {
				resource: ['axie'],
				operation: ['searchAxies'],
			},
		},
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 20,
		description: 'Max results',
		displayOptions: {
			show: {
				resource: ['axie'],
				operation: ['getAxiesByOwner', 'searchAxies', 'getAxieChildren'],
			},
		},
	},
	{
		displayName: 'Offset',
		name: 'offset',
		type: 'number',
		default: 0,
		displayOptions: {
			show: {
				resource: ['axie'],
				operation: ['getAxiesByOwner', 'searchAxies', 'getAxieChildren'],
			},
		},
	},
];

export async function executeAxie(this: IExecuteFunctions, index: number): Promise<unknown> {
	const operation = this.getNodeParameter('operation', index) as string;
	const skynetClient = await createSkynetClient(this);

	switch (operation) {
		case 'getAxieInfo': {
			const axieIdRaw = this.getNodeParameter('axieId', index) as string;
			const axieId = parseAxieId(axieIdRaw);
			const axie = await skynetClient.getAxie(axieId);
			return {
				...axie,
				imageUrl: getAxieImageUrl(axieId),
				marketUrl: getAxieMarketUrl(axieId),
			};
		}

		case 'getAxieGenes': {
			const axieIdRaw = this.getNodeParameter('axieId', index) as string;
			const axieId = parseAxieId(axieIdRaw);
			const axie = await skynetClient.getAxie(axieId);
			
			if (!axie.genes) {
				throw new Error('Axie genes not available');
			}

			const decodedGenes = decodeGenes(axie.genes);

			return {
				axieId,
				rawGenes: axie.genes,
				decoded: decodedGenes,
			};
		}

		case 'getAxieStats': {
			const axieIdRaw = this.getNodeParameter('axieId', index) as string;
			const axieId = parseAxieId(axieIdRaw);
			const axie = await skynetClient.getAxie(axieId);

			if (axie.genes) {
				const decodedGenes = decodeGenes(axie.genes);
				const calculatedStats = calculateStats(decodedGenes);
				return {
					axieId,
					class: axie.class,
					stats: axie.stats,
					calculatedStats,
				};
			}

			return {
				axieId,
				class: axie.class,
				stats: axie.stats,
			};
		}

		case 'getAxieParts': {
			const axieIdRaw = this.getNodeParameter('axieId', index) as string;
			const axieId = parseAxieId(axieIdRaw);
			const axie = await skynetClient.getAxie(axieId);

			return {
				axieId,
				class: axie.class,
				parts: axie.parts,
			};
		}

		case 'getAxiesByOwner': {
			const ownerAddress = this.getNodeParameter('ownerAddress', index) as string;
			const limit = this.getNodeParameter('limit', index) as number;
			const offset = this.getNodeParameter('offset', index) as number;

			const result = await skynetClient.getAxiesByOwner(ownerAddress, offset, limit);
			return {
				owner: hexToRonin(normalizeAddress(ownerAddress)),
				total: result.total,
				axies: result.results,
			};
		}

		case 'searchAxies': {
			const classes = this.getNodeParameter('classes', index) as string[];
			const breedCount = this.getNodeParameter('breedCount', index) as string;
			const minPurity = this.getNodeParameter('minPurity', index) as number;
			const limit = this.getNodeParameter('limit', index) as number;
			const offset = this.getNodeParameter('offset', index) as number;

			const filters: Record<string, unknown> = {
				from: offset,
				size: limit,
			};

			if (classes.length > 0) {
				filters.classes = classes;
			}
			if (breedCount !== '') {
				filters.breedCount = [parseInt(breedCount)];
			}
			if (minPurity > 0) {
				filters.pureness = [minPurity];
			}

			const result = await skynetClient.searchAxies(filters);
			return {
				total: result.total,
				filters: { classes, breedCount, minPurity },
				axies: result.results,
			};
		}

		case 'getAxieChildren': {
			const axieIdRaw = this.getNodeParameter('axieId', index) as string;
			const axieId = parseAxieId(axieIdRaw);

			const axie = await skynetClient.getAxie(axieId);
			return {
				axieId,
				children: axie.children || [],
				childCount: axie.children?.length || 0,
			};
		}

		case 'getAxieParents': {
			const axieIdRaw = this.getNodeParameter('axieId', index) as string;
			const axieId = parseAxieId(axieIdRaw);

			const axie = await skynetClient.getAxie(axieId);
			return {
				axieId,
				sireId: axie.sireId || null,
				matronId: axie.matronId || null,
				sireClass: axie.sireClass || null,
				matronClass: axie.matronClass || null,
			};
		}

		case 'getBreedingInfo': {
			const axieIdRaw = this.getNodeParameter('axieId', index) as string;
			const axieId = parseAxieId(axieIdRaw);

			const axie = await skynetClient.getAxie(axieId);
			const breedCountVal = axie.breedCount || 0;
			
			const slpCost = BREEDING_COSTS.SLP_BY_BREED_COUNT[breedCountVal] || 0;
			const axsCost = BREEDING_COSTS.AXS_PER_BREED;
			
			const canBreedResult = breedCountVal < BREEDING_COSTS.MAX_BREED_COUNT && axie.stage >= 4;
			let reason = '';
			if (breedCountVal >= BREEDING_COSTS.MAX_BREED_COUNT) {
				reason = 'Maximum breed count reached (7)';
			} else if (axie.stage < 4) {
				reason = 'Axie must be an adult to breed';
			}

			return {
				axieId,
				breedCount: breedCountVal,
				maxBreeds: BREEDING_COSTS.MAX_BREED_COUNT,
				canBreed: canBreedResult,
				reason: reason || undefined,
				breedingCost: {
					slp: slpCost,
					axs: axsCost,
				},
			};
		}

		case 'calculatePurity': {
			const axieIdRaw = this.getNodeParameter('axieId', index) as string;
			const axieId = parseAxieId(axieIdRaw);

			const axie = await skynetClient.getAxie(axieId);
			if (!axie.genes) {
				throw new Error('Axie genes not available');
			}

			const decodedGenes = decodeGenes(axie.genes);
			const purity = calculatePurity(decodedGenes);
			return {
				axieId,
				class: axie.class,
				purity: `${purity.toFixed(1)}%`,
				purityValue: purity,
			};
		}

		case 'getClassAdvantage': {
			const attackerClass = this.getNodeParameter('attackerClass', index) as AxieClass;
			const defenderClass = this.getNodeParameter('defenderClass', index) as AxieClass;

			const multiplier = getClassAdvantage(attackerClass, defenderClass);
			let advantage = 'neutral';
			if (multiplier > 1) advantage = 'strong';
			if (multiplier < 1) advantage = 'weak';

			return {
				attacker: attackerClass,
				defender: defenderClass,
				multiplier,
				advantage,
				damageModifier: `${((multiplier - 1) * 100).toFixed(0)}%`,
			};
		}

		default:
			throw new Error(`Unknown operation: ${operation}`);
	}
}
