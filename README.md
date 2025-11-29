# Hidden Instruction War

Fully homomorphic encryption (FHE) turns a simple on-chain city builder into a privacy-first strategy game. Players claim starter gold, construct bases, barracks, and farms, and keep their choices secret until they decide to decrypt. The project demonstrates how to pair Zama's FHEVM with a modern React client for a fully private gameplay loop on Ethereum.

## Overview
- Encrypted city building: building ids (1 = base, 2 = barracks, 3 = farm) are stored as `euint32` on-chain and only revealed after an explicit decrypt flow.
- Fair starting line: every wallet can claim 500 GOLD once, enforced by the contract.
- Deterministic economy: fixed prices (base: 100, barracks: 10, farm: 10) deducted from a clear balance while the encrypted balance remains shareable.
- Client-controlled reveal: users generate keys client-side and use the Zama relayer to decrypt their gold or building history without exposing values to others.
- Sepolia-first: wagmi and RainbowKit are configured for Sepolia; the front end never points to localhost or uses env vars.

## Advantages & Problems Solved
- Privacy on a public chain: gameplay intent (what you build, when you spend) stays hidden until the player opts in to reveal it.
- Verifiable fairness: balances and events remain auditable, while confidential values stay encrypted.
- Simpler UX for confidential actions: encryption, key generation, and EIP-712 signing are wrapped in the UI; no manual CLI steps are required.
- Production-ready stack: reproducible deployments, ABI artifacts, and separated read/write paths (viem for reads, ethers for writes) keep the app predictable.

## Tech Stack
- **Smart contracts**: Solidity 0.8.27, Hardhat, hardhat-deploy, FHEVM plugin.
- **FHE**: `@fhevm/solidity` encrypted types (`euint32`, `euint64`) plus `@zama-fhe/relayer-sdk` in the UI.
- **Frontend**: React + Vite + TypeScript, RainbowKit for wallet onboarding, wagmi/viem for reads, ethers v6 for writes.
- **Testing & quality**: Hardhat + chai for tests, solhint/eslint/prettier, solidity-coverage, gas reporter.

## Architecture
- `contracts/EncryptedBuildingGame.sol`: core game logic, gold claiming, building construction, encrypted storage, and access control for decryptable handles.
- `contracts/GoldCoin.sol`: confidential ERC-7984 token example for encrypted minting.
- `contracts/FHECounter.sol`: sample FHE counter kept for reference/testing.
- `deploy/deploy.ts`: hardhat-deploy script that requires `PRIVATE_KEY`; the deployed address and ABI are saved under `deployments/`.
- `deployments/sepolia/EncryptedBuildingGame.json`: source of truth for the ABI and the deployed address; copy the address into the frontend config when redeploying.
- `src/`: Vite React app. Config lives in `src/src/config/` and uses the generated ABI from `deployments/sepolia`; no frontend env vars are required.
- Docs for integration details: `docs/zama_llm.md` (contracts) and `docs/zama_doc_relayer.md` (frontend relayer).

## Gameplay Flow
1. Connect a wallet on Sepolia via RainbowKit (wagmi already pins the chain).
2. Claim starter gold once (`claimGold`) to receive 500 GOLD.
3. Spend gold to build: base (100), barracks (10), or farm (10) via `build(buildingType)`.
4. Decrypt when ready: generate a keypair in the client, sign the EIP-712 payload, and use the Zama relayer to reveal encrypted buildings or gold.
5. Review history: encrypted building handles stay visible; decrypted ids appear in the UI after a successful reveal.

## Setup

### Prerequisites
- Node.js 20+
- npm

### Install (contracts workspace)
```bash
npm install
```

Create a `.env` in the project root (no mnemonics; private key only):
```
PRIVATE_KEY=0xYOUR_SEPOLIA_PRIVATE_KEY
INFURA_API_KEY=your_infura_project_id
ETHERSCAN_API_KEY=optional_for_verification
```

### Build, Lint, and Test
- Compile: `npm run compile`
- Unit tests: `npm run test`
- Coverage: `npm run coverage`
- Lint Solidity/TypeScript/formatting: `npm run lint`

### Local Contracts (for iteration)
- Start a local Hardhat FHE-ready node: `npm run chain`
- Deploy locally: `npm run deploy:localhost`
(The shipped frontend targets Sepolia; switch addresses manually in `src/src/config/contracts.ts` only if you intentionally test against the local network.)

### Deploy to Sepolia
```bash
npm run deploy:sepolia
```
- Requires `PRIVATE_KEY` and `INFURA_API_KEY` set in `.env`.
- The deployed address and ABI are written to `deployments/sepolia/EncryptedBuildingGame.json`. Propagate the address to `src/src/config/contracts.ts` when updating the live frontend.

### Frontend
```bash
cd src
npm install
npm run dev   # Vite dev server
npm run build # Production build
```
- Reads use viem/wagmi; writes use ethers v6.
- Contract ABI is sourced from `deployments/sepolia`; do not introduce frontend env vars.
- Wallets must be on Sepolia; the dapp will not connect to localhost networks.

## Future Work
- Expand encrypted assets: more building types, upgrades, and time-based mechanics secured with FHE.
- Add social features: encrypted alliances, shared reveal keys, or zero-knowledge leaderboards.
- Improve relayer UX: progress indicators, retries, and clearer signing prompts.
- Security hardening: additional invariants, fuzzing, and economic simulations for the fixed-price model.
- Deployment automation: staged Sepolia/Mainnet pipelines with automatic ABI sync into the frontend config.

## Notes and References
- Zama protocol docs: see `docs/zama_llm.md` and `docs/zama_doc_relayer.md`.
- ABI source of truth: `deployments/sepolia/EncryptedBuildingGame.json`.
- No git commands or tailwind are used; frontend hooks remain untouched by design.
