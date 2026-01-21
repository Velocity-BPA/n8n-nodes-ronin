import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IDataObject,
} from 'n8n-workflow';

import { walletOperations, walletFields, executeWallet } from './actions/wallet';
import { nftOperations, nftFields, executeNft } from './actions/nft';
import { axieOperations, axieFields, executeAxie } from './actions/axie';
import { landOperations, landFields, executeLand } from './actions/land';
import { collectionOperations, collectionFields, executeCollection } from './actions/collection';
import { marketplaceOperations, marketplaceFields, executeMarketplace } from './actions/marketplace';
import { breedingOperations, breedingFields, executeBreeding } from './actions/breeding';
import { battleOperations, battleFields, executeBattle } from './actions/battle';
import { slpOperations, slpFields, executeSlp } from './actions/slp';
import { axsOperations, axsFields, executeAxs } from './actions/axs';
import { bridgeOperations, bridgeFields, executeBridge } from './actions/bridge';
import { katanaOperations, katanaFields, executeKatana } from './actions/katana';
import { stakingOperations, stakingFields, executeStaking } from './actions/staking';
import { contractOperations, contractFields, executeContract } from './actions/contract';
import { blockOperations, blockFields, executeBlock } from './actions/block';
import { transactionOperations, transactionFields, executeTransaction } from './actions/transaction';
import { mavisHubOperations, mavisHubFields, executeMavisHub } from './actions/mavisHub';
import { utilityOperations, utilityFields, executeUtility } from './actions/utility';

export class Ronin implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Ronin',
		name: 'ronin',
		icon: 'file:ronin.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with Ronin blockchain and Axie Infinity ecosystem',
		defaults: {
			name: 'Ronin',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'roninNetwork',
				required: true,
			},
			{
				name: 'roninApi',
				required: false,
			},
			{
				name: 'mavisHub',
				required: false,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Wallet', value: 'wallet', description: 'Wallet operations (balances, transfers)' },
					{ name: 'NFT', value: 'nft', description: 'NFT operations (info, transfer, metadata)' },
					{ name: 'Axie', value: 'axie', description: 'Axie Infinity operations (genes, stats, battles)' },
					{ name: 'Land', value: 'land', description: 'Lunacia land operations' },
					{ name: 'Collection', value: 'collection', description: 'NFT collection stats and info' },
					{ name: 'Marketplace', value: 'marketplace', description: 'Mavis marketplace operations' },
					{ name: 'Breeding', value: 'breeding', description: 'Axie breeding operations' },
					{ name: 'Battle', value: 'battle', description: 'Axie battle stats and history' },
					{ name: 'SLP', value: 'slp', description: 'Smooth Love Potion operations' },
					{ name: 'AXS', value: 'axs', description: 'Axie Infinity Shards operations' },
					{ name: 'Bridge', value: 'bridge', description: 'Ronin Bridge operations' },
					{ name: 'Katana', value: 'katana', description: 'Katana DEX operations' },
					{ name: 'Staking', value: 'staking', description: 'RON staking operations' },
					{ name: 'Smart Contract', value: 'contract', description: 'Smart contract interactions' },
					{ name: 'Block', value: 'block', description: 'Block information' },
					{ name: 'Transaction', value: 'transaction', description: 'Transaction operations' },
					{ name: 'Mavis Hub', value: 'mavisHub', description: 'Mavis Hub gaming platform' },
					{ name: 'Utility', value: 'utility', description: 'Utility functions' },
				],
				default: 'wallet',
			},
			// Operations and fields for each resource
			...walletOperations,
			...walletFields,
			...nftOperations,
			...nftFields,
			...axieOperations,
			...axieFields,
			...landOperations,
			...landFields,
			...collectionOperations,
			...collectionFields,
			...marketplaceOperations,
			...marketplaceFields,
			...breedingOperations,
			...breedingFields,
			...battleOperations,
			...battleFields,
			...slpOperations,
			...slpFields,
			...axsOperations,
			...axsFields,
			...bridgeOperations,
			...bridgeFields,
			...katanaOperations,
			...katanaFields,
			...stakingOperations,
			...stakingFields,
			...contractOperations,
			...contractFields,
			...blockOperations,
			...blockFields,
			...transactionOperations,
			...transactionFields,
			...mavisHubOperations,
			...mavisHubFields,
			...utilityOperations,
			...utilityFields,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const resource = this.getNodeParameter('resource', 0) as string;

		for (let i = 0; i < items.length; i++) {
			try {
				let result: unknown;

				switch (resource) {
					case 'wallet':
						result = await executeWallet.call(this, i);
						break;
					case 'nft':
						result = await executeNft.call(this, i);
						break;
					case 'axie':
						result = await executeAxie.call(this, i);
						break;
					case 'land':
						result = await executeLand.call(this, i);
						break;
					case 'collection':
						result = await executeCollection.call(this, i);
						break;
					case 'marketplace':
						result = await executeMarketplace.call(this, i);
						break;
					case 'breeding':
						result = await executeBreeding.call(this, i);
						break;
					case 'battle':
						result = await executeBattle.call(this, i);
						break;
					case 'slp':
						result = await executeSlp.call(this, i);
						break;
					case 'axs':
						result = await executeAxs.call(this, i);
						break;
					case 'bridge':
						result = await executeBridge.call(this, i);
						break;
					case 'katana':
						result = await executeKatana.call(this, i);
						break;
					case 'staking':
						result = await executeStaking.call(this, i);
						break;
					case 'contract':
						result = await executeContract.call(this, i);
						break;
					case 'block':
						result = await executeBlock.call(this, i);
						break;
					case 'transaction':
						result = await executeTransaction.call(this, i);
						break;
					case 'mavisHub':
						result = await executeMavisHub.call(this, i);
						break;
					case 'utility':
						result = await executeUtility.call(this, i);
						break;
					default:
						throw new Error(`Unknown resource: ${resource}`);
				}

				returnData.push({ json: result as IDataObject });
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: { error: (error as Error).message },
						pairedItem: { item: i },
					});
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}
