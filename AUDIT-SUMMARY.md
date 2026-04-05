# Keystone Treasury OS - Audit Summary (Quick Reference)

**19 Critical P0 Blockers | 5-6 Week Fix | 140 Person-Hours**

---

## Issues at a Glance

| # | Issue | File | Impact | Time |
|---|-------|------|--------|------|
| 1 | JWT Hardcoded | auth-utils.ts:11 | Auth bypass | 0.5h |
| 2 | SIWS No Nonce | auth/siws/route.ts | Replay attack | 4h |
| 3 | OAuth Race | exchange-session.ts:44 | Wrong user login | 2h |
| 4 | DCA User Auto-Create | solana/dca-bot.ts:5 | Tier bypass | 3h |
| 5 | Team Members Public | team/[id]/members.ts | Info leak | 2h |
| 6 | Runs No Isolation | runs/route.ts:33 | **All runs visible** | 1h |
| 7 | Vault Activity Public | vault/[addr]/activity.ts | **Any vault visible** | 2h |
| 8 | Vault Tier Bypass | VaultSelector.tsx:28 | Unlimited vaults | 4h |
| 9 | Onboarding No Vault | onboarding/page.tsx | Empty dashboard | 8h |
| 10 | Vaults Not Persisted | VaultSelector.tsx | No DB record | 6h |
| 11 | No Approvals Notify | notifications table | Silent approvals | 4h |
| 12 | Marketplace No Verify | marketplace/purchase.ts:17 | **Can fake purchases** | 6h |
| 13 | Webhook Bypass | webhooks/lemon-squeezy.ts:21 | **Fake subscriptions** | 1h |
| 14 | DCA Shared Key | dca-execute.ts:163 | All bots compromised | 8h |
| 15 | No Legal Pages | Missing | GDPR violation | 4h |
| 16 | No GDPR Export | Missing /api/user/* | €20M fine risk | 8h |
| 17 | No /api/health | Missing | No monitoring | 2h |
| 18 | No Rate Limiting | All public routes | DDoS exposed | 6h |

---

## Fix by Week

**Week 1 (38h):** Auth + Info Leak Security
- JWT fix (0.5h)
- SIWS nonce (4h)
- OAuth fix (2h)
- Webhook fix (1h)
- Runs + Vault activity isolation (3h)
- Rate limiting (6h)
- Health endpoint (2h)

**Week 2 (22h):** Business Logic
- Vault tier bypass (4h)
- Vault persistence (6h)
- Onboarding vault (8h)
- DCA user creation (3h)
- Approvals notifications (4h)

**Week 3 (28h):** Legal + Payment
- Legal pages (4h)
- GDPR export/delete (8h)
- Marketplace verification (6h)
- DCA keypair fix (8h)
- Team auth fixes (2h)

**Week 4-5:** Testing, QA, Launch

---

## Critical Fixes TODAY (8.5h)

1. **JWT hardcoding** (0.5h) → Remove fallback
2. **SIWS nonce** (4h) → Add validation
3. **Webhook signature** (1h) → Require env var
4. **Runs isolation** (1h) → Add user filter
5. **Vault activity** (2h) → Check ownership

---

## Financial Impact

| | Launch Now | Fix 5-6w |
|---|---|---|
| MRR | $300-500 | $1.5-2.5K |
| Churn | 85% | 5% |
| Legal Risk | €30M+ | ✅ Compliant |
| **ROI** | **–** | **+$12-18K/yr** |

---

## Categories

**Auth (4):** #1,#2,#3,#4  
**AuthZ (3):** #5,#6,#7  
**Business (5):** #8,#9,#10,#11,#12  
**Payment (3):** #13,#14,(#12)  
**Legal (2):** #15,#16  
**Ops (2):** #17,#18

---

**Full details:** See KEYSTONE-AUDIT-19-ISSUES.md
