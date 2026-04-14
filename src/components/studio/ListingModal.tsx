"use client";

import React, { useState } from "react";
import {
    PremiumModal,
    PremiumModalHeader,
    PremiumModalTitle,
    PremiumModalDescription,
    PremiumModalFooter,
} from "@/components/ui/PremiumModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Loader2, Store, DollarSign, Tag, FileText, Info, AlertTriangle, ImagePlus, X, Camera } from "lucide-react";
import { toast } from "@/lib/toast-notifications";
import { isValidSolanaAddress, marketplacePayments } from "@/lib/studio/marketplace-payments";
import { notify } from "@/lib/notifications";
import { pickFile, processIconUpload, processScreenshotUpload } from "@/lib/studio/image-upload";

const CATEGORIES = [
    { value: "defi", label: "DeFi" },
    { value: "nft", label: "NFT" },
    { value: "governance", label: "Governance" },
    { value: "analytics", label: "Analytics" },
    { value: "utility", label: "Utility" },
    { value: "trading", label: "Trading" },
    { value: "security", label: "Security" },
    { value: "social", label: "Social" },
];

interface ListingModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    app: {
        id: string;
        name: string;
        description: string;
        code: any;
        creatorWallet: string;
        version: string;
        iconUrl?: string;
        screenshots?: string[];
    };
    onSuccess: () => void;
}

