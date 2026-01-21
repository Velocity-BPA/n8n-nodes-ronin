import { INodeProperties, IExecuteFunctions } from 'n8n-workflow';
import { createSkynetClient } from '../../transport/skynetApi';
import { decodeGenes, calculatePurity } from '../../utils/geneUtils';
import { parseAxieId } from '../../utils/axieUtils';
import { BREEDING_COSTS } from '../../constants/axieData';

export const breedingOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['breeding'],
			},
		},
		options: [
			{ name: 'Get Breeding Cost', value: 'getBreedingCost', description: 'Calculate breeding cost for two Axies', action: 'Get breeding cost' },
			{ name: 'Check Breeding Eligibility', value: 'checkEligibility', description: 'Check if two Axies can breed', action: 'Check breeding eligibility' },
			{ name: 'Get Breed Count', value: 'getBreedCount', description: 'Get breed count for Axie', action: 'Get breed count' },
			{ name: 'Get Breeding Costs Table', value: 'getCostsTable', description: 'Get SLP costs by breed count', action: 'Get breeding costs table' },
		],
		default: 'getBreedingCost',
	},
];

export const breedingFields: INodeProperties[] = [
	{
		displayName: 'Sire Axie ID',
		name: 'sireId',
		type: 'string',
		default: '',
		required: true,
		placeholder: '12345',
		displayOptions: {
			show: {
				resource: ['breeding'],
				operation: ['getBreedingCost', 'checkEligibility'],
			},
		},
	},
	{
		displayName: 'Matron Axie ID',
		name: 'matronId',
		type: 'string',
		default: '',
		required: true,
		placeholder: '67890',
		displayOptions: {
			show: {
				resource: ['breeding'],
				operation: ['getBreedingCost', 'checkEligibility'],
			},
		},
	},
	{
		displayName: 'Axie ID',
		name: 'axieId',
		type: 'string',
		default: '',
		required: true,
		placeholder: '12345',
		displayOptions: {
			show: {
				resource: ['breeding'],
				operation: ['getBreedCount'],
			},
		},
	},
];

export async function executeBreeding(this: IExecuteFunctions, index: number): Promise<unknown> {
	const operation = this.getNodeParameter('operation', index) as string;
	const skynetClient = await createSkynetClient(this);

	switch (operation) {
		case 'getBreedingCost': {
			const sireIdRaw = this.getNodeParameter('sireId', index) as string;
			const matronIdRaw = this.getNodeParameter('matronId', index) as string;
			
			const sireId = parseAxieId(sireIdRaw);
			const matronId = parseAxieId(matronIdRaw);

			const sire = await skynetClient.getAxie(sireId);
			const matron = await skynetClient.getAxie(matronId);

			const sireBreedCount = sire.breedCount || 0;
			const matronBreedCount = matron.breedCount || 0;

			const sireSlpCost = BREEDING_COSTS.SLP_BY_BREED_COUNT[sireBreedCount] || 0;
			const matronSlpCost = BREEDING_COSTS.SLP_BY_BREED_COUNT[matronBreedCount] || 0;
			const totalSlpCost = sireSlpCost + matronSlpCost;
			const axsCost = BREEDING_COSTS.AXS_PER_BREED;

			return {
				sire: {
					id: sireId,
					breedCount: sireBreedCount,
					slpCost: sireSlpCost,
				},
				matron: {
					id: matronId,
					breedCount: matronBreedCount,
					slpCost: matronSlpCost,
				},
				totalCost: {
					slp: totalSlpCost,
					axs: axsCost,
				},
			};
		}

		case 'checkEligibility': {
			const sireIdRaw = this.getNodeParameter('sireId', index) as string;
			const matronIdRaw = this.getNodeParameter('matronId', index) as string;
			
			const sireId = parseAxieId(sireIdRaw);
			const matronId = parseAxieId(matronIdRaw);

			const sire = await skynetClient.getAxie(sireId);
			const matron = await skynetClient.getAxie(matronId);

			const issues: string[] = [];

			// Check same axie
			if (sireId === matronId) {
				issues.push('Cannot breed Axie with itself');
			}

			// Check breed counts
			if ((sire.breedCount || 0) >= BREEDING_COSTS.MAX_BREED_COUNT) {
				issues.push(`Sire has reached max breed count (${BREEDING_COSTS.MAX_BREED_COUNT})`);
			}
			if ((matron.breedCount || 0) >= BREEDING_COSTS.MAX_BREED_COUNT) {
				issues.push(`Matron has reached max breed count (${BREEDING_COSTS.MAX_BREED_COUNT})`);
			}

			// Check if adults
			if (sire.stage < 4) {
				issues.push('Sire must be an adult (stage 4)');
			}
			if (matron.stage < 4) {
				issues.push('Matron must be an adult (stage 4)');
			}

			// Check family relations
			if (sire.matronId === matronId || sire.sireId === matronId) {
				issues.push('Cannot breed with parent');
			}
			if (matron.matronId === sireId || matron.sireId === sireId) {
				issues.push('Cannot breed with parent');
			}

			const canBreed = issues.length === 0;

			return {
				sireId,
				matronId,
				canBreed,
				issues: issues.length > 0 ? issues : undefined,
				sireBreedCount: sire.breedCount || 0,
				matronBreedCount: matron.breedCount || 0,
			};
		}

		case 'getBreedCount': {
			const axieIdRaw = this.getNodeParameter('axieId', index) as string;
			const axieId = parseAxieId(axieIdRaw);

			const axie = await skynetClient.getAxie(axieId);
			const breedCount = axie.breedCount || 0;
			const remainingBreeds = BREEDING_COSTS.MAX_BREED_COUNT - breedCount;
			const nextBreedSlpCost = breedCount < BREEDING_COSTS.MAX_BREED_COUNT 
				? BREEDING_COSTS.SLP_BY_BREED_COUNT[breedCount] 
				: null;

			return {
				axieId,
				breedCount,
				maxBreedCount: BREEDING_COSTS.MAX_BREED_COUNT,
				remainingBreeds,
				nextBreedCost: nextBreedSlpCost !== null ? {
					slp: nextBreedSlpCost,
					axs: BREEDING_COSTS.AXS_PER_BREED,
				} : null,
				canBreed: breedCount < BREEDING_COSTS.MAX_BREED_COUNT && axie.stage >= 4,
			};
		}

		case 'getCostsTable': {
			const costsTable = BREEDING_COSTS.SLP_BY_BREED_COUNT.map((slp, breedCount) => ({
				breedCount,
				slpCost: slp,
				axsCost: BREEDING_COSTS.AXS_PER_BREED,
			}));

			return {
				axsPerBreed: BREEDING_COSTS.AXS_PER_BREED,
				maxBreedCount: BREEDING_COSTS.MAX_BREED_COUNT,
				costsByBreedCount: costsTable,
			};
		}

		default:
			throw new Error(`Unknown operation: ${operation}`);
	}
}
