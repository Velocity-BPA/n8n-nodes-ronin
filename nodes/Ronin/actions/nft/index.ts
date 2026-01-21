import { INodeProperties, IExecuteFunctions } from 'n8n-workflow';
import { createRoninClient } from '../../transport/roninClient';
import { createSkynetClient } from '../../transport/skynetApi';
import { normalizeAddress, hexToRonin } from '../../utils/addressUtils';
import { NFT_CONTRACTS } from '../../constants/contracts';

export const nftOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['nft'],
			},
		},
		options: [
			{ name: 'Get NFT Info', value: 'getNftInfo', description: 'Get NFT details', action: 'Get NFT info' },
			{ name: 'Get NFT Metadata', value: 'getNftMetadata', description: 'Get NFT metadata', action: 'Get NFT metadata' },
			{ name: 'Get NFTs by Owner', value: 'getNftsByOwner', description: 'Get all NFTs owned by address', action: 'Get NFTs by owner' },
			{ name: 'Get NFTs by Collection', value: 'getNftsByCollection', description: 'Get NFTs in collection', action: 'Get NFTs by collection' },
			{ name: 'Transfer NFT', value: 'transferNft', description: 'Transfer an NFT', action: 'Transfer NFT' },
			{ name: 'Verify Ownership', value: 'verifyOwnership', description: 'Check if address owns NFT', action: 'Verify ownership' },
			{ name: 'Get NFT Owner', value: 'getNftOwner', description: 'Get current owner of NFT', action: 'Get NFT owner' },
		],
		default: 'getNftInfo',
	},
];