export function ListingModal({ open, onOpenChange, app, onSuccess }: ListingModalProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [price, setPrice] = useState("0");
    const [category, setCategory] = useState("utility");
    const [description, setDescription] = useState(app.description || "");
    const [iconUrl, setIconUrl] = useState<string | null>(app.iconUrl || null);
    const [screenshots, setScreenshots] = useState<string[]>(app.screenshots || []);

    const handleIconUpload = async () => {
        const file = await pickFile();
        if (!file) return;
        const { result, error } = await processIconUpload(file);
        if (error) { toast.error(error); return; }
        if (result) setIconUrl(result.dataUrl);
    };

    const handleScreenshotUpload = async () => {
        if (screenshots.length >= 4) { toast.error("Maximum 4 screenshots."); return; }
        const file = await pickFile();
        if (!file) return;
        const { result, error } = await processScreenshotUpload(file);
        if (error) { toast.error(error); return; }
        if (result) setScreenshots(prev => [...prev, result.dataUrl]);
    };

    const removeScreenshot = (idx: number) => {
        setScreenshots(prev => prev.filter((_, i) => i !== idx));
    };

    const priceNum = parseFloat(price) || 0;
    const creatorEarns = priceNum * 0.8;
    const platformFee = priceNum * 0.2;

    const creatorWalletValid = isValidSolanaAddress(app.creatorWallet);
    const treasuryAddress = marketplacePayments.getTreasuryAddress();

    const handleList = async () => {
        if (!description.trim()) {
            toast.error("Please add a description.");
            return;
        }

        setIsSubmitting(true);

        try {
            // Save/update app in DB first
            const { saveProject, publishApp } = await import("@/actions/studio-actions");
            await saveProject(
                app.creatorWallet,
                app.code,
                { name: app.name, description },
                app.id
            );

            // Publish to marketplace via DB
            const result = await publishApp(app.creatorWallet, app.id, {
                description,
                priceUsdc: priceNum,
                category,
                screenshotUrl: iconUrl || undefined,
            });

            if (!result.success) {
                throw new Error(result.error || "Failed to publish");
            }

            toast.success("Listed on Marketplace!", {
                description: priceNum > 0
                    ? `"${app.name}" listed at ${priceNum} USDC (you earn ${creatorEarns.toFixed(2)} USDC)`
                    : `"${app.name}" listed as FREE`,
                action: {
                    label: "View",
                    onClick: () => window.location.href = "/app/marketplace",
                },
            });
            notify.listing(app.name, priceNum);

            onSuccess();
            onOpenChange(false);
        } catch (error: any) {
            toast.error("Listing failed: " + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <PremiumModal isOpen={open} onClose={() => onOpenChange(false)} className="sm:max-w-[480px]">
            <PremiumModalHeader>
                <PremiumModalTitle className="flex items-center gap-2 text-lg">
                    <Store size={20} className="text-primary" />
                    List on Marketplace
                </PremiumModalTitle>
                <PremiumModalDescription>
                    Publish <strong className="text-foreground">{app.name}</strong> to the dreyv Marketplace.
                    Set your price and earn 80% of every sale.
                </PremiumModalDescription>
            </PremiumModalHeader>

            <div className="space-y-5 py-4 max-h-[60vh] overflow-y-auto scrollbar-thin pr-1">
                {/* App Icon */}
                <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <Camera size={12} /> App Icon
                    </Label>
                    <div className="flex items-center gap-4">
                        <button
                            type="button"
                            onClick={handleIconUpload}
                            className="w-20 h-20 rounded-2xl border-2 border-dashed border-zinc-700 hover:border-primary/50 bg-zinc-900 flex items-center justify-center overflow-hidden transition-colors group"
                        >
                            {iconUrl ? (
                                <img src={iconUrl} alt="Icon" className="w-full h-full object-cover rounded-2xl" />
                            ) : (
                                <ImagePlus size={24} className="text-zinc-600 group-hover:text-primary transition-colors" />
                            )}
                        </button>
                        <div className="text-[10px] text-muted-foreground space-y-1">
                            <p>Click to upload an icon (max 2MB)</p>
                            <p>Resized to 256×256. PNG, JPG, or WebP.</p>
                            {iconUrl && (
                                <button onClick={() => setIconUrl(null)} className="text-red-400 hover:text-red-300 font-bold">
                                    Remove icon
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Screenshots */}
                <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <ImagePlus size={12} /> Screenshots ({screenshots.length}/4)
                    </Label>
                    <div className="grid grid-cols-2 gap-2">
                        {screenshots.map((url, i) => (
                            <div key={i} className="relative group rounded-lg overflow-hidden border border-zinc-800 aspect-video bg-zinc-900">
                                <img src={url} alt={`Screenshot ${i + 1}`} className="w-full h-full object-cover" />
                                <button
                                    onClick={() => removeScreenshot(i)}
                                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                                >
                                    <X size={10} />
                                </button>
                            </div>
                        ))}
                        {screenshots.length < 4 && (
                            <button
                                type="button"
                                onClick={handleScreenshotUpload}
                                className="rounded-lg border-2 border-dashed border-zinc-700 hover:border-primary/50 bg-zinc-900 aspect-video flex flex-col items-center justify-center gap-1 transition-colors group"
                            >
                                <ImagePlus size={18} className="text-zinc-600 group-hover:text-primary transition-colors" />
                                <span className="text-[9px] text-zinc-600 group-hover:text-primary">Add Screenshot</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Description */}
                <div className="space-y-2">
                    <Label htmlFor="description" className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <FileText size={12} /> Description
                    </Label>
                    <Textarea
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Describe what your app does..."
                        className="min-h-[80px] bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-500 resize-none"
                    />
                </div>

                {/* Category */}
                <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <Tag size={12} /> Category
                    </Label>
                    <Select value={category} onValueChange={setCategory}>
                        <SelectTrigger className="bg-zinc-900 border-zinc-800 text-white">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {CATEGORIES.map((cat) => (
                                <SelectItem key={cat.value} value={cat.value}>
                                    {cat.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Price */}
                <div className="space-y-2">
                    <Label htmlFor="price" className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <DollarSign size={12} /> Price (SOL)
                    </Label>
                    <Input
                        id="price"
                        type="number"
                        min="0"
                        step="1"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        placeholder="0 for free"
                        className="bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-500 font-mono"
                    />
                    <p className="text-[10px] text-muted-foreground">Set to 0 for a free app.</p>
                </div>

                {/* Revenue Split */}
                {priceNum > 0 && (
                    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
                            <Info size={12} />
                            Revenue Split (On-Chain)
                        </div>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Sale Price</span>
                                <span className="font-bold font-mono">{priceNum.toFixed(4)} SOL</span>
                            </div>
                            <div className="h-px bg-zinc-800" />
                            <div className="flex justify-between items-center">
                                <span className="text-emerald-400 font-medium">You earn (80%)</span>
                                <span className="font-bold font-mono text-emerald-400">{creatorEarns.toFixed(4)} SOL</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Platform fee (20%)</span>
                                <span className="font-mono text-muted-foreground">{platformFee.toFixed(4)} SOL</span>
                            </div>
                            <div className="h-px bg-zinc-800" />
                            <div className="flex justify-between items-center text-[10px]">
                                <span className="text-muted-foreground">Treasury</span>
                                <span className="font-mono text-muted-foreground/60">{treasuryAddress.slice(0, 4)}..{treasuryAddress.slice(-4)}</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Wallet warning */}
                {priceNum > 0 && !creatorWalletValid && (
                    <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-400/5 border border-amber-400/20 rounded-lg px-3 py-2">
                        <AlertTriangle size={12} />
                        <span>Your creator wallet is not a valid Solana address. Buyers will use demo mode for payment.</span>
                    </div>
                )}
            </div>

            <PremiumModalFooter>
                <Button
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                    className="bg-black/20 border-white/10 hover:bg-white/5 text-white"
                >
                    Cancel
                </Button>
                <Button
                    onClick={handleList}
                    disabled={isSubmitting || !description.trim()}
                    className="bg-primary text-black font-bold hover:bg-primary/90 disabled:opacity-40 disabled:bg-zinc-700 disabled:text-zinc-400"
                >
                    {isSubmitting ? (
                        <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Publishing...</>
                    ) : priceNum > 0 ? (
                        `List for ${priceNum} SOL`
                    ) : (
                        "List as Free"
                    )}
                </Button>
            </PremiumModalFooter>
        </PremiumModal>
    );
}
