/**
 * Ronin RPC Client
 * EVM-compatible client for interacting with Ronin blockchain
 */

import { ethers } from 'ethers';
import { IExecuteFunctions, ILoadOptionsFunctions } from 'n8n-workflow';
import { NETWORKS, NetworkConfig, getRpcUrl } from '../constants/networks';
import { ERC20_ABI, ERC721_ABI, getContracts } from '../constants/contracts';
import { normalizeAddress, roninToHex, hexToRonin } from '../utils/addressUtils';
import { weiToRon, ronToWei, formatUnits, parseUnits } from '../utils/unitConverter';

/**
 * Connection options for RPC client
 */
export interface RoninClientOptions {
	network: 'mainnet' | 'testnet' | 'custom';
	rpcUrl?: string;
	privateKey?: string;
	walletAddress?: string;
}

/**
 * Transaction result
 */
export interface TransactionResult {
	hash: string;
	blockNumber?: number;
	blockHash?: string;
	from: string;
	to: string;
	value: string;
	gasUsed?: string;
	status?: boolean;
}

/**
 * Ronin RPC Client class
 */
export class RoninClient {
	private provider: ethers.JsonRpcProvider;
	private wallet?: ethers.Wallet;
	private network: string;
	private config: NetworkConfig;

	constructor(options: RoninClientOptions) {
		this.network = options.network;
		
		// Get RPC URL
		const rpcUrl = options.network === 'custom' 
			? options.rpcUrl 
			: NETWORKS[options.network]?.rpcUrl;
		
		if (!rpcUrl) {
			throw new Error(`Invalid network or missing RPC URL: ${options.network}`);
		}

		// Get network config
		this.config = options.network === 'custom'
			? { ...NETWORKS.mainnet, rpcUrl: rpcUrl }
			: NETWORKS[options.network];

		// Create provider
		this.provider = new ethers.JsonRpcProvider(rpcUrl, {
			chainId: this.config.chainId,
			name: this.config.name,
		});

		// Create wallet if private key provided
		if (options.privateKey) {
			this.wallet = new ethers.Wallet(options.privateKey, this.provider);
		}
	}

	/**
	 * Get provider instance
	 */
	getProvider(): ethers.JsonRpcProvider {
		return this.provider;
	}

	/**
	 * Get wallet instance
	 */
	getWallet(): ethers.Wallet | undefined {
		return this.wallet;
	}

	/**
	 * Get wallet address
	 */
	getAddress(): string | undefined {
		return this.wallet?.address;
	}

	/**
	 * Get signer (wallet or provider)
	 */
	getSigner(): ethers.Wallet {
		if (!this.wallet) {
			throw new Error('No wallet configured. Private key required for signing.');
		}
		return this.wallet;
	}

	/**
	 * Get RON balance
	 */
	async getRonBalance(address: string): Promise<{
		wei: string;
		ron: string;
		formatted: string;
	}> {
		const normalizedAddress = normalizeAddress(address);
		const balance = await this.provider.getBalance(normalizedAddress);
		
		return {
			wei: balance.toString(),
			ron: weiToRon(balance),
			formatted: `${parseFloat(weiToRon(balance)).toFixed(4)} RON`,
		};
	}

	/**
	 * Get ERC20 token balance
	 */
	async getTokenBalance(
		tokenAddress: string,
		walletAddress: string
	): Promise<{
		raw: string;
		formatted: string;
		symbol: string;
		decimals: number;
	}> {
		const contract = new ethers.Contract(
			normalizeAddress(tokenAddress),
			ERC20_ABI,
			this.provider
		);

		const [balance, symbol, decimals] = await Promise.all([
			contract.balanceOf(normalizeAddress(walletAddress)),
			contract.symbol(),
			contract.decimals(),
		]);

		return {
			raw: balance.toString(),
			formatted: formatUnits(balance, decimals),
			symbol,
			decimals: Number(decimals),
		};
	}

	/**
	 * Transfer RON
	 */
	async transferRon(
		to: string,
		amount: string
	): Promise<TransactionResult> {
		const signer = this.getSigner();
		const toAddress = normalizeAddress(to);
		const value = ronToWei(amount);

		const tx = await signer.sendTransaction({
			to: toAddress,
			value,
		});

		const receipt = await tx.wait();

		return {
			hash: tx.hash,
			blockNumber: receipt?.blockNumber,
			blockHash: receipt?.blockHash,
			from: tx.from,
			to: tx.to || toAddress,
			value: amount,
			gasUsed: receipt?.gasUsed?.toString(),
			status: receipt?.status === 1,
		};
	}

	/**
	 * Transfer ERC20 token
	 */
	async transferToken(
		tokenAddress: string,
		to: string,
		amount: string,
		decimals?: number
	): Promise<TransactionResult> {
		const signer = this.getSigner();
		const contract = new ethers.Contract(
			normalizeAddress(tokenAddress),
			ERC20_ABI,
			signer
		);

		// Get decimals if not provided
		const tokenDecimals = decimals ?? Number(await contract.decimals());
		const parsedAmount = parseUnits(amount, tokenDecimals);
		const toAddress = normalizeAddress(to);

		const tx = await contract.transfer(toAddress, parsedAmount);
		const receipt = await tx.wait();

		return {
			hash: tx.hash,
			blockNumber: receipt?.blockNumber,
			blockHash: receipt?.blockHash,
			from: await signer.getAddress(),
			to: toAddress,
			value: amount,
			gasUsed: receipt?.gasUsed?.toString(),
			status: receipt?.status === 1,
		};
	}

