# ChainFlow Oracle — Phase 2 Plan (Execution, Optimizer, Persistence)

Status legend: [ ] pending · [~] in progress · [x] done · [!] blocked

## Current Status
- [x] Review & Sign dialog renders normalized, signable transactions only (non-tx steps excluded)
- [x] Sign Selected triggers wallet: provider detection, chain switch, eth_sendTransaction, hash surfaced
- [x] Auto-enrichment: if calldata missing for swap/bridge, attempts live quote to fill tx fields
- [x] Objective passthrough to planner (cheapest | fastest | mostSecure) threads existing constraints
- [x] Wallet button polish (light/dark) in header and dialog
- [~] Scenario cards use placeholder metrics (to be replaced with real optimizer outputs)
- [x] Multi-quote aggregation and scoring per step
- [x] Post-sign tracking stub: persist signed tx hashes locally
- [ ] Persistence: save runs + permalink + open by ID

---

## Objectives
- Deliver end-to-end execution preview with real, optimized routes
- Score routes per objective (fees/time/security) with tie-breakers and rationale
- Persist runs with short links for sharing and reproducibility
- Keep UI responsive with great loading, error, and provenance states

---

## Workstream A — Wallet Execution & Safety
- [x] Normalize step → tx mapping; skip non-transactional types (yield/vest/analysis)
- [x] Prefer live quote tx fields (details.tx.{to,data,value,gas}) when present
- [x] Fallback to known routers when safe and only as preview, with warnings
- [x] Chain switching + account selection + transaction submission (hash display)
- [x] Post-sign tracking stub (store hashes locally/API)
- [ ] "Sign all" sequential flow with per-tx confirmation, progress, and abort

Deliverables:
- Executable tx preview and seamless wallet prompt with explicit safeguards

---

## Workstream B — Objective Optimizer
- [x] Objective input and constraint threading (max slippage, min liquidity, preferred chain)
- [x] Fetch multiple quotes per step (bridge/swap) with retries/backoff
- [~] Score by objective:
  - cheapest: total fees (bridge + swap + gas) with slippage bounds
  - fastest: ETA + reliability; tie-break by fees
  - mostSecure: allowlist, audit status, TVL, chain security; tie-break by fees/ETA
- [x] Return rationale and alternatives per step with metrics
- [~] Populate scenario cards with real fee/time/APR aggregates (fees/time live; APR placeholder)

Deliverables:
- Deterministic optimizer output powering scenario comparisons and execution

---

## Workstream C — Persistence & Sharing
- [ ] DB schema: runs(id int, short_id, prompt, result_json, created_at)
- [ ] API: POST /api/runs (save), GET /api/runs/[short_id] (load)
- [ ] UI: Save Run, Recent Runs, open by ID; share button links to short_id

Deliverables:
- Shareable, reproducible runs with compact links

---

## Optional D — Auth & Gating
- [ ] Email/password auth (better-auth) for advanced features
- [ ] Gate execution/persistence behind session

---

## Optional E — Pricing & Limits
- [ ] Usage caps and plan gating; pricing page integration

---

## Testing Checklist
- [ ] Wallet flow on MetaMask, Rainbow, Coinbase; chain switch success/failure handling
- [ ] Aggregator failures (timeout/4xx/5xx) → step ok:false; plan ok:true
- [ ] Optimizer determinism across re-runs with same inputs
- [ ] Permalink open path: no prompt → populated state → run planner
- [ ] Mobile UI: dialog layout, scroll, safe areas

---

## Progress Log
- 2025-09-26: Wired wallet signing with chain switch; normalized tx preview; planner objective passthrough; wallet button polish.
- 2025-09-26: Started optimizer multi-quote + scoring; added post-sign tracking stub (persist signed tx hashes to localStorage).
- 2025-09-26: Marked post-sign tracking as complete and persisted hashes via localStorage load/save in /oracle UI.
- 2025-09-26: Planner now aggregates multi-source quotes (bridge/swap), scores by objective, returns rationale and alternatives; UI shows optimizer rationale and uses live fees/time in scenario cards (APR pending).