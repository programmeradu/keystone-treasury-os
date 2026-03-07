/**
 * Keystone Architect Engine
 * 
 * Self-correction state machine for the AI code generation pipeline.
 * Stream → Compile → Check Errors → Fix (up to 3 attempts).
 * 
 * States: IDLE → STREAMING → ANALYZING → CORRECTING → RE_ANALYZING → CLEAN | FAILED
 * 
 * [GEMINI-3.0] — The Architect Self-Correction Loop
 */

import { validateFrameworkConformance } from "@/lib/studio/framework-spec";

// ─── State Machine Types ────────────────────────────────────────────

export type ArchitectState =
  | "IDLE"
  | "STREAMING"
  | "ANALYZING"
  | "CORRECTING"
  | "RE_ANALYZING"
  | "CLEAN"
  | "FAILED";

export interface ArchitectStatus {
  state: ArchitectState;
  attempt: number;
  maxAttempts: number;
  tokensGenerated: number;
  startedAt: number | null;
  elapsedMs: number;
  errors: string[];
  model: string;
}

export interface ArchitectCallbacks {
  onStateChange: (status: ArchitectStatus) => void;
  onFilesGenerated: (files: Record<string, string>) => void;
  onExplanation: (text: string) => void;
  onError: (error: string) => void;
  onStreamChunk?: (chunk: string) => void;
}

// ─── Engine ─────────────────────────────────────────────────────────

export class ArchitectEngine {
  private state: ArchitectState = "IDLE";
  private attempt = 0;
  private maxAttempts = 3;
  private tokensGenerated = 0;
  private startedAt: number | null = null;
  private errors: string[] = [];
  private callbacks: ArchitectCallbacks;
  private abortController: AbortController | null = null;
  private activeModel: string = "auto";
  private activeProvider: string = "auto";

  constructor(callbacks: ArchitectCallbacks) {
    this.callbacks = callbacks;
  }

  /**
   * Get current status snapshot.
   */
  getStatus(): ArchitectStatus {
    return {
      state: this.state,
      attempt: this.attempt,
      maxAttempts: this.maxAttempts,
      tokensGenerated: this.tokensGenerated,
      startedAt: this.startedAt,
      elapsedMs: this.startedAt ? Date.now() - this.startedAt : 0,
      errors: [...this.errors],
      model: this.activeModel,
    };
  }

  /**
   * Abort the current generation.
   */
  abort(): void {
    this.abortController?.abort();
    this.transition("IDLE");
  }

