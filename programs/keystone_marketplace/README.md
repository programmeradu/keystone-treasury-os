# Keystone App Registry — Solana Program

Decentralized purchase flow with 80/20 revenue split and License NFT.  
KIMI_MARKETPLACE_SPEC.

## Build

```bash
# From repo root (requires Anchor CLI)
anchor build
```

On first run, Anchor generates `target/deploy/keystone_marketplace-keypair.json`.  
Then run `anchor keys sync` to update `declare_id!` and `Anchor.toml` with the program ID.

## Instructions

| Instruction       | Purpose                                                                 |
|-------------------|-------------------------------------------------------------------------|
| **initialize_app** | Create app listing (developer, price_usdc, developer_fee_bps=8000, ipfs_cid) |
| **purchase_app**   | Atomic: 80% to developer, 20% to treasury, mint 1 License NFT to buyer  |

## Integration

- **TypeScript client:** `src/lib/marketplace/client.ts` — PDA helpers, fetch AppRegistry
- **API stub:** `src/app/api/studio/marketplace/register/route.ts` — on-chain registration flow
- **Publish flow:** `keystone publish` → Hot path (registry) + Cold path (Arweave) → optional on-chain via `initialize_app`

## License NFT

The License NFT is a Soulbound token (SBT) minted to the buyer. Keystone OS checks wallet ownership before loading the app.
