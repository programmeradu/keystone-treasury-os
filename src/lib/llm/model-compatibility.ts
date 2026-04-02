export type PromptProfile = "short" | "medium" | "long";

export const MODEL_SAFE_CHAR_BUDGETS: Record<string, number> = {
  "groq/llama-3.3-70b-versatile": 28000,
  "cloudflare/@cf/meta/llama-3.3-70b-instruct-fp8-fast": 20000,
  "cloudflare/@cf/qwen/qwen3-30b-a3b-fp8": 20000,
  "cloudflare/@cf/qwen/qwen2.5-coder-32b-instruct": 20000,
  "cloudflare/@cf/meta/llama-3.1-8b-instruct": 18000,
};

export function estimateCompatibilityBudget(modelName: string): number {
  return MODEL_SAFE_CHAR_BUDGETS[modelName] ?? 16000;
}

export function profileTargetChars(profile: PromptProfile): number {
  if (profile === "short") return 2000;
  if (profile === "medium") return 12000;
  return 26000;
}
