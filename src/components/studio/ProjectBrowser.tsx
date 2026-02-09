"use client";

import React, { useEffect, useState } from "react";
import { getProjects } from "@/actions/studio-actions";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
            // Read from localStorage first
            let localProjects: any[] = [];
            try {
                localProjects = JSON.parse(localStorage.getItem("keystone_studio_projects") || "[]");
            } catch {}

            // Try DB
            let dbProjects: any[] = [];
            try {
                dbProjects = await getProjects(userId);
            } catch {}

            // Merge: local first, then DB (deduplicated by id)
            const merged = [...localProjects, ...dbProjects];
            const unique = Array.from(new Map(merged.map((p: any) => [p.id, p])).values());

            // Sort by updatedAt descending
            unique.sort((a: any, b: any) => {
                const aTime = typeof a.updatedAt === "string" ? new Date(a.updatedAt).getTime() : (a.updatedAt || 0);
                const bTime = typeof b.updatedAt === "string" ? new Date(b.updatedAt).getTime() : (b.updatedAt || 0);
                return bTime - aTime;
            });

            setProjects(unique);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }

    function handleDelete(e: React.MouseEvent, projectId: string, projectName: string) {
        e.stopPropagation();
        try {
            const existing = JSON.parse(localStorage.getItem("keystone_studio_projects") || "[]");
            const filtered = existing.filter((p: any) => p.id !== projectId);
            localStorage.setItem("keystone_studio_projects", JSON.stringify(filtered));
            setProjects(prev => prev.filter(p => p.id !== projectId));
            toast.success(`Deleted "${projectName}"`);
        } catch {
            toast.error("Failed to delete project.");
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl bg-[#09090b] border-zinc-800 text-zinc-100">
                <DialogHeader>
                    <div className="flex items-center justify-between">
                        <DialogTitle className="text-xl font-bold flex items-center gap-2">
                            <FolderOpen className="text-emerald-400" />
                            My Projects
                        </DialogTitle>
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
                </DialogHeader>

                <div className="min-h-[300px]">
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
                                        className="flex items-center justify-between p-4 rounded-xl border border-zinc-800/50 bg-zinc-900/20 hover:bg-zinc-800/50 hover:border-emerald-400/30 transition-all group text-left"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-400 group-hover:text-emerald-400 group-hover:bg-emerald-400/10 transition-colors">
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
                                                className="p-1.5 rounded-md text-zinc-600 hover:text-red-400 hover:bg-red-400/10 opacity-0 group-hover:opacity-100 transition-all"
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
            </DialogContent>
        </Dialog>
    );
}
