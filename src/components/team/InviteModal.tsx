"use client";

import React, { useState } from "react";
import { X, Plus, UserPlus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "@/lib/toast-notifications";

interface InviteModalProps {
    teamId: string;
    open: boolean;
    onClose: () => void;
    onInvited: () => void;
}

const ROLES = [
    { id: "viewer", label: "Viewer", desc: "Can view dashboard and analytics" },
    { id: "signer", label: "Signer", desc: "Can sign transactions and proposals" },
    { id: "admin", label: "Admin", desc: "Can manage team members and settings" },
];

export const InviteModal = ({ teamId, open, onClose, onInvited }: InviteModalProps) => {
    const [address, setAddress] = useState("");
    const [role, setRole] = useState("viewer");
    const [sending, setSending] = useState(false);

    if (!open) return null;

    const handleInvite = async () => {
        const trimmed = address.trim();
        if (!trimmed) return;

        setSending(true);
        try {
            const res = await fetch(`/api/team/${teamId}/invite`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ address: trimmed, role }),
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || "Failed to send invite");
            }
            toast.success(`Invited ${trimmed} as ${role}`);
            setAddress("");
            setRole("viewer");
            onInvited();
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Failed to send invite";
            toast.error(msg);
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-background border border-border rounded-2xl shadow-2xl w-full max-w-md mx-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="flex items-center justify-between p-5 border-b border-border">
                    <div className="flex items-center gap-2">
                        <UserPlus size={18} className="text-primary" />
                        <h3 className="text-sm font-black text-foreground uppercase tracking-widest">Invite Member</h3>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
                        <X size={16} />
                    </button>
                </div>

                <div className="p-5 space-y-4">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                            Wallet Address or Email
                        </label>
                        <Input
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleInvite()}
                            placeholder="0x... or user@example.com"
                            className="bg-card"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Role</label>
                        <div className="space-y-2">
                            {ROLES.map((r) => (
                                <button
                                    key={r.id}
                                    onClick={() => setRole(r.id)}
                                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                                        role === r.id
                                            ? "border-primary/30 bg-primary/5"
                                            : "border-border bg-card hover:border-border/80"
                                    }`}
                                >
                                    <span className="text-xs font-black text-foreground uppercase">{r.label}</span>
                                    <span className="text-[9px] text-muted-foreground block mt-0.5">{r.desc}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-end gap-3 p-5 border-t border-border">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-xs font-black text-muted-foreground uppercase tracking-widest hover:text-foreground transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleInvite}
                        disabled={!address.trim() || sending}
                        className="flex items-center gap-2 px-5 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-black uppercase tracking-widest hover:bg-primary/90 transition-all disabled:opacity-50 shadow-[0_0_15px_var(--dashboard-accent-muted)]"
                    >
                        <Plus size={14} />
                        {sending ? "Sending..." : "Send Invite"}
                    </button>
                </div>
            </div>
        </div>
    );
};
