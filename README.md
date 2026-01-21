# n8n-nodes-ronin

> [Velocity BPA Licensing Notice]
>
> This n8n node is licensed under the Business Source License 1.1 (BSL 1.1).
>
> Use of this node by for-profit organizations in production environments requires a commercial license from Velocity BPA.
>
> For licensing information, visit https://velobpa.com/licensing or contact licensing@velobpa.com.

---

A comprehensive n8n community node for the **Ronin blockchain** and **Axie Infinity ecosystem**. This package provides complete integration with wallet operations, NFT management, Axie breeding and battles, marketplace trading, Katana DEX swaps, Ronin Bridge transfers, staking, and Mavis Hub gaming features.

![Ronin](https://img.shields.io/badge/Ronin-Blockchain-blue)
![n8n](https://img.shields.io/badge/n8n-Community%20Node-orange)
![License](https://img.shields.io/badge/license-BSL--1.1-blue)
![Version](https://img.shields.io/badge/version-1.0.0-brightgreen)

## Features

- **18 Resource Categories** with 200+ operations
- **Wallet Management**: RON/WETH balances, transfers, transaction history
- **NFT Operations**: Get info, transfer, metadata, ownership verification
- **Axie Infinity**: Genes, stats, breeding, battles, marketplace search
- **Lunacia Land**: Coordinates, resources, ownership, adjacent plots
- **Marketplace**: List, buy, sell NFTs, offers, price history
- **Breeding**: Cost calculation, eligibility checks, offspring prediction
- **Battle System**: History, leaderboard, MMR tracking, win rates
- **Token Operations**: SLP/AXS balance, transfers, staking
- **Ronin Bridge**: Deposit/withdraw between Ethereum and Ronin
- **Katana DEX**: Token swaps, liquidity pools, price quotes
- **Staking**: Validators, delegation, rewards claiming
- **Smart Contracts**: Read/write operations, events, gas estimation
- **Real-time Triggers**: Block events, transfers, sales, breeding

## Installation

### Community Nodes (Recommended)

1. Open n8n
2. Go to **Settings** → **Community Nodes**
3. Search for `n8n-nodes-ronin`
4. Click **Install**

### Manual Installation

```bash
# Navigate to your n8n custom nodes directory
cd ~/.n8n/custom
mkdir -p ~/.n8n/custom

# Install the package
npm install n8n-nodes-ronin

# Restart n8n
n8n restart
```

### Development Installation

```bash
# Clone the repository
git clone https://github.com/Velocity-BPA/n8n-nodes-ronin.git
cd n8n-nodes-ronin

# Install dependencies
npm install

# Build the project
npm run build

# Create symlink to n8n custom nodes directory
mkdir -p ~/.n8n/custom
ln -s $(pwd) ~/.n8n/custom/n8n-nodes-ronin

# Restart n8n
n8n start
```

## Credentials Setup

### Ronin Network Credentials

| Field | Description | Required |
|-------|-------------|----------|
| Network | Mainnet / Testnet / Custom | Yes |
| RPC URL | Auto-populated based on network | Yes |
| Private Key | For transaction signing | For write ops |
| Chain ID | 2020 (mainnet) / 2021 (testnet) | Auto |

### Ronin API Credentials (Optional)

| Field | Description | Required |
|-------|-------------|----------|
| API Endpoint | Skynet API URL | No |
| API Key | For enhanced rate limits | No |

### Mavis Hub Credentials (Optional)

| Field | Description | Required |
|-------|-------------|----------|
| Hub API Endpoint | Gaming platform API | No |
| Client ID | OAuth client ID | No |
| Client Secret | OAuth client secret | No |

## Resources & Operations

### Wallet Resource

| Operation | Description |
|-----------|-------------|
| Get RON Balance | Get native RON token balance |
| Get WETH Balance | Get wrapped ETH balance |
| Get Token Balances | Get all token balances |
| Get Wallet NFTs | Get NFTs owned by wallet |
| Transfer RON | Send RON to another address |
| Transfer Token | Send ERC-20 tokens |
| Get Transaction History | Get wallet transactions |
| Validate Address | Validate ronin/hex address |
| Convert Address | Convert between formats |

### NFT Resource

| Operation | Description |
|-----------|-------------|
| Get NFT Info | Get NFT details |
| Get NFT Metadata | Get NFT metadata |
| Get NFTs by Owner | Get NFTs by wallet |
| Transfer NFT | Transfer NFT to address |
| Batch Transfer | Transfer multiple NFTs |
| Verify Ownership | Check NFT ownership |

### Axie Resource

| Operation | Description |
|-----------|-------------|
| Get Axie Info | Get Axie details |
| Get Axie Genes | Decode Axie genes |
| Get Axie Stats | Get Axie battle stats |
| Get Axie Parts | Get body parts |
| Get Axies by Owner | Get owner's Axies |
| Get Breeding Count | Get breed count |
| Search Axies | Search marketplace |

### Marketplace Resource

| Operation | Description |
|-----------|-------------|
| Get Active Listings | Get marketplace listings |
| Get Listings by User | Get user's listings |
| Get Recent Sales | Get recent sales |
| Get Price History | Get NFT price history |
| Get Marketplace Stats | Get marketplace statistics |

### Additional Resources

- **Land**: Lunacia land operations
- **Collection**: NFT collection stats
- **Breeding**: Axie breeding operations
- **Battle**: PvP battle tracking
- **SLP**: Smooth Love Potion operations
- **AXS**: Axie Infinity Shards operations
- **Bridge**: Ronin Bridge operations
- **Katana**: DEX swap operations
- **Staking**: RON staking operations
- **Contract**: Smart contract interactions
- **Block**: Block data retrieval
- **Transaction**: Transaction operations
- **Mavis Hub**: Gaming platform operations
- **Utility**: Helper functions

## Trigger Node

The Ronin Trigger node monitors blockchain events in real-time:

| Event Type | Description |
|------------|-------------|
| New Block | Triggered on new blocks |
| RON Received | When RON is received |
| RON Sent | When RON is sent |
| Token Transfer | On ERC-20 transfers |
| NFT Transfer | On NFT transfers |
| Axie Bred | When Axies are bred |
| Marketplace Sale | On NFT sales |
| Contract Event | Custom contract events |

## Usage Examples

### Get Wallet Balance

```javascript
// Resource: Wallet
// Operation: Get RON Balance
{
  "address": "ronin:1234567890abcdef..."
}
```

### Transfer RON

```javascript
// Resource: Wallet
// Operation: Transfer RON
{
  "toAddress": "ronin:recipient...",
  "amount": "1.5"
}
```

### Get Axie Information

```javascript
// Resource: Axie
// Operation: Get Axie Info
{
  "axieId": "12345"
}
```

### Swap on Katana DEX

```javascript
// Resource: Katana
// Operation: Execute Swap
{
  "fromToken": "WRON",
  "toToken": "WETH",
  "amount": "100",
  "slippage": 0.5
}
```

## Ronin Blockchain Concepts

### Address Formats

Ronin uses a unique address format prefixed with `ronin:` instead of `0x`:
- **Ronin format**: `ronin:1234567890abcdef...`
- **Hex format**: `0x1234567890abcdef...`

Both formats are interchangeable and this node handles conversion automatically.

### Native Tokens

| Token | Symbol | Description |
|-------|--------|-------------|
| RON | RON | Native gas token |
| Wrapped RON | WRON | ERC-20 wrapped RON |
| Wrapped ETH | WETH | Bridged Ethereum |
| Axie Infinity Shards | AXS | Governance token |
| Smooth Love Potion | SLP | In-game currency |

### Axie Concepts

- **Genes**: 256/512-bit genetic data encoding Axie traits
- **Parts**: Body parts (eyes, ears, mouth, horn, back, tail)
- **Class**: Beast, Bug, Bird, Plant, Aquatic, Reptile, etc.
- **Purity**: Percentage of parts matching the dominant class
- **Breed Count**: Number of times an Axie has bred (max 7)

## Networks

| Network | Chain ID | RPC URL |
|---------|----------|---------|
| Mainnet | 2020 | https://api.roninchain.com/rpc |
| Testnet (Saigon) | 2021 | https://saigon-testnet.roninchain.com/rpc |

## Error Handling

The node provides detailed error messages for common issues:

| Error | Cause | Solution |
|-------|-------|----------|
| Invalid address | Wrong address format | Use ronin: or 0x format |
| Insufficient balance | Not enough tokens | Check balance first |
| Transaction failed | Network/gas issues | Retry with higher gas |
| Rate limited | Too many requests | Wait and retry |

## Security Best Practices

1. **Never share private keys** - Store securely in n8n credentials
2. **Use testnet first** - Test workflows on Saigon testnet
3. **Validate addresses** - Use the Validate Address operation
4. **Set slippage limits** - Protect against price manipulation
5. **Monitor transactions** - Use trigger nodes for alerts

## Development

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run linting
npm run lint

# Fix linting issues
npm run lint:fix

# Watch mode for development
npm run dev
```

## Author

**Velocity BPA**
- Website: [velobpa.com](https://velobpa.com)
- GitHub: [Velocity-BPA](https://github.com/Velocity-BPA)

## Licensing

This n8n community node is licensed under the **Business Source License 1.1**.

### Free Use
Permitted for personal, educational, research, and internal business use.

### Commercial Use
Use of this node within any SaaS, PaaS, hosted platform, managed service,
or paid automation offering requires a commercial license.

For licensing inquiries:
**licensing@velobpa.com**

See [LICENSE](LICENSE), [COMMERCIAL_LICENSE.md](COMMERCIAL_LICENSE.md), and [LICENSING_FAQ.md](LICENSING_FAQ.md) for details.

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## Support

- **Issues**: [GitHub Issues](https://github.com/Velocity-BPA/n8n-nodes-ronin/issues)
- **Licensing**: licensing@velobpa.com
- **Website**: [velobpa.com](https://velobpa.com)

## Acknowledgments

- [Ronin Network](https://roninchain.com) - Blockchain infrastructure
- [Sky Mavis](https://skymavis.com) - Axie Infinity ecosystem
- [n8n](https://n8n.io) - Workflow automation platform
