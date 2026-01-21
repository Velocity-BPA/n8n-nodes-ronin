/**
 * Land (Lunacia) Actions for Ronin n8n Node
 */

import { INodeProperties, IExecuteFunctions, IDataObject } from 'n8n-workflow';
import { createRoninClient } from '../../transport/roninClient';
import { createSkynetClient } from '../../transport/skynetApi';
import { normalizeAddress, hexToRonin } from '../../utils/addressUtils';
import { ethers } from 'ethers';

const LAND_TYPES: Record<string, { rarity: string; color: string }> = {
	savannah: { rarity: 'Common', color: '#f0e68c' },
	forest: { rarity: 'Uncommon', color: '#228b22' },
	arctic: { rarity: 'Rare', color: '#87ceeb' },
	mystic: { rarity: 'Epic', color: '#9932cc' },
	genesis: { rarity: 'Legendary', color: '#ffd700' },
};

const LAND_CONTRACT = '0x8c811e3c958e190f5ec15fb376533a3398620500';

export const landOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['land'] } },
		options: [
			{ name: 'Get Land Info', value: 'getLandInfo', description: 'Get land info', action: 'Get land info' },
			{ name: 'Get Coordinates', value: 'getCoordinates', description: 'Get coordinates from token ID', action: 'Get coordinates' },
			{ name: 'Get Land Type', value: 'getLandType', description: 'Get land type/rarity', action: 'Get land type' },
			{ name: 'Get Lands by Owner', value: 'getLandsByOwner', description: 'Get lands by owner', action: 'Get lands by owner' },
			{ name: 'Get Adjacent Lands', value: 'getAdjacentLands', description: 'Get adjacent lands', action: 'Get adjacent lands' },
		],
		default: 'getLandInfo',
	},
];

export const landFields: INodeProperties[] = [
	{
		displayName: 'Token ID',
		name: 'tokenId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: { show: { resource: ['land'], operation: ['getLandInfo', 'getCoordinates', 'getLandType', 'getAdjacentLands'] } },
	},
	{
		displayName: 'Owner Address',
		name: 'ownerAddress',
		type: 'string',
		required: true,
		default: '',
		displayOptions: { show: { resource: ['land'], operation: ['getLandsByOwner'] } },
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 20,
		displayOptions: { show: { resource: ['land'], operation: ['getLandsByOwner'] } },
	},
];

function calculateLandType(x: number, y: number): string {
	const distance = Math.sqrt(x * x + y * y);
	if (distance <= 20) return 'genesis';
	if (distance <= 50) return 'mystic';
	if (distance <= 100) return 'arctic';
	if (distance <= 150) return 'forest';
	return 'savannah';
}

function tokenIdToCoordinates(tokenId: string): { x: number; y: number } {
	try {
		const id = BigInt(tokenId);
		return { x: Number((id >> 128n) & 0xFFFFFFFFn) - 220, y: Number(id & 0xFFFFFFFFn) - 220 };
	} catch { return { x: 0, y: 0 }; }
}

function coordinatesToTokenId(x: number, y: number): string {
	return ((BigInt(x + 220) << 128n) | BigInt(y + 220)).toString();
}

export async function executeLand(this: IExecuteFunctions, index: number): Promise<IDataObject> {
	const operation = this.getNodeParameter('operation', index) as string;
	const roninClient = await createRoninClient(this);
	const provider = roninClient.getProvider();

	switch (operation) {
		case 'getLandInfo': {
			const tokenId = this.getNodeParameter('tokenId', index) as string;
			const coords = tokenIdToCoordinates(tokenId);
			const landType = calculateLandType(coords.x, coords.y);
			let owner = 'Unknown';
			try {
				const contract = new ethers.Contract(LAND_CONTRACT, ['function ownerOf(uint256) view returns (address)'], provider);
				owner = await contract.ownerOf(tokenId);
			} catch { /* token may not exist */ }
			return { tokenId, coordinates: coords, landType, rarity: LAND_TYPES[landType].rarity, owner: hexToRonin(owner) };
		}
		case 'getCoordinates': {
			const tokenId = this.getNodeParameter('tokenId', index) as string;
			const coords = tokenIdToCoordinates(tokenId);
			return { tokenId, x: coords.x, y: coords.y, formatted: `(${coords.x}, ${coords.y})` };
		}
		case 'getLandType': {
			const tokenId = this.getNodeParameter('tokenId', index) as string;
			const coords = tokenIdToCoordinates(tokenId);
			const landType = calculateLandType(coords.x, coords.y);
			return { tokenId, coordinates: coords, landType, rarity: LAND_TYPES[landType].rarity };
		}
		case 'getLandsByOwner': {
			const ownerAddress = normalizeAddress(this.getNodeParameter('ownerAddress', index) as string);
			const limit = this.getNodeParameter('limit', index) as number;
			try {
				const skynetClient = await createSkynetClient(this);
				// Use getLandsByOwner directly if available, otherwise use generic NFT lookup
				const allLands = await skynetClient.getLandsByOwner(ownerAddress);
				const lands = Array.isArray(allLands) ? allLands.slice(0, limit) : [];
				return { owner: hexToRonin(ownerAddress), count: lands.length, lands };
			} catch { return { owner: hexToRonin(ownerAddress), count: 0, lands: [], note: 'API credentials required' }; }
		}
		case 'getAdjacentLands': {
			const tokenId = this.getNodeParameter('tokenId', index) as string;
			const coords = tokenIdToCoordinates(tokenId);
			const offsets = [{ dx: -1, dy: 0, dir: 'west' }, { dx: 1, dy: 0, dir: 'east' }, { dx: 0, dy: -1, dir: 'south' }, { dx: 0, dy: 1, dir: 'north' }];
			const adjacent = offsets.map(({ dx, dy, dir }) => {
				const nx = coords.x + dx, ny = coords.y + dy;
				const type = calculateLandType(nx, ny);
				return { direction: dir, tokenId: coordinatesToTokenId(nx, ny), coordinates: { x: nx, y: ny }, landType: type };
			});
			return { centerLand: { tokenId, coordinates: coords, landType: calculateLandType(coords.x, coords.y) }, adjacentLands: adjacent };
		}
		default: throw new Error(`Unknown operation: ${operation}`);
	}
}
