import { INodeProperties, IExecuteFunctions } from 'n8n-workflow';
import { ethers } from 'ethers';
import { createRoninClient } from '../../transport/roninClient';
import { normalizeAddress } from '../../utils/addressUtils';

export const contractOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['contract'],
			},
		},
		options: [
			{ name: 'Read Contract', value: 'read', description: 'Read from a smart contract', action: 'Read contract' },
			{ name: 'Write Contract', value: 'write', description: 'Write to a smart contract', action: 'Write contract' },
			{ name: 'Get Code', value: 'getCode', description: 'Get contract bytecode', action: 'Get contract code' },
			{ name: 'Estimate Gas', value: 'estimateGas', description: 'Estimate gas for transaction', action: 'Estimate gas' },
		],
		default: 'read',
	},
];

export const contractFields: INodeProperties[] = [
	{
		displayName: 'Contract Address',
		name: 'contractAddress',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'ronin:... or 0x...',
		displayOptions: {
			show: {
				resource: ['contract'],
			},
		},
	},
	{
		displayName: 'ABI',
		name: 'abi',
		type: 'json',
		default: '[]',
		required: true,
		description: 'Contract ABI (JSON array)',
		displayOptions: {
			show: {
				resource: ['contract'],
				operation: ['read', 'write'],
			},
		},
	},
	{
		displayName: 'Function Name',
		name: 'functionName',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'balanceOf',
		displayOptions: {
			show: {
				resource: ['contract'],
				operation: ['read', 'write'],
			},
		},
	},
	{
		displayName: 'Function Parameters',
		name: 'parameters',
		type: 'json',
		default: '[]',
		description: 'Function parameters as JSON array',
		displayOptions: {
			show: {
				resource: ['contract'],
				operation: ['read', 'write'],
			},
		},
	},
	{
		displayName: 'Value (RON)',
		name: 'value',
		type: 'string',
		default: '0',
		description: 'RON to send with transaction',
		displayOptions: {
			show: {
				resource: ['contract'],
				operation: ['write'],
			},
		},
	},
];

export async function executeContract(this: IExecuteFunctions, index: number): Promise<unknown> {
	const operation = this.getNodeParameter('operation', index) as string;
	const roninClient = await createRoninClient(this);
	const contractAddress = this.getNodeParameter('contractAddress', index) as string;

	switch (operation) {
		case 'read': {
			const abiInput = this.getNodeParameter('abi', index) as string | object;
			const functionName = this.getNodeParameter('functionName', index) as string;
			const parametersInput = this.getNodeParameter('parameters', index) as string | unknown[];

			const abi = typeof abiInput === 'string' ? JSON.parse(abiInput) : abiInput;
			const parameters = typeof parametersInput === 'string' ? JSON.parse(parametersInput) : parametersInput;

			const result = await roninClient.readContract(
				contractAddress,
				abi,
				functionName,
				parameters
			);

			// Handle various result types
			let formattedResult: unknown = result;
			if (typeof result === 'bigint') {
				formattedResult = result.toString();
			} else if (Array.isArray(result)) {
				formattedResult = result.map((r) => typeof r === 'bigint' ? r.toString() : r);
			}

			return {
				contract: normalizeAddress(contractAddress),
				function: functionName,
				result: formattedResult,
			};
		}

		case 'write': {
			const abiInput = this.getNodeParameter('abi', index) as string | object;
			const functionName = this.getNodeParameter('functionName', index) as string;
			const parametersInput = this.getNodeParameter('parameters', index) as string | unknown[];
			const value = this.getNodeParameter('value', index) as string;

			const abi = typeof abiInput === 'string' ? JSON.parse(abiInput) : abiInput;
			const parameters = typeof parametersInput === 'string' ? JSON.parse(parametersInput) : parametersInput;

			const result = await roninClient.writeContract(
				contractAddress,
				abi,
				functionName,
				parameters,
				value !== '0' ? value : undefined
			);

			return {
				success: result.status,
				txHash: result.hash,
				contract: normalizeAddress(contractAddress),
				function: functionName,
				gasUsed: result.gasUsed,
			};
		}

		case 'getCode': {
			const provider = roninClient.getProvider();
			const code = await provider.getCode(normalizeAddress(contractAddress));

			return {
				address: normalizeAddress(contractAddress),
				bytecode: code,
				isContract: code !== '0x',
				codeSize: (code.length - 2) / 2,
			};
		}

		case 'estimateGas': {
			const abiInput = this.getNodeParameter('abi', index) as string | object;
			const functionName = this.getNodeParameter('functionName', index) as string;
			const parametersInput = this.getNodeParameter('parameters', index) as string | unknown[];

			const abi = typeof abiInput === 'string' ? JSON.parse(abiInput) : abiInput;
			const parameters = typeof parametersInput === 'string' ? JSON.parse(parametersInput) : parametersInput;

			const provider = roninClient.getProvider();
			const iface = new ethers.Interface(abi);
			const data = iface.encodeFunctionData(functionName, parameters);

			const gasEstimate = await provider.estimateGas({
				to: normalizeAddress(contractAddress),
				data,
			});

			const gasPrice = await roninClient.getGasPrice();

			return {
				contract: normalizeAddress(contractAddress),
				function: functionName,
				gasEstimate: gasEstimate.toString(),
				gasPriceGwei: gasPrice.gwei,
				estimatedCostWei: (gasEstimate * BigInt(gasPrice.wei)).toString(),
			};
		}

		default:
			throw new Error(`Unknown operation: ${operation}`);
	}
}
