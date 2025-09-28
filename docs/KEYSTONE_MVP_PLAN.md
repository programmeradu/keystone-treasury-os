# Keystone Command Layer — MVP Plan

Status legend: [ ] pending · [~] in progress · [x] done · [!] blocked

## 0) Current Status Snapshot
- [x] Plan documented in repo (this file)
- [ ] Product brief aligned with stakeholders
- [ ] Design direction locked (visual language, sections, assets)
- [ ] MVP scope approved

---

## 1) Product Vision
While competitors build better dashboards, Keystone removes the need for them. The Keystone Command Layer lets Web3 leaders manage their entire treasury through natural language — transforming multi-step, cross-chain, multi-party operations into simple, declarative prompts.

### Success Criteria (MVP)
- A user can type: "Bridge 200k USDC from Treasury A on Ethereum to Treasury B on Solana, then stake 25%" and get:
  - [ ] A clear, explainable plan (steps, rationale, costs, time estimates)
  - [ ] Executable actions with safe defaults and constraints
  - [ ] Dry-run simulation + post-execution audit trail
- [ ] Support at least one EVM chain (Ethereum mainnet or Sepolia) and Solana (mainnet or devnet)
- [ ] Non-custodial: user brings their wallet(s); we never hold keys

### Non-Goals (MVP)
- Advanced portfolio analytics and dashboards
- Full DEX aggregator parity across all chains
- Automated policy engines and approvals (only basic role-based guardrails at MVP)

---

## 2) Scope (MVP)
- [ ] Natural-language command → Planner → Executable plan
- [ ] Executor with adapters (Bridge, Swap, Stake) — start with 1–2 well-supported providers per chain
- [ ] Wallet connection (EVM + Solana) and transaction building
- [ ] Dry-run simulation with clear warnings
- [ ] Execution + status updates + audit log
- [ ] Minimal admin: role-based access (Owner, Operator, Viewer)
- [ ] Landing page + product narrative focused on Command Layer

---

## 3) System Architecture (High-Level)
- App: Next.js 15 (App Router), TypeScript, Shadcn/UI, Tailwind (no styled-jsx)
- Server components for data fetching; client components for interactivity
- API Routes for planner, execution, adapters, and logs
- Orchestrator:
  1) Parse command → 2) Plan with constraints → 3) Quote + simulate → 4) Execute
- Adapters (modular):
  - Bridge: (e.g., Wormhole/LI.FI scaffold; start with one provider)
  - Swap: (e.g., 0x/Uniswap v3 or Jupiter for Solana)
  - Stake: (e.g., Lido (EVM) / Marinade (Solana))
- Storage: Start in-memory or lightweight DB for runs/logs; add durable DB when needed
- Observability: structured logs per step, correlation IDs

---

## 4) Feature Breakdown & Deliverables

### A) Command Intake & Planner
- [x] Command input UI with examples (server + client hybrid)
- [ ] Parser: structured intent (action, chains, tokens, amounts, wallets)
- [ ] Planner: produce steps, guardrails, constraints, estimates, and provenance
- [ ] Error resilience: always return a usable plan with clear failure notes

Deliverables:
- [x] /api/planner with deterministic, explainable output
- [ ] Step models: { id, type, params, estimates, risks, references }

### B) Quoting & Simulation
- [~] Quote engine calls adapter(s) to fetch price/fee/time
- [ ] Soft timeouts + retries + jitter
- [ ] Dry-run simulator (no on-chain writes) with explicit risk summary

Deliverables:
- [x] /api/quotes for bridge/swap/stake (deterministic unified; fallback wired in HomeClient)
- [x] /api/simulate returning per-step viability and warnings

### C) Execution & Wallets
- [ ] Wallet connect (EVM, Solana) — non-custodial
- [ ] Build & sign tx per step with review screen
- [ ] Execute in sequence with real-time status

Deliverables:
- [ ] /api/execute orchestrating steps with idempotency keys
- [ ] Client-side executor UI with progress and failure recovery

