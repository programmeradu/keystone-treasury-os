"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Shield, Wallet } from "lucide-react";
import { LogoFilled } from "@/components/icons";
import { turnkeyBrowser } from "@/lib/turnkey-browser";
import { getAvatarUrl } from "@/lib/avatars";

export function WalletManager() {
    const [isLoading, setIsLoading] = useState(false);
    const [step, setStep] = useState<"initial" | "registering" | "complete" | "error">("initial");
    const [subOrgId, setSubOrgId] = useState<string | null>(null);

    // Load saved sub-organization ID from localStorage on mount
    useEffect(() => {
        const savedSubOrgId = localStorage.getItem("keystone_sub_org_id");
        if (savedSubOrgId) {
            setSubOrgId(savedSubOrgId);
            setStep("complete");
        }
    }, []);

    const handleCreateWallet = async () => {
        setIsLoading(true);
        setStep("registering");
        try {
            // 1. Generate a random challenge
            // Use the raw bytes for WebAuthn, and base64url string for API
            const challengeBytes = new Uint8Array(32);
            crypto.getRandomValues(challengeBytes);

            // Base64url encode for the API
            const challenge = btoa(String.fromCharCode(...challengeBytes))
                .replace(/\+/g, '-')
                .replace(/\//g, '_')
                .replace(/=/g, '');

            // 2. Create passkey using WebAuthn directly
            // IMPORTANT: Pass the RAW bytes to WebAuthn, not the base64 string
            const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
                challenge: challengeBytes, // Use raw bytes directly
                rp: {
                    name: "Keystone Treasury OS",
                    id: window.location.hostname, // localhost for dev
                },
                user: {
                    id: Uint8Array.from(Date.now().toString(), c => c.charCodeAt(0)),
                    name: "Keystone Architect",
                    displayName: "Keystone Architect",
                },
                pubKeyCredParams: [
                    { alg: -7, type: "public-key" },  // ES256
                    { alg: -257, type: "public-key" }, // RS256
                ],
                authenticatorSelection: {
                    authenticatorAttachment: "platform",
                    residentKey: "preferred",
                    userVerification: "preferred",
                },
                timeout: 60000,
                attestation: "direct",
            };

            const credential = await navigator.credentials.create({
                publicKey: publicKeyCredentialCreationOptions,
            }) as PublicKeyCredential;

            if (!credential) {
                throw new Error("Failed to create credential");
            }

            const response = credential.response as AuthenticatorAttestationResponse;

            // 3. Encode the attestation data
            const credentialId = btoa(String.fromCharCode(...new Uint8Array(credential.rawId)))
                .replace(/\+/g, '-')
                .replace(/\//g, '_')
                .replace(/=/g, '');

            const clientDataJson = btoa(String.fromCharCode(...new Uint8Array(response.clientDataJSON)))
                .replace(/\+/g, '-')
                .replace(/\//g, '_')
                .replace(/=/g, '');

            const attestationObject = btoa(String.fromCharCode(...new Uint8Array(response.attestationObject)))
                .replace(/\+/g, '-')
                .replace(/\//g, '_')
                .replace(/=/g, '');

            // 4. Get transports if available
            const transports = response.getTransports?.() || ["internal"];
            const turnkeyTransports = transports.map(t => {
                switch (t) {
                    case "internal": return "AUTHENTICATOR_TRANSPORT_INTERNAL";
                    case "usb": return "AUTHENTICATOR_TRANSPORT_USB";
                    case "ble": return "AUTHENTICATOR_TRANSPORT_BLE";
                    case "nfc": return "AUTHENTICATOR_TRANSPORT_NFC";
                    case "hybrid": return "AUTHENTICATOR_TRANSPORT_HYBRID";
                    default: return "AUTHENTICATOR_TRANSPORT_INTERNAL";
                }
            });

            // 5. Register Sub-Organization on Server
            const registerResponse = await fetch("/api/turnkey/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    subOrgName: `Keystone Studio Vault ${Date.now()}`,
                    challenge,
                    attestation: {
                        credentialId,
                        clientDataJson,
                        attestationObject,
                        transports: turnkeyTransports,
                    },
                }),
            });

            if (!registerResponse.ok) {
                const errorData = await registerResponse.json();
                throw new Error(errorData.error || "Registration failed");
            }

            const data = await registerResponse.json();
            setSubOrgId(data.subOrganizationId);

            localStorage.setItem("keystone_sub_org_id", data.subOrganizationId);

            setStep("complete");
        } catch (error) {
            console.error("Wallet Creation Error:", error);
            setStep("error");
        } finally {
            setIsLoading(false);
        }
    };

    if (step === "complete") {
        return (
            <Card className="bg-zinc-900/90 border-[#36e27b]/30 shadow-[0_0_20px_-5px_rgba(54,226,123,0.1)] backdrop-blur-sm">
                <CardContent className="pt-8 pb-8 flex flex-col items-center text-center">
                    <div className="w-16 h-16 rounded-full bg-[#36e27b]/10 border border-[#36e27b]/20 flex items-center justify-center mb-5 animate-in fade-in zoom-in duration-500">
                        <LogoFilled size={32} fillColor="#36e27b" />
                    </div>

                    <h3 className="text-white font-bold text-lg mb-2 tracking-tight">Vault Initialized</h3>

                    <p className="text-zinc-400 text-sm mb-6 max-w-[280px] leading-relaxed">
                        Your Studio Wallet is ready.<br />
                        <span className="text-[#36e27b]">Secured by Turnkey Enclave</span>
                    </p>

                    <div className="bg-black/50 p-3 rounded-lg border border-[#36e27b]/20 font-mono text-[10px] text-zinc-500 w-full max-w-[320px] break-all group hover:border-[#36e27b]/40 transition-colors">
                        <div className="text-[9px] uppercase tracking-wider text-zinc-600 mb-1 flex items-center justify-center gap-1.5">
                            <Shield size={10} /> Organization ID
                        </div>
                        <span className="text-zinc-300">{subOrgId}</span>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white text-sm uppercase tracking-wider">
                    <Shield size={16} className="text-[#36e27b]" />
                    Secure Enclave
                </CardTitle>
                <CardDescription className="text-xs text-zinc-500">
                    Create a non-custodial wallet to sign transactions and deploy contracts.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Button
                    onClick={handleCreateWallet}
                    disabled={isLoading}
                    className="w-full bg-[#36e27b] text-zinc-950 font-bold hover:bg-[#36e27b]/90"
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Initializing...
                        </>
                    ) : (
                        <>
                            <Wallet className="mr-2 h-4 w-4" />
                            Initialize Keys
                        </>
                    )}
                </Button>
                {step === "error" && (
                    <p className="text-red-500 text-xs mt-3 text-center">
                        Initialization failed. Check console.
                    </p>
                )}
            </CardContent>
        </Card>
    );
}
