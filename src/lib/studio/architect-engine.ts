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

      // ─── Phase 3: Self-Correction Loop with Rollback ──
      let currentFiles = files;
      let bestFiles = files;
      let bestErrorCount = analysisErrors.length;
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

        // Rollback check: if correction made things worse, revert to best known state
        if (this.errors.length < bestErrorCount) {
          bestFiles = { ...currentFiles };
          bestErrorCount = this.errors.length;
        } else if (this.errors.length > bestErrorCount) {
          // Correction regressed — rollback to best state
          currentFiles = { ...bestFiles };
          this.errors = this.analyzeCode(currentFiles);
        }
      }

      // Exhausted attempts — ship the best version we achieved
      if (this.errors.length > 0) {
        this.transition("FAILED");
        this.callbacks.onError(
          `Self-correction exhausted (${this.maxAttempts} attempts). Remaining issues:\n${this.errors.join("\n")}`
        );
      }

      this.callbacks.onFilesGenerated(bestErrorCount <= this.errors.length ? bestFiles : currentFiles);
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
   * Call the /api/studio/generate-stream SSE endpoint.
   * Falls back to /api/studio/generate if streaming fails.
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

    // Try streaming first, fall back to non-streaming
    try {
      return await this.callStreamingAPI(fullPrompt, contextFiles, aiConfig);
    } catch (streamErr) {
      console.warn("[Architect] Streaming failed, falling back to non-streaming:", streamErr);
      return await this.callNonStreamingAPI(fullPrompt, contextFiles, aiConfig);
    }
  }

  /**
   * SSE streaming call to /api/studio/generate-stream.
   */
  private async callStreamingAPI(
    fullPrompt: string,
    contextFiles: Record<string, { content: string }>,
    aiConfig?: { provider: string; apiKey: string; model: string } | null
  ): Promise<Record<string, string> | null> {
    const response = await fetch("/api/studio/generate-stream", {
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
      throw new Error(`Stream request failed: ${response.status}`);
    }

    if (!response.body) {
      throw new Error("No response body for streaming");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let result: Record<string, string> | null = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const raw = line.slice(6).trim();
        if (!raw) continue;

        try {
          const event = JSON.parse(raw);

          if (event.type === "meta") {
            if (event.provider) this.activeProvider = event.provider;
            if (event.model) this.activeModel = event.model;
            this.callbacks.onStateChange(this.getStatus());
          } else if (event.type === "token") {
            this.tokensGenerated += Math.ceil((event.content?.length || 0) / 4);
            this.callbacks.onStreamChunk?.(event.content || "");
          } else if (event.type === "done") {
            if (event.error === "no_api_key") {
              throw new Error("NO_API_KEY: " + (event.details || "No AI API key configured."));
            }
            if (event.explanation) {
              this.callbacks.onExplanation(event.explanation);
            }
            result = event.files || null;
          } else if (event.type === "error" && !event.recoverable) {
            throw new Error(event.message || "Stream error");
          }
        } catch (parseErr) {
          // Skip unparseable SSE lines
          if (parseErr instanceof Error && parseErr.message.startsWith("NO_API_KEY")) throw parseErr;
        }
      }
    }

    return result;
  }

  /**
   * Non-streaming fallback to /api/studio/generate.
   */
  private async callNonStreamingAPI(
    fullPrompt: string,
    contextFiles: Record<string, { content: string }>,
    aiConfig?: { provider: string; apiKey: string; model: string } | null
  ): Promise<Record<string, string> | null> {
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

    if (data.error === "no_api_key") {
      throw new Error("NO_API_KEY: " + (data.details || "No AI API key configured."));
    }

    if (data.provider) this.activeProvider = data.provider;
    if (data.model) this.activeModel = data.model;
    if (data.explanation) this.callbacks.onExplanation(data.explanation);

    const responseText = JSON.stringify(data.files || {});
    this.tokensGenerated += Math.ceil(responseText.length / 4);
    this.callbacks.onStateChange(this.getStatus());

    return data.files || null;
  }

  /**
   * Call the generate API for correction, handling both patch arrays and full-file responses.
   * Separate from callGenerateAPI so it can parse the isPatches/patches fields.
   */
  private async callCorrectionGenerateAPI(
    prompt: string,
    contextFiles: Record<string, { content: string }>,
  ): Promise<{ files?: Record<string, string> | null; patches?: any[] | null }> {
    const response = await fetch("/api/studio/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, contextFiles }),
      signal: this.abortController?.signal,
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.details || errData.error || "Correction generation failed");
    }

    const data = await response.json();

    if (data.error === "no_api_key") {
      throw new Error("NO_API_KEY: " + (data.details || "No AI API key configured."));
    }

    if (data.provider) this.activeProvider = data.provider;
    if (data.model) this.activeModel = data.model;
    if (data.explanation) this.callbacks.onExplanation(data.explanation);

    this.tokensGenerated += Math.ceil(JSON.stringify(data).length / 4);
    this.callbacks.onStateChange(this.getStatus());

    // Route 1: Server detected a patch array from the LLM
    if (data.isPatches && Array.isArray(data.patches)) {
      return { patches: data.patches };
    }

    // Route 2: Model may have embedded patches as a JSON-array string inside a file value
    if (data.files) {
      for (const value of Object.values(data.files)) {
        if (typeof value === "string") {
          const trimmed = (value as string).trim();
          if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
            try {
              const parsed = JSON.parse(trimmed);
              if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].file && parsed[0].startLine != null) {
                return { patches: parsed };
              }
            } catch { /* not a valid patch array, fall through */ }
          }
        }
      }
    }

    // Route 3: Standard full-file response
    return { files: data.files || null };
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
        .map(([name, content]) => {
          const numberedLines = content.split('\n').map((line, idx) => `${idx + 1}: ${line}`).join('\n');
          return `--- ${name} ---\n${numberedLines}`;
        })
        .join("\n\n")}

Fix ONLY the errors listed above using the replace_range patching format.
Return ONLY a JSON array of patches with the following structure:
[
  {
    "file": "App.tsx",
    "startLine": 10,
    "endLine": 15,
    "replacement": "  const correctedCode = 'goes here';\\n  return correctedCode;"
  }
]
Do NOT return the standard JSON file format. Do not return markdown code blocks.`;

    const mergedContext: Record<string, { content: string }> = { ...contextFiles };
    for (const [name, content] of Object.entries(currentFiles)) {
      mergedContext[name] = { content };
    }

    const result = await this.callCorrectionGenerateAPI(correctionPrompt, mergedContext);

    if (!result) {
      return null;
    }

    // Standard full-file response — use directly
    if (result.files && Object.keys(result.files).length > 0) {
      return result.files;
    }

    // Patch array — apply replace_range patches
    const patches = result.patches;
    if (!patches || patches.length === 0) {
      return null;
    }

    const updatedFiles = { ...currentFiles };

    for (const patch of patches) {
      if (!patch.file || !patch.replacement || typeof patch.startLine !== "number" || typeof patch.endLine !== "number") {
        continue;
      }

      const fileContent = updatedFiles[patch.file];
      if (!fileContent) continue;

      const lines = fileContent.split("\n");

      const startIndex = Math.max(0, patch.startLine - 1);
      const endIndex = Math.max(0, patch.endLine - 1);
      const deleteCount = endIndex - startIndex + 1;

      if (startIndex < lines.length) {
        const replacementLines = patch.replacement.split("\n");
        lines.splice(startIndex, deleteCount, ...replacementLines);
        updatedFiles[patch.file] = lines.join("\n");
      }
    }

    return updatedFiles;
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