### D) Audit & Observability
- [ ] Structured run logs & events
- [ ] Human-readable audit trail: who, what, when, where, why
- [ ] Downloadable run report

Deliverables:
- [ ] /api/runs (list, detail) with filters
- [ ] Run detail page with timeline + export (PDF/JSON)

### E) Access Control (Basic)
- [ ] Roles: Owner, Operator, Viewer
- [ ] Simple policy guard: certain actions require Owner approval

Deliverables:
- [ ] Middleware to enforce role checks per route
- [ ] Policy evaluation surface (stubbed in MVP)

### F) Marketing Site (Landing Page)
- [~] Modern, premium landing — no purple, compact elements, minimal animation
- [x] Narrative: "Eliminate dashboards. Command your treasury."
- [~] Sections: Hero, How it Works (3 steps), Use Cases, Security, CTA

Deliverables:
- [x] / (homepage) redesigned to Keystone narrative
- [~] Asset pipeline for 4K imagery (abstract tech/finance; purple-avoidance)

---

## 5) Planning & Milestones

### Milestone 1 — Foundations (Week 1)
- [~] Project scaffolding confirmation (lint, tsconfig, ui components)
- [x] Command input + Planner API (stub returns deterministic plan)
- [~] Quoting & Simulation scaffolds
- [x] Basic Landing content scaffold

Exit: end-to-end stubbed demo from prompt → plan → simulated steps (no real chain calls)

### Milestone 2 — Adapters & Wallets (Week 2)
- [ ] EVM adapter v1 (bridge or swap)
- [ ] Solana adapter v1 (bridge or swap)
- [ ] Wallet connect flows + tx build/review for one action

Exit: prompt → plan → simulate → sign → execute one simple flow on testnets

### Milestone 3 — Execution & Audit (Week 3)
- [ ] Full executor with progress and retries
- [ ] Audit logs + Runs list/detail pages
- [ ] Role checks around sensitive actions

Exit: stable multi-step run on testnets with downloadable audit report

### Milestone 4 — Polish & Launch (Week 4)
- [ ] Landing polish (copy, assets, sections)
- [ ] Error messages, empty states, loading states
- [ ] Hardening: timeouts, idempotency, telemetry

Exit: public demo-ready MVP

---

## 6) UX Principles
- Command-first; no dashboard sprawl
- Compact components; avoid oversized hero/sections
- Clear, explainable plans and risks
- Minimal motion; purpose-driven only
- Strong typography and contrast; absolutely avoid purple hues

---

## 7) Technical Principles
- Keep server components pure; isolate interactivity in clients
- Never block client components with server-only APIs
- Tailwind for styling; Shadcn/UI primitives; no styled-jsx
- Deterministic planner output; graceful degradation under failures
- Adapters are modular, replaceable, and constrained

---

## 8) Risks & Mitigations
- Provider instability → retries, soft timeouts, fallback paths
- Cross-chain complexity → limit providers in MVP; prioritize reliability
- Wallet UX complexity → focus on clear review and step-by-step execution
- Security posture → non-custodial only; clear signing prompts; audit logs

---

## 9) Metrics (Post-MVP)
- Time-to-plan (p95)
- Plan acceptance rate
- Successful execution rate (by step type)
- User task completion time vs baseline workflows

---

## 10) Tracking Checklist
- [x] Command Intake UI
- [x] Planner API (deterministic)
- [x] Quotes API (bridge/swap/stake)
- [ ] Executor (client + API)
- [ ] Wallet connect (EVM, Solana)
- [ ] Audit logs + Runs pages
- [ ] Role checks
- [~] Landing page redesign & assets
- [ ] Hardening (timeouts, retries, idempotency)

---

## 11) Rollout Plan
- Week 1: internal dogfood on testnets
- Week 2: private pilot with 3–5 target users
- Week 3–4: expand pilot, collect feedback, tighten copy & flows
- Week 5: public demo + waitlist

---

## 12) Open Questions
- Which single bridge/swap provider pair offers best reliability per chain for MVP?
- Which staking provider is most aligned with our target users initially?
- Do we require org-level workspaces in MVP or single-tenant per org is fine?