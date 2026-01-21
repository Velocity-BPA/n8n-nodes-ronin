/**
 * Ronin Bridge Client
 * Client for Ethereum <-> Ronin bridge operations
 */

import axios, { AxiosInstance } from 'axios';
import { ethers } from 'ethers';
import { IExecuteFunctions, ILoadOptionsFunctions } from 'n8n-workflow';
import { MAINNET_CONTRACTS } from '../constants/contracts';
import { normalizeAddress } from '../utils/addressUtils';
import { ronToWei, weiToRon } from '../utils/unitConverter';
import { RoninClient } from './roninClient';

/**
 * Bridge transaction status
 */
export type BridgeStatus = 
	| 'pending'
	| 'processing'
	| 'completed'
	| 'failed';

/**
 * Bridge transaction data
 */
export interface BridgeTransaction {
	id: string;
	type: 'deposit' | 'withdrawal';
	from: string;
	to: string;
	token: string;
	amount: string;
	status: BridgeStatus;
	txHash?: string;
	roninTxHash?: string;
	ethereumTxHash?: string;
	createdAt: number;
	completedAt?: number;
}

/**
 * Bridge limits
 */
export interface BridgeLimits {
	minDeposit: string;
	maxDeposit: string;
	minWithdrawal: string;
	maxWithdrawal: string;
	dailyLimit: string;
	dailyUsed: string;
}

/**
 * Supported bridge token
 */
export interface BridgeToken {
	symbol: string;
	name: string;
	roninAddress: string;
	ethereumAddress: string;
	decimals: number;
	minAmount: string;
	maxAmount: string;
}

/**
 * Bridge Gateway ABI
 */
const BRIDGE_ABI = [
	'function depositFor(address recipient) payable',
	'function depositERC20For(address token, address recipient, uint256 amount)',
	'function requestWithdrawal(address token, uint256 amount)',
	'function submitWithdrawal(uint256 withdrawalId, bytes32[] calldata proof)',
	'function getPendingWithdrawal(uint256 withdrawalId) view returns (tuple(address owner, address token, uint256 amount, uint256 timestamp))',
	'function getWithdrawalStatus(uint256 withdrawalId) view returns (uint8)',
	'event Deposited(address indexed token, address indexed from, address indexed to, uint256 amount)',
	'event WithdrawalRequested(uint256 indexed withdrawalId, address indexed owner, address indexed token, uint256 amount)',
	'event WithdrawalCompleted(uint256 indexed withdrawalId)',
];

/**
 * Bridge Client Options
 */
export interface BridgeClientOptions {
	roninClient?: RoninClient;
	ethereumRpcUrl?: string;
}

/**
 * Ronin Bridge Client
 */
export class BridgeClient {
	private httpClient: AxiosInstance;
	private roninClient?: RoninClient;
	private ethereumProvider?: ethers.JsonRpcProvider;

	constructor(options: BridgeClientOptions = {}) {
		this.httpClient = axios.create({
			baseURL: 'https://bridge.roninchain.com/api',
			headers: {
				'Content-Type': 'application/json',
			},
		});

		if (options.roninClient) {
			this.roninClient = options.roninClient;
		}

		if (options.ethereumRpcUrl) {
			this.ethereumProvider = new ethers.JsonRpcProvider(options.ethereumRpcUrl);
		}
	}

	/**
	 * Set Ronin client
	 */
	setRoninClient(client: RoninClient): void {
		this.roninClient = client;
	}

	/**
	 * Set Ethereum provider
	 */
	setEthereumProvider(rpcUrl: string): void {
		this.ethereumProvider = new ethers.JsonRpcProvider(rpcUrl);
	}

	/**
	 * Get bridge status
	 */
	async getBridgeStatus(): Promise<{
		operational: boolean;
		depositEnabled: boolean;
		withdrawalEnabled: boolean;
		maintenanceMessage?: string;
	}> {
		const response = await this.httpClient.get('/status');
		return response.data;
	}

	/**
	 * Get supported tokens for bridging
	 */
	async getSupportedTokens(): Promise<BridgeToken[]> {
		const response = await this.httpClient.get('/tokens');
		return response.data;
	}

	/**
	 * Get bridge limits
	 */
	async getBridgeLimits(token: string = 'RON'): Promise<BridgeLimits> {
		const response = await this.httpClient.get(`/limits/${token}`);
		return response.data;
	}

	/**
	 * Get bridge transaction by ID
	 */
	async getBridgeTransaction(txId: string): Promise<BridgeTransaction> {
		const response = await this.httpClient.get(`/transactions/${txId}`);
		return response.data;
	}

	/**
	 * Get pending bridge transactions for user
	 */
	async getPendingTransactions(
		userAddress: string
	): Promise<BridgeTransaction[]> {
		const normalizedAddress = normalizeAddress(userAddress);
		
		const response = await this.httpClient.get('/transactions/pending', {
			params: { address: normalizedAddress },
		});
		return response.data;
	}

