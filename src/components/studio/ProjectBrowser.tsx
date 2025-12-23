"use client";

import React, { useEffect, useState } from "react";
import { getProjects, ProjectCode } from "@/actions/studio-actions";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Loader2, FolderOpen, FileCode, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ProjectBrowserProps {
    userId: string;
    isOpen: boolean;
    onClose: () => void;
    onLoadProject: (project: any) => void;
}

export function ProjectBrowser({ userId, isOpen, onClose, onLoadProject }: ProjectBrowserProps) {
    const [projects, setProjects] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && userId) {
            loadProjects();
        }
    }, [isOpen, userId]);

    async function loadProjects() {
        setLoading(true);
        try {
            const data = await getProjects(userId);
            setProjects(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl bg-[#09090b] border-zinc-800 text-zinc-100">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold flex items-center gap-2">
                        <FolderOpen className="text-emerald-400" />
                        My Projects
                    </DialogTitle>
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
                            <p className="text-xs opacity-50">Create something amazing and save it!</p>
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
                                                <p className="text-xs text-zinc-500 line-clamp-1">{project.description}</p>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-1">
                                            <span className="text-[10px] font-mono text-zinc-600 flex items-center gap-1 group-hover:text-zinc-400">
                                                <Clock size={10} />
                                                {formatDistanceToNow(new Date(project.updatedAt), { addSuffix: true })}
                                            </span>
                                            {project.isPublished && (
                                                <span className="text-[9px] uppercase tracking-wider text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded">
                                                    Published
                                                </span>
                                            )}
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
