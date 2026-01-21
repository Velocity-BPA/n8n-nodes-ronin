import { INodeProperties, IExecuteFunctions } from 'n8n-workflow';
import { createRoninClient } from '../../transport/roninClient';
import { 
	normalizeAddress, 
	hexToRonin, 
	roninToHex, 
	isValidAddress,
	isRoninFormat,
	isHexFormat 
} from '../../utils/addressUtils';
import { 
	weiToRon, 
	ronToWei, 
	formatUnits, 
	parseUnits,
	gweiToWei,
	weiToGwei 
} from '../../utils/unitConverter';
import { 
	isValidGene,
	decodeGenes,
	calculatePurity 
} from '../../utils/geneUtils';
import { MAINNET, TESTNET } from '../../constants/networks';
import { ethers } from 'ethers';

export const utilityOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['utility'],
			},
		},
		options: [
			{ name: 'Convert Units', value: 'convertUnits', description: 'Convert between wei, gwei, and RON', action: 'Convert units' },
			{ name: 'Convert Address', value: 'convertAddress', description: 'Convert between ronin: and 0x format', action: 'Convert address' },
			{ name: 'Validate Address', value: 'validateAddress', description: 'Validate a Ronin address', action: 'Validate address' },
			{ name: 'Sign Message', value: 'signMessage', description: 'Sign a message with wallet', action: 'Sign message' },
			{ name: 'Verify Signature', value: 'verifySignature', description: 'Verify a signed message', action: 'Verify signature' },
			{ name: 'Get Network Status', value: 'getNetworkStatus', description: 'Get network information', action: 'Get network status' },
			{ name: 'Hash Data', value: 'hashData', description: 'Hash data with keccak256', action: 'Hash data' },
			{ name: 'Encode ABI', value: 'encodeAbi', description: 'Encode function call data', action: 'Encode ABI' },
			{ name: 'Decode ABI', value: 'decodeAbi', description: 'Decode ABI encoded data', action: 'Decode ABI' },
			{ name: 'Validate Axie Genes', value: 'validateGenes', description: 'Validate and decode Axie genes', action: 'Validate Axie genes' },
			{ name: 'Generate Wallet', value: 'generateWallet', description: 'Generate a new wallet', action: 'Generate wallet' },
			{ name: 'Get Chain Info', value: 'getChainInfo', description: 'Get chain configuration', action: 'Get chain info' },
		],
		default: 'convertUnits',
	},
];

export const utilityFields: INodeProperties[] = [
	// Unit conversion fields
	{
		displayName: 'Amount',
		name: 'amount',
		type: 'string',
		default: '',
		required: true,
		placeholder: '1000000000000000000',
		description: 'Amount to convert',
		displayOptions: {
			show: {
				resource: ['utility'],
				operation: ['convertUnits'],
			},
		},
	},
	{
		displayName: 'From Unit',
		name: 'fromUnit',
		type: 'options',
		default: 'wei',
		options: [
			{ name: 'Wei', value: 'wei' },
			{ name: 'Gwei', value: 'gwei' },
			{ name: 'RON', value: 'ron' },
		],
		displayOptions: {
			show: {
				resource: ['utility'],
				operation: ['convertUnits'],
			},
		},
	},
	{
		displayName: 'To Unit',
		name: 'toUnit',
		type: 'options',
		default: 'ron',
		options: [
			{ name: 'Wei', value: 'wei' },
			{ name: 'Gwei', value: 'gwei' },
			{ name: 'RON', value: 'ron' },
		],
		displayOptions: {
			show: {
				resource: ['utility'],
				operation: ['convertUnits'],
			},
		},
	},
	// Address fields
	{
		displayName: 'Address',
		name: 'address',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'ronin:1234... or 0x1234...',
		description: 'Address to convert or validate',
		displayOptions: {
			show: {
				resource: ['utility'],
				operation: ['convertAddress', 'validateAddress'],
			},
		},
	},
	// Message signing fields
	{
		displayName: 'Message',
		name: 'message',
		type: 'string',
		default: '',
		required: true,
		description: 'Message to sign or verify',
		displayOptions: {
			show: {
				resource: ['utility'],
				operation: ['signMessage', 'verifySignature'],
			},
		},
	},
	{
		displayName: 'Signature',
		name: 'signature',
		type: 'string',
		default: '',
		required: true,
		placeholder: '0x...',
		description: 'Signature to verify',
		displayOptions: {
			show: {
				resource: ['utility'],
				operation: ['verifySignature'],
			},
		},
	},
	{
		displayName: 'Signer Address',
		name: 'signerAddress',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'ronin:1234... or 0x1234...',
		description: 'Expected signer address',
		displayOptions: {
			show: {
				resource: ['utility'],
				operation: ['verifySignature'],
			},
		},
	},
	// Hash fields
	{
		displayName: 'Data',
		name: 'data',
		type: 'string',
		default: '',
		required: true,
		description: 'Data to hash (text or hex)',
		displayOptions: {
			show: {
				resource: ['utility'],
				operation: ['hashData'],
			},
		},
	},
	{
		displayName: 'Is Hex',
		name: 'isHex',
		type: 'boolean',
		default: false,
		description: 'Whether the input is hex encoded',
		displayOptions: {
			show: {
				resource: ['utility'],
				operation: ['hashData'],
			},
		},
	},
	// ABI fields
	{
		displayName: 'ABI',
		name: 'abi',
		type: 'json',
		default: '[]',
		required: true,
		description: 'Function ABI',
		displayOptions: {
			show: {
				resource: ['utility'],
				operation: ['encodeAbi', 'decodeAbi'],
			},
		},
	},
	{
		displayName: 'Function Name',
		name: 'functionName',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'transfer',
		description: 'Function name to encode',
		displayOptions: {
			show: {
				resource: ['utility'],
				operation: ['encodeAbi'],
			},
		},
	},
	{
		displayName: 'Arguments',
		name: 'args',
		type: 'json',
		default: '[]',
		description: 'Function arguments as JSON array',
		displayOptions: {
			show: {
				resource: ['utility'],
				operation: ['encodeAbi'],
			},
		},
	},
	{
		displayName: 'Encoded Data',
		name: 'encodedData',
		type: 'string',
		default: '',
		required: true,
		placeholder: '0x...',
		description: 'Encoded data to decode',
		displayOptions: {
			show: {
				resource: ['utility'],
				operation: ['decodeAbi'],
			},
		},
	},
	// Gene validation
	{
		displayName: 'Genes',
		name: 'genes',
		type: 'string',
		default: '',
		required: true,
		placeholder: '0x...',
		description: 'Axie genes (256-bit hex string)',
		displayOptions: {
			show: {
				resource: ['utility'],
				operation: ['validateGenes'],
			},
		},
	},
];

