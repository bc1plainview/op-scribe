# OP_Scribe -- On-chain Proof of File Existence

OP_Scribe is a three-layer application built on OPNet (Bitcoin L1) that provides
cryptographic proof of file existence by storing IPFS content identifiers (CIDs)
on-chain with associated metadata.

## Architecture

```
┌──────────────────────────────────────────────────┐
│  Frontend (Vite + React + OPWallet)              │
│  - Upload page (drag & drop)                     │
│  - File browser (enumerate on-chain records)     │
│  - Verification page (check CID proof)           │
└───────────────┬──────────────┬───────────────────┘
                │              │
         IPFS Upload     Contract Calls
         (HTTP POST)     (via OPWallet)
                │              │
┌───────────────▼──────┐  ┌───▼───────────────────┐
│  Backend (Node.js)   │  │  OPNet Smart Contract  │
│  - Pinata IPFS API   │  │  - registerFile()      │
│  - File validation   │  │  - getFile()           │
│  - CID return        │  │  - checkFileExists()   │
└──────────────────────┘  │  - getFileByIndex()    │
                          │  - getTotalFiles()     │
                          │  - pause/unpause       │
                          └────────────────────────┘
```

## Project Structure

```
op-scribe/
├── contract/           # OPNet smart contract (AssemblyScript -> WASM)
│   ├── src/
│   │   ├── index.ts        # Entry point with factory + abort handler
│   │   └── OPScribe.ts     # Contract implementation
│   ├── build/
│   │   └── OPScribe.wasm   # Compiled contract
│   ├── abis/
│   │   └── OPScribe.abi.json  # Auto-generated ABI
│   ├── asconfig.json
│   └── package.json
│
├── backend/            # Node.js IPFS upload API
│   ├── src/
│   │   └── index.ts        # HTTP server with Pinata integration
│   ├── .env.example         # Environment variable template
│   ├── tsconfig.json
│   └── package.json
│
├── frontend/           # Vite + React + TypeScript dApp
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx          # Root component with tab navigation
│   │   ├── abi/
│   │   │   └── OPScribeAbi.ts  # Contract ABI + TypeScript interface
│   │   ├── components/
│   │   │   ├── UploadPage.tsx   # File upload + IPFS + on-chain
│   │   │   ├── BrowsePage.tsx   # Browse registered files
│   │   │   └── VerifyPage.tsx   # Verify CID on-chain
│   │   ├── services/
│   │   │   └── ipfs.ts          # Backend API client
│   │   ├── styles/
│   │   │   └── app.css          # Full dark theme CSS
│   │   └── types/
│   │       └── config.ts        # Config constants
│   ├── index.html
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── package.json
│
└── README.md
```

## Setup

### Prerequisites

- Node.js >= 24
- npm
- A Pinata account (free tier: 1GB, 100 files)

### 1. Smart Contract

```bash
cd contract
npm install --legacy-peer-deps
npm run build
# Output: build/OPScribe.wasm + abis/OPScribe.abi.json
```

NOTE: After `npm install`, you may need to patch `node_modules/bs58check`
to use `@noble/hashes/sha2.js` instead of `@noble/hashes/sha256` due to
the v2 export map change. The build script handles this automatically if
you use the included setup.

### 2. Backend

```bash
cd backend
npm install
cp .env.example .env
# Edit .env and add your Pinata JWT
npm run dev
# Server starts on http://localhost:3001
```

### 3. Frontend

```bash
cd frontend
npm install --legacy-peer-deps
npm run dev
# Dev server starts on http://localhost:5173
```

## Contract Methods

| Method | Selector | Description |
|--------|----------|-------------|
| `registerFile(cid, fileName, fileSize)` | `0x44887d59` | Register a new file proof |
| `getFile(cid)` | `0xb3ff079b` | Get file record by CID |
| `checkFileExists(cid)` | `0xd007e2ec` | Check if CID is registered |
| `getTotalFiles()` | `0x42b9be00` | Total registered files |
| `getFileByIndex(index)` | `0x8958fbb0` | Get file by sequential index |
| `pause()` | `0x2138ec0c` | Pause contract (deployer only) |
| `unpause()` | `0x8144711b` | Unpause contract (deployer only) |
| `getIsPaused()` | `0x28b3bca6` | Check pause status |

## Flow

1. User selects a file in the frontend
2. Frontend sends file to backend via POST /upload
3. Backend pins file to Pinata IPFS, returns CID + metadata
4. Frontend calls registerFile(cid, fileName, fileSize) via OPWallet
5. User signs the OPNet transaction in their wallet
6. Contract stores the proof on Bitcoin L1
7. Anyone can verify the proof using the Verify page

## Contract Storage Layout

- Pointer 0: paused (bool)
- Pointer 1: totalFiles (u256 counter)
- Pointer 2: fileSizes (cidHash -> u256)
- Pointer 3: fileUploaders (cidHash -> u256-encoded address)
- Pointer 4: fileBlocks (cidHash -> u256 block number)
- Pointer 5: fileTimestamps (cidHash -> u256 timestamp)
- Pointer 6: fileExists (cidHash -> u256 0/1)
- Pointer 7: fileNameChunks (cidHash-based -> chunked string)
- Pointer 8: cidChunks (index-based -> chunked string)

## Next Steps

1. Deploy contract to regtest
2. Set CONTRACT_ADDRESS in frontend/src/types/config.ts
3. Integrate WalletConnect for real wallet connection
4. Wire up contract calls in Upload/Browse/Verify pages
   (commented-out code shows the exact pattern)
5. Test end-to-end on regtest
6. Deploy to IPFS for static hosting

## Security Notes

- All u256 arithmetic uses SafeMath (overflow/underflow protection)
- File CID uniqueness enforced (no duplicate registrations)
- Deployer-only pause/unpause
- No BTC custody (verify-don't-custody pattern)
- 10MB file size limit enforced at backend level
- CORS restricted to allowed origins

## Tech Stack

- Smart Contract: AssemblyScript + @btc-vision/btc-runtime
- Backend: Node.js + Pinata SDK (TypeScript)
- Frontend: Vite + React + TypeScript
- Wallet: @btc-vision/walletconnect (OPWallet)
- Network: OPNet regtest (regtest.opnet.org)

## License

MIT
