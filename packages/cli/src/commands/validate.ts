import * as fs from "node:fs";
import * as path from "node:path";

// ─── Regex-based Security Patterns ──────────────────────────────────

const FORBIDDEN_PATTERNS = [
  { pattern: /\bfetch\s*\(/g, msg: "Direct fetch() is blocked. Use useFetch() from '@keystone-os/sdk'." },
  { pattern: /\blocalStorage\b/g, msg: "localStorage is blocked in sandbox." },
  { pattern: /\bsessionStorage\b/g, msg: "sessionStorage is blocked in sandbox." },
  { pattern: /\bdocument\.cookie\b/g, msg: "document.cookie is blocked in sandbox." },
  { pattern: /\bwindow\.parent\.postMessage\b/g, msg: "window.parent.postMessage is reserved for SDK." },
  { pattern: /\beval\s*\(/g, msg: "eval() is blocked by CSP." },
  { pattern: /\bnew\s+Function\s*\(/g, msg: "new Function() is blocked by CSP." },
];

// ─── AST-based Security Checks ──────────────────────────────────────
// Lightweight AST analysis using regex patterns that match code structure
// more precisely than simple word matching.

const AST_PATTERNS = [
  {
    // Dynamic import() — can load arbitrary code
    pattern: /\bimport\s*\(\s*[^)]+\)/g,
    msg: "Dynamic import() is blocked in sandbox. Declare imports statically.",
    suggestion: "Use static imports: import { ... } from '@keystone-os/sdk';",
  },
  {
    // XMLHttpRequest — bypass proxy gate
    pattern: /\bnew\s+XMLHttpRequest\b/g,
    msg: "XMLHttpRequest is blocked. Use useFetch() from '@keystone-os/sdk'.",
    suggestion: "Replace with: const { data } = useFetch(url);",
  },
  {
    // WebSocket — non-proxied network access
    pattern: /\bnew\s+WebSocket\b/g,
    msg: "WebSocket is blocked in sandbox. Use useMCPClient() for real-time communication.",
    suggestion: "Replace with: const mcp = useMCPClient(serverUrl);",
  },
  {
    // Worker — spawn threads
    pattern: /\bnew\s+Worker\s*\(/g,
    msg: "Web Workers are blocked in sandbox.",
  },
  {
    // SharedWorker
    pattern: /\bnew\s+SharedWorker\s*\(/g,
    msg: "SharedWorker is blocked in sandbox.",
  },
  {
    // window.open — popup
    pattern: /\bwindow\.open\s*\(/g,
    msg: "window.open() is blocked in sandbox.",
  },
  {
    // document.write — XSS vector
    pattern: /\bdocument\.write\s*\(/g,
    msg: "document.write() is blocked — XSS risk.",
  },
  {
    // innerHTML assignment — XSS vector
    pattern: /\.innerHTML\s*=/g,
    msg: "Direct innerHTML assignment is a XSS risk. Use React's JSX for DOM manipulation.",
    suggestion: "Use React state and JSX instead of innerHTML.",
  },
  {
    // Crypto mining detection
    pattern: /\bCoinHive\b|\bcoinhive\b|\bcryptominer\b/gi,
    msg: "Suspected crypto mining code detected.",
  },
  {
    // Dangerous protocol URLs
    pattern: /['"`]javascript:/gi,
    msg: "javascript: protocol URLs are blocked — XSS risk.",
  },
  {
    // Access to __proto__ — prototype pollution
    pattern: /\b__proto__\b/g,
    msg: "__proto__ access is blocked — prototype pollution risk.",
  },
  {
    // Access to constructor.constructor — function creation bypass
    pattern: /\.constructor\s*\.\s*constructor/g,
    msg: "constructor.constructor chain is blocked — code execution bypass risk.",
  },
];

// ─── Types ──────────────────────────────────────────────────────────

export interface ValidateError {
  file: string;
  line: number;
  message: string;
  suggestion?: string;
  severity?: "error" | "warning";
}

export interface ValidateResult {
  ok: boolean;
  errors: ValidateError[];
  warnings: ValidateError[];
  suggestions?: string[];
}

// ─── Suggestion Engine (Ouroboros Loop) ─────────────────────────────

function getSuggestion(error: ValidateError): string | undefined {
  if (error.message.includes("fetch()")) {
    return `Replace fetch(url) with: const { data } = useFetch(url);`;
  }
  if (error.message.includes("localStorage")) {
    return `Use useEncryptedSecret() from '@keystone-os/sdk' for persistent storage.`;
  }
  if (error.message.includes("sessionStorage")) {
    return `Use in-memory state or useEncryptedSecret() from '@keystone-os/sdk'.`;
  }
  if (error.message.includes("document.cookie")) {
    return `Use useSIWS() from '@keystone-os/sdk' for session/auth.`;
  }
  if (error.message.includes("postMessage")) {
    return `Use AppEventBus.emit() from '@keystone-os/sdk' for host communication.`;
  }
  return undefined;
}

// ─── Validator ──────────────────────────────────────────────────────

export function runValidate(dir: string = ".", options?: { suggest?: boolean }): ValidateResult {
  const targetDir = path.resolve(process.cwd(), dir);
  const errors: ValidateError[] = [];
  const warnings: ValidateError[] = [];

  const files = ["App.tsx", "app.tsx"];
  for (const file of files) {
    const filePath = path.join(targetDir, file);
    if (!fs.existsSync(filePath)) continue;

    const content = fs.readFileSync(filePath, "utf-8");

    // ─── Regex-based pattern checks ─────────────────────
    for (const { pattern, msg } of FORBIDDEN_PATTERNS) {
      const re = new RegExp(pattern.source, pattern.flags);
      let m: RegExpExecArray | null;
      while ((m = re.exec(content)) !== null) {
        const lineNum = content.slice(0, m.index).split("\n").length;
        const err: ValidateError = { file, line: lineNum, message: msg, severity: "error" };
        if (options?.suggest) {
          err.suggestion = getSuggestion(err);
        }
        errors.push(err);
      }
    }

    // ─── AST-based security checks ──────────────────────
    for (const { pattern, msg, suggestion } of AST_PATTERNS) {
      const re = new RegExp(pattern.source, pattern.flags);
      let m: RegExpExecArray | null;
      while ((m = re.exec(content)) !== null) {
        const lineNum = content.slice(0, m.index).split("\n").length;
        const entry: ValidateError = {
          file,
          line: lineNum,
          message: msg,
          severity: msg.includes("risk") ? "warning" : "error",
        };
        if (options?.suggest && suggestion) {
          entry.suggestion = suggestion;
        }
        if (entry.severity === "warning") {
          warnings.push(entry);
        } else {
          errors.push(entry);
        }
      }
    }

    // ─── Missing SDK import check ───────────────────────
    const hasSdkImport = /from\s+['"]@keystone-os\/sdk['"]/.test(content);
    const hasForbidden = FORBIDDEN_PATTERNS.some((p) => new RegExp(p.pattern.source).test(content));
    if (!hasSdkImport && hasForbidden) {
      const err: ValidateError = {
        file,
        line: 1,
        message: "Use '@keystone-os/sdk' for fetch/vault/turnkey instead of raw APIs.",
        severity: "error",
      };
      if (options?.suggest) {
        err.suggestion = `Add: import { useFetch, useVault } from '@keystone-os/sdk';`;
      }
      errors.push(err);
    }
  }

  const suggestions = options?.suggest
    ? [...errors, ...warnings].map((e) => e.suggestion).filter(Boolean) as string[]
    : undefined;

  return { ok: errors.length === 0, errors, warnings, suggestions };
}