export async function executeUtility(this: IExecuteFunctions, index: number): Promise<unknown> {
	const operation = this.getNodeParameter('operation', index) as string;

	switch (operation) {
		case 'convertUnits': {
			const amount = this.getNodeParameter('amount', index) as string;
			const fromUnit = this.getNodeParameter('fromUnit', index) as string;
			const toUnit = this.getNodeParameter('toUnit', index) as string;
			
			let weiValue: bigint;
			
			// Convert to wei first
			switch (fromUnit) {
				case 'wei':
					weiValue = BigInt(amount);
					break;
				case 'gwei':
					weiValue = gweiToWei(amount);
					break;
				case 'ron':
					weiValue = BigInt(ronToWei(amount));
					break;
				default:
					throw new Error(`Unknown unit: ${fromUnit}`);
			}
			
			// Convert from wei to target
			let result: string;
			switch (toUnit) {
				case 'wei':
					result = weiValue.toString();
					break;
				case 'gwei':
					result = weiToGwei(weiValue.toString());
					break;
				case 'ron':
					result = weiToRon(weiValue.toString());
					break;
				default:
					throw new Error(`Unknown unit: ${toUnit}`);
			}
			
			return {
				input: amount,
				fromUnit,
				toUnit,
				result,
				weiValue: weiValue.toString(),
			};
		}

		case 'convertAddress': {
			const address = this.getNodeParameter('address', index) as string;
			
			if (!isValidAddress(address)) {
				throw new Error('Invalid address format');
			}
			
			const normalized = normalizeAddress(address);
			
			return {
				input: address,
				inputFormat: isRoninFormat(address) ? 'ronin' : 'hex',
				hex: normalized,
				ronin: hexToRonin(normalized),
				checksummed: normalized,
			};
		}

		case 'validateAddress': {
			const address = this.getNodeParameter('address', index) as string;
			
			const isValid = isValidAddress(address);
			const isRonin = isRoninFormat(address);
			const isHex = isHexFormat(address);
			
			return {
				address,
				isValid,
				format: isRonin ? 'ronin' : isHex ? 'hex' : 'unknown',
				normalized: isValid ? normalizeAddress(address) : null,
				roninFormat: isValid ? hexToRonin(normalizeAddress(address)) : null,
			};
		}

		case 'signMessage': {
			const message = this.getNodeParameter('message', index) as string;
			const roninClient = await createRoninClient(this);
			
			const signature = await roninClient.signMessage(message);
			const signer = roninClient.getAddress();
			
			return {
				message,
				signature,
				signer: signer ? hexToRonin(signer) : 'unknown',
			};
		}

		case 'verifySignature': {
			const message = this.getNodeParameter('message', index) as string;
			const signature = this.getNodeParameter('signature', index) as string;
			const signerAddress = this.getNodeParameter('signerAddress', index) as string;
			
			const roninClient = await createRoninClient(this);
			const recoveredAddress = roninClient.verifySignature(message, signature);
			const normalizedSigner = normalizeAddress(signerAddress);
			const isValid = recoveredAddress.toLowerCase() === normalizedSigner.toLowerCase();
			
			return {
				message,
				signature,
				expectedSigner: hexToRonin(normalizedSigner),
				recoveredSigner: hexToRonin(recoveredAddress),
				isValid,
			};
		}

		case 'getNetworkStatus': {
			const roninClient = await createRoninClient(this);
			const provider = roninClient.getProvider();
			
			const [blockNumber, network, feeData] = await Promise.all([
				provider.getBlockNumber(),
				provider.getNetwork(),
				provider.getFeeData(),
			]);
			
			return {
				chainId: network.chainId.toString(),
				networkName: network.chainId === BigInt(2020) ? 'Ronin Mainnet' : 'Ronin Testnet',
				currentBlock: blockNumber,
				gasPrice: feeData.gasPrice?.toString(),
				gasPriceGwei: weiToGwei(feeData.gasPrice?.toString() || '0'),
			};
		}

		case 'hashData': {
			const data = this.getNodeParameter('data', index) as string;
			const isHex = this.getNodeParameter('isHex', index) as boolean;
			
			let hash: string;
			if (isHex) {
				hash = ethers.keccak256(data);
			} else {
				hash = ethers.keccak256(ethers.toUtf8Bytes(data));
			}
			
			return {
				input: data,
				isHex,
				keccak256: hash,
			};
		}

		case 'encodeAbi': {
			const abiInput = this.getNodeParameter('abi', index) as string | object;
			const functionName = this.getNodeParameter('functionName', index) as string;
			const argsInput = this.getNodeParameter('args', index) as string | unknown[];
			
			const abi = typeof abiInput === 'string' ? JSON.parse(abiInput) : abiInput;
			const args = typeof argsInput === 'string' ? JSON.parse(argsInput) : argsInput;
			
			const iface = new ethers.Interface(abi);
			const encoded = iface.encodeFunctionData(functionName, args);
			
			return {
				function: functionName,
				args,
				encoded,
				selector: encoded.substring(0, 10),
			};
		}

		case 'decodeAbi': {
			const abiInput = this.getNodeParameter('abi', index) as string | object;
			const encodedData = this.getNodeParameter('encodedData', index) as string;
			
			const abi = typeof abiInput === 'string' ? JSON.parse(abiInput) : abiInput;
			
			const iface = new ethers.Interface(abi);
			const decoded = iface.parseTransaction({ data: encodedData });
			
			return {
				function: decoded?.name,
				args: decoded?.args.map(arg => arg.toString()),
				selector: decoded?.selector,
				signature: decoded?.signature,
			};
		}

		case 'validateGenes': {
			const genes = this.getNodeParameter('genes', index) as string;
			
			const isValid = isValidGene(genes);
			
			if (!isValid) {
				return {
					genes,
					isValid: false,
					message: 'Invalid gene format. Expected 256-bit hex string (64 characters after 0x)',
				};
			}
			
			const decoded = decodeGenes(genes);
			const purity = calculatePurity(decoded);
			
			return {
				genes,
				isValid: true,
				class: decoded.class,
				eyes: decoded.eyes,
				ears: decoded.ears,
				mouth: decoded.mouth,
				horn: decoded.horn,
				back: decoded.back,
				tail: decoded.tail,
				purity: `${purity.toFixed(1)}%`,
				pattern: decoded.pattern,
				color: decoded.color,
			};
		}

		case 'generateWallet': {
			const wallet = ethers.Wallet.createRandom();
			
			return {
				address: hexToRonin(wallet.address),
				addressHex: wallet.address,
				privateKey: wallet.privateKey,
				mnemonic: wallet.mnemonic?.phrase,
				warning: 'NEVER share your private key or mnemonic phrase. Store them securely.',
			};
		}

		case 'getChainInfo': {
			return {
				mainnet: {
					chainId: MAINNET.chainId,
					name: MAINNET.name,
					rpcUrl: MAINNET.rpcUrl,
					explorer: MAINNET.explorer,
					currency: MAINNET.nativeCurrency,
				},
				testnet: {
					chainId: TESTNET.chainId,
					name: TESTNET.name,
					rpcUrl: TESTNET.rpcUrl,
					explorer: TESTNET.explorer,
					currency: TESTNET.nativeCurrency,
				},
			};
		}

		default:
			throw new Error(`Unknown operation: ${operation}`);
	}
}
