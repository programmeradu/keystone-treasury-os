/**
 * Keystone Lockfile Resolver
 * 
 * Reads keystone.lock.json and constructs ESM Import Maps for the Mini-App runtime.
 * Prevents the "Two Reacts" problem by externalizing React from all packages.
 * Falls back to esm.sh with ?bundle for unknown packages.
 * 
 * [GPT-5.2] — Zero-Build Runtime Environment
 */

// ─── Types ──────────────────────────────────────────────────────────

export interface LockfileEntry {
  version: string;
  url: string;
  external?: string[];
  integrity?: string | null;
}

export interface LockfileSchema {
  $schema: string;
  description: string;
  runtime: Record<string, LockfileEntry>;
  packages: Record<string, LockfileEntry>;
}

export interface ImportMap {
  imports: Record<string, string>;
}

// ─── Static Lockfile Data (inlined at build time) ───────────────────
// We inline the lockfile to avoid async fetch at runtime inside the iframe.

const LOCKFILE: LockfileSchema = {
  $schema: "keystone-lock/1.0",
  description: "Curated package registry for Keystone Mini-App runtime.",
  runtime: {
    "react": {
      version: "18.2.0",
      url: "https://esm.sh/react@18.2.0",
      integrity: null,
    },
    "react-dom": {
      version: "18.2.0",
      url: "https://esm.sh/react-dom@18.2.0",
      integrity: null,
    },
    "react-dom/client": {
      version: "18.2.0",
      url: "https://esm.sh/react-dom@18.2.0/client",
      integrity: null,
    },
  },
  packages: {
    "framer-motion": {
      version: "11.5.4",
      url: "https://esm.sh/framer-motion@11.5.4?external=react,react-dom",
      external: ["react", "react-dom"],
    },
    "lightweight-charts": {
      version: "4.2.1",
      url: "https://esm.sh/lightweight-charts@4.2.1",
      external: [],
    },
    "recharts": {
      version: "2.12.7",
      url: "https://esm.sh/recharts@2.12.7?external=react,react-dom",
      external: ["react", "react-dom"],
    },
    "d3": {
      version: "7.9.0",
      url: "https://esm.sh/d3@7.9.0",
      external: [],
    },
    "chart.js": {
      version: "4.4.4",
      url: "https://esm.sh/chart.js@4.4.4",
      external: [],
    },
    "lucide-react": {
      version: "0.441.0",
      url: "https://esm.sh/lucide-react@0.441.0?external=react",
      external: ["react"],
    },
    "@solana/web3.js": {
      version: "1.95.3",
      url: "https://esm.sh/@solana/web3.js@1.95.3",
      external: [],
    },
    "animejs": {
      version: "3.2.2",
      url: "https://esm.sh/animejs@3.2.2",
      external: [],
    },
    "zustand": {
      version: "4.5.5",
      url: "https://esm.sh/zustand@4.5.5?external=react",
      external: ["react"],
    },
    "clsx": {
      version: "2.1.1",
      url: "https://esm.sh/clsx@2.1.1",
      external: [],
    },
    "date-fns": {
      version: "3.6.0",
      url: "https://esm.sh/date-fns@3.6.0",
      external: [],
    },
    "uuid": {
      version: "10.0.0",
      url: "https://esm.sh/uuid@10.0.0",
      external: [],
    },
    "react-icons": {
      version: "5.3.0",
      url: "https://esm.sh/react-icons@5.3.0?external=react",
      external: ["react"],
    },
    "class-variance-authority": {
      version: "0.7.0",
      url: "https://esm.sh/class-variance-authority@0.7.0",
      external: [],
    },
    "tailwind-merge": {
      version: "2.5.2",
      url: "https://esm.sh/tailwind-merge@2.5.2",
      external: [],
    },
    "@tanstack/react-query": {
      version: "5.56.2",
      url: "https://esm.sh/@tanstack/react-query@5.56.2?external=react",
      external: ["react"],
    },
    "swr": {
      version: "2.2.5",
      url: "https://esm.sh/swr@2.2.5?external=react",
      external: ["react"],
    },
  },
};

// ─── Resolver ───────────────────────────────────────────────────────

export class LockfileResolver {
  private lockfile: LockfileSchema;

  constructor(lockfile?: LockfileSchema) {
    this.lockfile = lockfile || LOCKFILE;
  }

