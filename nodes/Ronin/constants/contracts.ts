/**
 * Ronin Smart Contract Addresses
 * Includes token contracts, marketplace, staking, and more
 */

export interface ContractAddresses {
	// Core Tokens
	WRON: string;
	WETH: string;
	AXS: string;
	SLP: string;
	USDC: string;
	
	// Axie Infinity
	AXIE_CONTRACT: string;
	AXIE_NFT: string; // Alias for AXIE_CONTRACT
	LAND_CONTRACT: string;
	ITEM_CONTRACT: string;
	
	// Marketplace
	MARKETPLACE: string;
	MARKETPLACE_V2: string;
	
	// Katana DEX
	KATANA_ROUTER: string;
	KATANA_FACTORY: string;
	
	// Bridge
	BRIDGE_GATEWAY: string;
	
	// Staking
	RON_STAKING: string;
	AXS_STAKING: string;
	
	// Governance
	GOVERNANCE: string;
}

export const MAINNET_CONTRACTS: ContractAddresses = {
	// Core Tokens
	WRON: '0xe514d9deb7966c8be0ca922de8a064264ea6bcd4',
	WETH: '0xc99a6a985ed2cac1ef41640596c5a5f9f4e19ef5',
	AXS: '0x97a9107c1793bc407d6f527b77e7fff4d812bece',
	SLP: '0xa8754b9fa15fc18bb59458815510e40a12cd2014',
	USDC: '0x0b7007c13325c48911f73a2dad5fa5dcbf808adc',
	
	// Axie Infinity NFTs
	AXIE_CONTRACT: '0x32950db2a7164ae833121501c797d79e7b79d74c',
	AXIE_NFT: '0x32950db2a7164ae833121501c797d79e7b79d74c', // Alias
	LAND_CONTRACT: '0x8c811e3c958e190f5ec15fb376533a3398620500',
	ITEM_CONTRACT: '0xc25970724f032af21d801978c73653c440cf787c',
	
	// Marketplace
	MARKETPLACE: '0x213073989821f738a7ba3520c3d31a1f9ad31bbd',
	MARKETPLACE_V2: '0xfff9ce5f71ca6178d3beecedb61e7eff1602950e',
	
	// Katana DEX
	KATANA_ROUTER: '0x7d0556d55ca1a92708681e2e231733ebd922597d',
	KATANA_FACTORY: '0xb255d6a720bb7c39fee173ce22113397119cb930',
	
	// Bridge
	BRIDGE_GATEWAY: '0x64192819ac13ef72bf6b5ae239ac672b43a9af08',
	
	// Staking
	RON_STAKING: '0x545edb750eb8769c868429be9586f5857a768758',
	AXS_STAKING: '0x05b0bb3c1c320b280501b86706c3551995bc8571',
	
	// Governance
	GOVERNANCE: '0x0000000000000000000000000000000000000000', // Placeholder
};

export const TESTNET_CONTRACTS: ContractAddresses = {
	// Core Tokens (Testnet addresses)
	WRON: '0xa959726154953bae111746e265e6d754f48570e6',
	WETH: '0x29c6f8349a028e1bdfc68bfa08bdee7bc5d47e16',
	AXS: '0x3c4e17b9056272ce1b49f6900d8cfd6171a1869d',
	SLP: '0x82f5483623d636bc3deba8ae67e1751b098254d4',
	USDC: '0x067fbff8990c58ab90bae3c97241c5d736053f77',
	
	// Axie Infinity NFTs (Testnet)
	AXIE_CONTRACT: '0x2eb7b2f9f9c5f0dd0c76b7bc35c2ccfc9b9bfb0a',
	AXIE_NFT: '0x2eb7b2f9f9c5f0dd0c76b7bc35c2ccfc9b9bfb0a', // Alias
	LAND_CONTRACT: '0x0000000000000000000000000000000000000000', // Not deployed on testnet
	ITEM_CONTRACT: '0x0000000000000000000000000000000000000000', // Not deployed on testnet
	
	// Marketplace (Testnet)
	MARKETPLACE: '0x0000000000000000000000000000000000000000',
	MARKETPLACE_V2: '0x0000000000000000000000000000000000000000',
	
	// Katana DEX (Testnet)
	KATANA_ROUTER: '0xdbb5284ede0bb5023c1a0acb70cb9b8b66cb6f3b',
	KATANA_FACTORY: '0x86587380c4c815ba0e984d1c3161e4c9bbd8be9a',
	
	// Bridge (Testnet)
	BRIDGE_GATEWAY: '0x0000000000000000000000000000000000000000',
	
	// Staking (Testnet)
	RON_STAKING: '0x0000000000000000000000000000000000000000',
	AXS_STAKING: '0x0000000000000000000000000000000000000000',
	
	// Governance
	GOVERNANCE: '0x0000000000000000000000000000000000000000',
};

export const CONTRACTS: Record<string, ContractAddresses> = {
	mainnet: MAINNET_CONTRACTS,
	testnet: TESTNET_CONTRACTS,
};

/**
 * Get contract addresses for a network
 */
