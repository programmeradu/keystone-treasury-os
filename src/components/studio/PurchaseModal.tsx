import React, { useState } from "react";
import { PremiumModal, PremiumModalHeader, PremiumModalTitle, PremiumModalDescription, PremiumModalFooter } from "@/components/ui/PremiumModal";
import { Button } from "@/components/ui/button";
import { Loader2, ShieldCheck, CheckCircle2, Wallet, ExternalLink, AlertTriangle, Award } from "lucide-react";
import { toast } from "@/lib/toast-notifications";
import { useWallet } from "@solana/wallet-adapter-react";
import { useConnection } from "@solana/wallet-adapter-react";
import { marketplacePayments, isValidSolanaAddress } from "@/lib/studio/marketplace-payments";
import { buildPurchaseTransaction, isAppOnChain } from "@/lib/marketplace/client";
import { PublicKey } from "@solana/web3.js";
import { notify } from "@/lib/notifications";

interface PurchaseModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    app: {
        id: string;
        name: string;
        priceUsdc: number;
        creatorWallet: string;
        description?: string;
        code?: any;
        category?: string;
        version?: string;
    };
    onSuccess: () => void;
}

export function PurchaseModal({ open, onOpenChange, app, onSuccess }: PurchaseModalProps) {
    const { publicKey, signTransaction, connected } = useWallet();
    const { connection } = useConnection();
    const [isProcessing, setIsProcessing] = useState(false);
    const [step, setStep] = useState<"confirm" | "signing" | "confirming" | "success">("confirm");
    const [txSignature, setTxSignature] = useState<string | null>(null);
    const [licenseMintAddr, setLicenseMintAddr] = useState<string | null>(null);

    const isPaidApp = (app.priceUsdc || 0) > 0;
    const creatorHasValidWallet = isValidSolanaAddress(app.creatorWallet);
    const canDoRealTx = connected && publicKey && signTransaction && isPaidApp && creatorHasValidWallet;

    /** Check if the buyer already owns this app via DB */
    async function isAlreadyOwned(): Promise<boolean> {
        if (!publicKey) return false;
        try {
            const { checkOwnership } = await import("@/actions/studio-actions");
            return await checkOwnership(publicKey.toBase58(), app.id);
        } catch {
            return false;
        }
    }

    /** Record purchase receipt + install app via DB */
    async function recordPurchaseAndInstall(signature?: string) {
        const buyerWallet = publicKey?.toBase58() || "anonymous";

        // Record purchase to DB
        try {
            await fetch("/api/studio/marketplace/purchase", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    appId: app.id,
                    buyerWallet,
                    txSignature: signature || null,
                    amountUsdc: app.priceUsdc || 0,
                    creatorPayout: (app.priceUsdc || 0) * 0.8,
                    keystoneFee: (app.priceUsdc || 0) * 0.2,
                }),
            });
        } catch {}

        // Install to user's library via DB
        try {
            const { installApp } = await import("@/actions/studio-actions");
            await installApp(buyerWallet, app.id);
        } catch {}
    }

    const handlePurchase = async () => {
        // Prevent double-purchase / double-payment
        if (await isAlreadyOwned()) {
            toast.info("You already own this app.", {
                description: "Check your Library to launch it.",
                action: {
                    label: "Open Library",
                    onClick: () => window.location.href = "/app/library",
                },
            });
            return;
        }

        setIsProcessing(true);

        try {
            // ── FREE APP: skip transaction, just install ──
            if (!isPaidApp) {
                setStep("signing");
                await new Promise(r => setTimeout(r, 500));
                await recordPurchaseAndInstall();
                setStep("success");
                toast.success("Installed!", { description: `"${app.name}" added to your Library` });
                notify.install(app.name);
                setTimeout(() => { onSuccess(); onOpenChange(false); setStep("confirm"); }, 1200);
                return;
            }

            // ── PAID APP with real wallet ──
            if (canDoRealTx) {
                setStep("signing");

                // Treasury wallet — deployer wallet for protocol fees
                const treasuryWallet = new PublicKey("9agsk4cgDFrcz2xBoTfitPVQcBPV6bB65LcQMkppYn8n");

                // Check if app is registered on-chain for License NFT flow
                const onChain = await isAppOnChain(connection, app.id).catch(() => false);

                let signature: string;
                let mintAddress: string | undefined;

                if (onChain) {
                  // ── ON-CHAIN: USDC split + License NFT mint ──
                  const { transaction, licenseMintKeypair, lastValidBlockHeight } = await buildPurchaseTransaction({
                    connection,
                    buyer: publicKey!,
                    appId: app.id,
                    developer: new PublicKey(app.creatorWallet),
                    treasuryWallet,
                  });

                  mintAddress = licenseMintKeypair?.publicKey.toBase58();
                  const signed = await signTransaction!(transaction);
                  setStep("confirming");
                  signature = await connection.sendRawTransaction(signed.serialize(), {
                    skipPreflight: false,
                    preflightCommitment: "confirmed",
                  });
                  setTxSignature(signature);
                  if (mintAddress) setLicenseMintAddr(mintAddress);

                  await connection.confirmTransaction({ signature, blockhash: transaction.recentBlockhash!, lastValidBlockHeight }, "confirmed");
                } else {
                  // ── FALLBACK: basic SOL transfer (app not on-chain yet) ──
                  const { transaction, lastValidBlockHeight } = await marketplacePayments.createPurchaseTransaction(
                    connection, publicKey!, app.creatorWallet, app.priceUsdc, "SOL"
                  );
                  const signed = await signTransaction!(transaction);
                  setStep("confirming");
                  signature = await connection.sendRawTransaction(signed.serialize(), {
                    skipPreflight: false, preflightCommitment: "confirmed",
                  });
                  setTxSignature(signature);
                  await connection.confirmTransaction({ signature, blockhash: transaction.recentBlockhash!, lastValidBlockHeight }, "confirmed");
                }

                // Record purchase + install via DB
                await recordPurchaseAndInstall(signature);

                // Record license mint if on-chain
                if (mintAddress) {
                  try {
                    await fetch("/api/studio/marketplace/purchase", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        appId: app.id,
                        buyerWallet: publicKey!.toBase58(),
                        txSignature: signature,
                        amountUsdc: app.priceUsdc,
                        creatorPayout: app.priceUsdc * 0.8,
                        keystoneFee: app.priceUsdc * 0.2,
                        licenseMint: mintAddress,
                      }),
                    });
                  } catch { /* non-blocking */ }
                }

                setStep("success");
                toast.success(onChain ? "License NFT minted!" : "Payment confirmed on-chain!", {
                    description: onChain
                      ? `License NFT minted + ${(app.priceUsdc * 0.8).toFixed(2)} USDC → creator`
                      : `${(app.priceUsdc * 0.8).toFixed(4)} SOL → creator, ${(app.priceUsdc * 0.2).toFixed(4)} SOL → platform`,
                });
                notify.purchase(app.name, app.priceUsdc, signature);

            } else {
                // ── PAID APP, no wallet: prompt to connect ──
                toast.error("Please connect your wallet to purchase.", {
                    description: "A Solana wallet is required for on-chain purchases.",
                });
                setIsProcessing(false);
                return;
            }

            setTimeout(() => { onSuccess(); onOpenChange(false); setStep("confirm"); setTxSignature(null); setLicenseMintAddr(null); }, 1500);

        } catch (error: any) {
            console.error("Purchase failed:", error);
            const msg = error?.message || "Transaction failed";
            if (msg.includes("User rejected")) {
                toast.error("Transaction cancelled.");
            } else {
                toast.error("Purchase failed: " + msg);
            }
            setStep("confirm");
            setTxSignature(null);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <PremiumModal isOpen={open} onClose={() => onOpenChange(false)} className="sm:max-w-[425px]">
            <PremiumModalHeader>
                <PremiumModalTitle>Confirm Purchase</PremiumModalTitle>
                <PremiumModalDescription>
                    You are purchasing <strong>{app.name}</strong>.
                </PremiumModalDescription>
            </PremiumModalHeader>

            {step === "confirm" && (
                <div className="py-4 space-y-4">
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Price</span>
                        <span className="font-bold text-lg">{isPaidApp ? `${app.priceUsdc} SOL` : "FREE"}</span>
                    </div>
                    {isPaidApp && (
                        <>
                            <div className="flex justify-between items-center text-xs text-muted-foreground pt-2 border-t border-border">
                                <span>Creator receives (80%)</span>
                                <span>{(app.priceUsdc * 0.8).toFixed(2)} USDC</span>
                            </div>
                            <div className="flex justify-between items-center text-xs text-muted-foreground">
                                <span>Platform fee (20%)</span>
                                <span>{(app.priceUsdc * 0.2).toFixed(2)} USDC</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg border border-primary/20 bg-primary/5 text-primary">
                                <Award size={12} />
                                <span>License NFT will be minted to your wallet</span>
                            </div>
                        </>
                    )}

                    {/* Wallet status indicator */}
                    {isPaidApp && (
                        <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg border ${connected ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-400" : "border-amber-500/20 bg-amber-500/5 text-amber-400"}`}>
                            {connected ? (
                                <>
                                    <Wallet size={12} />
                                    <span className="font-mono">{publicKey?.toBase58().slice(0, 4)}..{publicKey?.toBase58().slice(-4)}</span>
                                    <span className="text-muted-foreground ml-1">• On-chain payment</span>
                                </>
                            ) : (
                                <>
                                    <AlertTriangle size={12} />
                                    <span>No wallet connected — will use demo mode</span>
                                </>
                            )}
                        </div>
                    )}
                </div>
            )}

            {step === "signing" && (
                <div className="py-8 flex flex-col items-center justify-center text-center space-y-4">
                    <div className="relative">
                        <div className="w-12 h-12 rounded-full border-2 border-primary/30 animate-ping absolute" />
                        <ShieldCheck className="w-12 h-12 text-primary relative z-10" />
                    </div>
                    <div>
                        <h3 className="font-bold">{canDoRealTx ? "Approve in your wallet..." : "Processing..."}</h3>
                        <p className="text-xs text-muted-foreground">
                            {canDoRealTx ? "Check your wallet for the signature request" : "Signing transaction..."}
                        </p>
                    </div>
                </div>
            )}

            {step === "confirming" && (
                <div className="py-8 flex flex-col items-center justify-center text-center space-y-4">
                    <Loader2 className="w-12 h-12 text-primary animate-spin" />
                    <div>
                        <h3 className="font-bold">Confirming on Solana...</h3>
                        <p className="text-xs text-muted-foreground font-mono">
                            {txSignature ? `${txSignature.slice(0, 8)}...${txSignature.slice(-8)}` : "Waiting for network..."}
                        </p>
                    </div>
                </div>
            )}

            {step === "success" && (
                <div className="py-8 flex flex-col items-center justify-center text-center space-y-4">
                    <CheckCircle2 className="w-16 h-16 text-emerald-400" />
                    <div>
                        <h3 className="font-bold text-xl">{licenseMintAddr ? "License NFT Minted!" : "Payment Complete!"}</h3>
                        <p className="text-sm text-muted-foreground">App installed to your Library.</p>
                    </div>
                    {licenseMintAddr && (
                        <div className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg border border-primary/20 bg-primary/5 text-primary">
                            <Award size={14} />
                            <span className="font-mono">{licenseMintAddr.slice(0, 6)}...{licenseMintAddr.slice(-4)}</span>
                            <span className="text-muted-foreground">License NFT</span>
                        </div>
                    )}
                    {txSignature && (
                        <a
                            href={`https://explorer.solana.com/tx/${txSignature}?cluster=devnet`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-xs text-primary hover:underline"
                        >
                            <ExternalLink size={12} /> View on Solana Explorer
                        </a>
                    )}
                </div>
            )}

            <PremiumModalFooter>
                {step === "confirm" && (
                    <Button onClick={handlePurchase} disabled={isProcessing} className="w-full font-bold tracking-wider bg-primary hover:bg-primary/90 text-black">
                        {isProcessing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                        {isPaidApp ? `PAY ${app.priceUsdc} SOL` : "INSTALL FREE"}
                    </Button>
                )}
            </PremiumModalFooter>
        </PremiumModal>
    );
}
