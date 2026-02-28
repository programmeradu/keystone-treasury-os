---
name: institutional-execution
description: Enforces safe, institutional-grade on-chain execution for Solana treasury workflows. Use when building transaction logic, DAO treasury operations, multisig proposals, or any code that constructs, simulates, or executes Solana transactions.
---

# Institutional-Grade On-Chain Execution

Apply these protocols when building transaction logic for treasury operations, DAO workflows, or on-chain execution.

---

## 1. Simulation-First

**Every transaction logic block must include a call to `simulateTransaction` before execution.**

- Use Helius Mainnet Fork (or mainnet RPC) for simulation
- Fail fast: if simulation returns `err`, do not proceed to execution
- Use simulation to validate compute units, account changes, and program behavior

**Required flow:**
```
Build transaction → simulateTransaction → check err → if success, then execute
```

---

## 2. Squads v4 Integration

**When dealing with DAO treasuries, wrap instructions in multisig-compatible proposals.**

- Use Squads v4 program: `SQDS4ep65T869zMMBKyuUq6aD6EgTu8psMjkvj52pCf`
- Prefer `multisig.instructions` for raw instructions, or `multisig.transactions` for VersionedTransaction
- Create proposals via Create Proposal → Create Vault Transaction → Approve → Execute
- Never bypass multisig for treasury-controlled assets

---

## 3. Transaction Versioning

**Use `VersionedTransaction` only. Reject legacy transactions for all new treasury workflows.**

- Do not use `Transaction` (legacy) for new code
- Use `@solana/web3.js` `VersionedTransaction` with `MessageV0` or `TransactionMessage`
- Support address lookup tables (ALTs) for smaller transaction size
- Legacy transactions are deprecated for institutional flows

---

## 4. Asset Deltas

**Functions must return a predicted "Before/After" snapshot of token balances.**

- Define a return type that includes `before` and `after` balance snapshots
- Include: mint, owner, balance (raw and human-readable), and any new/closed accounts
- Compute deltas from simulation logs or explicit balance fetches
- Surface this to the caller so signers can verify expected outcomes

**Example shape:**
```ts
interface AssetDelta {
  mint: string;
  owner: string;
  before: { raw: bigint; ui: number };
  after: { raw: bigint; ui: number };
  delta: { raw: bigint; ui: number };
}
```

---

## Pre-Generation Checklist

Before outputting transaction or execution code:

- [ ] `simulateTransaction` is called before any execution path
- [ ] DAO/treasury flows use Squads v4 multisig proposals
- [ ] Only `VersionedTransaction` is used (no legacy `Transaction`)
- [ ] Functions return or expose Before/After asset deltas
- [ ] Simulation errors block execution

---

## Red Flags to Reject

- Execute without prior simulation
- Use legacy `Transaction` for new treasury logic
- Direct treasury transfers without Squads multisig
- Functions that don't expose predicted balance changes

---

## Additional Resources

- For code examples and API details, see [reference.md](reference.md)