	/**
	 * Get bridge history for user
	 */
	async getBridgeHistory(
		userAddress: string,
		params?: {
			type?: 'deposit' | 'withdrawal';
			from?: number;
			size?: number;
		}
	): Promise<{ total: number; transactions: BridgeTransaction[] }> {
		const normalizedAddress = normalizeAddress(userAddress);
		
		const response = await this.httpClient.get('/transactions/history', {
			params: {
				...params,
				address: normalizedAddress,
			},
		});
		return response.data;
	}

	/**
	 * Estimate bridge fee
	 */
	async estimateBridgeFee(params: {
		type: 'deposit' | 'withdrawal';
		token: string;
		amount: string;
	}): Promise<{
		bridgeFee: string;
		gasFee: string;
		totalFee: string;
		estimatedTime: number;
	}> {
		const response = await this.httpClient.post('/estimate', params);
		return response.data;
	}

	/**
	 * Initiate deposit from Ethereum to Ronin
	 * Note: This requires an Ethereum wallet/signer
	 */
	async initiateDeposit(params: {
		token: string;
		amount: string;
		recipient?: string;
	}): Promise<{
		txHash: string;
		estimatedCompletionTime: number;
	}> {
		if (!this.ethereumProvider) {
			throw new Error('Ethereum provider required for deposits');
		}

		// This would require Ethereum wallet integration
		// Simplified for demonstration
		throw new Error(
			'Direct deposit requires Ethereum wallet integration. ' +
			'Please use the Ronin Bridge UI at https://bridge.roninchain.com'
		);
	}

	/**
	 * Request withdrawal from Ronin to Ethereum
	 */
	async requestWithdrawal(params: {
		token: string;
		amount: string;
	}): Promise<{
		withdrawalId: string;
		txHash: string;
		status: BridgeStatus;
	}> {
		if (!this.roninClient) {
			throw new Error('Ronin client required for withdrawals');
		}

		const wallet = this.roninClient.getWallet();
		if (!wallet) {
			throw new Error('Wallet required for withdrawals');
		}

		// Get token address
		const tokens = await this.getSupportedTokens();
		const tokenInfo = tokens.find(
			(t) => t.symbol.toUpperCase() === params.token.toUpperCase()
		);

		if (!tokenInfo) {
			throw new Error(`Unsupported token: ${params.token}`);
		}

		// Create bridge contract instance
		const bridgeContract = new ethers.Contract(
			MAINNET_CONTRACTS.BRIDGE_GATEWAY,
			BRIDGE_ABI,
			wallet
		);

		// Request withdrawal
		const amount = ethers.parseUnits(params.amount, tokenInfo.decimals);
		const tx = await bridgeContract.requestWithdrawal(
			tokenInfo.roninAddress,
			amount
		);

		const receipt = await tx.wait();

		// Parse withdrawal ID from event
		const event = receipt.logs.find(
			(log: ethers.Log) => {
				try {
					const parsed = bridgeContract.interface.parseLog({
						topics: [...log.topics],
						data: log.data,
					});
					return parsed?.name === 'WithdrawalRequested';
				} catch {
					return false;
				}
			}
		);

		const withdrawalId = event ? 
			bridgeContract.interface.parseLog({
				topics: [...event.topics],
				data: event.data,
			})?.args?.withdrawalId?.toString() : 
			'unknown';

		return {
			withdrawalId,
			txHash: tx.hash,
			status: 'pending',
		};
	}

	/**
	 * Get withdrawal status
	 */
	async getWithdrawalStatus(withdrawalId: string): Promise<{
		status: BridgeStatus;
		canClaim: boolean;
		proof?: string[];
	}> {
		const response = await this.httpClient.get(
			`/withdrawals/${withdrawalId}/status`
		);
		return response.data;
	}

	/**
	 * Complete withdrawal (claim on Ethereum)
	 */
	async completeWithdrawal(withdrawalId: string): Promise<{
		txHash: string;
		status: BridgeStatus;
	}> {
		if (!this.ethereumProvider) {
			throw new Error('Ethereum provider required to complete withdrawal');
		}

		// Get withdrawal proof
		const { proof, canClaim } = await this.getWithdrawalStatus(withdrawalId);

		if (!canClaim) {
			throw new Error('Withdrawal not ready to claim yet');
		}

		if (!proof) {
			throw new Error('Withdrawal proof not available');
		}

		// This would require Ethereum wallet integration
		// Simplified for demonstration
		throw new Error(
			'Completing withdrawal requires Ethereum wallet integration. ' +
			'Please use the Ronin Bridge UI at https://bridge.roninchain.com'
		);
	}

	/**
	 * Get bridge transactions count
	 */
	async getBridgeStats(): Promise<{
		totalDeposits: number;
		totalWithdrawals: number;
		totalVolumeDeposited: string;
		totalVolumeWithdrawn: string;
		averageDepositTime: number;
		averageWithdrawalTime: number;
	}> {
		const response = await this.httpClient.get('/stats');
		return response.data;
	}
}

/**
 * Create bridge client from n8n context
 */
export async function createBridgeClient(
	context: IExecuteFunctions | ILoadOptionsFunctions,
	roninClient?: RoninClient
): Promise<BridgeClient> {
	const client = new BridgeClient();
	
	if (roninClient) {
		client.setRoninClient(roninClient);
	}

	return client;
}
