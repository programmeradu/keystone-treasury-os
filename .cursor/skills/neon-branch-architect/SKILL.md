---
name: neon-branch-architect
description: Manages the lifecycle of ephemeral Neon database branches for the AI Studio Sandbox. Use when implementing Architect Mode, spawning database branches, applying migrations to branches, or cleaning up branches on session end or Arweave commit.
---

# Neon Branch Architect

Apply these protocols when managing ephemeral database branches for the AI Studio Sandbox.

---

## 1. Branch Spawning

**When a user enters "Architect Mode," fork the main branch state using the Neon API.**

- Use `POST /projects/{project_id}/branches` to create a branch from `main`
- Store the branch ID and connection string for the session
- Branch name should be deterministic and traceable (e.g., `studio-{session_id}` or `architect-{wallet_address}-{timestamp}`)
- Never spawn branches without prior RLS verification (see §3)

**Required flow:**
```
Verify SIWS JWT (wallet_address) → POST /branches → Store branch_id + connection_string
```

---

## 2. Schema Integrity

**Apply migrations to the branch before the AI starts its test run.**

- Run all pending migrations against the branch connection string, not the main branch
- Use the same migration tooling as production (e.g., Supabase migrations, Drizzle, Prisma)
- Fail fast: if migrations fail, do not proceed to AI test run
- Ensure migration order is preserved (timestamp or sequential numbering)

**Required flow:**
```
Branch ready → Run migrations on branch DB → Verify success → Enable AI test run
```

---

## 3. RLS Enforcement

**Always verify that the SIWS JWT contains the `wallet_address` claim before performing Neon operations.**

- Decode and validate the SIWS JWT before any branch create/delete/query
- Reject requests where `wallet_address` is missing or invalid
- Use the `wallet_address` for branch naming, RLS policies, or audit trails
- Never perform Neon operations on behalf of unauthenticated or unverified users

**Required flow:**
```
Incoming request → Decode SIWS JWT → Assert wallet_address present → Proceed with Neon op
```

---

## 4. Cleanup

**Trigger branch deletion when the Studio session is terminated or the app is committed to Arweave.**

- Use `DELETE /projects/{project_id}/branches/{branch_id}` to remove the ephemeral branch
- Cleanup triggers:
  1. User explicitly exits Architect Mode
  2. Studio session timeout or disconnect
  3. App successfully committed to Arweave (branch no longer needed)
- Do not leave orphaned branches; enforce a maximum branch lifetime if cleanup hooks fail
- Log branch deletion for audit purposes

**Required flow:**
```
Session end / Arweave commit → DELETE /branches/{branch_id} → Confirm deletion
```

---

## Pre-Generation Checklist

Before outputting Neon branch logic:

- [ ] SIWS JWT `wallet_address` is verified before any Neon API call
- [ ] Branch creation uses `POST /branches` from main
- [ ] Migrations run against the branch connection string before AI test run
- [ ] Cleanup logic is wired to session end and Arweave commit
- [ ] No hardcoded Neon API keys; use env vars

---

## Red Flags to Reject

- Neon operations without prior SIWS JWT validation
- Running migrations on main instead of the ephemeral branch
- Skipping cleanup on session termination
- Orphaned branches with no deletion path

---

## Additional Resources

- For Neon API details and code examples, see [reference.md](reference.md)
- Neon API reference: https://api-docs.neon.tech/reference/getting-started-with-neon-api
