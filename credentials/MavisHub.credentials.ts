import {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

/**
 * Mavis Hub Credentials
 * Used for accessing Mavis Hub gaming platform features
 */
export class MavisHub implements ICredentialType {
	name = 'mavisHub';
	displayName = 'Mavis Hub';
	documentationUrl = 'https://docs.skymavis.com/mavis/mavis-hub';
	properties: INodeProperties[] = [
		{
			displayName: 'Hub API Endpoint',
			name: 'hubApiEndpoint',
			type: 'string',
			default: 'https://hub.skymavis.com/api',
			description: 'Mavis Hub API endpoint',
		},
		{
			displayName: 'Client ID',
			name: 'clientId',
			type: 'string',
			default: '',
			description: 'OAuth Client ID from Mavis Hub developer portal',
			required: true,
		},
		{
			displayName: 'Client Secret',
			name: 'clientSecret',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			description: 'OAuth Client Secret from Mavis Hub developer portal',
			required: true,
		},
		{
			displayName: 'Access Token',
			name: 'accessToken',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			description: 'Optional: Pre-generated access token',
		},
		{
			displayName: 'Refresh Token',
			name: 'refreshToken',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			description: 'Optional: Refresh token for renewing access',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.accessToken}}',
				'X-Client-Id': '={{$credentials.clientId}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.hubApiEndpoint}}',
			url: '/v1/health',
			method: 'GET',
		},
	};
}
