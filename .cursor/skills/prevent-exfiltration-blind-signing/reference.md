# Reference: Exfiltration & Blind Signing Patterns

## Exfiltration Vectors (Avoid)

### Network-Based

| Pattern | Risk | Safe Alternative |
|---------|------|------------------|
| `fetch(userInput)` | SSRF, exfil to attacker URL | Allowlist URLs from config |
| `axios.post(process.env.WEBHOOK, data)` | Leaks `data` if env misconfigured | Require explicit user opt-in |
| `new URL(userProvided)` for outbound | User controls destination | Validate against allowlist |
| DNS queries with encoded data | DNS tunneling | Use standard DNS only |

### Logging & Persistence

| Pattern | Risk | Safe Alternative |
|---------|------|------------------|
| `console.log(token)` | Secret in stdout | `console.log('Token: ***')` |
| `logger.debug({ apiKey })` | Secret in log files | Omit or redact |
| `fs.writeFile('debug.json', state)` | May contain secrets | Redact before write |
| Error message with stack + env | Leaks env vars | Sanitize stack traces |

### Code Repository

| Pattern | Risk | Safe Alternative |
|---------|------|------------------|
| `git push` in automation | May push committed secrets | Never auto-push; use pre-push hooks |
| Commit with `.env` | Secrets in history | Add to `.gitignore`; use env templates |

---

## Blind Signing Patterns (Avoid)

### Web3 / Blockchain

| Pattern | Risk | Safe Alternative |
|---------|------|------------------|
| `signTransaction(tx)` without decode | User signs unknown action | Decode calldata, show recipient/amount |
| `eth_sign` for arbitrary data | Phishing, malicious approval | Use typed data (EIP-712) with schema |
| `approve(spender, MAX_UINT256)` | Unlimited token approval | Show amount; warn on unlimited |
| "Sign to continue" / "Data Present" | User has no visibility | Decode and display: action, amount, to |
| Batch sign N transactions | User can't review each | Require per-tx confirmation |

### General Signing

| Pattern | Risk | Safe Alternative |
|---------|------|------------------|
| Auto-approve OAuth scope | Over-permission | Show requested scopes; user confirms |
| Sign JWT without audience check | Token misuse | Validate audience, expiry |
| Sign config/code without review | Malicious config | Display diff; require explicit confirm |

---

## Example: Safe vs Unsafe

### Unsafe (exfiltration risk)

```javascript
// BAD: Sends data to hardcoded URL
const report = collectUserData();
await fetch('https://analytics.example.com/ingest', {
  method: 'POST',
  body: JSON.stringify(report)
});
```

### Safe

```javascript
// GOOD: Endpoint from config; user opts in
const endpoint = process.env.ANALYTICS_ENDPOINT;
if (!endpoint || !userConsent.analytics) return;
const report = redactSecrets(collectUserData());
await fetch(endpoint, { method: 'POST', body: JSON.stringify(report) });
```

### Unsafe (blind signing)

```javascript
// BAD: User signs without seeing details
const tx = await buildTransaction(calldata);
await wallet.signTransaction(tx);  // User sees hex only
```

### Safe

```javascript
// GOOD: Decode and display before signing
const decoded = decodeCalldata(calldata);
await showConfirmation({
  action: decoded.action,
  amount: decoded.amount,
  recipient: decoded.recipient,
  contract: decoded.contract
});
if (await userConfirms()) {
  await wallet.signTransaction(tx);
}
```

---

## MITRE ATT&CK Mapping

Relevant techniques to avoid enabling:

- **T1041**: Exfiltration Over C2 Channel
- **T1567**: Exfiltration Over Web Service (T1567.001 to code repo, T1567.003 to paste sites)
- **T1048**: Exfiltration Over Alternative Protocol (e.g., DNS)
