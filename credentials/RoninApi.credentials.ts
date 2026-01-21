import {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

/**
 * Ronin API Credentials (Skynet API)
 * Used for accessing Ronin blockchain data via REST/GraphQL APIs
 */
export class RoninApi implements ICredentialType {
	name = 'roninApi';
	displayName = 'Ronin API (Skynet)';
	documentationUrl = 'https://docs.skymavis.com/';
	properties: INodeProperties[] = [
		{
			displayName: 'API Endpoint',
			name: 'apiEndpoint',
			type: 'options',
			options: [
				{
					name: 'Skynet Mainnet',
					value: 'https://api-gateway.skymavis.com',
				},
				{
					name: 'Skynet Testnet',
					value: 'https://api-gateway.skymavis.com/testnet',
				},
				{
					name: 'Custom',
					value: 'custom',
				},
			],
			default: 'https://api-gateway.skymavis.com',
			description: 'Select the Skynet API endpoint',
		},
		{
			displayName: 'Custom API URL',
			name: 'customApiUrl',
			type: 'string',
			default: '',
			placeholder: 'https://your-api-endpoint.com',
			displayOptions: {
				show: {
					apiEndpoint: ['custom'],
				},
			},
		},
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			description: 'Your Skynet API key from the Sky Mavis Developer Portal',
			required: true,
		},
		{
			displayName: 'App ID',
			name: 'appId',
			type: 'string',
			default: '',
			description: 'Your application ID from Sky Mavis',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				'X-API-Key': '={{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.apiEndpoint === "custom" ? $credentials.customApiUrl : $credentials.apiEndpoint}}',
			url: '/health',
			method: 'GET',
		},
	};
}
