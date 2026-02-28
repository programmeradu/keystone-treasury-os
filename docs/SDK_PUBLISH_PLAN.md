# Keystone SDK & CLI — Publish Plan

Plan to extract the virtual `@keystone-os/sdk` into a published npm package, library, and CLI for Keystone Studio and Mini-Apps.

**Sovereign OS 2026 Direction:** The SDK evolves from simple hooks into a **Policy-as-Code** and **Agentic Interoperability** framework. See [SOVEREIGN_OS_2026_ROADMAP.md](./SOVEREIGN_OS_2026_ROADMAP.md) for the full strategic roadmap.

---

## 1. Package Structure (Monorepo)

```
keystone-treasury-os/
├── packages/
│   ├── sdk/                    # @keystone-os/sdk
│   │   ├── src/
│   │   │   ├── index.ts        # Main exports
│   │   │   ├── types.ts        # Token, VaultState, TurnkeyState, etc.
│   │   │   ├── bridge.ts       # KeystoneBridge interface + BridgeMethods
│   │   │   ├── hooks/
│   │   │   │   ├── useVault.ts
│   │   │   │   ├── useTurnkey.ts
│   │   │   │   ├── useFetch.ts
│   │   │   │   └── AppEventBus.ts
│   │   │   └── createSDK.ts    # Factory: createSDK(bridge) → hooks
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── README.md
│   │
│   └── cli/                    # @keystone-os/cli
│       ├── src/
│       │   ├── index.ts         # CLI entry
│       │   ├── commands/
│       │   │   ├── init.ts      # keystone init
│       │   │   ├── validate.ts  # keystone validate
│       │   │   └── build.ts     # keystone build (optional)
│       │   └── utils.ts
│       ├── package.json
│       ├── tsconfig.json
│       └── README.md
│
├── package.json                # Root: workspaces
└── pnpm-workspace.yaml         # or npm workspaces
```

---

## 2. @keystone-os/sdk — Library Design

### 2.1 Bridge Abstraction

The SDK does **not** contain postMessage logic. It depends on a `KeystoneBridge` interface injected by the host:

```ts
// packages/sdk/src/bridge.ts
export interface KeystoneBridge {
  call(method: string, params?: Record<string, unknown>, timeoutMs?: number): Promise<unknown>;
  notify(method: string, params?: Record<string, unknown>): void;
}

export const BridgeMethods = {
  TURNKEY_GET_PK: "turnkey.getPublicKey",
  TURNKEY_SIGN: "turnkey.signTransaction",
  PROXY_REQUEST: "proxy.fetch",
  EVENT_EMIT: "event.emit",
} as const;
```

### 2.2 Hooks API (unchanged)

```ts
// packages/sdk/src/index.ts
export { useVault, useTurnkey, useFetch, AppEventBus } from './hooks';
export type { Token, VaultState, TurnkeyState, FetchOptions, FetchResult } from './types';
export { BridgeMethods, type KeystoneBridge } from './bridge';
```

### 2.3 Two Usage Modes

| Mode | Who provides bridge? | Where SDK runs |
|------|----------------------|----------------|
| **Studio iframe** | Host injects `keystoneBridge` (postMessage) via `IFRAME_BRIDGE_CLIENT` | Sandboxed iframe |
| **Standalone / tests** | Dev provides mock `KeystoneBridge` | Node or browser |

For Studio, the OS continues to inject the bridge client string and the SDK bundle (or blob URL). The SDK package is used to:
- Generate the runtime bundle for the iframe (so we have a single source of truth)
- Provide types for Mini-App authors (`npm i @keystone-os/sdk`)
- Enable local dev/testing with a mock bridge

### 2.4 Build Outputs

- `main`: `dist/index.js` (CJS)
- `module`: `dist/index.mjs` (ESM)
- `types`: `dist/index.d.ts`
- `exports`: conditional exports for ESM/CJS

### 2.5 Migration in keystone-treasury-os

1. Add `packages/sdk` as workspace dependency.
2. In `LivePreview.tsx` / `bridge-protocol.ts`: import SDK from `@keystone-os/sdk` and either:
   - Use `createSDK(keystoneBridge)` to get hooks, then inject that bundle into iframe, **or**
   - Keep injecting the bridge client + a pre-bundled SDK that expects `window.keystoneBridge` (simpler for iframe).
