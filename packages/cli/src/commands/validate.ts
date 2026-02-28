import * as fs from "node:fs";
import * as path from "node:path";

const FORBIDDEN_PATTERNS = [
  { pattern: /\bfetch\s*\(/g, msg: "Direct fetch() is blocked. Use useFetch() from '@keystone-os/sdk'." },
  { pattern: /\blocalStorage\b/g, msg: "localStorage is blocked in sandbox." },
  { pattern: /\bsessionStorage\b/g, msg: "sessionStorage is blocked in sandbox." },
  { pattern: /\bdocument\.cookie\b/g, msg: "document.cookie is blocked in sandbox." },
  { pattern: /\bwindow\.parent\.postMessage\b/g, msg: "window.parent.postMessage is reserved for SDK." },
  { pattern: /\beval\s*\(/g, msg: "eval() is blocked by CSP." },
  { pattern: /\bnew\s+Function\s*\(/g, msg: "new Function() is blocked by CSP." },
];

export interface ValidateError {
  file: string;
  line: number;
  message: string;
  suggestion?: string;
}

export interface ValidateResult {
  ok: boolean;
  errors: ValidateError[];
  suggestions?: string[];
}

/**
 * Ouroboros Loop — Self-correction: detect bugs and suggest patches.
 */
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

export function runValidate(dir: string = ".", options?: { suggest?: boolean }): ValidateResult {
  const targetDir = path.resolve(process.cwd(), dir);
  const errors: ValidateError[] = [];

  const files = ["App.tsx", "app.tsx"];
  for (const file of files) {
    const filePath = path.join(targetDir, file);
    if (!fs.existsSync(filePath)) continue;

    const content = fs.readFileSync(filePath, "utf-8");

    for (const { pattern, msg } of FORBIDDEN_PATTERNS) {
      const re = new RegExp(pattern.source, pattern.flags);
      let m: RegExpExecArray | null;
      while ((m = re.exec(content)) !== null) {
        const lineNum = content.slice(0, m.index).split("\n").length;
        const err: ValidateError = { file, line: lineNum, message: msg };
        if (options?.suggest) {
          err.suggestion = getSuggestion(err);
        }
        errors.push(err);
      }
    }

    const hasSdkImport = /from\s+['"]@keystone-os\/sdk['"]/.test(content);
    const hasForbidden = FORBIDDEN_PATTERNS.some((p) => new RegExp(p.pattern.source).test(content));
    if (!hasSdkImport && hasForbidden) {
      const err: ValidateError = {
        file,
        line: 1,
        message: "Use '@keystone-os/sdk' for fetch/vault/turnkey instead of raw APIs.",
      };
      if (options?.suggest) {
        err.suggestion = `Add: import { useFetch, useVault } from '@keystone-os/sdk';`;
      }
      errors.push(err);
    }
  }

  const suggestions = options?.suggest ? errors.map((e) => e.suggestion).filter(Boolean) as string[] : undefined;

  return { ok: errors.length === 0, errors, suggestions };
}
