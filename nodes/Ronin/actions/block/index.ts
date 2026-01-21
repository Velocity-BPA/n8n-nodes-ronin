import { INodeProperties, IExecuteFunctions } from 'n8n-workflow';
import { createRoninClient } from '../../transport/roninClient';
import { weiToRon } from '../../utils/unitConverter';

export const blockOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['block'],
			},
		},
		options: [
			{ name: 'Get Block', value: 'getBlock', description: 'Get block by number or hash', action: 'Get block' },
			{ name: 'Get Latest Block', value: 'getLatest', description: 'Get latest block', action: 'Get latest block' },
			{ name: 'Get Block Transactions', value: 'getTransactions', description: 'Get transactions in block', action: 'Get block transactions' },
			{ name: 'Get Block Time', value: 'getBlockTime', description: 'Get block timestamp', action: 'Get block time' },
			{ name: 'Get Block Number', value: 'getBlockNumber', description: 'Get current block number', action: 'Get block number' },
			{ name: 'Get Block Range', value: 'getBlockRange', description: 'Get multiple blocks', action: 'Get block range' },
		],
		default: 'getLatest',
	},
];

export const blockFields: INodeProperties[] = [
	{
		displayName: 'Block Identifier',
		name: 'blockId',
		type: 'string',
		default: '',
		required: true,
		placeholder: '12345678 or 0xabc...',
		description: 'Block number or block hash',
		displayOptions: {
			show: {
				resource: ['block'],
				operation: ['getBlock', 'getTransactions', 'getBlockTime'],
			},
		},
	},
	{
		displayName: 'Start Block',
		name: 'startBlock',
		type: 'number',
		default: 0,
		description: 'Starting block number',
		displayOptions: {
			show: {
				resource: ['block'],
				operation: ['getBlockRange'],
			},
		},
	},
	{
		displayName: 'End Block',
		name: 'endBlock',
		type: 'number',
		default: 0,
		description: 'Ending block number (0 for latest)',
		displayOptions: {
			show: {
				resource: ['block'],
				operation: ['getBlockRange'],
			},
		},
	},
	{
		displayName: 'Include Transactions',
		name: 'includeTransactions',
		type: 'boolean',
		default: false,
		description: 'Whether to include full transaction data',
		displayOptions: {
			show: {
				resource: ['block'],
				operation: ['getBlock', 'getLatest', 'getBlockRange'],
			},
		},
	},
];

export async function executeBlock(this: IExecuteFunctions, index: number): Promise<unknown> {
	const operation = this.getNodeParameter('operation', index) as string;
	const roninClient = await createRoninClient(this);
	const provider = roninClient.getProvider();

	switch (operation) {
		case 'getBlock': {
			const blockId = this.getNodeParameter('blockId', index) as string;
			const includeTransactions = this.getNodeParameter('includeTransactions', index) as boolean;
			
			const blockIdentifier = blockId.startsWith('0x') ? blockId : parseInt(blockId, 10);
			const block = await provider.getBlock(blockIdentifier, includeTransactions);
			
			if (!block) {
				throw new Error(`Block ${blockId} not found`);
			}
			
			return {
				number: block.number,
				hash: block.hash,
				parentHash: block.parentHash,
				timestamp: block.timestamp,
				timestampDate: new Date(block.timestamp * 1000).toISOString(),
				nonce: block.nonce,
				miner: block.miner,
				gasLimit: block.gasLimit.toString(),
				gasUsed: block.gasUsed.toString(),
				baseFeePerGas: block.baseFeePerGas?.toString(),
				transactionCount: block.transactions.length,
				transactions: includeTransactions ? block.transactions : block.transactions.slice(0, 10),
			};
		}

		case 'getLatest': {
			const includeTransactions = this.getNodeParameter('includeTransactions', index) as boolean;
			const block = await provider.getBlock('latest', includeTransactions);
			
			if (!block) {
				throw new Error('Unable to fetch latest block');
			}
			
			return {
				number: block.number,
				hash: block.hash,
				parentHash: block.parentHash,
				timestamp: block.timestamp,
				timestampDate: new Date(block.timestamp * 1000).toISOString(),
				miner: block.miner,
				gasLimit: block.gasLimit.toString(),
				gasUsed: block.gasUsed.toString(),
				gasUsedPercentage: ((Number(block.gasUsed) / Number(block.gasLimit)) * 100).toFixed(2) + '%',
				transactionCount: block.transactions.length,
				transactions: includeTransactions ? block.transactions : undefined,
			};
		}

		case 'getTransactions': {
			const blockId = this.getNodeParameter('blockId', index) as string;
			
			const blockIdentifier = blockId.startsWith('0x') ? blockId : parseInt(blockId, 10);
			const block = await provider.getBlock(blockIdentifier, true);
			
			if (!block) {
				throw new Error(`Block ${blockId} not found`);
			}
			
			return {
				blockNumber: block.number,
				blockHash: block.hash,
				transactionCount: block.transactions.length,
				transactions: block.prefetchedTransactions?.map(tx => ({
					hash: tx.hash,
					from: tx.from,
					to: tx.to,
					value: weiToRon(tx.value.toString()),
					gasPrice: tx.gasPrice?.toString(),
					gasLimit: tx.gasLimit.toString(),
					nonce: tx.nonce,
					data: tx.data.length > 100 ? `${tx.data.substring(0, 100)}...` : tx.data,
				})) || block.transactions,
			};
		}

		case 'getBlockTime': {
			const blockId = this.getNodeParameter('blockId', index) as string;
			
			const blockIdentifier = blockId.startsWith('0x') ? blockId : parseInt(blockId, 10);
			const block = await provider.getBlock(blockIdentifier);
			
			if (!block) {
				throw new Error(`Block ${blockId} not found`);
			}
			
			return {
				blockNumber: block.number,
				blockHash: block.hash,
				timestamp: block.timestamp,
				timestampDate: new Date(block.timestamp * 1000).toISOString(),
				age: `${Math.floor((Date.now() / 1000 - block.timestamp) / 60)} minutes ago`,
			};
		}

		case 'getBlockNumber': {
			const blockNumber = await provider.getBlockNumber();
			
			return {
				blockNumber,
				network: 'Ronin',
			};
		}

		case 'getBlockRange': {
			const startBlock = this.getNodeParameter('startBlock', index) as number;
			let endBlock = this.getNodeParameter('endBlock', index) as number;
			const includeTransactions = this.getNodeParameter('includeTransactions', index) as boolean;
			
			if (endBlock === 0) {
				endBlock = await provider.getBlockNumber();
			}
			
			// Limit to 10 blocks to avoid timeout
			const maxBlocks = Math.min(endBlock - startBlock + 1, 10);
			const blocks = [];
			
			for (let i = 0; i < maxBlocks; i++) {
				const block = await provider.getBlock(startBlock + i, includeTransactions);
				if (block) {
					blocks.push({
						number: block.number,
						hash: block.hash,
						timestamp: block.timestamp,
						timestampDate: new Date(block.timestamp * 1000).toISOString(),
						transactionCount: block.transactions.length,
						gasUsed: block.gasUsed.toString(),
					});
				}
			}
			
			return {
				startBlock,
				endBlock: startBlock + maxBlocks - 1,
				blockCount: blocks.length,
				blocks,
			};
		}

		default:
			throw new Error(`Unknown operation: ${operation}`);
	}
}
