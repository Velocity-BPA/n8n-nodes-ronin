import { INodeProperties, IExecuteFunctions } from 'n8n-workflow';
import { createRoninClient } from '../../transport/roninClient';
import { normalizeAddress, hexToRonin } from '../../utils/addressUtils';
import { MAINNET_CONTRACTS } from '../../constants/contracts';
import { ronToWei, weiToRon } from '../../utils/unitConverter';

export const stakingOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['staking'],
			},
		},
		options: [
			{ name: 'Get Staking Info', value: 'getStakingInfo', description: 'Get staking information for address', action: 'Get staking info' },
			{ name: 'Get Validators', value: 'getValidators', description: 'Get list of validators', action: 'Get validators' },
			{ name: 'Get Validator Info', value: 'getValidatorInfo', description: 'Get specific validator details', action: 'Get validator info' },
			{ name: 'Stake RON', value: 'stake', description: 'Stake RON with validator', action: 'Stake RON' },
			{ name: 'Unstake RON', value: 'unstake', description: 'Unstake RON from validator', action: 'Unstake RON' },
			{ name: 'Delegate', value: 'delegate', description: 'Delegate to validator', action: 'Delegate' },
			{ name: 'Undelegate', value: 'undelegate', description: 'Undelegate from validator', action: 'Undelegate' },
			{ name: 'Get Delegation Info', value: 'getDelegationInfo', description: 'Get delegation details', action: 'Get delegation info' },
			{ name: 'Get Staking Rewards', value: 'getRewards', description: 'Get pending staking rewards', action: 'Get staking rewards' },
			{ name: 'Claim Rewards', value: 'claimRewards', description: 'Claim staking rewards', action: 'Claim rewards' },
			{ name: 'Get APY', value: 'getApy', description: 'Get current staking APY', action: 'Get APY' },
		],
		default: 'getStakingInfo',
	},
];

export const stakingFields: INodeProperties[] = [
	{
		displayName: 'Address',
		name: 'address',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'ronin:1234... or 0x1234...',
		description: 'Wallet address',
		displayOptions: {
			show: {
				resource: ['staking'],
				operation: ['getStakingInfo', 'getDelegationInfo', 'getRewards'],
			},
		},
	},
	{
		displayName: 'Validator Address',
		name: 'validatorAddress',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'ronin:1234... or 0x1234...',
		description: 'Validator address',
		displayOptions: {
			show: {
				resource: ['staking'],
				operation: ['getValidatorInfo', 'stake', 'unstake', 'delegate', 'undelegate'],
			},
		},
	},
	{
		displayName: 'Amount',
		name: 'amount',
		type: 'string',
		default: '',
		required: true,
		placeholder: '100',
		description: 'Amount of RON to stake/unstake',
		displayOptions: {
			show: {
				resource: ['staking'],
				operation: ['stake', 'unstake', 'delegate', 'undelegate'],
			},
		},
	},
];

