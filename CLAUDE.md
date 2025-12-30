# Claude Developer Notes for Hydra

This file contains implementation notes for AI assistants working on this codebase.

## Project Overview

Hydra is a collaborative checkout system for the MNEE Hackathon. The core concept is "recoup-first" payment splitting:

1. One collaborator (the "recoup recipient") receives 100% of all payments until a target amount is reached
2. Once the target is hit, the contract automatically flips to "post-recoup" mode
3. All subsequent payments are split according to configured percentages (basis points)

This "mode flip" is the key feature - it happens automatically on-chain without admin intervention.

### Content Delivery Feature

- **Optional Content URLs**: Creators can specify a link to digital content (downloads, access codes, etc.)
- **IPFS Metadata Storage**: Content URLs are stored in IPFS metadata (decentralized & tamper-proof)
- **Pay-to-Reveal**: Content URLs are only revealed to buyers after successful payment
- **Fallback Storage**: Uses localStorage as backup if IPFS upload fails (demo purposes)

## Architecture

```
/apps/web                 # Next.js 16 frontend (Turbopack)
/packages/contracts       # Solidity contracts (Foundry)
```

### Smart Contracts (`/packages/contracts`)

**CollabDealFactory.sol** - Factory pattern for creating deals
- Deploys new CollabDeal instances
- Validates inputs (2-10 recipients, bps sum = 10000, recoupTarget > 0)
- Tracks all deals and deals-per-creator
- Emits `DealCreated` event

**CollabDeal.sol** - Main payment logic
- Immutable after creation (recipients, splits, recoup settings cannot change)
- Two modes: `RECOUP` (enum 0) and `POST_RECOUP` (enum 1)
- Key state:
  - `recouped` - total amount paid during recoup phase
  - `recoupTarget` - threshold that triggers mode flip
  - `owed[address]` - mapping of pending withdrawals per recipient
  - `mode` - current payment mode
- Functions:
  - `pay(amount, productId, receiptHash)` - pay any amount
  - `payProduct(productId, receiptHash)` - pay fixed product price
  - `withdraw()` - pull pattern for recipients to claim funds
  - `pause()/unpause()` - creator-only emergency controls
- Events: `PaymentReceived`, `ModeFlipped`, `Withdrawn`
- Security: ReentrancyGuard on withdraw, state updates before external calls

**Testing**: 26 tests in `/packages/contracts/test/CollabDeal.t.sol`
- Run with: `~/.foundry/bin/forge test -vv`
- Note: System has both Atlassian's `forge` and Foundry's `forge` - use full path `~/.foundry/bin/forge`

### Frontend (`/apps/web`)

**Tech Stack**:
- Next.js 16.1.1+ with Turbopack (not webpack)
- React 19
- wagmi v2 + viem for contract interactions
- RainbowKit for wallet connection
- TanStack Query for caching
- Zustand for local state
- TailwindCSS for styling

**Pages**:

| Route | Purpose | Auth Required |
|-------|---------|---------------|
| `/` | Landing page | No |
| `/create` | Create new deal | Yes (wallet) |
| `/checkout/[deal]/[productId]` | Buyer payment flow | Yes (wallet) |
| `/ledger/[deal]` | Public read-only view | No |
| `/deal/[deal]` | Creator dashboard + withdraw | Yes (wallet) |

**Key Files**:
- `lib/chains.ts` - MNEE token addresses per chain (configured to use MockMNEE on Sepolia)
- `lib/contracts.ts` - ABIs for CollabDeal, Factory, ERC20
- `lib/mnee.ts` - Formatting helpers (formatMnee, bpsToPercent, etc.)
- `lib/store.ts` - Zustand stores for form state (includes contentUrl field)
- `lib/wagmi.ts` - RainbowKit/wagmi config
- `lib/ipfs.ts` - IPFS metadata upload/fetch utilities (Pinata integration)
- `lib/url.ts` - App URL utilities for shareable links (supports NEXT_PUBLIC_APP_URL env variable)
- `components/Providers.tsx` - Wraps app with wagmi/RainbowKit/TanStack

**NOTE:** All token addresses and RPC endpoints are configurable via environment variables - see "Environment Configuration" section below.

## Content Delivery System

### How It Works

1. **Creator adds content URL** (optional) when creating a deal
   - Examples: Google Drive link, Dropbox, IPFS file, private download link
   - Can be any URL that provides access to digital content

2. **Metadata uploaded to IPFS**
   ```typescript
   {
     dealName: "Studio Album",
     productName: "Digital Download",
     contentUrl: "https://drive.google.com/...",
     createdAt: "2025-12-28T...",
     version: "1.0.0"
   }
   ```

