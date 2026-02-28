---
name: studio-browser-esm
description: Enforces browser-only constraints for Keystone Studio, which compiles React and TypeScript in-browser via Babel and ESM import maps. Use when writing or reviewing Studio code, user-authored components, or any code that runs inside the Studio sandbox.
---

# Studio Browser-Only ESM Environment

Keystone Studio compiles React and TypeScript **directly in the browser** using Babel and ESM import maps. Node.js APIs do not exist. Standard Node.js development patterns will crash the application.

When writing or reviewing code that runs in the Studio sandbox, enforce these rules.

---

## 1. No Node.js APIs

**Node.js APIs do not exist in this environment.** Never import or use:

| Forbidden | Reason |
|-----------|--------|
| `fs` | File system API is Node-only |
| `path` | Path resolution is Node-only |
| `child_process` | Process spawning is Node-only |
| `require()` | CommonJS loader; use ESM `import` only |
| `__dirname` | Node global; undefined in browser |
| `__filename` | Node global; undefined in browser |
| `process.env` | Node process object; use `import.meta.env` or host-provided config instead |

**Correct (browser-compatible):**

```ts
import { useState } from "react";
// Use import.meta.env or props/config passed from host
const apiUrl = config?.apiUrl ?? "https://api.example.com";
```

**Forbidden:**

```ts
import fs from "fs";
import path from "path";
const env = process.env.NODE_ENV;
const dir = __dirname;
const x = require("lodash");
```

If you see Node.js imports or globals in Studio code, replace them with browser-safe alternatives or remove them.

---

## 2. No Dynamic Code Execution (Sandbox Escape Vectors)

**Strictly avoid** constructs that execute arbitrary code from strings. These are critical sandbox escape vectors:

| Forbidden | Reason |
|-----------|--------|
| `eval()` | Executes arbitrary code |
| `new Function(...)` | Creates functions from string body |
| `setTimeout("code")` | String form executes in global scope |
| `setInterval("code")` | String form executes in global scope |

**Correct:**

```ts
setTimeout(() => doSomething(), 1000);
setInterval(callback, 1000);
```

**Forbidden:**

```ts
eval("alert(1)");
new Function("return 1 + 1")();
setTimeout("console.log(1)", 1000);
```

---

## 3. Import Maps and esm.sh

All third-party imports must be mapped to **esm.sh** with the `?external=react,react-dom` flag. This prevents multiple instances of React from loading and crashing hooks.

**Correct import map entry:**

```json
{
  "imports": {
    "lodash-es": "https://esm.sh/lodash-es?external=react,react-dom",
    "date-fns": "https://esm.sh/date-fns?external=react,react-dom"
  }
}
```

**Rules:**

- Use `https://esm.sh/<package>` for third-party packages.
- Always append `?external=react,react-dom` so React comes from the host, not a duplicate bundle.
- Use ESM-compatible packages (e.g. `lodash-es`, not `lodash`).

**Forbidden:**

```json
{
  "lodash": "https://esm.sh/lodash"
}
```
(Missing `?external=react,react-dom`; may load duplicate React.)

---

## Pre-Commit Checklist

Before submitting code that runs in the Studio sandbox:

- [ ] No `fs`, `path`, `child_process`, `require()`, `__dirname`, `__filename`, or `process.env`.
- [ ] No `eval()`, `new Function()`, or string-based `setTimeout`/`setInterval`.
- [ ] Third-party imports use esm.sh with `?external=react,react-dom` in the import map.

---

## Red Flags to Reject

- Importing Node built-ins "for type checking only" — they still fail at runtime.
- Using `process.env` "because it works in dev" — it does not exist in the browser sandbox.
- Adding `eval` or `new Function` for "dynamic imports" — use static `import()` or host-provided module loading instead.
- Omitting `?external=react,react-dom` from esm.sh URLs — causes duplicate React and broken hooks.