export function getContracts(network: string): ContractAddresses {
	const contracts = CONTRACTS[network];
	if (!contracts) {
		throw new Error(`No contracts defined for network: ${network}`);
	}
	return contracts;
}

/**
 * ERC20 Standard ABI (minimal)
 */
export const ERC20_ABI = [
	'function name() view returns (string)',
	'function symbol() view returns (string)',
	'function decimals() view returns (uint8)',
	'function totalSupply() view returns (uint256)',
	'function balanceOf(address account) view returns (uint256)',
	'function transfer(address to, uint256 amount) returns (bool)',
	'function approve(address spender, uint256 amount) returns (bool)',
	'function allowance(address owner, address spender) view returns (uint256)',
	'function transferFrom(address from, address to, uint256 amount) returns (bool)',
	'event Transfer(address indexed from, address indexed to, uint256 value)',
	'event Approval(address indexed owner, address indexed spender, uint256 value)',
];

/**
 * ERC721 Standard ABI (minimal)
 */
export const ERC721_ABI = [
	'function name() view returns (string)',
	'function symbol() view returns (string)',
	'function tokenURI(uint256 tokenId) view returns (string)',
	'function balanceOf(address owner) view returns (uint256)',
	'function ownerOf(uint256 tokenId) view returns (address)',
	'function safeTransferFrom(address from, address to, uint256 tokenId)',
	'function transferFrom(address from, address to, uint256 tokenId)',
	'function approve(address to, uint256 tokenId)',
	'function getApproved(uint256 tokenId) view returns (address)',
	'function setApprovalForAll(address operator, bool approved)',
	'function isApprovedForAll(address owner, address operator) view returns (bool)',
	'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)',
	'event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId)',
];

/**
 * Axie Contract ABI (extended)
 */
export const AXIE_ABI = [
	...ERC721_ABI,
	'function getAxie(uint256 axieId) view returns (tuple(uint256 genes, uint256 bornAt, uint256 matronId, uint256 sireId, uint256 breedCount))',
	'function genes(uint256 axieId) view returns (uint256)',
	'function breedingFee() view returns (uint256)',
];

/**
 * Katana Router ABI
 */
export const KATANA_ROUTER_ABI = [
	'function getAmountsOut(uint amountIn, address[] calldata path) view returns (uint[] memory amounts)',
	'function getAmountsIn(uint amountOut, address[] calldata path) view returns (uint[] memory amounts)',
	'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) returns (uint[] memory amounts)',
	'function swapTokensForExactTokens(uint amountOut, uint amountInMax, address[] calldata path, address to, uint deadline) returns (uint[] memory amounts)',
	'function swapExactRONForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) payable returns (uint[] memory amounts)',
	'function swapTokensForExactRON(uint amountOut, uint amountInMax, address[] calldata path, address to, uint deadline) returns (uint[] memory amounts)',
	'function swapExactTokensForRON(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) returns (uint[] memory amounts)',
	'function swapRONForExactTokens(uint amountOut, address[] calldata path, address to, uint deadline) payable returns (uint[] memory amounts)',
	'function addLiquidity(address tokenA, address tokenB, uint amountADesired, uint amountBDesired, uint amountAMin, uint amountBMin, address to, uint deadline) returns (uint amountA, uint amountB, uint liquidity)',
	'function addLiquidityRON(address token, uint amountTokenDesired, uint amountTokenMin, uint amountRONMin, address to, uint deadline) payable returns (uint amountToken, uint amountRON, uint liquidity)',
	'function removeLiquidity(address tokenA, address tokenB, uint liquidity, uint amountAMin, uint amountBMin, address to, uint deadline) returns (uint amountA, uint amountB)',
	'function removeLiquidityRON(address token, uint liquidity, uint amountTokenMin, uint amountRONMin, address to, uint deadline) returns (uint amountToken, uint amountRON)',
];

/**
 * RON Staking ABI
 */
export const RON_STAKING_ABI = [
	'function stake(address validatorAddr) payable',
	'function unstake(address validatorAddr, uint256 amount)',
	'function claimRewards(address[] calldata validatorAddrs) returns (uint256)',
	'function getStakingAmount(address delegator, address validator) view returns (uint256)',
	'function getPendingRewards(address delegator, address validator) view returns (uint256)',
	'function getValidators() view returns (address[])',
];

/**
 * NFT Contract addresses for common collections
 */
export const NFT_CONTRACTS: Record<string, { mainnet: string; testnet: string; name: string }> = {
	axie: {
		mainnet: MAINNET_CONTRACTS.AXIE_CONTRACT,
		testnet: TESTNET_CONTRACTS.AXIE_CONTRACT,
		name: 'Axie Infinity',
	},
	land: {
		mainnet: MAINNET_CONTRACTS.LAND_CONTRACT,
		testnet: TESTNET_CONTRACTS.LAND_CONTRACT,
		name: 'Lunacia Land',
	},
	item: {
		mainnet: MAINNET_CONTRACTS.ITEM_CONTRACT,
		testnet: TESTNET_CONTRACTS.ITEM_CONTRACT,
		name: 'Axie Accessories',
	},
};
