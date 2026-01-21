import {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

/**
 * Ronin Network Credentials
 * Supports Ronin Mainnet, Saigon Testnet, and custom endpoints
 */
export class RoninNetwork implements ICredentialType {
	name = 'roninNetwork';
	displayName = 'Ronin Network';
	documentationUrl = 'https://docs.roninchain.com/';
	properties: INodeProperties[] = [
		{
			displayName: 'Network',
			name: 'network',
			type: 'options',
			options: [
				{
					name: 'Ronin Mainnet',
					value: 'mainnet',
				},
				{
					name: 'Saigon Testnet',
					value: 'testnet',
				},
				{
					name: 'Custom Endpoint',
					value: 'custom',
				},
			],
			default: 'mainnet',
			description: 'Select the Ronin network to connect to',
		},
		{
			displayName: 'RPC URL',
			name: 'rpcUrl',
			type: 'string',
			default: '',
			placeholder: 'https://api.roninchain.com/rpc',
			description: 'Custom RPC endpoint URL. Leave empty to use default for selected network.',
			displayOptions: {
				show: {
					network: ['custom'],
				},
			},
		},
		{
			displayName: 'Private Key',
			name: 'privateKey',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			description: 'Private key for signing transactions. Never share this with anyone.',
			hint: 'Your private key is stored securely and never logged',
		},
		{
			displayName: 'Chain ID',
			name: 'chainId',
			type: 'number',
			default: 2020,
			description: 'Chain ID (2020 for Mainnet, 2021 for Testnet)',
			hint: 'Automatically set based on network selection',
		},
		{
			displayName: 'Wallet Address',
			name: 'walletAddress',
			type: 'string',
			default: '',
			placeholder: 'ronin:your-wallet-address or 0x...',
			description: 'Your Ronin wallet address. Supports both ronin: and 0x formats.',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.network === "mainnet" ? "https://api.roninchain.com/rpc" : $credentials.network === "testnet" ? "https://saigon-testnet.roninchain.com/rpc" : $credentials.rpcUrl}}',
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				jsonrpc: '2.0',
				method: 'eth_chainId',
				params: [],
				id: 1,
			}),
		},
	};
}