  /**
   * Main entry point: generate code from a prompt.
   * Handles the full stream → compile → check → fix loop.
   */
  async generate(
    prompt: string,
    contextFiles: Record<string, { content: string }>,
    runtimeLogs?: string[],
    researchContext?: string,
    aiConfig?: { provider: string; apiKey: string; model: string } | null
  ): Promise<void> {
    this.reset();
    this.startedAt = Date.now();
    this.transition("STREAMING");

    try {
      // ─── Phase 1: Initial Generation ──────────────────
      const files = await this.callGenerateAPI(
        prompt,
        contextFiles,
        runtimeLogs,
        researchContext,
        aiConfig
      );

      if (!files || Object.keys(files).length === 0) {
        this.transition("FAILED");
        this.callbacks.onError("No files generated");
        return;
      }

      // ─── Phase 2: Analyze for Errors ──────────────────
      this.transition("ANALYZING");
      const analysisErrors = this.analyzeCode(files);

      if (analysisErrors.length === 0) {
        // Clean on first try
        this.transition("CLEAN");
        this.callbacks.onFilesGenerated(files);
        return;
      }

      // ─── Phase 3: Self-Correction Loop ────────────────
      let currentFiles = files;
      this.errors = analysisErrors;

      while (this.attempt < this.maxAttempts && this.errors.length > 0) {
        this.attempt++;
        this.transition("CORRECTING");

        const correctedFiles = await this.callCorrectionAPI(
          currentFiles,
          this.errors,
          contextFiles
        );

        if (correctedFiles) {
          currentFiles = { ...currentFiles, ...correctedFiles };
        }

        // Re-analyze
        this.transition("RE_ANALYZING");
        this.errors = this.analyzeCode(currentFiles);

        if (this.errors.length === 0) {
          this.transition("CLEAN");
          this.callbacks.onFilesGenerated(currentFiles);
          return;
        }
      }

      // Exhausted attempts — ship what we have
      if (this.errors.length > 0) {
        this.transition("FAILED");
        this.callbacks.onError(
          `Self-correction exhausted (${this.maxAttempts} attempts). Remaining issues:\n${this.errors.join("\n")}`
        );
      }

      // Still deliver the files even if there are remaining errors
      this.callbacks.onFilesGenerated(currentFiles);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes("aborted")) {
        this.transition("IDLE");
        return;
      }
      this.transition("FAILED");
      this.callbacks.onError(message);
    }
  }

  // ─── Private Methods ──────────────────────────────────────────────

  private transition(newState: ArchitectState): void {
    this.state = newState;
    this.callbacks.onStateChange(this.getStatus());
  }

  private reset(): void {
    this.state = "IDLE";
    this.attempt = 0;
    this.tokensGenerated = 0;
    this.startedAt = null;
    this.errors = [];
    this.activeModel = "auto";
    this.activeProvider = "auto";
    this.abortController?.abort();
    this.abortController = new AbortController();
  }

  /**
   * Call the /api/studio/generate endpoint.
   */
  private async callGenerateAPI(
    prompt: string,
    contextFiles: Record<string, { content: string }>,
    runtimeLogs?: string[],
    researchContext?: string,
    aiConfig?: { provider: string; apiKey: string; model: string } | null
  ): Promise<Record<string, string> | null> {
    let fullPrompt = prompt;

    if (researchContext) {
      fullPrompt += `\n\n${researchContext}`;
    }

    if (runtimeLogs && runtimeLogs.length > 0) {
      const errorLogs = runtimeLogs
        .filter((l) => l.startsWith("[error]"))
        .slice(-10);
      if (errorLogs.length > 0) {
        fullPrompt += `\n\n[RUNTIME LOGS]\n${errorLogs.join("\n")}`;
      }
    }

    const response = await fetch("/api/studio/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: fullPrompt,
        contextFiles,
        aiConfig: aiConfig || undefined,
      }),
      signal: this.abortController?.signal,
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.details || errData.error || "Generation failed");
    }

    const data = await response.json();

    // Handle no-key error from the API
    if (data.error === "no_api_key") {
      throw new Error("NO_API_KEY: " + (data.details || "No AI API key configured. Open Settings to add your own key."));
    }

    // Update active provider/model from API response
    if (data.provider) this.activeProvider = data.provider;
    if (data.model) this.activeModel = data.model;

    if (data.explanation) {
      this.callbacks.onExplanation(data.explanation);
    }

    // Estimate tokens from response size
    const responseText = JSON.stringify(data.files || {});
    this.tokensGenerated += Math.ceil(responseText.length / 4);

    // Emit status so UI reflects the real model
    this.callbacks.onStateChange(this.getStatus());

    return data.files || null;
  }

  /**
   * Call the generate API with correction context.
   * Uses the server-selected model to generate focused fixes.
   */
  private async callCorrectionAPI(
    currentFiles: Record<string, string>,
    errors: string[],
    contextFiles: Record<string, { content: string }>
  ): Promise<Record<string, string> | null> {
    const correctionPrompt = `[SELF-CORRECTION MODE — Attempt ${this.attempt}/${this.maxAttempts}]

The previously generated code has the following issues:

[TYPESCRIPT ERRORS]
${errors.join("\n")}

[CURRENT CODE]
${Object.entries(currentFiles)
        .map(([name, content]) => `--- ${name} ---\n${content}`)
        .join("\n\n")}

Fix ONLY the errors listed above. Do not rewrite the entire file unless necessary.
Return the corrected files in the standard JSON format.`;

    // Merge current files into context
    const mergedContext: Record<string, { content: string }> = { ...contextFiles };
    for (const [name, content] of Object.entries(currentFiles)) {
      mergedContext[name] = { content };
    }

    return this.callGenerateAPI(correctionPrompt, mergedContext);
  }

  /**
   * Static analysis of generated code.
   * Checks for common issues that would cause runtime errors in the Keystone iframe.
   */
  private analyzeCode(files: Record<string, string>): string[] {
    const errors: string[] = [];
    const appCode = files["App.tsx"] || "";

    if (!appCode) {
      errors.push("Missing App.tsx — the entry point is required.");
      return errors;
    }

    // Check for default export
    if (
      !appCode.includes("export default") &&
      !appCode.match(/export\s*\{\s*\w+\s+as\s+default\s*\}/)
    ) {
      errors.push(
        "App.tsx must have a default export: `export default function App()`"
      );
    }

    // Check for forbidden APIs
    const forbiddenPatterns: [RegExp, string][] = [
      [/\blocalStorage\b/, "localStorage is blocked by sandbox (no allow-same-origin)"],
      [/\bsessionStorage\b/, "sessionStorage is blocked by sandbox"],
      [/\bdocument\.cookie\b/, "document.cookie is blocked by sandbox"],
      [/\bwindow\.parent\.postMessage\b/, "window.parent.postMessage is reserved for SDK internals"],
      [/\brequire\s*\(/, "require() is not available — use ESM imports"],
      [/\b__dirname\b/, "__dirname is a Node.js API, not available in browser"],
      [/\bprocess\.env\b/, "process.env is not available in the iframe runtime"],
    ];

    for (const [pattern, message] of forbiddenPatterns) {
      if (pattern.test(appCode)) {
        errors.push(message);
      }
    }

    // Check for old import paths
    if (
      appCode.includes("from './keystone'") ||
      appCode.includes('from "./keystone"') ||
      appCode.includes("from 'keystone-api'") ||
      appCode.includes('from "keystone-api"')
    ) {
      errors.push(
        "Use `import { ... } from '@keystone-os/sdk'` instead of './keystone' or 'keystone-api'"
      );
    }

    // Check for direct fetch() usage (should use useFetch from SDK)
    const fetchMatch = appCode.match(/(?<!use)fetch\s*\(/);
    if (fetchMatch) {
      // Make sure it's not useFetch or a comment
      const lines = appCode.split("\n");
      for (const line of lines) {
        const trimmed = line.trim();
        if (
          trimmed.includes("fetch(") &&
          !trimmed.includes("useFetch") &&
          !trimmed.startsWith("//") &&
          !trimmed.startsWith("*")
        ) {
          errors.push(
            "Direct fetch() is blocked by CSP. Use `useFetch()` from '@keystone-os/sdk' instead."
          );
          break;
        }
      }
    }

    // ─── Framework Conformance Gate ──────────────────
    // Validates imports, SDK hooks, and blocked APIs against
    // the canonical framework spec (single source of truth).
    const frameworkErrors = validateFrameworkConformance(appCode);
    errors.push(...frameworkErrors);

    return errors;
  }
}
