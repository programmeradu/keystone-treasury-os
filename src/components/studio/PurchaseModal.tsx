import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, ShieldCheck, CheckCircle2, Wallet, ExternalLink, AlertTriangle } from "lucide-react";
import { toast } from "@/lib/toast-notifications";
import { useWallet } from "@solana/wallet-adapter-react";
import { useConnection } from "@solana/wallet-adapter-react";
import { marketplacePayments, isValidSolanaAddress } from "@/lib/studio/marketplace-payments";
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

    const isPaidApp = (app.priceUsdc || 0) > 0;
    const creatorHasValidWallet = isValidSolanaAddress(app.creatorWallet);
    const canDoRealTx = connected && publicKey && signTransaction && isPaidApp && creatorHasValidWallet;

    /** Check if the buyer already owns this app */
    function isAlreadyOwned(): boolean {
        try {
            const library = JSON.parse(localStorage.getItem("keystone_library_apps") || "[]");
            return library.some((a: any) => a.id === app.id);
        } catch {
            return false;
        }
    }

    /** Record purchase receipt + install app to library */
    function recordPurchaseAndInstall(signature?: string) {
        // Record purchase with 80/20 split
        const purchase: Record<string, any> = {
            id: "purchase_" + Math.random().toString(36).substring(2, 12),
            appId: app.id,
            appName: app.name,
            buyerWallet: publicKey?.toBase58() || localStorage.getItem("keystone_wallet_id") || "anonymous",
            priceUsdc: app.priceUsdc || 0,
            creatorPayout: (app.priceUsdc || 0) * 0.8,
            keystoneFee: (app.priceUsdc || 0) * 0.2,
            creatorWallet: app.creatorWallet,
            purchasedAt: Date.now(),
        };
        if (signature) purchase.txSignature = signature;

        const purchases = JSON.parse(localStorage.getItem("keystone_purchases") || "[]");
        purchases.push(purchase);
        localStorage.setItem("keystone_purchases", JSON.stringify(purchases));

        // Install app to buyer's library
        const libraryEntry = {
            id: app.id,
            name: app.name,
            description: app.description || "",
            code: app.code || { files: {} },
            creatorWallet: app.creatorWallet,
            category: app.category || "utility",
            isPublished: false,
            version: app.version || "1.0.0",
            priceUsdc: app.priceUsdc || 0,
            purchasedAt: Date.now(),
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };
        const library = JSON.parse(localStorage.getItem("keystone_library_apps") || "[]");
        if (!library.find((a: any) => a.id === app.id)) {
            library.push(libraryEntry);
            localStorage.setItem("keystone_library_apps", JSON.stringify(library));
        }

        // Increment install count in marketplace listing
        try {
            const listings = JSON.parse(localStorage.getItem("keystone_marketplace_listings") || "[]");
            const idx = listings.findIndex((a: any) => a.id === app.id);
            if (idx >= 0) {
                listings[idx].installs = (listings[idx].installs || 0) + 1;
                localStorage.setItem("keystone_marketplace_listings", JSON.stringify(listings));
            }
        } catch {}
    }

    const handlePurchase = async () => {
        // Prevent double-purchase / double-payment
        if (isAlreadyOwned()) {
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
                recordPurchaseAndInstall();
                setStep("success");
                toast.success("Installed!", { description: `"${app.name}" added to your Library` });
                notify.install(app.name);
                setTimeout(() => { onSuccess(); onOpenChange(false); setStep("confirm"); }, 1200);
                return;
            }

            // ── PAID APP with real wallet ──
            if (canDoRealTx) {
                setStep("signing");

                // Build the 80/20 split transaction
                const { transaction, lastValidBlockHeight } = await marketplacePayments.createPurchaseTransaction(
                    connection,
                    publicKey!,
                    app.creatorWallet,
                    app.priceUsdc,
                    "SOL"
                );

                // Sign via wallet adapter (triggers wallet popup)
                const signed = await signTransaction!(transaction);

                // Send to network
                setStep("confirming");
                const signature = await connection.sendRawTransaction(signed.serialize(), {
                    skipPreflight: false,
                    preflightCommitment: "confirmed",
                });
                setTxSignature(signature);

                // Wait for confirmation
                await connection.confirmTransaction({
                    signature,
                    blockhash: transaction.recentBlockhash!,
                    lastValidBlockHeight,
                }, "confirmed");

                // Record with real signature
                recordPurchaseAndInstall(signature);
                setStep("success");
                toast.success("Payment confirmed on-chain!", {
                    description: `${(app.priceUsdc * 0.8).toFixed(4)} SOL → creator, ${(app.priceUsdc * 0.2).toFixed(4)} SOL → platform`,
                });
                notify.purchase(app.name, app.priceUsdc, signature);

            } else {
                // ── PAID APP, no wallet: demo mode ──
                setStep("signing");
                await new Promise(r => setTimeout(r, 2000));
                recordPurchaseAndInstall();
                setStep("success");
                toast.success("Purchase recorded (demo)", {
                    description: "Connect a wallet for real on-chain transactions.",
                });
                notify.purchase(app.name, app.priceUsdc);
            }

            setTimeout(() => { onSuccess(); onOpenChange(false); setStep("confirm"); setTxSignature(null); }, 1500);

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
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Confirm Purchase</DialogTitle>
                    <DialogDescription>
                        You are purchasing <strong>{app.name}</strong>.
                    </DialogDescription>
                </DialogHeader>

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
                                    <span>{(app.priceUsdc * 0.8).toFixed(4)} SOL</span>
                                </div>
                                <div className="flex justify-between items-center text-xs text-muted-foreground">
                                    <span>Platform fee (20%)</span>
                                    <span>{(app.priceUsdc * 0.2).toFixed(4)} SOL</span>
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
                            <h3 className="font-bold text-xl">Payment Complete!</h3>
                            <p className="text-sm text-muted-foreground">App installed to your Library.</p>
                        </div>
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

                <DialogFooter>
                    {step === "confirm" && (
                        <Button onClick={handlePurchase} disabled={isProcessing} className="w-full font-bold tracking-wider">
                            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                            {isPaidApp ? `PAY ${app.priceUsdc} SOL` : "INSTALL FREE"}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
