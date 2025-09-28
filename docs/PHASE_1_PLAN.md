# ChainFlow Oracle — Phase 1 Plan (Planner Hardening)

Status legend: [ ] pending · [~] in progress · [x] done · [!] blocked

## Current Status
- [x] Planner error resolved — endpoint now always returns ok:true with a safe fallback
- [x] Verified via API tests (prompted and empty payload cases)
- [x] Bridge/swap orchestration returns structured details; upstream quote errors are surfaced per-step without failing the whole plan

---

## Objectives
- Make planner resilient (never shows generic "Planner error")
- Wire reliable quote orchestration using existing internal endpoints
- Prepare optimizer surface (cheapest/fastest/secure) for Phase 2
- Improve data quality, retries, and provenance

---

## Workstream A — Planner Reliability
- [x] Add robust fallback inside /api/planner so it never fails on parser hiccups
- [x] Sanitize amounts/units to avoid NaN and broken query params
- [x] Global safety net to always return a default plan on unexpected errors
- [x] Add lightweight input validation and clearer per-step error summaries

Deliverables:
- Planner returns { ok: true, steps: [...] } even if /api/ai/parse is down or returns bad JSON

---

## Workstream B — Quote Orchestration (Internal APIs)
- [x] Bridge: normalize params (fromChain/toChain/token/amount → units)
- [x] Swap: normalize params (sellToken/buyToken/amount/chainId → units)
- [x] Yield: add ranking and safety flags in UI from response data

Notes:
- Upstream aggregator errors (e.g., LI.FI invalid address) are surfaced in step.details/error while keeping the plan usable.
- Yield UI now sorts by APY, shows top-3 picks with APY and TVL chips, and flags Extreme APY / Low TVL.

Deliverables:
- Consistent step details + references for provenance

---

## Workstream C — Optimizer Surface (Scaffolding)
- [x] Accept objective: "cheapest" | "fastest" | "mostSecure" (maps to bridgePreference already in UI)
- [x] Thread constraints (maxSlippagePct, minLiquidityUsd, preferredChain) through planner decisions
- [x] Return scenario metadata (fee/time estimate placeholders) for UI scenario cards (optimizer.estimates)

Deliverables:
- Deterministic selection fields included in planner response (paved road for Phase 2 optimizer)

---

## Workstream D — Data Quality and Resilience
- [x] Retry with jitter for internal calls
- [x] Handle non-JSON responses safely
- [x] Add soft timeouts per step and mark failures as ok:false with actionable message

Deliverables:
- Stable runs under partial outages with actionable diagnostics

---

## Testing Checklist
- [x] Planner with only prompt (no steps provided)
- [x] Planner when /api/ai/parse returns non-JSON body
- [x] Planner when amounts are missing/invalid
- [x] Planner when swap/bridge quote returns 4xx/5xx (step ok:false, overall ok:true)
- [x] Yield ranking chips render (top-3), safety flags visible for extreme APY / low TVL

Evidence:
- Bridge 100k USDC (LI.FI 400) → step ok:false, plan ok:true
- Swap with invalid chainId 999999 (502) → step ok:false, plan ok:true
- Yield step sorted by APY with badges and safety flags in /oracle UI

---

## Notes & Next Steps
- Phase 1 focuses on reliability and deterministic orchestration using existing endpoints.
- Phase 2 will introduce aggregator integrations (LI.FI / 0x / CoW), objective optimizer, and wallet execution.
- Next: Expose data freshness chips per step and minor copy/UX polish for step error summaries.