  /**
   * Resolve a bare package specifier to a pinned esm.sh URL.
   * Returns null if not found in the registry (caller should fallback).
   */
  resolve(specifier: string): string | null {
    // Check runtime entries first (react, react-dom, react-dom/client)
    if (this.lockfile.runtime[specifier]) {
      return this.lockfile.runtime[specifier].url;
    }

    // Check curated packages
    if (this.lockfile.packages[specifier]) {
      return this.lockfile.packages[specifier].url;
    }

    // Handle deep imports: e.g., "react-icons/fi" → base package "react-icons"
    const basePkg = this.findBasePackage(specifier);
    if (basePkg) {
      const entry = this.lockfile.packages[basePkg];
      // Construct deep import URL: replace the base package URL path
      const subpath = specifier.slice(basePkg.length); // e.g., "/fi"
      const baseUrl = new URL(entry.url);
      baseUrl.pathname += subpath;
      return baseUrl.toString();
    }

    return null;
  }

  /**
   * Resolve with fallback to esm.sh for unknown packages.
   * Applies ?external=react,react-dom by default for safety.
   */
  resolveWithFallback(specifier: string): string {
    const pinned = this.resolve(specifier);
    if (pinned) return pinned;

    // Fallback: construct esm.sh URL with React externalized
    console.warn(`[LockfileResolver] Package "${specifier}" not in registry. Using esm.sh fallback.`);
    return `https://esm.sh/${specifier}?external=react,react-dom`;
  }

  /**
   * Extract all bare import specifiers from user code.
   */
  static extractImports(code: string): string[] {
    const imports = new Set<string>();
    // Match: import ... from 'package' or import 'package'
    const importRegex = /(?:import\s+(?:[\w{}\s,*]+\s+from\s+)?['"])([^.'"][^'"]*)['"]/g;
    let match;
    while ((match = importRegex.exec(code)) !== null) {
      const specifier = match[1];
      // Skip relative imports, URLs, and the virtual SDK module
      if (
        specifier.startsWith('.') ||
        specifier.startsWith('/') ||
        specifier.startsWith('http') ||
        specifier === '@keystone-os/sdk'
      ) {
        continue;
      }
      imports.add(specifier);
    }
    return Array.from(imports);
  }

  /**
   * Build a complete Import Map for the given user code.
   * Includes runtime entries (react), SDK virtual module, and all detected packages.
   */
  buildImportMap(userCode: string, sdkBlobUrl: string): ImportMap {
    const imports: Record<string, string> = {};

    // 1. Runtime entries (always present)
    for (const [key, entry] of Object.entries(this.lockfile.runtime)) {
      imports[key] = entry.url;
    }

    // 2. Virtual SDK module
    imports["@keystone-os/sdk"] = sdkBlobUrl;

    // 3. Resolve user imports
    const specifiers = LockfileResolver.extractImports(userCode);
    for (const spec of specifiers) {
      if (spec === "react" || spec === "react-dom" || spec === "react-dom/client") continue;
      if (spec === "@keystone-os/sdk") continue;
      imports[spec] = this.resolveWithFallback(spec);
    }

    return { imports };
  }

  /**
   * Get the lockfile data (for serialization into iframe).
   */
  getLockfile(): LockfileSchema {
    return this.lockfile;
  }

  /**
   * Check if a package is in the curated registry.
   */
  isKnownPackage(specifier: string): boolean {
    return !!(
      this.lockfile.runtime[specifier] ||
      this.lockfile.packages[specifier] ||
      this.findBasePackage(specifier)
    );
  }

  // ─── Private ────────────────────────────────────────────────────

  private findBasePackage(specifier: string): string | null {
    // Check if any registered package is a prefix of this specifier
    // e.g., "react-icons/fi" → "react-icons"
    for (const pkg of Object.keys(this.lockfile.packages)) {
      if (specifier.startsWith(pkg + "/")) {
        return pkg;
      }
    }
    // Also check scoped packages: "@tanstack/react-query/devtools"
    for (const pkg of Object.keys(this.lockfile.packages)) {
      if (specifier.startsWith(pkg + "/")) {
        return pkg;
      }
    }
    return null;
  }
}

// ─── Singleton ──────────────────────────────────────────────────────

export const lockfileResolver = new LockfileResolver();
