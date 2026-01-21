import {
	INodeType,
	INodeTypeDescription,
	ITriggerFunctions,
	ITriggerResponse,
} from 'n8n-workflow';
import { ethers } from 'ethers';
import { MAINNET, TESTNET } from './constants/networks';
import { MAINNET_CONTRACTS } from './constants/contracts';
import { hexToRonin, normalizeAddress } from './utils/addressUtils';
import { weiToRon } from './utils/unitConverter';

export class RoninTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Ronin Trigger',
		name: 'roninTrigger',
		icon: 'file:ronin.svg',
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["event"]}}',
		description: 'Listen for Ronin blockchain events',
		defaults: {
			name: 'Ronin Trigger',
		},
		inputs: [],
		outputs: ['main'],
		credentials: [
			{
				name: 'roninNetwork',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Event',
				name: 'event',
				type: 'options',
				noDataExpression: true,
				options: [
					// Block events
					{ name: 'New Block', value: 'newBlock', description: 'Trigger on new blocks' },
					
					// Wallet events
					{ name: 'RON Received', value: 'ronReceived', description: 'Trigger when RON is received' },
					{ name: 'RON Sent', value: 'ronSent', description: 'Trigger when RON is sent' },
					{ name: 'Token Transfer', value: 'tokenTransfer', description: 'Trigger on token transfers' },
					
					// NFT events
					{ name: 'NFT Transfer', value: 'nftTransfer', description: 'Trigger on NFT transfers' },
					{ name: 'Axie Transfer', value: 'axieTransfer', description: 'Trigger when Axies are transferred' },
					
					// Contract events
					{ name: 'Contract Event', value: 'contractEvent', description: 'Listen for specific contract events' },
					
					// Marketplace events
					{ name: 'Marketplace Sale', value: 'marketplaceSale', description: 'Trigger on marketplace sales' },
				],
				default: 'newBlock',
			},
			// Address filter for wallet events
			{
				displayName: 'Watch Address',
				name: 'watchAddress',
				type: 'string',
				default: '',
				placeholder: 'ronin:1234... or 0x1234...',
				description: 'Address to watch for events',
				displayOptions: {
					show: {
						event: ['ronReceived', 'ronSent', 'tokenTransfer', 'nftTransfer', 'axieTransfer'],
					},
				},
			},
			// Token address for token events
			{
				displayName: 'Token Address',
				name: 'tokenAddress',
				type: 'string',
				default: '',
				placeholder: 'ronin:1234... or leave empty for all',
				description: 'Specific token to watch (optional)',
				displayOptions: {
					show: {
						event: ['tokenTransfer'],
					},
				},
			},
			// Contract event settings
			{
				displayName: 'Contract Address',
				name: 'contractAddress',
				type: 'string',
				default: '',
				required: true,
				placeholder: 'ronin:1234... or 0x1234...',
				description: 'Contract to listen for events',
				displayOptions: {
					show: {
						event: ['contractEvent'],
					},
				},
			},
			{
				displayName: 'Event ABI',
				name: 'eventAbi',
				type: 'json',
				default: '[]',
				description: 'Event ABI for decoding',
				displayOptions: {
					show: {
						event: ['contractEvent'],
					},
				},
			},
			{
				displayName: 'Event Name',
				name: 'eventName',
				type: 'string',
				default: '',
				placeholder: 'Transfer',
				description: 'Name of the event to listen for',
				displayOptions: {
					show: {
						event: ['contractEvent'],
					},
				},
			},
			// Polling interval
			{
				displayName: 'Polling Interval (seconds)',
				name: 'pollingInterval',
				type: 'number',
				default: 15,
				description: 'How often to check for new events',
			},
		],
	};

	async trigger(this: ITriggerFunctions): Promise<ITriggerResponse> {
		const event = this.getNodeParameter('event') as string;
		const pollingInterval = this.getNodeParameter('pollingInterval') as number;
		
		// Get credentials
		const credentials = await this.getCredentials('roninNetwork');
		const network = credentials.network as string;
		const customRpcUrl = credentials.rpcUrl as string;
		
		let rpcUrl: string;
		if (network === 'custom' && customRpcUrl) {
			rpcUrl = customRpcUrl;
		} else if (network === 'testnet') {
			rpcUrl = TESTNET.rpcUrl;
		} else {
			rpcUrl = MAINNET.rpcUrl;
		}
		
		const provider = new ethers.JsonRpcProvider(rpcUrl);
		
		let lastBlockNumber = await provider.getBlockNumber();
		let intervalId: NodeJS.Timeout;
		
		const checkForEvents = async () => {
			try {
				const currentBlock = await provider.getBlockNumber();
				
				if (currentBlock <= lastBlockNumber) {
					return;
				}
				
				// Process new blocks
				for (let blockNum = lastBlockNumber + 1; blockNum <= currentBlock; blockNum++) {
					const block = await provider.getBlock(blockNum, true);
					if (!block) continue;
					
					switch (event) {
						case 'newBlock': {
							this.emit([
								this.helpers.returnJsonArray([{
									blockNumber: block.number,
									blockHash: block.hash,
									timestamp: block.timestamp,
									timestampDate: new Date(block.timestamp * 1000).toISOString(),
									transactionCount: block.transactions.length,
									gasUsed: block.gasUsed.toString(),
									miner: block.miner,
								}]),
							]);
							break;
						}
						
						case 'ronReceived':
						case 'ronSent': {
							const watchAddress = this.getNodeParameter('watchAddress') as string;
							if (!watchAddress) break;
							
							const normalizedWatch = normalizeAddress(watchAddress).toLowerCase();
							
							for (const txHash of block.transactions) {
								const tx = typeof txHash === 'string' 
									? await provider.getTransaction(txHash)
									: txHash;
								
								if (!tx || tx.value === BigInt(0)) continue;
								
								const isReceived = tx.to?.toLowerCase() === normalizedWatch;
								const isSent = tx.from.toLowerCase() === normalizedWatch;
								
								if ((event === 'ronReceived' && isReceived) || (event === 'ronSent' && isSent)) {
									this.emit([
										this.helpers.returnJsonArray([{
											event: event === 'ronReceived' ? 'received' : 'sent',
											txHash: tx.hash,
											from: hexToRonin(tx.from),
											to: tx.to ? hexToRonin(tx.to) : null,
											amount: weiToRon(tx.value.toString()),
											blockNumber: block.number,
											timestamp: block.timestamp,
										}]),
									]);
								}
							}
							break;
						}
						
						case 'tokenTransfer': {
							const watchAddress = this.getNodeParameter('watchAddress') as string;
							const tokenAddress = this.getNodeParameter('tokenAddress') as string;
							
							// Get Transfer event logs
							const transferTopic = ethers.id('Transfer(address,address,uint256)');
							
							const filter: ethers.Filter = {
								fromBlock: blockNum,
								toBlock: blockNum,
								topics: [transferTopic],
							};
							
							if (tokenAddress) {
								filter.address = normalizeAddress(tokenAddress);
							}
							
							const logs = await provider.getLogs(filter);
							
							for (const log of logs) {
								const from = '0x' + log.topics[1].slice(26);
								const to = '0x' + log.topics[2].slice(26);
								
								if (watchAddress) {
									const normalizedWatch = normalizeAddress(watchAddress).toLowerCase();
									if (from.toLowerCase() !== normalizedWatch && to.toLowerCase() !== normalizedWatch) {
										continue;
									}
								}
								
								const amount = BigInt(log.data).toString();
								
								this.emit([
									this.helpers.returnJsonArray([{
										event: 'tokenTransfer',
										token: log.address,
										from: hexToRonin(from),
										to: hexToRonin(to),
										amount,
										txHash: log.transactionHash,
										blockNumber: log.blockNumber,
									}]),
								]);
							}
							break;
						}
						
						case 'nftTransfer':
						case 'axieTransfer': {
							const watchAddress = this.getNodeParameter('watchAddress') as string;
							
							// ERC721 Transfer event
							const transferTopic = ethers.id('Transfer(address,address,uint256)');
							
							const filter: ethers.Filter = {
								fromBlock: blockNum,
								toBlock: blockNum,
								topics: [transferTopic],
							};
							
							if (event === 'axieTransfer') {
								filter.address = MAINNET_CONTRACTS.AXIE_NFT;
							}
							
							const logs = await provider.getLogs(filter);
							
							for (const log of logs) {
								// NFTs have tokenId in topics[3] or data
								if (log.topics.length < 4) continue; // Not ERC721
								
								const from = '0x' + log.topics[1].slice(26);
								const to = '0x' + log.topics[2].slice(26);
								const tokenId = BigInt(log.topics[3]).toString();
								
								if (watchAddress) {
									const normalizedWatch = normalizeAddress(watchAddress).toLowerCase();
									if (from.toLowerCase() !== normalizedWatch && to.toLowerCase() !== normalizedWatch) {
										continue;
									}
								}
								
								this.emit([
									this.helpers.returnJsonArray([{
										event: event === 'axieTransfer' ? 'axieTransfer' : 'nftTransfer',
										contract: log.address,
										tokenId,
										from: hexToRonin(from),
										to: hexToRonin(to),
										txHash: log.transactionHash,
										blockNumber: log.blockNumber,
									}]),
								]);
							}
							break;
						}
						
						case 'contractEvent': {
							const contractAddress = this.getNodeParameter('contractAddress') as string;
							const eventAbiInput = this.getNodeParameter('eventAbi') as string | object;
							const eventName = this.getNodeParameter('eventName') as string;
							
							const eventAbi = typeof eventAbiInput === 'string' 
								? JSON.parse(eventAbiInput) 
								: eventAbiInput;
							
							const iface = new ethers.Interface(eventAbi);
							const eventFragment = iface.getEvent(eventName);
							
							if (!eventFragment) break;
							
							const eventTopic = eventFragment.topicHash;
							
							const logs = await provider.getLogs({
								address: normalizeAddress(contractAddress),
								fromBlock: blockNum,
								toBlock: blockNum,
								topics: [eventTopic],
							});
							
							for (const log of logs) {
								try {
									const decoded = iface.parseLog({
										topics: log.topics as string[],
										data: log.data,
									});
									
									this.emit([
										this.helpers.returnJsonArray([{
											event: eventName,
											contract: log.address,
											args: decoded?.args.toObject(),
											txHash: log.transactionHash,
											blockNumber: log.blockNumber,
										}]),
									]);
								} catch {
									// Skip logs that fail to decode
								}
							}
							break;
						}
						
						case 'marketplaceSale': {
							// Listen for OrdersMatched event on marketplace
							const orderMatchedTopic = ethers.id('OrdersMatched(bytes32,bytes32,address,address,uint256)');
							
							const logs = await provider.getLogs({
								address: MAINNET_CONTRACTS.MARKETPLACE_V2,
								fromBlock: blockNum,
								toBlock: blockNum,
								topics: [orderMatchedTopic],
							});
							
							for (const log of logs) {
								this.emit([
									this.helpers.returnJsonArray([{
										event: 'marketplaceSale',
										contract: log.address,
										txHash: log.transactionHash,
										blockNumber: log.blockNumber,
										data: log.data,
									}]),
								]);
							}
							break;
						}
					}
				}
				
				lastBlockNumber = currentBlock;
			} catch (error) {
				// Log error but continue polling
				console.error('Ronin Trigger error:', error);
			}
		};
		
		// Start polling
		intervalId = setInterval(checkForEvents, pollingInterval * 1000);
		
		// Initial check
		await checkForEvents();
		
		// Cleanup function
		const closeFunction = async () => {
			clearInterval(intervalId);
		};
		
		return {
			closeFunction,
		};
	}
}