3. In `CodeEditor.tsx`: remove inline `KEYSTONE_SDK_TYPES`; use `@keystone-os/sdk` types.
4. In `keystone.lock.json`: change `@keystone-os/sdk` from `blob:keystone-sdk` to `https://esm.sh/@keystone-os/sdk@x.y.z` (or keep blob for Studio-controlled version).

---

## 3. @keystone-os/cli — CLI Design

### 3.1 Commands

| Command | Description |
|---------|-------------|
| `keystone init [dir]` | Scaffold a new Mini-App (App.tsx, keystone.lock.json, tailwind) |
| `keystone validate` | Typecheck + lint against SDK (ensures `@keystone-os/sdk` imports are valid) |
| `keystone build` | (Optional) Bundle Mini-App for deployment / Arweave |
| `keystone dev` | (Optional) Local dev server with mock bridge |

### 3.2 `keystone init`

Creates:

```
my-mini-app/
├── App.tsx              # Starter with useVault, useFetch
├── keystone.lock.json   # { packages: { "@keystone-os/sdk": "latest", "react": "..." } }
├── package.json        # Optional: for local typecheck
└── README.md
```

### 3.3 `keystone validate`

- Parses `App.tsx` (and other files)
- Ensures `@keystone-os/sdk` is used (no raw `fetch`, no `localStorage`)
- Runs `tsc --noEmit` if `tsconfig.json` exists
- Exits 1 on violations (Glass Safety Standard checks)

### 3.4 Bin Entry

```json
// packages/cli/package.json
{
  "bin": {
    "keystone": "./dist/index.js"
  }
}
```

Users run: `npx @keystone-os/cli init` or `npm i -g @keystone-os/cli` then `keystone init`.

---

## 4. Publishing Checklist

### 4.1 SDK

- [ ] Create `packages/sdk` with types + hooks
- [ ] Add `createSDK(bridge)` for host-injected bridge
- [ ] Build with `tsup` or `tsc` + `esbuild`
- [ ] Publish to npm: `npm publish --access public`
- [ ] Update keystone-treasury-os to consume `@keystone-os/sdk`
- [ ] Update Studio iframe to use SDK bundle (or esm.sh in lockfile)

### 4.2 CLI

- [ ] Create `packages/cli` with `init`, `validate`
- [ ] Use `commander` or `yargs` for CLI parsing
- [ ] Publish: `npm publish --access public`
- [ ] Add to README: `npx @keystone-os/cli init`

### 4.3 Versioning

- Use **semver**. Start at `0.1.0` or `1.0.0`.
- SDK and CLI can version independently.
- Consider `changesets` or `lerna` for monorepo releases.

---

## 5. Security Notes (Glass Safety Standard)

- SDK must **never** expose raw `fetch` or `localStorage` to Mini-App code.
- `useFetch` always routes through `proxy.fetch` (Proxy Gate).
- `useTurnkey.signTransaction` must be paired with Simulation Firewall on the host.
- CLI `validate` should flag: `fetch(`, `localStorage`, `eval(`, etc.

---

## 6. Sovereign OS 2026 Extensions

The SDK extends with Policy-as-Code and Agentic Interoperability:

| Category | Hooks / Utilities |
|----------|-------------------|
| **Security** | `useEncryptedSecret()`, `useACEReport()`, ZKSP stubs |
| **Agentic** | `useAgentHandoff()`, `useMCPClient()`, `useMCPServer()`, observability in `useFetch` |
| **DX** | `toBlink()`, `useYieldOptimizer()`, `useGaslessTx()` |
| **Prebuilt** | `useSIWS()`, `useJupiterSwap()`, `useImpactReport()`, `useTaxForensics()` |
| **CLI** | Ouroboros loop, pinned import maps, `build --anchor-arweave` |

See [SOVEREIGN_OS_2026_ROADMAP.md](./SOVEREIGN_OS_2026_ROADMAP.md).

---

## 7. Quick Start (After Implementation)

```bash
# Create a new Mini-App
npx @keystone-os/cli init my-portfolio
cd my-portfolio

# Validate against SDK rules
npx @keystone-os/cli validate

# In your Mini-App code
import { useVault, useFetch, useSIWS, useImpactReport } from '@keystone-os/sdk';
```
