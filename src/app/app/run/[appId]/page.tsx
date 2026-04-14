"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getProject } from "@/actions/studio-actions";
import { LivePreview } from "@/components/studio/LivePreview";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, AlertTriangle } from "lucide-react";
import Link from "next/link";

export default function RunPage() {
    const params = useParams();
    const appId = params.appId as string;

    const [project, setProject] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            // Load from DB
            try {
                const data = await getProject(appId);
                if (data) {
                    setProject(data);
                }
            } catch {}

            setLoading(false);
        }
        load();
    }, [appId]);

    if (loading) {
        return (
            <div className="h-screen flex flex-col items-center justify-center bg-background text-foreground gap-4">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold">Loading App...</p>
            </div>
        );
    }

    if (!project) {
        return (
            <div className="h-screen flex flex-col items-center justify-center bg-background text-foreground gap-4">
                <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center text-red-500">
                    <AlertTriangle size={32} />
                </div>
                <h1 className="text-xl font-bold">App Not Found</h1>
                <p className="text-muted-foreground">The application you are trying to run does not exist or you do not have permission.</p>
                <Link href="/app/library">
                    <Button variant="outline">Return to Library</Button>
                </Link>
            </div>
        );
    }

    // Transform stored files to StudioFile format
    const files: Record<string, { name: string; content: string; language: string }> = {};
    if (project.code && typeof project.code === 'object' && 'files' in project.code) {
        const storedFiles = (project.code as any).files;
        Object.keys(storedFiles).forEach((fileName: string) => {
            const ext = fileName.split('.').pop() || '';
            const langMap: Record<string, string> = {
                'tsx': 'typescript',
                'ts': 'typescript',
                'js': 'javascript',
                'jsx': 'javascript',
                'css': 'css',
                'json': 'json',
                'rs': 'rust'
            };
            files[fileName] = {
                name: fileName,
                content: storedFiles[fileName].content,
                language: langMap[ext] || 'plaintext'
            };
        });
    }

    return (
        <div className="h-screen flex flex-col bg-background overflow-hidden">
            {/* Minimal Runtime Header */}
            <div className="h-10 border-b border-border/20 bg-muted/10 flex items-center justify-between px-4 shrink-0">
                <div className="flex items-center gap-4">
                    <Link href="/app/library" className="text-muted-foreground hover:text-foreground transition-colors">
                        <ArrowLeft size={16} />
                    </Link>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/80">
                            dreyv Runtime // {project.name}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <span className="text-[9px] font-mono text-zinc-500">v{project.version}</span>
                    <div className="h-3 w-px bg-zinc-800" />
                    <Link href={`/app/studio?appId=${project.id}`}>
                        <Button variant="ghost" size="sm" className="h-6 text-[9px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground">
                            View Source
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Runtime Sandbox */}
            <div className="flex-1 relative bg-black">
                <LivePreview files={files} tab="preview" />
            </div>
        </div>
    );
}