export async function executeStaking(this: IExecuteFunctions, index: number): Promise<unknown> {
	const operation = this.getNodeParameter('operation', index) as string;
	const roninClient = await createRoninClient(this);

	switch (operation) {
		case 'getStakingInfo': {
			const address = this.getNodeParameter('address', index) as string;
			
			try {
				const stakingAmount = await roninClient.readContract(
					MAINNET_CONTRACTS.RON_STAKING,
					['function getStakingTotal(address) view returns (uint256)'],
					'getStakingTotal',
					[normalizeAddress(address)]
				) as bigint;
				
				return {
					address: hexToRonin(normalizeAddress(address)),
					totalStaked: weiToRon(stakingAmount.toString()),
					stakingContract: MAINNET_CONTRACTS.RON_STAKING,
				};
			} catch {
				return {
					address: hexToRonin(normalizeAddress(address)),
					message: 'Unable to fetch staking info - contract interaction required',
					stakingContract: MAINNET_CONTRACTS.RON_STAKING,
				};
			}
		}

		case 'getValidators': {
			try {
				const validators = await roninClient.readContract(
					MAINNET_CONTRACTS.RON_STAKING,
					['function getValidators() view returns (address[])'],
					'getValidators',
					[]
				) as string[];
				
				return {
					count: validators.length,
					validators: validators.map((v: string) => ({
						address: hexToRonin(v),
					})),
					stakingContract: MAINNET_CONTRACTS.RON_STAKING,
				};
			} catch {
				// Return known validators as fallback
				return {
					message: 'Unable to fetch validators dynamically',
					knownValidators: [
						{ name: 'Sky Mavis', type: 'Standard' },
						{ name: 'Binance', type: 'Standard' },
						{ name: 'Animoca Brands', type: 'Standard' },
					],
					stakingContract: MAINNET_CONTRACTS.RON_STAKING,
					stakingUrl: 'https://app.roninchain.com/staking',
				};
			}
		}

		case 'getValidatorInfo': {
			const validatorAddress = this.getNodeParameter('validatorAddress', index) as string;
			
			try {
				const [totalStaked, commission] = await Promise.all([
					roninClient.readContract(
						MAINNET_CONTRACTS.RON_STAKING,
						['function getValidatorStake(address) view returns (uint256)'],
						'getValidatorStake',
						[normalizeAddress(validatorAddress)]
					) as Promise<bigint>,
					roninClient.readContract(
						MAINNET_CONTRACTS.RON_STAKING,
						['function getCommissionRate(address) view returns (uint256)'],
						'getCommissionRate',
						[normalizeAddress(validatorAddress)]
					) as Promise<bigint>,
				]);
				
				return {
					validator: hexToRonin(normalizeAddress(validatorAddress)),
					totalStaked: weiToRon(totalStaked.toString()),
					commissionRate: `${(Number(commission) / 100).toFixed(2)}%`,
				};
			} catch {
				return {
					validator: hexToRonin(normalizeAddress(validatorAddress)),
					message: 'Unable to fetch validator info',
				};
			}
		}

		case 'stake': {
			const validatorAddress = this.getNodeParameter('validatorAddress', index) as string;
			const amount = this.getNodeParameter('amount', index) as string;
			
			// writeContract accepts value as string (RON amount), not { value: bigint }
			const result = await roninClient.writeContract(
				MAINNET_CONTRACTS.RON_STAKING,
				['function stake(address validator) payable'],
				'stake',
				[normalizeAddress(validatorAddress)],
				amount // Pass amount as string, writeContract handles conversion
			);
			
			return {
				success: true,
				txHash: result.hash,
				validator: hexToRonin(normalizeAddress(validatorAddress)),
				amount: `${amount} RON`,
				blockNumber: result.blockNumber,
			};
		}

		case 'unstake': {
			const validatorAddress = this.getNodeParameter('validatorAddress', index) as string;
			const amount = this.getNodeParameter('amount', index) as string;
			
			const amountWei = ronToWei(amount);
			
			const result = await roninClient.writeContract(
				MAINNET_CONTRACTS.RON_STAKING,
				['function unstake(address validator, uint256 amount)'],
				'unstake',
				[normalizeAddress(validatorAddress), amountWei]
			);
			
			return {
				success: true,
				txHash: result.hash,
				validator: hexToRonin(normalizeAddress(validatorAddress)),
				amount: `${amount} RON`,
				blockNumber: result.blockNumber,
				note: 'Unstaking has a cooldown period before funds are available',
			};
		}

		case 'delegate': {
			const validatorAddress = this.getNodeParameter('validatorAddress', index) as string;
			const amount = this.getNodeParameter('amount', index) as string;
			
			// writeContract accepts value as string (RON amount), not { value: bigint }
			const result = await roninClient.writeContract(
				MAINNET_CONTRACTS.RON_STAKING,
				['function delegate(address validator) payable'],
				'delegate',
				[normalizeAddress(validatorAddress)],
				amount // Pass amount as string, writeContract handles conversion
			);
			
			return {
				success: true,
				txHash: result.hash,
				validator: hexToRonin(normalizeAddress(validatorAddress)),
				amount: `${amount} RON`,
				blockNumber: result.blockNumber,
			};
		}

		case 'undelegate': {
			const validatorAddress = this.getNodeParameter('validatorAddress', index) as string;
			const amount = this.getNodeParameter('amount', index) as string;
			
			const amountWei = ronToWei(amount);
			
			const result = await roninClient.writeContract(
				MAINNET_CONTRACTS.RON_STAKING,
				['function undelegate(address validator, uint256 amount)'],
				'undelegate',
				[normalizeAddress(validatorAddress), amountWei]
			);
			
			return {
				success: true,
				txHash: result.hash,
				validator: hexToRonin(normalizeAddress(validatorAddress)),
				amount: `${amount} RON`,
				blockNumber: result.blockNumber,
			};
		}

		case 'getDelegationInfo': {
			const address = this.getNodeParameter('address', index) as string;
			
			try {
				const delegations = await roninClient.readContract(
					MAINNET_CONTRACTS.RON_STAKING,
					['function getDelegations(address) view returns (address[], uint256[])'],
					'getDelegations',
					[normalizeAddress(address)]
				) as [string[], bigint[]];
				
				const [validators, amounts] = delegations;
				
				return {
					address: hexToRonin(normalizeAddress(address)),
					delegations: validators.map((v: string, i: number) => ({
						validator: hexToRonin(v),
						amount: weiToRon(amounts[i].toString()),
					})),
				};
			} catch {
				return {
					address: hexToRonin(normalizeAddress(address)),
					message: 'Unable to fetch delegation info',
					stakingUrl: 'https://app.roninchain.com/staking',
				};
			}
		}

		case 'getRewards': {
			const address = this.getNodeParameter('address', index) as string;
			
			try {
				const rewards = await roninClient.readContract(
					MAINNET_CONTRACTS.RON_STAKING,
					['function getRewards(address) view returns (uint256)'],
					'getRewards',
					[normalizeAddress(address)]
				) as bigint;
				
				return {
					address: hexToRonin(normalizeAddress(address)),
					pendingRewards: weiToRon(rewards.toString()),
					rewardToken: 'RON',
				};
			} catch {
				return {
					address: hexToRonin(normalizeAddress(address)),
					message: 'Unable to fetch rewards',
				};
			}
		}

		case 'claimRewards': {
			const result = await roninClient.writeContract(
				MAINNET_CONTRACTS.RON_STAKING,
				['function claimRewards()'],
				'claimRewards',
				[]
			);
			
			return {
				success: true,
				txHash: result.hash,
				blockNumber: result.blockNumber,
			};
		}

		case 'getApy': {
			// APY is typically calculated from on-chain data
			// This is a simplified implementation
			return {
				estimatedApy: '8-12%',
				note: 'APY varies based on total staked amount and network activity',
				stakingUrl: 'https://app.roninchain.com/staking',
				factors: [
					'Total RON staked network-wide',
					'Validator commission rate',
					'Network transaction fees',
					'Block rewards',
				],
			};
		}

		default:
			throw new Error(`Unknown operation: ${operation}`);
	}
}