export const nftFields: INodeProperties[] = [
	{
		displayName: 'Collection',
		name: 'collection',
		type: 'options',
		default: 'axie',
		options: [
			{ name: 'Axie', value: 'axie' },
			{ name: 'Land', value: 'land' },
			{ name: 'Land Item', value: 'item' },
			{ name: 'Custom', value: 'custom' },
		],
		description: 'NFT collection',
		displayOptions: {
			show: {
				resource: ['nft'],
				operation: ['getNftInfo', 'getNftMetadata', 'getNftsByCollection', 'transferNft', 'verifyOwnership', 'getNftOwner'],
			},
		},
	},
	{
		displayName: 'Contract Address',
		name: 'contractAddress',
		type: 'string',
		default: '',
		placeholder: '0x...',
		description: 'Custom NFT contract address',
		displayOptions: {
			show: {
				resource: ['nft'],
				collection: ['custom'],
			},
		},
	},
	{
		displayName: 'Token ID',
		name: 'tokenId',
		type: 'string',
		default: '',
		required: true,
		description: 'NFT token ID',
		displayOptions: {
			show: {
				resource: ['nft'],
				operation: ['getNftInfo', 'getNftMetadata', 'transferNft', 'verifyOwnership', 'getNftOwner'],
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
		description: 'Wallet address to check',
		displayOptions: {
			show: {
				resource: ['nft'],
				operation: ['getNftsByOwner', 'verifyOwnership'],
			},
		},
	},
	{
		displayName: 'To Address',
		name: 'toAddress',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'ronin:... or 0x...',
		description: 'Recipient address',
		displayOptions: {
			show: {
				resource: ['nft'],
				operation: ['transferNft'],
			},
		},
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 20,
		description: 'Max results to return',
		displayOptions: {
			show: {
				resource: ['nft'],
				operation: ['getNftsByOwner', 'getNftsByCollection'],
			},
		},
	},
	{
		displayName: 'Offset',
		name: 'offset',
		type: 'number',
		default: 0,
		description: 'Results to skip',
		displayOptions: {
			show: {
				resource: ['nft'],
				operation: ['getNftsByOwner', 'getNftsByCollection'],
			},
		},
	},
];

export async function executeNft(this: IExecuteFunctions, index: number): Promise<unknown> {
	const operation = this.getNodeParameter('operation', index) as string;
	const roninClient = await createRoninClient(this);

	const getContractAddress = (): string => {
		const collection = this.getNodeParameter('collection', index) as string;
		if (collection === 'custom') {
			return normalizeAddress(this.getNodeParameter('contractAddress', index) as string);
		}
		// Default to mainnet for now - network detection is handled elsewhere
		const contractInfo = NFT_CONTRACTS[collection];
		if (contractInfo) {
			return contractInfo.mainnet;
		}
		return collection;
	};

	const isAxieCollection = (): boolean => {
		const collection = this.getNodeParameter('collection', index) as string;
		return collection === 'axie';
	};

	switch (operation) {
		case 'getNftInfo': {
			const contractAddress = getContractAddress();
			const tokenId = this.getNodeParameter('tokenId', index) as string;

			if (isAxieCollection()) {
				const skynetClient = await createSkynetClient(this);
				const axie = await skynetClient.getAxie(tokenId);
				return axie;
			}

			const owner = await roninClient.getNftOwner(contractAddress, tokenId);
			return {
				contractAddress,
				tokenId,
				owner: hexToRonin(owner),
			};
		}

		case 'getNftMetadata': {
			const contractAddress = getContractAddress();
			const tokenId = this.getNodeParameter('tokenId', index) as string;

			if (isAxieCollection()) {
				const skynetClient = await createSkynetClient(this);
				const axie = await skynetClient.getAxie(tokenId);
				return {
					tokenId,
					name: axie.name || `Axie #${tokenId}`,
					class: axie.class,
					genes: axie.genes,
					stats: axie.stats,
					parts: axie.parts,
					image: axie.image,
				};
			}

			return {
				contractAddress,
				tokenId,
				message: 'Metadata retrieval requires tokenURI implementation',
			};
		}

		case 'getNftsByOwner': {
			const ownerAddress = this.getNodeParameter('ownerAddress', index) as string;
			const limit = this.getNodeParameter('limit', index) as number;
			const offset = this.getNodeParameter('offset', index) as number;

			const skynetClient = await createSkynetClient(this);
			const axies = await skynetClient.getAxiesByOwner(ownerAddress, offset, limit);

			return {
				owner: hexToRonin(normalizeAddress(ownerAddress)),
				total: axies.total,
				nfts: axies.results,
			};
		}

		case 'getNftsByCollection': {
			const contractAddress = getContractAddress();
			const limit = this.getNodeParameter('limit', index) as number;
			const offset = this.getNodeParameter('offset', index) as number;

			if (isAxieCollection()) {
				const skynetClient = await createSkynetClient(this);
				const axies = await skynetClient.searchAxies({ from: offset, size: limit });
				return {
					collection: 'Axie',
					contractAddress,
					total: axies.total,
					nfts: axies.results,
				};
			}

			return {
				collection: contractAddress,
				message: 'Collection listing requires indexer integration',
			};
		}

		case 'transferNft': {
			const contractAddress = getContractAddress();
			const tokenId = this.getNodeParameter('tokenId', index) as string;
			const toAddress = this.getNodeParameter('toAddress', index) as string;

			const result = await roninClient.transferNft(contractAddress, toAddress, tokenId);
			return {
				success: true,
				txHash: result.hash,
				contractAddress,
				tokenId,
				to: hexToRonin(normalizeAddress(toAddress)),
				blockNumber: result.blockNumber,
			};
		}

		case 'verifyOwnership': {
			const contractAddress = getContractAddress();
			const tokenId = this.getNodeParameter('tokenId', index) as string;
			const ownerAddress = this.getNodeParameter('ownerAddress', index) as string;

			const actualOwner = await roninClient.getNftOwner(contractAddress, tokenId);
			const normalizedOwner = normalizeAddress(ownerAddress);
			const isOwner = actualOwner.toLowerCase() === normalizedOwner.toLowerCase();

			return {
				contractAddress,
				tokenId,
				checkAddress: hexToRonin(normalizedOwner),
				actualOwner: hexToRonin(actualOwner),
				isOwner,
			};
		}

		case 'getNftOwner': {
			const contractAddress = getContractAddress();
			const tokenId = this.getNodeParameter('tokenId', index) as string;

			const owner = await roninClient.getNftOwner(contractAddress, tokenId);
			return {
				contractAddress,
				tokenId,
				owner: hexToRonin(owner),
				ownerHex: owner,
			};
		}

		default:
			throw new Error(`Unknown operation: ${operation}`);
	}
}