	/**
	 * Get NFT owner
	 */
	async getNftOwner(
		contractAddress: string,
		tokenId: string
	): Promise<string> {
		const contract = new ethers.Contract(
			normalizeAddress(contractAddress),
			ERC721_ABI,
			this.provider
		);

		const owner = await contract.ownerOf(tokenId);
		return hexToRonin(owner);
	}

	/**
	 * Transfer NFT
	 */
	async transferNft(
		contractAddress: string,
		to: string,
		tokenId: string
	): Promise<TransactionResult> {
		const signer = this.getSigner();
		const contract = new ethers.Contract(
			normalizeAddress(contractAddress),
			ERC721_ABI,
			signer
		);

		const from = await signer.getAddress();
		const toAddress = normalizeAddress(to);

		const tx = await contract.transferFrom(from, toAddress, tokenId);
		const receipt = await tx.wait();

		return {
			hash: tx.hash,
			blockNumber: receipt?.blockNumber,
			blockHash: receipt?.blockHash,
			from,
			to: toAddress,
			value: tokenId,
			gasUsed: receipt?.gasUsed?.toString(),
			status: receipt?.status === 1,
		};
	}

	/**
	 * Get latest block
	 */
	async getLatestBlock(): Promise<ethers.Block | null> {
		return this.provider.getBlock('latest');
	}

	/**
	 * Get block by number or hash
	 */
	async getBlock(blockHashOrNumber: string | number): Promise<ethers.Block | null> {
		return this.provider.getBlock(blockHashOrNumber);
	}

	/**
	 * Get transaction
	 */
	async getTransaction(hash: string): Promise<ethers.TransactionResponse | null> {
		return this.provider.getTransaction(hash);
	}

	/**
	 * Get transaction receipt
	 */
	async getTransactionReceipt(hash: string): Promise<ethers.TransactionReceipt | null> {
		return this.provider.getTransactionReceipt(hash);
	}

	/**
	 * Get gas price
	 */
	async getGasPrice(): Promise<{
		wei: string;
		gwei: string;
	}> {
		const feeData = await this.provider.getFeeData();
		const gasPrice = feeData.gasPrice || BigInt(0);
		
		return {
			wei: gasPrice.toString(),
			gwei: ethers.formatUnits(gasPrice, 'gwei'),
		};
	}

	/**
	 * Estimate gas for transaction
	 */
	async estimateGas(tx: ethers.TransactionRequest): Promise<string> {
		const gas = await this.provider.estimateGas(tx);
		return gas.toString();
	}

	/**
	 * Read contract method
	 */
	async readContract(
		contractAddress: string,
		abi: string[],
		methodName: string,
		params: unknown[] = []
	): Promise<unknown> {
		const contract = new ethers.Contract(
			normalizeAddress(contractAddress),
			abi,
			this.provider
		);

		return contract[methodName](...params);
	}

	/**
	 * Write contract method
	 */
	async writeContract(
		contractAddress: string,
		abi: string[],
		methodName: string,
		params: unknown[] = [],
		value?: string
	): Promise<TransactionResult> {
		const signer = this.getSigner();
		const contract = new ethers.Contract(
			normalizeAddress(contractAddress),
			abi,
			signer
		);

		const options: { value?: bigint } = {};
		if (value) {
			options.value = ronToWei(value);
		}

		const tx = await contract[methodName](...params, options);
		const receipt = await tx.wait();

		return {
			hash: tx.hash,
			blockNumber: receipt?.blockNumber,
			blockHash: receipt?.blockHash,
			from: await signer.getAddress(),
			to: contractAddress,
			value: value || '0',
			gasUsed: receipt?.gasUsed?.toString(),
			status: receipt?.status === 1,
		};
	}

	/**
	 * Get chain ID
	 */
	async getChainId(): Promise<number> {
		const network = await this.provider.getNetwork();
		return Number(network.chainId);
	}

	/**
	 * Check if connected
	 */
	async isConnected(): Promise<boolean> {
		try {
			await this.provider.getBlockNumber();
			return true;
		} catch {
			return false;
		}
	}

	/**
	 * Sign message
	 */
	async signMessage(message: string): Promise<string> {
		const signer = this.getSigner();
		return signer.signMessage(message);
	}

	/**
	 * Verify signature
	 */
	verifySignature(message: string, signature: string): string {
		return ethers.verifyMessage(message, signature);
	}
}

/**
 * Create Ronin client from n8n credentials
 */
export async function createRoninClient(
	context: IExecuteFunctions | ILoadOptionsFunctions,
	credentialsName: string = 'roninNetwork'
): Promise<RoninClient> {
	const credentials = await context.getCredentials(credentialsName);
	
	const options: RoninClientOptions = {
		network: credentials.network as 'mainnet' | 'testnet' | 'custom',
		rpcUrl: credentials.rpcUrl as string | undefined,
		privateKey: credentials.privateKey as string | undefined,
		walletAddress: credentials.walletAddress as string | undefined,
	};

	return new RoninClient(options);
}
