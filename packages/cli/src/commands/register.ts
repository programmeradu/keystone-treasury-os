/**
 * keystone register — Register as a developer and get a publish token.
 *
 * Two modes:
 *   1. Turnkey-managed (default): Server creates a Solana wallet via Turnkey.
 *      No private key needed — zero credential management.
 *
 *   2. BYO-key (--wallet): Register your existing wallet address.
 *      You'll still get a bearer token for faster subsequent publishes.
 *
 * The token is saved to keystone.config.json so `keystone ship` just works.
 */

import { loadConfig, saveConfig } from "./config.js";

export interface RegisterOptions {
  dir?: string;
  label?: string;
  wallet?: string;
  apiUrl?: string;
}

export interface RegisterResult {
  ok: boolean;
  walletAddress?: string;
  developerToken?: string;
  mode?: string;
  error?: string;
}

export async function runRegister(options: RegisterOptions): Promise<RegisterResult> {
  const apiUrl = (options.apiUrl || "https://keystone.stauniverse.tech").replace(/\/$/, "");

  const payload: Record<string, string> = {};
  if (options.label) payload.label = options.label;
  if (options.wallet) payload.walletAddress = options.wallet;

  try {
    const res = await fetch(`${apiUrl}/api/studio/publish/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      return { ok: false, error: err.error || `Registration failed (${res.status})` };
    }

    const data = (await res.json()) as {
      walletAddress: string;
      developerToken: string;
      mode: string;
    };

    // Save to config
    const config = loadConfig(options.dir);
    config.wallet = data.walletAddress;
    config.apiKey = data.developerToken;
    if (!config.apiUrl) config.apiUrl = apiUrl;
    saveConfig(config, options.dir);

    return {
      ok: true,
      walletAddress: data.walletAddress,
      developerToken: data.developerToken,
      mode: data.mode,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Registration failed",
    };
  }
}
