import { INodeProperties, IExecuteFunctions } from 'n8n-workflow';
import { createRoninClient } from '../../transport/roninClient';
import { normalizeAddress, hexToRonin } from '../../utils/addressUtils';
import { weiToRon, ronToWei, formatGasPrice, parseGasPrice } from '../../utils/unitConverter';
import { ethers } from 'ethers';

export const transactionOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['transaction'],
			},
		},
		options: [
			{ name: 'Send Transaction', value: 'send', description: 'Send a transaction', action: 'Send transaction' },
			{ name: 'Get Transaction', value: 'get', description: 'Get transaction details', action: 'Get transaction' },
			{ name: 'Get Transaction Receipt', value: 'getReceipt', description: 'Get transaction receipt', action: 'Get transaction receipt' },
			{ name: 'Get Transaction Status', value: 'getStatus', description: 'Check transaction status', action: 'Get transaction status' },
			{ name: 'Estimate Gas', value: 'estimateGas', description: 'Estimate gas for transaction', action: 'Estimate gas' },
			{ name: 'Get Gas Price', value: 'getGasPrice', description: 'Get current gas price', action: 'Get gas price' },
			{ name: 'Wait For Transaction', value: 'wait', description: 'Wait for transaction confirmation', action: 'Wait for transaction' },
			{ name: 'Decode Transaction', value: 'decode', description: 'Decode transaction input data', action: 'Decode transaction' },
		],
		default: 'get',
	},
];

export const transactionFields: INodeProperties[] = [
	{
		displayName: 'Transaction Hash',
		name: 'txHash',
		type: 'string',
		default: '',
		required: true,
		placeholder: '0x...',
		description: 'Transaction hash',
		displayOptions: {
			show: {
				resource: ['transaction'],
				operation: ['get', 'getReceipt', 'getStatus', 'wait', 'decode'],
			},
		},
	},
	{
		displayName: 'To Address',
		name: 'toAddress',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'ronin:1234... or 0x1234...',
		description: 'Recipient address',
		displayOptions: {
			show: {
				resource: ['transaction'],
				operation: ['send', 'estimateGas'],
			},
		},
	},
	{
		displayName: 'Amount (RON)',
		name: 'amount',
		type: 'string',
		default: '0',
		description: 'Amount of RON to send',
		displayOptions: {
			show: {
				resource: ['transaction'],
				operation: ['send', 'estimateGas'],
			},
		},
	},
	{
		displayName: 'Data',
		name: 'data',
		type: 'string',
		default: '0x',
		placeholder: '0x...',
		description: 'Transaction data (hex encoded)',
		displayOptions: {
			show: {
				resource: ['transaction'],
				operation: ['send', 'estimateGas'],
			},
		},
	},
	{
		displayName: 'Gas Limit',
		name: 'gasLimit',
		type: 'number',
		default: 21000,
		description: 'Gas limit for transaction',
		displayOptions: {
			show: {
				resource: ['transaction'],
				operation: ['send'],
			},
		},
	},
	{
		displayName: 'Gas Price (Gwei)',
		name: 'gasPrice',
		type: 'string',
		default: '',
		placeholder: 'auto',
		description: 'Gas price in Gwei (leave empty for auto)',
		displayOptions: {
			show: {
				resource: ['transaction'],
				operation: ['send'],
			},
		},
	},
	{
		displayName: 'Confirmations',
		name: 'confirmations',
		type: 'number',
		default: 1,
		description: 'Number of confirmations to wait for',
		displayOptions: {
			show: {
				resource: ['transaction'],
				operation: ['wait'],
			},
		},
	},
	{
		displayName: 'ABI',
		name: 'abi',
		type: 'json',
		default: '[]',
		description: 'Contract ABI for decoding (optional)',
		displayOptions: {
			show: {
				resource: ['transaction'],
				operation: ['decode'],
			},
		},
	},
];

