/**
 * useKeystoneAuth — Central authentication hook for Keystone App
 * 
 * Handles the full SIWS (Sign In With Solana) flow:
 * 1. Fetch nonce from /api/auth/nonce
 * 2. Construct message + wallet signs it
 * 3. Submit to /api/auth/siws → Supabase session created
 * 
 * Also handles session check on mount, sign out, and Atlas session backfill.
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import bs58 from "bs58";

// ─── Types ───────────────────────────────────────────────────────────

export interface KeystoneUser {
    id: string;
    walletAddress: string;
    email: string;
}

export type AuthStep = "idle" | "connecting" | "signing" | "verifying" | "success" | "error";

export interface UseKeystoneAuthReturn {
    user: KeystoneUser | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    step: AuthStep;
    error: string | null;
    signIn: () => Promise<void>;
    signOut: () => Promise<void>;
    checkSession: () => Promise<void>;
}

// ─── Hook ────────────────────────────────────────────────────────────

export function useKeystoneAuth(): UseKeystoneAuthReturn {
    const { publicKey, signMessage, connected, connecting } = useWallet();
    const [user, setUser] = useState<KeystoneUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [step, setStep] = useState<AuthStep>("idle");
    const [error, setError] = useState<string | null>(null);

    // ─── Check existing session on mount ─────────────────────────────
    const checkSession = useCallback(async () => {
        try {
            setIsLoading(true);
            // Add timeout to prevent hanging indefinitely
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);

            const res = await fetch("/api/auth/siws", {
                signal: controller.signal,
            });
            clearTimeout(timeoutId);

            const data = await res.json();
            if (data.user) {
                setUser(data.user);
            } else {
                setUser(null);
            }
        } catch (err: any) {
            // AbortError means timeout — just set user to null
            if (err.name !== 'AbortError') {
                console.error('[useKeystoneAuth] Session check error:', err);
            }
            setUser(null);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        checkSession();
    }, [checkSession]);

    // ─── Sign In (SIWS Flow) ─────────────────────────────────────────
    const signIn = useCallback(async () => {
        if (!publicKey || !signMessage) {
            setError("Wallet not connected or does not support message signing.");
            setStep("error");
            return;
        }

        try {
            setError(null);

            // Step 1: Fetch nonce
            setStep("connecting");
            const nonceRes = await fetch("/api/auth/nonce");
            const { nonce } = await nonceRes.json();

            if (!nonce) {
                throw new Error("Failed to fetch nonce from server.");
            }

            // Step 2: Construct & sign message
            setStep("signing");
            const walletAddress = publicKey.toBase58();
            const timestamp = new Date().toISOString();
            const message = [
                "Sign in to Keystone",
                "",
                `Wallet: ${walletAddress}`,
                `Nonce: ${nonce}`,
                `Timestamp: ${timestamp}`,
                "",
                "This request will not trigger a blockchain transaction or cost any fees.",
            ].join("\n");

            const encodedMessage = new TextEncoder().encode(message);
            const signatureBytes = await signMessage(encodedMessage);
            const signature = bs58.encode(signatureBytes);

            // Step 3: Verify with backend
            setStep("verifying");
            const authRes = await fetch("/api/auth/siws", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message, signature, walletAddress }),
            });

            const authData = await authRes.json();

            if (!authRes.ok) {
                throw new Error(authData.error || "Authentication failed.");
            }

            setUser(authData.user);
            setStep("success");

            // Backfill Atlas sessions if wallet had anonymous sessions
            try {
                await fetch("/api/atlas/session", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        wallet: walletAddress,
                        context: { keystoneLinked: true, linkedAt: timestamp },
                    }),
                });
            } catch {
                // Non-critical — don't fail auth if Atlas backfill fails
            }
        } catch (err: any) {
            console.error("[useKeystoneAuth] Sign-in error:", err);
            setError(err.message || "Authentication failed. Please try again.");
            setStep("error");
        }
    }, [publicKey, signMessage]);

    // ─── Sign Out ─────────────────────────────────────────────────────
    const signOut = useCallback(async () => {
        try {
            await fetch("/api/auth/siws", { method: "DELETE" });
            setUser(null);
            setStep("idle");
            setError(null);
        } catch (err: any) {
            console.error("[useKeystoneAuth] Sign-out error:", err);
        }
    }, []);

    return {
        user,
        isAuthenticated: !!user,
        isLoading,
        step,
        error,
        signIn,
        signOut,
        checkSession,
    };
}