3. **IPFS hash stored on-chain**
   - Stored in `metadataHash` field of CollabDeal contract
   - Decentralized, immutable, verifiable

4. **Buyer makes payment**
   - Content URL remains hidden until payment succeeds

5. **Content revealed after payment**
   - Frontend fetches metadata from IPFS using the hash
   - Content URL displayed with "Access Your Content" link
   - Buyer clicks to access purchased content

### Storage Methods

**Primary: IPFS (Pinata)**
- Decentralized storage (web3-native)
- Content-addressed (tamper-proof)
- Free tier available: [app.pinata.cloud](https://app.pinata.cloud/)
- Requires `NEXT_PUBLIC_PINATA_JWT` env variable
- Optional dedicated gateway via `NEXT_PUBLIC_PINATA_GATEWAY` for faster retrieval

**Fallback: localStorage**
- Automatic fallback if IPFS upload fails
- Stores metadata in browser (persists between sessions)
- Good for demo/testing without API keys
- Not suitable for production (local only)

### Implementation Details

**Files Modified:**
- `lib/store.ts` - Added `contentUrl` field to CreateDealForm
- `lib/ipfs.ts` - New file with upload/fetch functions
- `app/create/page.tsx` - Content URL input + IPFS upload on create
- `app/checkout/[deal]/[productId]/page.tsx` - Fetch & reveal content after payment

**Key Functions:**
```typescript
// Upload metadata to IPFS
uploadMetadataToIPFS(metadata: DealMetadata): Promise<string>

// Fetch metadata from IPFS or localStorage
fetchMetadataFromIPFS(cidOrHash: string): Promise<DealMetadata | null>

// Store locally as backup
storeMetadataLocally(hash: string, metadata: DealMetadata): void

// Convert CID to bytes32 for Solidity
cidToBytes32(cid: string): `0x${string}`
```

## Deployed Contracts

### Sepolia Testnet (Development/Testing)

| Contract | Address | Notes |
|----------|---------|-------|
| CollabDealFactory (MockMNEE) | `0xbB656c7774f2E1b81f72A2eBdDdFe2557290a6AB` | **Current** - Uses MockMNEE for testing |
| MockMNEE (Test Token) | `0x4a79b8E7479da267930f3B14f6292c274e7B01b0` | Has public `faucet()` function |

### Mainnet (Production)

| Contract | Address | Notes |
|----------|---------|-------|
| CollabDealFactory | `0xB4DF502B0b964a481253B034Ad3d2b25cCeF2869` | **DEPLOYED** - Uses official MNEE token |
| MNEE Token (Official) | `0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF` | **Required for hackathon** |

## MNEE Token Addresses

| Network | Address | Usage |
|---------|---------|-------|
| Mainnet | `0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF` | **Required for hackathon** |
| Sepolia (Official) | `0x9CAF26bBFe63269FAF5C425f268fF81299dD9A74` | Official MNEE testnet token (no public faucet) |
| Sepolia (Mock) | `0x4a79b8E7479da267930f3B14f6292c274e7B01b0` | **Use this for testing** - has public `faucet()` function |

### Getting Test MNEE Tokens

The official MNEE token on Sepolia has no public mint/faucet function. For testing, use MockMNEE:

```bash
# Call faucet to get 1000 MNEE tokens
cd packages/contracts
source .env
~/.foundry/bin/cast send 0x4a79b8E7479da267930f3B14f6292c274e7B01b0 "faucet()" --private-key $PRIVATE_KEY --rpc-url $SEPOLIA_RPC_URL

# Or mint specific amount to an address
~/.foundry/bin/cast send 0x4a79b8E7479da267930f3B14f6292c274e7B01b0 "mint(address,uint256)" YOUR_ADDRESS 1000000000000000000000 --private-key $PRIVATE_KEY --rpc-url $SEPOLIA_RPC_URL
```

**Add MockMNEE to MetaMask:**
1. Switch to Sepolia network
2. Assets → Import Tokens
3. Token Address: `0x4a79b8E7479da267930f3B14f6292c274e7B01b0`
4. Symbol: `mMNEE`
5. Decimals: `18`

## Common Issues & Solutions

### 1. TypeScript errors with wagmi v2 hook returns

wagmi v2's `useReadContract` returns union types that include empty objects `{}`. Always use type guards:

```typescript
// BAD - will fail type check
const hasEnough = allowance >= productPrice;

// GOOD - use typeof checks
const hasEnough = typeof allowance === "bigint" && typeof productPrice === "bigint" && allowance >= productPrice;
```

### 2. BigInt literal errors

If you see "BigInt literals are not available when targeting lower than ES2020", ensure `tsconfig.json` has:
```json
"target": "ES2020"
```

### 3. Forge command not found / wrong forge

The system has Atlassian's Forge CLI at `/usr/local/bin/forge`. Use Foundry's forge with full path:
```bash
~/.foundry/bin/forge test -vv
~/.foundry/bin/forge build
```

### 4. Next.js 16 Turbopack errors

Next.js 16 uses Turbopack by default. If you see webpack config errors, ensure `next.config.ts` has:
```typescript
turbopack: {},  // Empty config tells Next to use Turbopack
```

### 5. ABI stateMutability errors

Constructors in ABIs need `stateMutability: "nonpayable"`:
```typescript
{
  type: "constructor",
  stateMutability: "nonpayable",  // Required!
  inputs: [...]
}
```

### 6. Array type checks for wagmi data

When using `recipients` or similar array data from contracts:
```typescript
// BAD
const contracts = recipients ? recipients.map(...) : [];

// GOOD
const contracts = Array.isArray(recipients) ? recipients.map(...) : [];
```

## Environment Configuration

### Quick Start: Testing vs Production

The app supports easy switching between **testing mode** (MockMNEE) and **production mode** (official MNEE):

**Testing Mode (Current):**
```bash
cp apps/web/.env.example apps/web/.env.local
# Edit .env.local - uses MockMNEE by default
```

**Production Mode:**
```bash
cp apps/web/.env.production.example apps/web/.env.production
# Edit .env.production - uses official MNEE
```

### Frontend Environment Variables

**File:** `apps/web/.env.local` (testing) or `apps/web/.env.production` (live)

```bash
# WalletConnect (required)
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=your_project_id

# App URL (optional - for production deployment)
# Set to your deployed URL (e.g., https://hydra.yourdomain.com)
# If not set, defaults to window.location.origin (works for local dev)
# Used for generating shareable checkout links
NEXT_PUBLIC_APP_URL=

# Factory addresses (from deployment)
NEXT_PUBLIC_SEPOLIA_FACTORY_ADDRESS=0xbB656c7774f2E1b81f72A2eBdDdFe2557290a6AB
NEXT_PUBLIC_MAINNET_FACTORY_ADDRESS=0x...

# MNEE token addresses (configurable!)
# For TESTING: Use MockMNEE
NEXT_PUBLIC_SEPOLIA_MNEE_ADDRESS=0x4a79b8E7479da267930f3B14f6292c274e7B01b0
# For PRODUCTION: Use official MNEE
NEXT_PUBLIC_MAINNET_MNEE_ADDRESS=0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF

# RPC URLs (optional - uses public RPCs if not set)
NEXT_PUBLIC_SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
NEXT_PUBLIC_MAINNET_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY

# IPFS Storage (optional - falls back to localStorage)
# Get free JWT at: https://app.pinata.cloud/developers/api-keys
NEXT_PUBLIC_PINATA_JWT=your_jwt_here
# Optional: Use your dedicated gateway for faster retrieval
# Format: example-gateway.mypinata.cloud (without https://)
NEXT_PUBLIC_PINATA_GATEWAY=
```

**Where to get:**
- WalletConnect Project ID: [cloud.walletconnect.com](https://cloud.walletconnect.com/)
- RPC URLs: [Alchemy](https://www.alchemy.com/) or [Infura](https://www.infura.io/)
- Pinata JWT: [app.pinata.cloud](https://app.pinata.cloud/developers/api-keys) (optional - for IPFS uploads)
- Factory addresses: See "Deployed Contracts" section

**Note on IPFS:**
- **With JWT**: Metadata uploaded to Pinata IPFS (decentralized, permanent)
- **Without JWT**: Falls back to localStorage (demo/testing only)
- **With dedicated gateway**: Faster retrieval via Pinata's CDN
- Both methods work - IPFS is recommended for production/hackathon demo

### Contract Deployment Environment Variables

**File:** `packages/contracts/.env`

```bash
PRIVATE_KEY=0x...  # MUST include 0x prefix!
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY
ETHERSCAN_API_KEY=YOUR_KEY
```

**Where to get:**
- Etherscan API Key: [etherscan.io/myapikey](https://etherscan.io/myapikey)
- Private Key: MetaMask → Account Details → Show Private Key (⚠️ use test wallet!)

## Deployment

### Deploy MockMNEE (Testing Only)

```bash
cd packages/contracts
~/.foundry/bin/forge script script/DeployMockMNEE.s.sol --rpc-url sepolia --broadcast
# Note the deployed address: 0x4a79b8E7479da267930f3B14f6292c274e7B01b0
```

### Deploy Factory

**For Testing (with MockMNEE):**
```bash
cd packages/contracts
MNEE_TOKEN=0x4a79b8E7479da267930f3B14f6292c274e7B01b0 \
  ~/.foundry/bin/forge script script/Deploy.s.sol --rpc-url sepolia --broadcast
# Current: 0xbB656c7774f2E1b81f72A2eBdDdFe2557290a6AB
```

**For Production (with official MNEE):**
```bash
cd packages/contracts
# Mainnet - uses official MNEE automatically
~/.foundry/bin/forge script script/Deploy.s.sol --rpc-url mainnet --broadcast --verify

# OR Sepolia with official MNEE
~/.foundry/bin/forge script script/Deploy.s.sol --rpc-url sepolia --broadcast --verify
```

**Update Frontend:**
```bash
# Edit apps/web/.env.local (or .env.production)
# Set NEXT_PUBLIC_SEPOLIA_FACTORY_ADDRESS or NEXT_PUBLIC_MAINNET_FACTORY_ADDRESS
```

### Frontend

```bash
cd apps/web
npm run dev
# Open http://localhost:3000
```

## Demo Flow (for hackathon presentation)

### Basic Flow (Core Features)

1. **Create deal**: Artist 70%, Producer 20%, Editor 10%, Producer recoups 30 MNEE first
2. **Set product**: "Digital Album" at 10 MNEE
3. **Add content URL** (optional): `https://drive.google.com/file/d/example-album`
4. **Buyer pays** 10 MNEE x3 = recoup complete, mode flips ⚡
5. **Buyer pays** 10 MNEE again = splits 7/2/1 MNEE according to percentages
6. **Content revealed**: Buyer sees download link after payment
7. **Collaborators withdraw** on `/deal/[address]` page
8. **Show transparency**: Public ledger at `/ledger/[address]`

### Key Demo Moments

1. **Mode Flip** - When recoup hits target (automatic on-chain)
2. **Content Reveal** - Digital goods delivered after payment (pay-to-access)
3. **IPFS Integration** - Decentralized metadata storage (web3-native)
4. **Transparent Splits** - Public ledger shows all payments & distributions

## File Modification History

Key decisions made during development:
- Used `via_ir = true` in foundry.toml to avoid "stack too deep" errors
- Renamed `recipientCount` local var to `numRecipients` to avoid shadowing function
- Added `stateMutability` to all constructor ABIs for viem compatibility
- Used `typeof x === "bigint"` guards throughout for wagmi v2 compatibility
- Configured Turbopack instead of webpack for Next.js 16
- Fixed hydration errors by using `useEffect` for `window.location.origin`
- Implemented IPFS metadata storage with localStorage fallback for demo
- Added content URL field to enable pay-to-access digital content delivery
- Made MNEE token addresses and RPC endpoints fully configurable via env variables
- Created `lib/url.ts` utility with `NEXT_PUBLIC_APP_URL` env variable for production-ready shareable links

## Testing Checklist

### Contract Tests
- [ ] `~/.foundry/bin/forge test -vv` - all 26 tests pass
- [ ] Factory deployed with correct MNEE token address

### Frontend Build
- [ ] `npm run build` in apps/web - builds without errors
- [ ] `npm run dev` - starts without Turbopack errors
- [ ] No hydration errors in console

### Wallet & Connection
- [ ] Wallet connects via RainbowKit
- [ ] Can switch to Sepolia network
- [ ] MockMNEE token visible in wallet (import if needed)
- [ ] Can call MockMNEE faucet to get test tokens

### Create Deal Flow
- [ ] Can create deal with all fields
- [ ] Optional content URL field accepts input
- [ ] "Uploading to IPFS..." shows during creation
- [ ] Deal created successfully (tx hash shown)
- [ ] Payment link displayed after creation
- [ ] Can copy payment link

### Checkout/Payment Flow
- [ ] Checkout page loads with deal info
- [ ] Approve MNEE transaction works
- [ ] Payment transaction succeeds
- [ ] Success page shows transaction hash
- [ ] **Content URL revealed after payment** (if set)
- [ ] Content link is clickable

### Dashboard & Ledger
- [ ] Creator dashboard (`/deal/[address]`) shows owed amounts
- [ ] Withdraw function works for recipients
- [ ] Ledger page (`/ledger/[address]`) loads without wallet
- [ ] Public ledger displays all collaborators & splits
- [ ] Mode flip indicator shows correctly (RECOUP → POST-RECOUP)

### IPFS/Metadata
- [ ] Metadata stored (check localStorage as fallback)
- [ ] Content URL fetched after payment
- [ ] Falls back gracefully if IPFS unavailable