export async function executeTransaction(this: IExecuteFunctions, index: number): Promise<unknown> {
	const operation = this.getNodeParameter('operation', index) as string;
	const roninClient = await createRoninClient(this);
	const provider = roninClient.getProvider();

	switch (operation) {
		case 'send': {
			const toAddress = this.getNodeParameter('toAddress', index) as string;
			const amount = this.getNodeParameter('amount', index) as string;
			const data = this.getNodeParameter('data', index) as string;
			const gasLimit = this.getNodeParameter('gasLimit', index) as number;
			const gasPriceInput = this.getNodeParameter('gasPrice', index) as string;
			
			const wallet = roninClient.getWallet();
			if (!wallet) {
				throw new Error('Wallet required for sending transactions');
			}
			
			const tx: ethers.TransactionRequest = {
				to: normalizeAddress(toAddress),
				value: ronToWei(amount),
				data: data || '0x',
				gasLimit: BigInt(gasLimit),
			};
			
			if (gasPriceInput) {
				tx.gasPrice = parseGasPrice(gasPriceInput);
			}
			
			const response = await wallet.sendTransaction(tx);
			const receipt = await response.wait();
			
			return {
				success: true,
				txHash: response.hash,
				from: response.from,
				to: hexToRonin(normalizeAddress(toAddress)),
				amount: `${amount} RON`,
				gasUsed: receipt?.gasUsed.toString(),
				blockNumber: receipt?.blockNumber,
				status: receipt?.status === 1 ? 'success' : 'failed',
			};
		}

		case 'get': {
			const txHash = this.getNodeParameter('txHash', index) as string;
			const tx = await provider.getTransaction(txHash);
			
			if (!tx) {
				throw new Error(`Transaction ${txHash} not found`);
			}
			
			return {
				hash: tx.hash,
				from: tx.from,
				to: tx.to ? hexToRonin(tx.to) : null,
				value: weiToRon(tx.value.toString()),
				gasPrice: formatGasPrice(tx.gasPrice?.toString() || '0'),
				gasLimit: tx.gasLimit.toString(),
				nonce: tx.nonce,
				data: tx.data.length > 200 ? `${tx.data.substring(0, 200)}...` : tx.data,
				blockNumber: tx.blockNumber,
				blockHash: tx.blockHash,
				chainId: tx.chainId?.toString(),
			};
		}

		case 'getReceipt': {
			const txHash = this.getNodeParameter('txHash', index) as string;
			const receipt = await provider.getTransactionReceipt(txHash);
			
			if (!receipt) {
				return {
					hash: txHash,
					status: 'pending',
					message: 'Transaction is still pending',
				};
			}
			
			return {
				hash: receipt.hash,
				status: receipt.status === 1 ? 'success' : 'failed',
				from: receipt.from,
				to: receipt.to ? hexToRonin(receipt.to) : null,
				contractAddress: receipt.contractAddress,
				blockNumber: receipt.blockNumber,
				blockHash: receipt.blockHash,
				gasUsed: receipt.gasUsed.toString(),
				cumulativeGasUsed: receipt.cumulativeGasUsed.toString(),
				effectiveGasPrice: receipt.gasPrice?.toString(),
				logsCount: receipt.logs.length,
			};
		}

		case 'getStatus': {
			const txHash = this.getNodeParameter('txHash', index) as string;
			
			const [tx, receipt] = await Promise.all([
				provider.getTransaction(txHash),
				provider.getTransactionReceipt(txHash),
			]);
			
			if (!tx) {
				return {
					hash: txHash,
					found: false,
					status: 'unknown',
					message: 'Transaction not found',
				};
			}
			
			if (!receipt) {
				return {
					hash: txHash,
					found: true,
					status: 'pending',
					message: 'Transaction is pending confirmation',
				};
			}
			
			const currentBlock = await provider.getBlockNumber();
			const confirmations = currentBlock - receipt.blockNumber;
			
			return {
				hash: txHash,
				found: true,
				status: receipt.status === 1 ? 'success' : 'failed',
				blockNumber: receipt.blockNumber,
				confirmations,
				gasUsed: receipt.gasUsed.toString(),
			};
		}

		case 'estimateGas': {
			const toAddress = this.getNodeParameter('toAddress', index) as string;
			const amount = this.getNodeParameter('amount', index) as string;
			const data = this.getNodeParameter('data', index) as string;
			
			const wallet = roninClient.getWallet();
			const from = wallet ? await wallet.getAddress() : undefined;
			
			const tx: ethers.TransactionRequest = {
				from,
				to: normalizeAddress(toAddress),
				value: ronToWei(amount),
				data: data || '0x',
			};
			
			const gasEstimate = await provider.estimateGas(tx);
			const feeData = await provider.getFeeData();
			
			const estimatedCost = gasEstimate * (feeData.gasPrice || BigInt(0));
			
			return {
				to: hexToRonin(normalizeAddress(toAddress)),
				amount: `${amount} RON`,
				estimatedGas: gasEstimate.toString(),
				gasPrice: formatGasPrice(feeData.gasPrice?.toString() || '0'),
				estimatedCostWei: estimatedCost.toString(),
				estimatedCostRon: weiToRon(estimatedCost.toString()),
			};
		}

		case 'getGasPrice': {
			const feeData = await provider.getFeeData();
			
			return {
				gasPrice: feeData.gasPrice?.toString() || '0',
				gasPriceGwei: formatGasPrice(feeData.gasPrice?.toString() || '0'),
				maxFeePerGas: feeData.maxFeePerGas?.toString(),
				maxPriorityFeePerGas: feeData.maxPriorityFeePerGas?.toString(),
			};
		}

		case 'wait': {
			const txHash = this.getNodeParameter('txHash', index) as string;
			const confirmations = this.getNodeParameter('confirmations', index) as number;
			
			const tx = await provider.getTransaction(txHash);
			
			if (!tx) {
				throw new Error(`Transaction ${txHash} not found`);
			}
			
			const receipt = await tx.wait(confirmations);
			
			return {
				hash: txHash,
				status: receipt?.status === 1 ? 'confirmed' : 'failed',
				confirmations,
				blockNumber: receipt?.blockNumber,
				gasUsed: receipt?.gasUsed.toString(),
			};
		}

		case 'decode': {
			const txHash = this.getNodeParameter('txHash', index) as string;
			const abiInput = this.getNodeParameter('abi', index) as string | object;
			
			const tx = await provider.getTransaction(txHash);
			
			if (!tx) {
				throw new Error(`Transaction ${txHash} not found`);
			}
			
			const result: {
				hash: string;
				from: string;
				to: string | null;
				value: string;
				data: string;
				decoded?: {
					function: string | undefined;
					args: string[];
					selector: string | undefined;
				};
			} = {
				hash: tx.hash,
				from: tx.from,
				to: tx.to ? hexToRonin(tx.to) : null,
				value: weiToRon(tx.value.toString()),
				data: tx.data,
			};
			
			if (abiInput && tx.data && tx.data !== '0x') {
				try {
					const abi = typeof abiInput === 'string' ? JSON.parse(abiInput) : abiInput;
					const iface = new ethers.Interface(abi);
					const decoded = iface.parseTransaction({ data: tx.data });
					
					result.decoded = {
						function: decoded?.name,
						args: decoded?.args.map(arg => arg.toString()) || [],
						selector: decoded?.selector,
					};
				} catch {
					// Decoding failed
				}
			}
			
			return result;
		}

		default:
			throw new Error(`Unknown operation: ${operation}`);
	}
}
