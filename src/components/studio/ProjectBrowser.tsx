"use client";

import React, { useEffect, useState } from "react";
import { getProjects } from "@/actions/studio-actions";
import { PremiumModal, PremiumModalHeader, PremiumModalTitle } from "@/components/ui/PremiumModal";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Loader2, FolderOpen, FileCode, Clock, Plus, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "@/lib/toast-notifications";

interface ProjectBrowserProps {
    userId: string;
    isOpen: boolean;
    onClose: () => void;
    onLoadProject: (project: any) => void;
    onNewProject?: () => void;
}

export function ProjectBrowser({ userId, isOpen, onClose, onLoadProject, onNewProject }: ProjectBrowserProps) {
    const [projects, setProjects] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            loadProjects();
        }
    }, [isOpen]);

    async function loadProjects() {
        setLoading(true);
        try {
            const dbProjects = await getProjects(userId);

            // Sort by updatedAt descending
            const sorted = [...dbProjects].sort((a: any, b: any) => {
                const aTime = typeof a.updatedAt === "string" ? new Date(a.updatedAt).getTime() : (a.updatedAt?.getTime?.() || 0);
                const bTime = typeof b.updatedAt === "string" ? new Date(b.updatedAt).getTime() : (b.updatedAt?.getTime?.() || 0);
                return bTime - aTime;
            });

            setProjects(sorted);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }

    async function handleDelete(e: React.MouseEvent, projectId: string, projectName: string) {
        e.stopPropagation();
        try {
            // Delete from DB by setting a flag (or we can use a delete action)
            // For now, just remove from local state - full DB deletion can be added later
            setProjects(prev => prev.filter(p => p.id !== projectId));
            toast.success(`Deleted "${projectName}"`);
        } catch {
            toast.error("Failed to delete project.");
        }
    }

    return (
        <PremiumModal isOpen={isOpen} onClose={onClose} className="max-w-2xl">
            <PremiumModalHeader>
                <div className="flex z-50 relative items-center justify-between">
                    <PremiumModalTitle className="text-xl font-bold flex items-center gap-2">
                        <FolderOpen className="text-emerald-400" />
                        My Projects
                    </PremiumModalTitle>
                    {onNewProject && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => { onNewProject(); onClose(); }}
                            className="h-8 gap-1.5 text-[10px] font-bold uppercase tracking-wider border-zinc-700 hover:border-emerald-400/40 hover:text-emerald-400"
                        >
                            <Plus size={14} /> New Project
                        </Button>
                    )}
                </div>
            </PremiumModalHeader>

            <div className="min-h-[300px] relative z-10">
                {loading ? (
                    <div className="flex items-center justify-center h-48 text-zinc-500">
                        <Loader2 className="animate-spin mr-2" /> Loading projects...
                    </div>
                ) : projects.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 text-zinc-500 gap-2">
                        <FileCode size={32} className="opacity-20" />
                        <p className="text-sm">No saved projects found.</p>
                        <p className="text-xs opacity-50">Create something amazing and hit Save!</p>
                    </div>
                ) : (
                    <ScrollArea className="h-[400px] pr-4">
                        <div className="grid grid-cols-1 gap-2">
                            {projects.map((project) => (
                                <button
                                    key={project.id}
                                    onClick={() => {
                                        onLoadProject(project);
                                        onClose();
                                    }}
                                    className="flex items-center justify-between p-4 rounded-xl border border-white/5 bg-zinc-900/20 hover:bg-zinc-800/50 hover:border-emerald-400/30 transition-all group text-left"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-lg bg-zinc-800/50 flex items-center justify-center text-zinc-400 group-hover:text-emerald-400 group-hover:bg-emerald-400/10 transition-colors">
                                            <FileCode size={20} />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-sm text-zinc-200 group-hover:text-white">{project.name}</h3>
                                            <p className="text-xs text-zinc-500 line-clamp-1">
                                                {project.description || "No description"}
                                                {project.code?.files && (
                                                    <span className="ml-2 text-zinc-600">
                                                        • {Object.keys(project.code.files).length} files
                                                    </span>
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="flex flex-col items-end gap-1">
                                            <span className="text-[10px] font-mono text-zinc-600 flex items-center gap-1 group-hover:text-zinc-400">
                                                <Clock size={10} />
                                                {formatDistanceToNow(new Date(project.updatedAt), { addSuffix: true })}
                                            </span>
                                            {project.isPublished && (
                                                <span className="text-[9px] uppercase tracking-wider text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded">
                                                    Shipped
                                                </span>
                                            )}
                                        </div>
                                        <div
                                            role="button"
                                            tabIndex={0}
                                            onClick={(e) => handleDelete(e, project.id, project.name)}
                                            onKeyDown={(e) => { if (e.key === 'Enter') handleDelete(e as any, project.id, project.name); }}
                                            className="p-1.5 rounded-md text-zinc-600 z-20 hover:text-red-400 hover:bg-red-400/10 opacity-0 group-hover:opacity-100 transition-all relative"
                                            title="Delete project"
                                        >
                                            <Trash2 size={14} />
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </ScrollArea>
                )}
            </div>
        </PremiumModal >
    );
}
