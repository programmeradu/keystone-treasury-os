# @keystone-os/sdk

**Sovereign OS 2026** — Policy-as-Code and Agentic Interoperability SDK for Keystone Studio Mini-Apps.

## Install

```bash
npm install @keystone-os/sdk react
```

## Usage

```tsx
import { useVault, useFetch, useSIWS, useImpactReport } from '@keystone-os/sdk';

export default function App() {
  const { tokens } = useVault();
  const { signIn, session } = useSIWS();
  const { simulate } = useImpactReport();

  return (
    <div>
      {tokens.map((t) => (
        <div key={t.symbol}>{t.symbol}: {t.balance}</div>
      ))}
    </div>
  );
}
```

## Core API

- **useVault()** — Vault state (balances, tokens)
- **useTurnkey()** — `getPublicKey()`, `signTransaction()` (routes through host)
- **useFetch(url, options?)** — Proxy-gated fetch; optional `observability: { provider: 'langfuse' }`
- **AppEventBus.emit(type, payload?)** — Emit events to host

## Sovereign OS 2026 Hooks

| Category | Hook | Description |
|----------|------|-------------|
| **Identity** | `useSIWS()` | Sign-In With Solana, session persistence |
| **Finance** | `useJupiterSwap()` | Jupiter routing, quotes |
| **Compliance** | `useACEReport()` | ACE regulatory reporting |
| **Reporting** | `useTaxForensics()` | Tax basis, gain/loss |
| **Simulation** | `useImpactReport()` | Before/After treasury snapshots |
| **Security** | `useEncryptedSecret()` | Lit Protocol wallet-based secrets |
| **Agentic** | `useAgentHandoff()`, `useMCPClient()`, `useMCPServer()` | Federated handoff, MCP |
| **DX** | `useYieldOptimizer()`, `useGaslessTx()` | Earn stack, gasless hub |
| **Utils** | `toBlink()`, `verifyZKSP()` | Blinks export, ZK simulation proofs |

## Bridge

Mini-Apps run in a sandboxed iframe. The host injects `keystoneBridge` before your code runs. For local testing, use `setBridge(mockBridge)`.

## Glass Safety Standard

- No blind signing — `signTransaction` routes through host Simulation Firewall
- No direct `fetch` — use `useFetch` (Proxy Gate)
- No `localStorage` / `eval` — sandbox blocks these
