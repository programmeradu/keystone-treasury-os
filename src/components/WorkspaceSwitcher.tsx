"use client";

import React, { useState } from "react";
import { Building2, ChevronDown, Plus, Check } from "lucide-react";
import { useOrganization } from "@/lib/contexts/OrganizationContext";
import { Input } from "@/components/ui/input";
import { toast } from "@/lib/toast-notifications";

export const WorkspaceSwitcher = () => {
    const { organizations, activeOrg, switchOrg, createOrg } = useOrganization();
    const [open, setOpen] = useState(false);
    const [creating, setCreating] = useState(false);
    const [newName, setNewName] = useState("");
    const [saving, setSaving] = useState(false);

    const handleCreate = async () => {
        if (!newName.trim()) return;
        setSaving(true);
        const slug = await createOrg(newName.trim());
        setSaving(false);
        if (slug) {
            toast.success(`Workspace "${newName}" created`);
            setNewName("");
            setCreating(false);
            setOpen(false);
        } else {
            toast.error("Failed to create workspace");
        }
    };

    return (
        <div className="relative">
            {/* Trigger */}
            <button
                onClick={() => setOpen(!open)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-muted transition-colors w-full text-left"
            >
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                    <Building2 size={14} />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-black text-foreground uppercase tracking-widest truncate">
                        {activeOrg?.orgName || "Personal Workspace"}
                    </p>
                    <p className="text-[8px] text-muted-foreground uppercase tracking-widest">
                        {activeOrg?.orgTier || "free"} plan
                    </p>
                </div>
                <ChevronDown size={12} className={`text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
            </button>

            {/* Dropdown */}
            {open && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => { setOpen(false); setCreating(false); }} />
                    <div className="absolute left-0 top-full mt-1 w-64 bg-background border border-border rounded-xl shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-200 overflow-hidden">
                        <div className="p-2 space-y-0.5 max-h-48 overflow-y-auto">
                            {/* Personal workspace */}
                            {organizations.length === 0 && (
                                <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-primary/5 border border-primary/20">
                                    <Building2 size={14} className="text-primary" />
                                    <span className="text-[10px] font-black text-foreground uppercase tracking-widest">Personal Workspace</span>
                                    <Check size={12} className="text-primary ml-auto" />
                                </div>
                            )}

                            {organizations.map((org) => (
                                <button
                                    key={org.orgSlug}
                                    onClick={() => { switchOrg(org.orgSlug); setOpen(false); }}
                                    className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-left transition-colors ${
                                        activeOrg?.orgSlug === org.orgSlug
                                            ? "bg-primary/5 border border-primary/20"
                                            : "hover:bg-muted"
                                    }`}
                                >
                                    <div className="w-6 h-6 rounded-md bg-muted flex items-center justify-center text-muted-foreground text-[9px] font-black">
                                        {org.orgName.slice(0, 2).toUpperCase()}
                                    </div>
                                    <span className="text-[10px] font-black text-foreground uppercase tracking-widest truncate flex-1">{org.orgName}</span>
                                    {activeOrg?.orgSlug === org.orgSlug && <Check size={12} className="text-primary flex-shrink-0" />}
                                </button>
                            ))}
                        </div>

                        <div className="border-t border-border p-2">
                            {creating ? (
                                <div className="flex gap-2">
                                    <Input
                                        value={newName}
                                        onChange={(e) => setNewName(e.target.value)}
                                        onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                                        placeholder="Workspace name"
                                        className="h-8 text-xs bg-card"
                                        autoFocus
                                    />
                                    <button
                                        onClick={handleCreate}
                                        disabled={!newName.trim() || saving}
                                        className="px-3 h-8 bg-primary text-primary-foreground rounded-lg text-[10px] font-black uppercase disabled:opacity-50"
                                    >
                                        {saving ? "..." : "Add"}
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setCreating(true)}
                                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left hover:bg-muted transition-colors"
                                >
                                    <Plus size={14} className="text-muted-foreground" />
                                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">New Workspace</span>
                                </button>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};
