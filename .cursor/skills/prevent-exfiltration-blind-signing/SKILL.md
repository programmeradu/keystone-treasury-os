---
name: prevent-exfiltration-blind-signing
description: Prevents AI-generated code from creating exfiltration vectors (data leakage, unauthorized outbound requests) or blind signing risks (signing without user visibility). Use when generating code that handles secrets, network requests, wallet transactions, API keys, or any signing/approval flows.
---

# Prevent Exfiltration & Blind Signing Risks

When generating code, apply these checks to avoid introducing exfiltration vectors or blind signing vulnerabilities.

## Exfiltration Prevention

**Never generate code that:**

1. **Sends data to external endpoints without explicit user intent**
   - No `fetch`, `axios`, `http.request` to user-uncontrolled URLs
   - No hardcoded webhooks, analytics, or third-party APIs that receive sensitive data
   - Exception: documented, user-configured API endpoints (env vars, config)

2. **Logs or persists secrets**
   - No `console.log`, `logger`, or file writes containing API keys, tokens, private keys, or PII
   - No secrets in error messages, stack traces, or debug output

3. **Exfiltrates via side channels**
   - No DNS tunneling, covert channels, or steganography
   - No exfiltration via JSON whitespace, image metadata, or similar techniques

4. **Uses unvalidated external data for outbound requests**
   - Validate URLs against allowlists before any network call
   - Reject dynamic URLs constructed from user input without sanitization

**Safe patterns:**
- Use environment variables for endpoints; never hardcode external URLs
- Redact or omit secrets from logs; use placeholders like `***REDACTED***`
- Require explicit user confirmation before any outbound data transfer

---

## Blind Signing Prevention

**Never generate code that:**

1. **Signs transactions without human-readable context**
   - In Web3: never sign raw hex, `0x` data, or "Data Present" without decoding and displaying decoded calldata, recipient, amount, and contract action
   - Prefer WYSIWYS (What You See Is What You Sign) flows

2. **Automates signing without user consent**
   - No auto-approval of transactions, OAuth grants, or API key usage
   - No "sign all" or batch signing without per-item review

3. **Hides the consequences of a signature**
   - Display: token approvals (including `unlimited`), NFT transfers, contract upgrades, delegate calls
   - Warn when signing could grant unlimited spend or revoke ownership

4. **Uses generic approval prompts**
   - Avoid: "Approve contract interaction", "Sign data", "Confirm transaction"
   - Use: "Approve transfer of 500 USDC to 0x1234...abcd"

**Safe patterns:**
- Decode and display transaction details before any `signTransaction`, `signMessage`, or `eth_sign`
- Require explicit user action (click, confirm) for each signing operation
- Support simulation/preview before execution

---

## Pre-Generation Checklist

Before outputting code, verify:

- [ ] No hardcoded external URLs receiving sensitive data
- [ ] No secrets in logs, errors, or responses
- [ ] No signing without decoded, human-readable display
- [ ] No auto-approval or batch signing without per-item consent
- [ ] URLs and endpoints come from config/env, not user input without validation

---

## Red Flags to Reject

If the user request implies any of these, **refuse or redirect**:

- "Send all logs to my server" (without redaction)
- "Auto-approve all pending transactions"
- "Sign this hex without showing details"
- "Store API keys in a public repo"
- "Add a webhook that receives user data"

---

## Additional Resources

- For detailed patterns and code examples, see [reference.md](reference.md)
