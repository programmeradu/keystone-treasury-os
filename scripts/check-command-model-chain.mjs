#!/usr/bin/env node
/**
 * Verify the /api/command model chain: Groq first, then Cloudflare Workers AI fallbacks.
 * Run from repo root: node scripts/check-command-model-chain.mjs
 * Or with env from .env.local: node -r dotenv/config scripts/check-command-model-chain.mjs dotenv_config_path=.env.local
 */
import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env.local from repo root
config({ path: resolve(process.cwd(), '.env.local') });

const CLOUDFLARE_FALLBACK_MODELS = [
  '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
  '@cf/qwen/qwen3-30b-a3b-fp8',
  '@cf/qwen/qwen2.5-coder-32b-instruct',
  '@cf/meta/llama-3.1-8b-instruct',
];

const groqKey = process.env.GROQ_API_KEY;
const cfAccountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const cfToken = process.env.CLOUDFLARE_AI_TOKEN;
const hasCloudflare = Boolean(cfAccountId && cfToken);

const modelChain = [];
if (groqKey) {
  modelChain.push({ index: 1, name: 'groq/llama-3.3-70b-versatile', provider: 'Groq' });
}
if (hasCloudflare) {
  CLOUDFLARE_FALLBACK_MODELS.forEach((modelId, i) => {
    modelChain.push({
      index: modelChain.length + 1,
      name: `cloudflare/${modelId}`,
      provider: 'Cloudflare Workers AI',
    });
  });
}

console.log('Command API model chain (same order as /api/command fallback):\n');
if (modelChain.length === 0) {
  console.log('  (none) — set GROQ_API_KEY or CLOUDFLARE_ACCOUNT_ID + CLOUDFLARE_AI_TOKEN\n');
  process.exit(1);
}

modelChain.forEach(({ index, name, provider }) => {
  console.log(`  ${index}. ${name}  [${provider}]`);
});

console.log('\nCloudflare models in loop:', hasCloudflare ? `${CLOUDFLARE_FALLBACK_MODELS.length} models` : 'no (missing CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_AI_TOKEN)');
console.log('');
