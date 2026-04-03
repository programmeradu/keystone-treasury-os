"use client";

import React, { useState, useEffect } from "react";
import { User, Shield, Key, Fingerprint, Award, Wallet, Package, Store, Pencil, Check, RefreshCw, Loader2 } from "lucide-react";
import { Logo } from "@/components/icons";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/lib/toast-notifications";
import { useProfile } from "@/lib/hooks/useProfile";

async function loadAppStatsFromDb(wallet: string): Promise<{ appsCreated: number; appsListed: number }> {
    try {
        const { getProjects } = await import("@/actions/studio-actions");
        const projects = await getProjects(wallet);
        return {
            appsCreated: projects.length,
            appsListed: projects.filter((p: any) => p.isPublished).length,
        };
    } catch {
        return { appsCreated: 0, appsListed: 0 };
    }
}

export const ProfileView = ({ onNavigate }: { onNavigate?: (view: string) => void }) => {
    const { publicKey, connected, disconnect } = useWallet();
    const { setVisible: openWalletModal } = useWalletModal();
    const { profile, isLoading, error, updateProfile } = useProfile();
    const [editing, setEditing] = useState(false);
    const [editName, setEditName] = useState("");
    const [stats, setStats] = useState({ appsCreated: 0, appsListed: 0 });
    const [saving, setSaving] = useState(false);

    const walletAddress = connected && publicKey ? publicKey.toBase58() : null;
    const shortWallet = walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : "Not Connected";

    const displayName = profile?.displayName || "Keystone Operator";
    const avatarSeed = profile?.avatarSeed || "KeystoneAdmin";
    const role = profile?.role || "user";

    useEffect(() => {
        const wallet = walletAddress || "";
        loadAppStatsFromDb(wallet).then(setStats);
    }, [walletAddress]);

    const handleSaveName = async () => {
        const name = editName.trim() || "Keystone Operator";
        setSaving(true);
        const success = await updateProfile({ displayName: name });
        setSaving(false);
        if (success) {
            setEditing(false);
            toast.success("Display name updated");
        } else {
            toast.error("Failed to save display name");
        }
    };

    const handleRandomizeAvatar = async () => {
        const seed = `user_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        setSaving(true);
        const success = await updateProfile({ avatarSeed: seed });
        setSaving(false);
        if (success) {
            toast.success("Avatar updated");
        } else {
            toast.error("Failed to update avatar");
        }
    };

    // Loading skeleton
    if (isLoading) {
        return (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shadow-[0_0_15px_var(--dashboard-accent-muted)]">
                        <Fingerprint size={20} />
                    </div>
                    <div>
                        <h2 className="text-lg font-black text-foreground uppercase tracking-tight">Identity Profile</h2>
                        <p className="text-xs text-muted-foreground font-black uppercase tracking-widest">Loading your profile...</p>
                    </div>
                </div>
                <div className="bg-gradient-to-br from-muted to-background border border-border rounded-2xl p-8 flex items-center justify-center h-48">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shadow-[0_0_15px_var(--dashboard-accent-muted)]">
                    <Fingerprint size={20} />
                </div>
                <div>
                    <h2 className="text-lg font-black text-foreground uppercase tracking-tight">Identity Profile</h2>
                    <p className="text-xs text-muted-foreground font-black uppercase tracking-widest">Manage your digital identity and access credentials.</p>
                </div>
            </div>

            {/* ID Card */}
            <div className="bg-gradient-to-br from-muted to-background border border-border rounded-2xl p-8 relative overflow-hidden group shadow-md">
                <div className="absolute top-0 right-0 p-8 opacity-5">
                    <Logo size={180} fillColor="#fff" />
                </div>

                <div className="relative z-10 flex flex-col md:flex-row gap-8 items-center md:items-start">
                    <div className="relative">
                        <div className="w-24 h-24 rounded-full bg-muted p-1 border border-border relative group-hover:border-primary/50 transition-colors shadow-inner">
                            <img
                                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${avatarSeed}`}
                                alt="Avatar"
                                className="w-full h-full rounded-full bg-background"
                            />
                            <button
                                onClick={handleRandomizeAvatar}
                                disabled={saving}
                                className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-primary border-4 border-background flex items-center justify-center hover:scale-110 transition-transform disabled:opacity-50"
                                title="Randomize avatar"
                            >
                                {saving ? <Loader2 size={10} className="animate-spin text-primary-foreground" /> : <RefreshCw size={10} className="text-primary-foreground" />}
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 space-y-4 text-center md:text-left">
                        <div>
                            <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
                                {editing ? (
                                    <div className="flex items-center gap-2">
                                        <Input
                                            value={editName}
                                            onChange={(e) => setEditName(e.target.value)}
                                            onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
                                            className="h-8 text-lg font-black uppercase w-56 bg-background"
                                            autoFocus
                                        />
                                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleSaveName} disabled={saving}>
                                            {saving ? <Loader2 size={16} className="animate-spin text-primary" /> : <Check size={16} className="text-primary" />}
                                        </Button>
                                    </div>
                                ) : (
                                    <>
                                        <h3 className="text-2xl font-black text-foreground tracking-tight uppercase">{displayName}</h3>
                                        <button onClick={() => { setEditName(displayName); setEditing(true); }} className="p-1 rounded hover:bg-muted transition-colors">
                                            <Pencil size={12} className="text-muted-foreground" />
                                        </button>
                                    </>
                                )}
                                <span className="px-2 py-0.5 rounded bg-primary/20 text-primary text-[10px] font-black uppercase border border-primary/10 shadow-sm">
                                    {role}
                                </span>
                            </div>
                            <p className="text-sm text-muted-foreground font-mono font-black uppercase tracking-widest">{shortWallet}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-3 rounded-lg bg-muted/20 border border-border shadow-inner">
                                <span className="text-[10px] text-muted-foreground uppercase font-black block mb-1">Apps Created</span>
                                <span className="text-foreground font-black uppercase flex items-center gap-1.5 justify-center md:justify-start text-xs">
                                    <Package size={14} className="text-primary" /> {stats.appsCreated}
                                </span>
                            </div>
                            <div className="p-3 rounded-lg bg-muted/20 border border-border shadow-inner">
                                <span className="text-[10px] text-muted-foreground uppercase font-black block mb-1">Marketplace Listings</span>
                                <span className="text-foreground font-black uppercase flex items-center gap-1.5 justify-center md:justify-start text-xs">
                                    <Store size={14} className="text-purple-500" /> {stats.appsListed}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Wallet & Credentials */}
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
                <h3 className="text-sm font-black text-foreground uppercase tracking-widest mb-4">Linked Credentials</h3>
                <div className="space-y-3">
                    <CredentialItem
                        icon={Wallet}
                        label="Solana Wallet"
                        value={walletAddress ? shortWallet : "No wallet connected"}
                        status={connected ? "Connected" : "Connect"}
                        color={connected ? "text-primary" : "text-muted-foreground"}
                        onClick={() => {
                            if (connected) {
                                disconnect();
                                toast.success("Wallet disconnected");
                            } else {
                                openWalletModal(true);
                            }
                        }}
                    />
                    <CredentialItem
                        icon={Key}
                        label="API Keys"
                        value={(() => {
                            try {
                                const keys = JSON.parse(localStorage.getItem("keystone_api_keys") || "[]");
                                return `${keys.length} key${keys.length !== 1 ? "s" : ""} active`;
                            } catch { return "0 keys"; }
                        })()}
                        status="Manage →"
                        color="text-primary"
                        onClick={() => onNavigate?.("api")}
                    />
                    <CredentialItem
                        icon={Shield}
                        label="Security Level"
                        value={connected ? "Wallet-verified identity" : "Unverified — connect wallet"}
                        status={connected ? "Verified" : "Connect Wallet"}
                        color={connected ? "text-primary" : "text-amber-400"}
                        onClick={() => {
                            if (!connected) {
                                openWalletModal(true);
                            } else {
                                toast.info("Your identity is verified via your connected wallet.");
                            }
                        }}
                    />
                </div>
            </div>
        </div>
    );
};

const CredentialItem = ({ icon: Icon, label, value, status, color = "text-muted-foreground", onClick }: any) => (
    <div
        onClick={onClick}
        className={`flex items-center justify-between p-4 rounded-xl bg-muted/10 hover:bg-muted/30 border border-border transition-colors group shadow-sm ${onClick ? "cursor-pointer" : ""}`}
    >
        <div className="flex items-center gap-4">
            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground group-hover:text-foreground transition-colors border border-border">
                <Icon size={16} />
            </div>
            <div>
                <h4 className="text-sm font-black text-foreground uppercase tracking-tight">{label}</h4>
                <p className="text-xs text-muted-foreground uppercase tracking-widest font-black text-[9px]">{value}</p>
            </div>
        </div>
        <span className={`text-xs font-black uppercase ${color}`}>{status}</span>
    </div>
);
