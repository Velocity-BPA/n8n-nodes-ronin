/**
 * Marketplace Actions for Ronin n8n Node
 */

import { INodeProperties, IExecuteFunctions, IDataObject } from 'n8n-workflow';
import { createMarketplaceClient } from '../../transport/marketplaceClient';
import { normalizeAddress, hexToRonin } from '../../utils/addressUtils';

export const marketplaceOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['marketplace'] } },
		options: [
			{ name: 'Get Listing', value: 'getListing', description: 'Get listing details', action: 'Get listing' },
			{ name: 'Get Active Listings', value: 'getActiveListings', description: 'Get active listings', action: 'Get active listings' },
			{ name: 'Get Listings by User', value: 'getListingsByUser', description: 'Get user listings', action: 'Get listings by user' },
			{ name: 'Get Recent Sales', value: 'getRecentSales', description: 'Get recent sales', action: 'Get recent sales' },
			{ name: 'Get Floor Price', value: 'getFloorPrice', description: 'Get floor price', action: 'Get floor price' },
			{ name: 'Get Offers', value: 'getOffers', description: 'Get NFT offers', action: 'Get offers' },
			{ name: 'Get Marketplace Stats', value: 'getMarketplaceStats', description: 'Get stats', action: 'Get marketplace stats' },
			{ name: 'Get Price History', value: 'getPriceHistory', description: 'Get price history', action: 'Get price history' },
		],
		default: 'getActiveListings',
	},
];

export const marketplaceFields: INodeProperties[] = [
	{
		displayName: 'Listing ID',
		name: 'listingId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: { show: { resource: ['marketplace'], operation: ['getListing'] } },
	},
	{
		displayName: 'Collection Address',
		name: 'collectionAddress',
		type: 'string',
		required: true,
		default: '',
		displayOptions: { show: { resource: ['marketplace'], operation: ['getActiveListings', 'getRecentSales', 'getFloorPrice'] } },
	},
	{
		displayName: 'User Address',
		name: 'userAddress',
		type: 'string',
		required: true,
		default: '',
		displayOptions: { show: { resource: ['marketplace'], operation: ['getListingsByUser'] } },
	},
	{
		displayName: 'Contract Address',
		name: 'contractAddress',
		type: 'string',
		required: true,
		default: '',
		displayOptions: { show: { resource: ['marketplace'], operation: ['getOffers', 'getPriceHistory'] } },
	},
	{
		displayName: 'Token ID',
		name: 'tokenId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: { show: { resource: ['marketplace'], operation: ['getOffers', 'getPriceHistory'] } },
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 20,
		displayOptions: { show: { resource: ['marketplace'], operation: ['getActiveListings', 'getListingsByUser', 'getRecentSales'] } },
	},
	{
		displayName: 'Offset',
		name: 'offset',
		type: 'number',
		default: 0,
		displayOptions: { show: { resource: ['marketplace'], operation: ['getActiveListings', 'getListingsByUser'] } },
	},
];

export async function executeMarketplace(this: IExecuteFunctions, index: number): Promise<IDataObject> {
	const operation = this.getNodeParameter('operation', index) as string;
	const marketplace = await createMarketplaceClient(this);

	switch (operation) {
		case 'getListing': {
			const listingId = this.getNodeParameter('listingId', index) as string;
			const listing = await marketplace.getListing(listingId);
			return { listing };
		}
		case 'getActiveListings': {
			const collectionAddress = normalizeAddress(this.getNodeParameter('collectionAddress', index) as string);
			const limit = this.getNodeParameter('limit', index) as number;
			const offset = this.getNodeParameter('offset', index) as number;
			const result = await marketplace.getActiveListings({ contractAddress: collectionAddress, from: offset, size: limit });
			return { collection: hexToRonin(collectionAddress), total: result.total, listings: result.data };
		}
		case 'getListingsByUser': {
			const userAddress = normalizeAddress(this.getNodeParameter('userAddress', index) as string);
			const limit = this.getNodeParameter('limit', index) as number;
			const offset = this.getNodeParameter('offset', index) as number;
			const result = await marketplace.getListingsByUser(userAddress, { from: offset, size: limit });
			return { seller: hexToRonin(userAddress), total: result.total, listings: result.data };
		}
		case 'getRecentSales': {
			const collectionAddress = normalizeAddress(this.getNodeParameter('collectionAddress', index) as string);
			const limit = this.getNodeParameter('limit', index) as number;
			const result = await marketplace.getRecentSales({ contractAddress: collectionAddress, size: limit });
			return { collection: hexToRonin(collectionAddress), total: result.total, sales: result.data };
		}
		case 'getFloorPrice': {
			const collectionAddress = normalizeAddress(this.getNodeParameter('collectionAddress', index) as string);
			const result = await marketplace.getFloorPrice(collectionAddress);
			return { collection: hexToRonin(collectionAddress), ...result };
		}
		case 'getOffers': {
			const contractAddress = normalizeAddress(this.getNodeParameter('contractAddress', index) as string);
			const tokenId = this.getNodeParameter('tokenId', index) as string;
			const result = await marketplace.getOffers(contractAddress, tokenId);
			return { contractAddress: hexToRonin(contractAddress), tokenId, total: result.total, offers: result.data };
		}
		case 'getMarketplaceStats': {
			const stats = await marketplace.getMarketplaceStats();
			return stats;
		}
		case 'getPriceHistory': {
			const contractAddress = normalizeAddress(this.getNodeParameter('contractAddress', index) as string);
			const tokenId = this.getNodeParameter('tokenId', index) as string;
			const history = await marketplace.getPriceHistory(contractAddress, tokenId);
			return { contractAddress: hexToRonin(contractAddress), tokenId, total: Array.isArray(history) ? history.length : 0, history: history || [] };
		}
		default: throw new Error(`Unknown operation: ${operation}`);
	}
}
