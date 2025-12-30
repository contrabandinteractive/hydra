# Hydra

**Collab Checkout that automatically pays collaborators with a programmable recoup rule.**

One contributor gets paid back first (until a target is reached), then splits switch automatically.

Built for the MNEE Hackathon.

## Features

- **Recoup-First Logic**: 100% of payments go to one recipient until the recoup target is met
- **Automatic Mode Flip**: Contract automatically switches to split mode when target is reached
- **Content Delivery**: Optional pay-to-reveal content URLs (digital downloads, access codes, etc.)
- **IPFS Metadata Storage**: Decentralized storage with localStorage fallback for demo
- **Transparent Ledger**: Public view of all payments and progress
- **MNEE ERC-20**: Uses MNEE token on Ethereum mainnet
- **No Backend Required**: All data is on-chain

## Networks & Contracts

### MNEE Token Addresses

| Network  | Type | Address                                      | Notes |
| -------- | ---- | -------------------------------------------- | ----- |
| Mainnet  | Official | `0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF` | **Required for hackathon** |
| Sepolia  | Official | `0x9CAF26bBFe63269FAF5C425f268fF81299dD9A74` | No public faucet |
| Sepolia  | MockMNEE | `0x4a79b8E7479da267930f3B14f6292c274e7B01b0` | **Use for testing** - has `faucet()` function |

### Factory Addresses

| Network | Address | MNEE Token Used | Status |
| ------- | ------- | --------------- | ------ |
| Sepolia | `0xbB656c7774f2E1b81f72A2eBdDdFe2557290a6AB` | MockMNEE | **Current** - For testing |
| Mainnet | *Not deployed* | Official MNEE | Deploy for hackathon |

**Environment Variables:**
- `NEXT_PUBLIC_SEPOLIA_FACTORY_ADDRESS` - Set in `apps/web/.env.local`
- `NEXT_PUBLIC_MAINNET_FACTORY_ADDRESS` - Set when deploying to mainnet

## Project Structure

```
/apps/web                 # Next.js 16 app
  /app
    /create              # Creator flow
    /checkout/[deal]/[productId]  # Buyer checkout
    /ledger/[deal]       # Public ledger (no wallet needed)
    /deal/[deal]         # Creator dashboard
  /lib
    chains.ts            # Chain config & token addresses
    contracts.ts         # ABIs
    ipfs.ts              # IPFS metadata upload/fetch
    mnee.ts              # MNEE helpers
    store.ts             # Zustand stores (includes contentUrl)
    wagmi.ts             # Wagmi config

/packages/contracts       # Solidity + Foundry
  /src
    CollabDeal.sol       # Main deal contract
    CollabDealFactory.sol # Factory for creating deals
    /mocks
      MockERC20.sol      # For testing
  /test
    CollabDeal.t.sol     # Comprehensive tests
  /script
    Deploy.s.sol         # Deployment script
```

## Quick Start

### Prerequisites

