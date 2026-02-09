"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Key, Copy, Plus, ShieldCheck, History, Trash2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/lib/toast-notifications";
import { formatDistanceToNow } from "date-fns";

const LS_KEY = "keystone_api_keys";

interface ApiKey {
    id: string;
    name: string;
    prefix: string;
    secret: string;           // full key (only shown once)
    createdAt: number;
    lastUsedAt: number | null;
    env: "live" | "test";
}

function loadKeys(): ApiKey[] {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || "[]"); } catch { return []; }
}
function saveKeys(keys: ApiKey[]) {
    localStorage.setItem(LS_KEY, JSON.stringify(keys));
}

function generateKeyString(env: "live" | "test"): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = `pk_${env}_`;
    for (let i = 0; i < 32; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
    return result;
}

export const ApiKeysView = () => {
    const [keys, setKeys] = useState<ApiKey[]>([]);
    const [showCreate, setShowCreate] = useState(false);
    const [newKeyName, setNewKeyName] = useState("");
    const [newKeyEnv, setNewKeyEnv] = useState<"live" | "test">("live");
    const [justCreatedId, setJustCreatedId] = useState<string | null>(null);

    useEffect(() => { setKeys(loadKeys()); }, []);

    const handleCreate = () => {
        const name = newKeyName.trim() || `Key ${keys.length + 1}`;
        const secret = generateKeyString(newKeyEnv);
        const key: ApiKey = {
            id: `key_${Date.now()}`,
            name,
            prefix: secret.slice(0, 12) + "...",
            secret,
            createdAt: Date.now(),
            lastUsedAt: null,
            env: newKeyEnv,
        };
        const updated = [key, ...keys];
        setKeys(updated);
        saveKeys(updated);
        setJustCreatedId(key.id);
        setShowCreate(false);
        setNewKeyName("");
        toast.success("API key created — copy it now, it won't be shown again.");
    };

    const handleCopy = useCallback((key: ApiKey) => {
        navigator.clipboard.writeText(key.secret);
        toast.success("API key copied to clipboard");
    }, []);

    const handleRevoke = useCallback((id: string) => {
        const updated = keys.filter((k) => k.id !== id);
        setKeys(updated);
        saveKeys(updated);
        if (justCreatedId === id) setJustCreatedId(null);
        toast.success("API key revoked");
    }, [keys, justCreatedId]);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shadow-[0_0_15px_var(--dashboard-accent-muted)]">
                        <Key size={20} />
                    </div>
                    <div>
                        <h2 className="text-lg font-black text-foreground uppercase tracking-tight">API Access Vault</h2>
                        <p className="text-xs text-muted-foreground font-black uppercase tracking-widest">Manage programmatic access keys.</p>
                    </div>
                </div>
                <Button
                    onClick={() => setShowCreate(!showCreate)}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-black uppercase gap-2 shadow-sm"
                >
                    <Plus size={14} /> Generate New Key
                </Button>
            </div>

            {/* Create form */}
            {showCreate && (
                <div className="bg-card border border-primary/20 rounded-xl p-5 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="flex gap-3">
                        <Input
                            value={newKeyName}
                            onChange={(e) => setNewKeyName(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                            placeholder="Key name (e.g. Production Agent)"
                            className="flex-1 bg-background"
                            autoFocus
                        />
                        <div className="flex rounded-lg overflow-hidden border border-border">
                            <button
                                onClick={() => setNewKeyEnv("live")}
                                className={`px-3 py-1.5 text-[10px] font-black uppercase transition-colors ${newKeyEnv === "live" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                            >Live</button>
                            <button
                                onClick={() => setNewKeyEnv("test")}
                                className={`px-3 py-1.5 text-[10px] font-black uppercase transition-colors ${newKeyEnv === "test" ? "bg-orange-500 text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                            >Test</button>
                        </div>
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setShowCreate(false)} className="text-xs">Cancel</Button>
                        <Button size="sm" onClick={handleCreate} className="bg-primary text-primary-foreground text-xs font-bold">Create Key</Button>
                    </div>
                </div>
            )}

            <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
                <div className="p-4 border-b border-border bg-muted/30">
                    <div className="grid grid-cols-12 text-[10px] text-muted-foreground font-black uppercase tracking-widest">
                        <div className="col-span-4">Key Name</div>
                        <div className="col-span-4">Prefix</div>
                        <div className="col-span-2">Created</div>
                        <div className="col-span-2 text-right">Action</div>
                    </div>
                </div>

                {keys.length === 0 ? (
                    <div className="p-8 text-center">
                        <p className="text-xs text-muted-foreground">No API keys yet. Generate one to get started.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-border">
                        {keys.map((key) => (
                            <div key={key.id} className={`p-4 grid grid-cols-12 items-center hover:bg-primary/5 transition-colors group ${justCreatedId === key.id ? "bg-primary/5 ring-1 ring-inset ring-primary/20" : ""}`}>
                                <div className="col-span-4 flex items-center gap-3">
                                    <div className="w-8 h-8 rounded bg-muted flex items-center justify-center border border-border shadow-sm">
                                        <Key size={14} className="text-foreground opacity-50 block rotate-45" />
                                    </div>
                                    <div>
                                        <span className="text-sm font-black text-foreground flex items-center gap-2 uppercase tracking-tight">
                                            {key.name}
                                            {key.env === "test" && (
                                                <span className="px-1.5 py-0.5 rounded bg-orange-500/10 text-[9px] text-orange-500 font-mono font-black uppercase border border-orange-500/20">TEST</span>
                                            )}
                                        </span>
                                        <span className="text-[10px] text-muted-foreground flex items-center gap-1 uppercase tracking-widest font-black">
                                            <History size={10} /> {key.lastUsedAt ? formatDistanceToNow(new Date(key.lastUsedAt), { addSuffix: true }) : "Never used"}
                                        </span>
                                    </div>
                                </div>
                                <div className="col-span-4 font-mono text-[10px] text-muted-foreground flex items-center gap-2 uppercase font-black">
                                    {justCreatedId === key.id ? (
                                        <span className="text-primary select-all break-all text-[9px]">{key.secret}</span>
                                    ) : (
                                        <>{key.prefix} <span className="opacity-30">••••••••••••</span></>
                                    )}
                                </div>
                                <div className="col-span-2 text-[10px] text-muted-foreground uppercase font-black tracking-widest">
                                    {formatDistanceToNow(new Date(key.createdAt), { addSuffix: true })}
                                </div>
                                <div className="col-span-2 text-right flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => handleCopy(key)}
                                        className="p-2 rounded bg-muted hover:bg-primary/20 hover:text-primary transition-colors border border-border shadow-sm"
                                        title="Copy Key"
                                    >
                                        <Copy size={14} />
                                    </button>
                                    <button
                                        onClick={() => handleRevoke(key.id)}
                                        className="p-2 rounded bg-muted hover:bg-destructive/20 text-foreground hover:text-destructive transition-colors border border-border shadow-sm"
                                        title="Revoke"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {justCreatedId && (
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-start gap-3 animate-in fade-in duration-300">
                    <CheckCircle2 className="text-primary mt-0.5" size={16} />
                    <div className="space-y-1">
                        <h4 className="text-xs font-black text-primary uppercase tracking-tight">Key Created Successfully</h4>
                        <p className="text-[10px] text-muted-foreground leading-relaxed uppercase tracking-widest font-black">
                            Copy the full key above now. It will be hidden once you navigate away.
                        </p>
                    </div>
                </div>
            )}

            <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 flex items-start gap-3 shadow-inner">
                <ShieldCheck className="text-amber-500 mt-0.5" size={16} />
                <div className="space-y-1">
                    <h4 className="text-xs font-black text-amber-500 uppercase tracking-tight">Security Notice</h4>
                    <p className="text-[10px] text-muted-foreground leading-relaxed uppercase tracking-widest font-black">
                        Secret keys are only visible once upon creation. Do not share your keys with anyone.
                        Rotate your keys every 90 days for optimal security.
                    </p>
                </div>
            </div>
        </div>
    );
};
