"use client";

import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MoreHorizontal, ShieldCheck, UserCog, Eye, Pen, Trash2 } from "lucide-react";
import { hasMinRole } from "@/lib/rbac";

interface Member {
    id: number;
    userId: string;
    walletAddress: string;
    role: string;
    status: string;
    displayName: string | null;
    avatarUrl: string | null;
    acceptedAt: string | null;
}

interface MemberListProps {
    members: Member[];
    currentUserRole: string;
    onChangeRole: (userId: string, newRole: string) => void;
    onRemove: (userId: string) => void;
}

const ROLE_BADGES: Record<string, { label: string; color: string }> = {
    owner: { label: "Owner", color: "text-amber-400 bg-amber-400/10 border-amber-400/20" },
    admin: { label: "Admin", color: "text-violet-400 bg-violet-400/10 border-violet-400/20" },
    signer: { label: "Signer", color: "text-primary bg-primary/10 border-primary/20" },
    viewer: { label: "Viewer", color: "text-muted-foreground bg-muted/30 border-border" },
};

export const MemberList = ({ members, currentUserRole, onChangeRole, onRemove }: MemberListProps) => {
    const canManage = hasMinRole(currentUserRole, "admin");

    return (
        <div className="space-y-2">
            {members.map((member) => {
                const badge = ROLE_BADGES[member.role] || ROLE_BADGES.viewer;
                const shortWallet = `${member.walletAddress.slice(0, 4)}...${member.walletAddress.slice(-4)}`;
                const name = member.displayName || shortWallet;
                const isPending = member.status === "pending";

                return (
                    <div
                        key={member.userId}
                        className={`flex items-center justify-between p-4 rounded-xl border transition-colors ${
                            isPending ? "bg-muted/5 border-dashed border-border/50" : "bg-card border-border hover:border-border/80"
                        }`}
                    >
                        <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9 ring-1 ring-border">
                                <AvatarImage src={member.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.walletAddress}`} />
                                <AvatarFallback className="bg-muted text-muted-foreground text-[10px] font-black">
                                    {name.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-black text-foreground uppercase tracking-tight">{name}</span>
                                    {isPending && (
                                        <span className="text-[8px] font-black text-amber-400 uppercase tracking-widest px-1.5 py-0.5 bg-amber-400/10 rounded border border-amber-400/20">
                                            Pending
                                        </span>
                                    )}
                                </div>
                                <p className="text-[9px] text-muted-foreground font-mono tracking-wide">{shortWallet}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border ${badge.color}`}>
                                {badge.label}
                            </span>

                            {canManage && member.role !== "owner" && (
                                <div className="relative group">
                                    <button className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                                        <MoreHorizontal size={14} />
                                    </button>
                                    <div className="absolute right-0 top-full mt-1 w-40 bg-background border border-border rounded-xl shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                                        {["viewer", "signer", "admin"].filter((r) => r !== member.role).map((role) => (
                                            <button
                                                key={role}
                                                onClick={() => onChangeRole(member.userId, role)}
                                                className="w-full text-left px-3 py-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground hover:bg-muted transition-colors first:rounded-t-xl"
                                            >
                                                Set as {role}
                                            </button>
                                        ))}
                                        <button
                                            onClick={() => onRemove(member.userId)}
                                            className="w-full text-left px-3 py-2 text-[10px] font-black uppercase tracking-widest text-red-400 hover:bg-red-400/10 transition-colors rounded-b-xl"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}

            {members.length === 0 && (
                <div className="p-8 text-center">
                    <p className="text-xs text-muted-foreground font-black uppercase tracking-widest">No team members yet</p>
                </div>
            )}
        </div>
    );
};