- Node.js 18+
- [Foundry](https://book.getfoundry.sh/getting-started/installation)

### Install Dependencies

```bash
# Install web app dependencies
cd apps/web
npm install

# Install Foundry dependencies (from packages/contracts)
cd ../../packages/contracts
forge install
```

### Environment Configuration

#### Frontend Environment Variables

Create `apps/web/.env.local` for development:

```bash
# Required: WalletConnect Project ID
# Get one at: https://cloud.walletconnect.com/
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=your_project_id

# Optional: App URL (for production deployment)
# Set this to your deployed app URL (e.g., https://hydra.yourdomain.com)
# If not set, defaults to window.location.origin (works for local dev)
# Used for generating shareable checkout links
NEXT_PUBLIC_APP_URL=

# Required: Factory Contract Addresses
NEXT_PUBLIC_SEPOLIA_FACTORY_ADDRESS=0xbB656c7774f2E1b81f72A2eBdDdFe2557290a6AB
NEXT_PUBLIC_MAINNET_FACTORY_ADDRESS=your_mainnet_factory_address

# MNEE Token Addresses (configurable for testing vs production)
# For TESTING: Use MockMNEE (has public faucet function)
NEXT_PUBLIC_SEPOLIA_MNEE_ADDRESS=0x4a79b8E7479da267930f3B14f6292c274e7B01b0
# For PRODUCTION: Use official MNEE
NEXT_PUBLIC_MAINNET_MNEE_ADDRESS=0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF

# Optional: Custom RPC URLs (uses public RPCs if not set)
# Get free RPC endpoints at: https://www.alchemy.com/ or https://www.infura.io/
NEXT_PUBLIC_SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
NEXT_PUBLIC_MAINNET_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY

# Optional: IPFS Storage via Pinata (falls back to localStorage if not set)
# Get free JWT at: https://app.pinata.cloud/developers/api-keys
NEXT_PUBLIC_PINATA_JWT=your_jwt_here
# Optional: Dedicated Pinata gateway for faster retrieval
# Format: example-gateway.mypinata.cloud (without https://)
NEXT_PUBLIC_PINATA_GATEWAY=
```

**Quick setup:**
```bash
cd apps/web
cp .env.example .env.local
# Edit .env.local with your values
```

#### Contract Deployment Environment Variables

Create `packages/contracts/.env`:

```bash
# Required: Private key with 0x prefix
# ⚠️ Use a test wallet only, never your main wallet
PRIVATE_KEY=0x...

# Required: RPC URLs
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY

# Required for contract verification
# Get one at: https://etherscan.io/myapikey
ETHERSCAN_API_KEY=YOUR_KEY
```

#### Testing vs Production Mode

**Testing Mode (Current Setup):**
- Uses MockMNEE: `0x4a79b8E7479da267930f3B14f6292c274e7B01b0`
- Has public `faucet()` function to get test tokens
- Deployed on Sepolia testnet

**Production Mode:**
- Uses official MNEE: `0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF`
- Update `NEXT_PUBLIC_MAINNET_MNEE_ADDRESS` in `.env.production`
- Deploy to mainnet for hackathon submission

#### Getting Test MNEE Tokens

The official MNEE token on Sepolia has no public faucet. For testing, use MockMNEE:

```bash
cd packages/contracts
source .env

# Get 1000 MNEE tokens
~/.foundry/bin/cast send 0x4a79b8E7479da267930f3B14f6292c274e7B01b0 "faucet()" \
  --private-key $PRIVATE_KEY \
  --rpc-url $SEPOLIA_RPC_URL

# Or mint specific amount to an address
~/.foundry/bin/cast send 0x4a79b8E7479da267930f3B14f6292c274e7B01b0 \
  "mint(address,uint256)" YOUR_ADDRESS 1000000000000000000000 \
  --private-key $PRIVATE_KEY \
  --rpc-url $SEPOLIA_RPC_URL
```

**Add MockMNEE to MetaMask:**
1. Switch to Sepolia network
2. Assets → Import Tokens
3. Token Address: `0x4a79b8E7479da267930f3B14f6292c274e7B01b0`
4. Symbol: `mMNEE`
5. Decimals: `18`

### Run Tests

```bash
cd packages/contracts
~/.foundry/bin/forge test -vv
```

All 26 tests should pass:
- Recoup mode pays 100% to recoup recipient
- Mode flips when target is reached
- Post-flip payments follow split percentages
- Rounding dust is handled deterministically
- Pause/unpause functionality works
- Withdrawal pays correct amounts

### Deploy Contracts

1. Ensure you've set up `packages/contracts/.env` (see Environment Configuration section above)

2. Deploy MockMNEE (for testing only):

```bash
cd packages/contracts
~/.foundry/bin/forge script script/DeployMockMNEE.s.sol --rpc-url sepolia --broadcast
# Note the deployed address (current: 0x4a79b8E7479da267930f3B14f6292c274e7B01b0)
```

3. Deploy Factory to Sepolia (with MockMNEE):

```bash
cd packages/contracts
MNEE_TOKEN=0x4a79b8E7479da267930f3B14f6292c274e7B01b0 \
  ~/.foundry/bin/forge script script/Deploy.s.sol --rpc-url sepolia --broadcast --verify
# Current: 0xbB656c7774f2E1b81f72A2eBdDdFe2557290a6AB
```

4. Deploy Factory to Mainnet (with official MNEE):

```bash
cd packages/contracts
~/.foundry/bin/forge script script/Deploy.s.sol --rpc-url mainnet --broadcast --verify
# Uses official MNEE automatically: 0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF
```

5. Update `apps/web/.env.local` with the deployed factory address

### Run Web App

```bash
cd apps/web
# Ensure .env.local is configured (see Environment Configuration section)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Demo Script (5 minutes)

Use 4 wallets: Creator + 3 collaborators (or 2 collaborators + buyer).

### Setup

- **Product**: "Exclusive Track Download"
- **Price**: 10 MNEE
- **Recoup recipient**: Producer
- **Recoup target**: 30 MNEE
- **Post-recoup splits**: Artist 70%, Producer 20%, Editor 10%

### Demo Flow

1. **Create deal** (show "Deal Created" + links)
2. **Buyer pays 10** → shows "Mode: RECOUP", recoup 10/30
3. **Buyer pays 10** → recoup 20/30
4. **Buyer pays 10** → recoup hits 30/30 → **Mode flips** (show event + UI changes)
5. **Buyer pays 10 again** → now splits 7/2/1 MNEE owed
6. **Collaborators withdraw live** → show payouts land in wallets
7. **Open ledger page** (no wallet) → show transparent timeline

The mode flip + immediate split is the "wow" moment.

## Getting MNEE for Testing

**Recommended for Testing:** Use MockMNEE on Sepolia with public `faucet()` function.

See the [Getting Test MNEE Tokens](#getting-test-mnee-tokens) section for detailed instructions on:
- Calling the faucet to get 1000 MNEE tokens
- Minting custom amounts to specific addresses
- Adding MockMNEE to MetaMask

**For Production:** Use official MNEE token on mainnet (`0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF`)

## Tech Stack

### Frontend
- Next.js 16 (App Router + Turbopack) + TypeScript
- TailwindCSS
- wagmi v2 + viem
- RainbowKit
- TanStack Query
- Zustand

### Contracts
- Solidity 0.8.24+
- OpenZeppelin (ReentrancyGuard, Pausable)
- Foundry

## Contract Security

- `nonReentrant` on withdraw
- State updates before external calls
- Array length validation
- Max 10 recipients to prevent gas issues
- Recipients/splits cannot change after creation
- Pausable by creator

## Developer Notes

See `CLAUDE.md` for detailed implementation notes, common issues, and debugging tips. This file is intended for AI assistants and developers working on the codebase.

## License

MIT
