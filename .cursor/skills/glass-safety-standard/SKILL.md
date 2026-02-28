---
name: glass-safety-standard
description: Enforces Keystone's Glass Safety Standard — no blind signing. All privileged signing must route through useTurnkey().signTransaction(). Use when generating or reviewing code that signs transactions, accesses wallet providers, or constructs Solana transactions in Keystone Studio, Mini-Apps, or SDK integrations.
---

# Glass Safety Standard

Keystone **never** allows blind signing. The AI must enforce this standard whenever generating or reviewing signing-related code.

---

## The Rule

**Never generate or suggest code that:**

1. **Constructs transactions manually** for direct signing
   - Do not build raw `Transaction` or `VersionedTransaction` and pass to any non-Turnkey signer
   - Do not bypass the simulation firewall by signing outside the Keystone flow

2. **Accesses wallet providers directly**
   - Never use `window.solana`, `window.phantom`, `window.ethereum`, or similar injected providers
   - Never use `navigator.credentials` or WebAuthn APIs directly for signing
   - Never use `@solana/wallet-adapter` or wallet adapter `signTransaction` in Studio/Mini-App code

3. **Signs without human-readable context**
   - No raw hex, `0x` data, or opaque "Data Present" prompts
   - No generic "Approve transaction" without decoded impact

---

## The Fix

**All privileged signing must route exclusively through `useTurnkey().signTransaction()`.**

```ts
import { useTurnkey } from '@keystone-os/sdk';

const { getPublicKey, signTransaction } = useTurnkey();

// ✅ Correct: useTurnkey routes through the Simulation Firewall
const result = await signTransaction(transaction, 'Swap 1 SOL for USDC');
```

**Why this is required:**
- `useTurnkey().signTransaction()` automatically triggers a **pre-flight mainnet fork simulation** (`simulateTransaction`)
- The OS presents a **human-readable impact report** (balance changes, risk level, summary) before prompting the user
- Failed simulations are **hard blocked** — no signature prompt is shown
- The user sees "You send: X SOL | You receive: Y USDC" before approving

---

## Forbidden Patterns

| ❌ Forbidden | ✅ Use Instead |
|-------------|----------------|
| `window.solana?.connect()` | `useTurnkey().getPublicKey()` |
| `wallet.signTransaction(tx)` (adapter) | `useTurnkey().signTransaction(tx, description)` |
| `window.phantom.solana.request({ method: 'signTransaction', params: [tx] })` | `useTurnkey().signTransaction(tx, description)` |
| `navigator.credentials.get()` for signing | `useTurnkey().signTransaction(tx, description)` |
| Building tx and passing to any non-Turnkey signer | Build tx, pass to `useTurnkey().signTransaction()` |

---

## Pre-Generation Checklist

Before outputting signing-related code:

- [ ] No `window.solana`, `window.phantom`, `window.ethereum`, or `navigator.credentials`
- [ ] No wallet adapter `signTransaction` in Studio/Mini-App code
- [ ] All signing flows use `useTurnkey().signTransaction(tx, description)`
- [ ] Transaction construction is allowed; signing must go through Turnkey only

---

## Red Flags to Reject

- "Use Phantom's signTransaction directly"
- "Connect to window.solana for signing"
- "Bypass the simulation for faster UX"
- "Sign this hex without showing details"
- Any code that routes signing outside `useTurnkey()`

---

## Scope

- **Applies to:** Keystone Studio, Mini-Apps, SDK integrations, and any code that runs in the Keystone sandbox or uses `@keystone-os/sdk`
- **Does not apply to:** Host app wallet flows (e.g. `useWallet` in the main app) that are outside the Studio sandbox — those may use wallet adapters per their design
