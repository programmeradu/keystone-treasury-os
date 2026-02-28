# @keystone-os/cli

CLI for Keystone Studio Mini-Apps — **Sovereign OS 2026**. Scaffold, validate, and build with Ouroboros self-correction and Arweave cold path.

## Install

```bash
npm install -g @keystone-os/cli
# or
npx @keystone-os/cli init
```

## Commands

### init [dir]

Scaffold a new Mini-App.

```bash
keystone init my-app
npx @keystone-os/cli init my-app
```

### validate [dir] (Ouroboros Loop)

Validate against Glass Safety Standard. Use `--suggest` for self-correction hints.

```bash
keystone validate --suggest
```

- Direct `fetch()` → use `useFetch()` from SDK
- `localStorage` / `eval` / etc. → blocked
- **Pinned Import Maps** — enforces `?external=react,react-dom` for esm.sh

### lockfile [dir]

Validate pinned import maps only.

```bash
keystone lockfile
```

### build [dir]

Build Mini-App. Optional Arweave cold path for atomic rollbacks.

```bash
keystone build
keystone build --anchor-arweave
keystone build -o ./dist
```

### publish [dir]

Full pipeline: Gatekeeper → Build → Arweave (Cold) → Registry (Hot).

| Step | Action | Tool |
|------|--------|------|
| 1. Scan | Security & policy check | Gatekeeper AST + lockfile |
| 2. Anchor | Immutable code upload | Arweave via Irys |
| 3. Register | Hot path indexing | Keystone OS API |

```bash
keystone publish -n "My App" -d "Description" -w <creator_wallet> --api-url https://keystone.example.com
keystone publish --skip-arweave   # Skip Arweave (registry only)
```
