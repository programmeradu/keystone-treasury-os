import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, ShieldCheck, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { marketplacePayments } from "@/lib/studio/marketplace-payments";
import { Connection, PublicKey } from "@solana/web3.js"; // Import needed types

interface PurchaseModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    app: {
        id: string;
        name: string;
        priceUsdc: number;
        creatorWallet: string;
    };
    onSuccess: () => void;
}

export function PurchaseModal({ open, onOpenChange, app, onSuccess }: PurchaseModalProps) {
    const [isProcessing, setIsProcessing] = useState(false);
    const [step, setStep] = useState<"confirm" | "signing" | "success">("confirm");

    const handlePurchase = async () => {
        setIsProcessing(true);
        setStep("signing");

        try {
            // 1. Setup Connection (Devnet)
            const connection = new Connection("https://api.devnet.solana.com", "confirmed");

            // 2. Get User Wallet (Mocked for now until WalletManager is globally accessible)
            // In real app: const { publicKey } = useWallet();
            const mockBuyerKey = new PublicKey("7KeY...StUdIo"); // Replace with actual logic

            // 3. Create Transaction
            console.log("Creating transaction for", app.name);
            // Simulating tx creation for demo purposes since we don't have a real signer connected in this context file

            await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate network

            // 4. Sign & Send (Mocked)
            // await marketplacePayments.createPurchaseTransaction(...)

            setStep("success");
            toast.success("Purchase successful!");

            setTimeout(() => {
                onSuccess();
                onOpenChange(false);
                setStep("confirm");
            }, 1500);

        } catch (error) {
            console.error("Purchase failed:", error);
            toast.error("Purchase failed. Please try again.");
            setStep("confirm");
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
                            <span className="font-bold text-lg">{app.priceUsdc > 0 ? `$${app.priceUsdc} USDC` : "FREE"}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs text-muted-foreground pt-2 border-t border-border">
                            <span>Creator receives (80%)</span>
                            <span>${(app.priceUsdc * 0.8).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs text-muted-foreground">
                            <span>Platform fee (20%)</span>
                            <span>${(app.priceUsdc * 0.2).toFixed(2)}</span>
                        </div>
                    </div>
                )}

                {step === "signing" && (
                    <div className="py-8 flex flex-col items-center justify-center text-center space-y-4">
                        <div className="relative">
                            <div className="w-12 h-12 rounded-full border-2 border-primary/30 animate-ping absolute" />
                            <ShieldCheck className="w-12 h-12 text-primary relative z-10" />
                        </div>
                        <div>
                            <h3 className="font-bold">Signing Transaction...</h3>
                            <p className="text-xs text-muted-foreground">Please check your Turnkey wallet</p>
                        </div>
                    </div>
                )}

                {step === "success" && (
                    <div className="py-8 flex flex-col items-center justify-center text-center space-y-4">
                        <CheckCircle2 className="w-16 h-16 text-emerald-400" />
                        <div>
                            <h3 className="font-bold text-xl">Payment Complete!</h3>
                            <p className="text-sm text-muted-foreground">App is now installing in your studio.</p>
                        </div>
                    </div>
                )}

                <DialogFooter>
                    {step === "confirm" && (
                        <Button onClick={handlePurchase} disabled={isProcessing} className="w-full font-bold tracking-wider">
                            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                            CONFIRM PAYMENT
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
