import { INodeProperties, IExecuteFunctions } from 'n8n-workflow';
import { createMarketplaceClient } from '../../transport/marketplaceClient';
import { normalizeAddress } from '../../utils/addressUtils';
import { MAINNET_CONTRACTS } from '../../constants/contracts';

export const collectionOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['collection'],
			},
		},
		options: [
			{ name: 'Get Collection Stats', value: 'getCollectionStats', description: 'Get collection statistics', action: 'Get collection stats' },
			{ name: 'Get Floor Price', value: 'getFloorPrice', description: 'Get collection floor price', action: 'Get floor price' },
			{ name: 'Get Volume', value: 'getVolume', description: 'Get trading volume', action: 'Get volume' },
			{ name: 'Get Marketplace Stats', value: 'getMarketplaceStats', description: 'Get overall marketplace stats', action: 'Get marketplace stats' },
		],
		default: 'getCollectionStats',
	},
];

export const collectionFields: INodeProperties[] = [
	{
		displayName: 'Collection',
		name: 'collection',
		type: 'options',
		default: MAINNET_CONTRACTS.AXIE_CONTRACT,
		options: [
			{ name: 'Axie', value: MAINNET_CONTRACTS.AXIE_CONTRACT },
			{ name: 'Land', value: MAINNET_CONTRACTS.LAND_CONTRACT },
			{ name: 'Land Item', value: MAINNET_CONTRACTS.ITEM_CONTRACT },
			{ name: 'Custom', value: 'custom' },
		],
		displayOptions: {
			show: {
				resource: ['collection'],
				operation: ['getCollectionStats', 'getFloorPrice', 'getVolume'],
			},
		},
	},
	{
		displayName: 'Contract Address',
		name: 'contractAddress',
		type: 'string',
		default: '',
		placeholder: '0x...',
		displayOptions: {
			show: {
				resource: ['collection'],
				collection: ['custom'],
			},
		},
	},
	{
		displayName: 'Period',
		name: 'period',
		type: 'options',
		default: '24h',
		options: [
			{ name: '24 Hours', value: '24h' },
			{ name: '7 Days', value: '7d' },
			{ name: '30 Days', value: '30d' },
			{ name: 'All Time', value: 'all' },
		],
		displayOptions: {
			show: {
				resource: ['collection'],
				operation: ['getVolume'],
			},
		},
	},
];

export async function executeCollection(this: IExecuteFunctions, index: number): Promise<unknown> {
	const operation = this.getNodeParameter('operation', index) as string;
	const marketplaceClient = await createMarketplaceClient(this);

	const getContractAddress = (): string => {
		const collection = this.getNodeParameter('collection', index) as string;
		if (collection === 'custom') {
			return this.getNodeParameter('contractAddress', index) as string;
		}
		return collection;
	};

	switch (operation) {
		case 'getCollectionStats': {
			const contractAddress = getContractAddress();
			
			const [floorPrice, volume] = await Promise.all([
				marketplaceClient.getFloorPrice(contractAddress),
				marketplaceClient.getCollectionVolume(contractAddress),
			]);

			return {
				contractAddress,
				floorPrice: floorPrice.floorPrice,
				floorPriceUsd: floorPrice.floorPriceUsd,
				volume: volume.volume,
				volumeUsd: volume.volumeUsd,
				sales: volume.sales,
			};
		}

		case 'getFloorPrice': {
			const contractAddress = getContractAddress();
			const result = await marketplaceClient.getFloorPrice(contractAddress);
			return {
				contractAddress,
				...result,
			};
		}

		case 'getVolume': {
			const contractAddress = getContractAddress();
			const period = this.getNodeParameter('period', index) as '24h' | '7d' | '30d' | 'all';
			
			const result = await marketplaceClient.getCollectionVolume(contractAddress, { period });
			return {
				contractAddress,
				period,
				...result,
			};
		}

		case 'getMarketplaceStats': {
			const stats = await marketplaceClient.getMarketplaceStats();
			return stats;
		}

		default:
			throw new Error(`Unknown operation: ${operation}`);
	}
}
