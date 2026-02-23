"use client";

import React, { useState, useCallback, useEffect } from "react";
import {
    ResizableHandle,
    ResizablePanel,
    ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Save,
    Play,
    Upload,
    Zap,
    Eye,
    Terminal,
    FileCode,
    FileText,
    Hash,
    Cpu,
    Settings,
    Shield,

    Loader2,
    FolderOpen,
} from "lucide-react";
import { useSelf } from "@/liveblocks.config";
import { getAvatarUrl } from "@/lib/avatars";
import { Logo, ArchitectIcon } from "@/components/icons";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PromptChat } from "@/components/studio/PromptChat";
import { CodeEditor } from "@/components/studio/CodeEditor";
import { LivePreview } from "@/components/studio/LivePreview";
import { ContractEditor } from "@/components/studio/ContractEditor";
import { WalletManager } from "@/components/studio/WalletManager";
import { compileProgram } from "@/lib/studio/solana-playground";
import { saveProject } from "@/actions/studio-actions";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "@/lib/toast-notifications";
import { ProjectBrowser } from "@/components/studio/ProjectBrowser";
import { useSearchParams } from "next/navigation";

interface StudioFile {
    name: string;
    content: string;
    language: string;
}

// Helper to determine file icon
const FileIcon = ({ fileName, active }: { fileName: string; active: boolean }) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    const color = active ? "text-emerald-400" : "text-muted-foreground/60";

    if (ext === 'tsx' || ext === 'ts') return <FileCode size={14} className={color} strokeWidth={2.5} />;
    if (ext === 'css') return <Hash size={14} className={color} strokeWidth={2.5} />;
    if (ext === 'rs') return <Cpu size={14} className={color} strokeWidth={2.5} />;
    return <FileText size={14} className={color} strokeWidth={2.5} />;
};

const DEFAULT_FILES: Record<string, StudioFile> = {
    "App.tsx": {
        name: "App.tsx",
        content: `import { useVault } from '@keystone-os/sdk';

export default function App() {
  const { tokens } = useVault();

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-lg shadow-emerald-400/50 animate-pulse"></div>
        <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">System Ready</span>
      </div>
      
      <h1 className="text-4xl font-bold tracking-tight mb-4 text-white">
        Keystone <span className="text-emerald-400">Architect</span> Node
      </h1>
      
      <p className="text-zinc-400 max-w-2xl mb-8 leading-relaxed text-lg">
        Treasury OS construction environment initialized.
        Use the AI Architect to synthesize custom mini-apps.
      </p>

      <div className="grid gap-3 mb-12">
        {tokens.map((token) => (
          <div key={token.symbol} className="flex items-center justify-between p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 hover:border-emerald-400/20 transition-all">
            <div className="flex items-center gap-3">
              {token.logoURI ? (
                <img src={token.logoURI} alt={token.symbol} className="w-8 h-8 rounded-full" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-400">{token.symbol[0]}</div>
              )}
              <div>
                <p className="font-bold text-white">{token.symbol}</p>
                <p className="text-xs text-zinc-500">{token.name}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-mono font-bold text-white">{token.balance.toLocaleString()}</p>
              <p className="text-xs text-emerald-400">\${(token.balance * token.price).toLocaleString()}</p>
            </div>
          </div>
        ))}
      </div>
      
      <div className="text-center text-zinc-600 text-[10px] font-bold uppercase tracking-[0.3em] pt-8 border-t border-zinc-900/50">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 mr-3 animate-pulse"></span>
        Ask the Architect to build something
      </div>
    </div>
  );
}`,
        language: "typescript",
    },
    "utils.ts": {
        name: "utils.ts",
        content: `// Keystone Utility Suite
export const formatUSD = (val: number) => 
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

export const cn = (...classes: string[]) => classes.filter(Boolean).join(' ');
`,
        language: "typescript",
    },
    "styles.css": {
        name: "styles.css",
        content: `/* Keystone Design System */
body {
  margin: 0;
  background: #09090b;
  color: white;
  font-family: system-ui, sans-serif;
}
`,
        language: "css",
    },
    "lib.rs": {
        name: "lib.rs",
        content: `use anchor_lang::prelude::*;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod keystone_contract {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Keystone Vault Initialized");
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}`,
        language: "rust",
    },
};

export default function StudioPage() {
    const user = useSelf();
    const [appName, setAppName] = useState("Untitled Mini-App");
    const [files, setFiles] = useState<Record<string, StudioFile>>({ ...DEFAULT_FILES });
    const [activeFile, setActiveFile] = useState("App.tsx");
    const [isGenerating, setIsGenerating] = useState(false);
    const [isCompiling, setIsCompiling] = useState(false);
    const [activeTab, setActiveTab] = useState<"preview" | "code" | "contract">("preview");
    const [showWalletModal, setShowWalletModal] = useState(false);
    const [programBuffer, setProgramBuffer] = useState<Buffer | null>(null);
    const [isDeploying, setIsDeploying] = useState(false);
    const [runtimeLogs, setRuntimeLogs] = useState<string[]>([]);

    // Persistence State
    const [currentAppId, setCurrentAppId] = useState<string | undefined>(undefined);
    const [showProjectBrowser, setShowProjectBrowser] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const searchParams = useSearchParams();

    // Load project from ?appId= query param on mount
    useEffect(() => {
        const appIdParam = searchParams.get("appId");
        if (!appIdParam) return;

        // Try localStorage saved projects first
        try {
            const projects = JSON.parse(localStorage.getItem("keystone_studio_projects") || "[]");
            const found = projects.find((p: any) => p.id === appIdParam);
            if (found) {
                handleLoadProject(found);
                return;
            }
        } catch {}

        // Try localStorage library apps
        try {
            const library = JSON.parse(localStorage.getItem("keystone_library_apps") || "[]");
            const found = library.find((a: any) => a.id === appIdParam);
            if (found) {
                handleLoadProject(found);
                return;
            }
        } catch {}

        // Try DB as last resort
        (async () => {
            try {
                const { getProject } = await import("@/actions/studio-actions");
                const project = await getProject(appIdParam);
                if (project) handleLoadProject(project);
            } catch {}
        })();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const handleNewProject = () => {
        setAppName("Untitled Mini-App");
        setCurrentAppId(undefined);
        setFiles({ ...DEFAULT_FILES });
        setActiveFile("App.tsx");
        setRuntimeLogs([]);
        setProgramBuffer(null);
        setActiveTab("preview");
        toast.info("New project created.");
    };

    const handleCodeChange = useCallback((newCode: string) => {
        setFiles((prev) => ({
            ...prev,
            [activeFile]: {
                ...prev[activeFile],
                content: newCode,
            },
        }));
    }, [activeFile]);

    const handleAIGenerate = useCallback(async (generatedFiles: Record<string, string>) => {
        const newFiles: Record<string, StudioFile> = {};
        for (const [name, content] of Object.entries(generatedFiles)) {
            const ext = name.split(".").pop() || "";
            const langMap: Record<string, string> = {
                tsx: "typescript",
                ts: "typescript",
                js: "javascript",
                jsx: "javascript",
                css: "css",
                json: "json",
            };
            newFiles[name] = {
                name,
                content,
                language: langMap[ext] || "plaintext",
            };
        }
        setFiles((prev) => ({ ...prev, ...newFiles }));
        if (generatedFiles["App.tsx"]) {
            setActiveFile("App.tsx");
        }
    }, []);



    const handleSave = async () => {
        setIsSaving(true);
        const toastId = toast.loading("Saving project...");

        try {
            const appId = currentAppId || "proj_" + Math.random().toString(36).substring(2, 15);
            const creatorWallet = localStorage.getItem("keystone_wallet_id") || user?.info?.name || "Operator";

            const projectCode = {
                files: Object.entries(files).reduce((acc, [name, file]) => ({
                    ...acc,
                    [name]: { content: file.content }
                }), {} as Record<string, { content: string }>)
            };

            const projectEntry = {
                id: appId,
                name: appName,
                description: "Created in Keystone Studio",
                code: projectCode,
                creatorWallet,
                version: "1.0.0",
                isPublished: false,
                createdAt: Date.now(),
                updatedAt: Date.now(),
            };

            // Save to localStorage
            const existing = JSON.parse(localStorage.getItem("keystone_studio_projects") || "[]");
            const idx = existing.findIndex((p: { id: string }) => p.id === appId);
            if (idx >= 0) {
                projectEntry.createdAt = existing[idx].createdAt;
                existing[idx] = projectEntry;
            } else {
                existing.push(projectEntry);
            }
            localStorage.setItem("keystone_studio_projects", JSON.stringify(existing));

            // Also try DB if available
            try {
                await saveProject(
                    creatorWallet,
                    projectCode,
                    { name: appName, description: "Created in Keystone Studio" },
                    appId
                );
            } catch {
                // DB not available, localStorage is the fallback
            }

            setCurrentAppId(appId);
            toast.dismiss(toastId);
            toast.success("Project saved!", {
                description: `"${appName}" saved. Open My Projects to load it later.`,
            });
        } catch (error) {
            console.error(error);
            toast.dismiss(toastId);
            toast.error("Failed to save project.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleLoadProject = (project: any) => {
        setAppName(project.name);
        setCurrentAppId(project.id);

        // Restore files
        const loadedFiles: Record<string, StudioFile> = {};
        if (project.code && project.code.files) {
            Object.entries(project.code.files).forEach(([name, file]: [string, any]) => {
                loadedFiles[name] = {
                    name,
                    content: file.content,
                    language: name.endsWith("json") ? "json" :
                        name.endsWith("css") ? "css" :
                            name.endsWith("rs") ? "rust" : "typescript"
                };
            });
        }
        setFiles(loadedFiles);
        toast.success(`Loaded "${project.name}"`);
    };

    // Ship Mini-App to Library
    const handleShip = async () => {
        setIsDeploying(true);
        const toastId = toast.loading("Shipping to Library...");

        try {
            const appId = currentAppId || "app_" + Math.random().toString(36).substring(2, 15);
            const creatorName = user?.info?.name || "Operator";

            const libraryEntry = {
                id: appId,
                name: appName,
                description: "Built in Keystone Studio by " + creatorName,
                code: {
                    files: Object.entries(files).reduce((acc, [name, file]) => ({
                        ...acc,
                        [name]: { content: file.content }
                    }), {} as Record<string, { content: string }>),
                },
                creatorWallet: localStorage.getItem("keystone_wallet_id") || creatorName,
                category: "utility",
                isPublished: false,
                version: "1.0.0",
                createdAt: Date.now(),
                updatedAt: Date.now(),
            };

            // Save to localStorage library
            const existing = JSON.parse(localStorage.getItem("keystone_library_apps") || "[]");
            const idx = existing.findIndex((a: { id: string }) => a.id === appId);
            if (idx >= 0) {
                existing[idx] = { ...libraryEntry, createdAt: existing[idx].createdAt };
            } else {
                existing.push(libraryEntry);
            }
            localStorage.setItem("keystone_library_apps", JSON.stringify(existing));

            // Also try saving to DB if available
            try {
                await saveProject(
                    libraryEntry.creatorWallet,
                    libraryEntry.code,
                    { name: appName, description: libraryEntry.description },
                    appId
                );
            } catch {
                // DB not available, localStorage is the fallback
            }

            setCurrentAppId(appId);

            toast.dismiss(toastId);
            toast.success("Shipped to Library!", {
                description: `"${appName}" is ready to launch.`,
                action: {
                    label: "Open Library",
                    onClick: () => window.location.href = "/app/library",
                },
            });

            setRuntimeLogs(prev => [...prev, `[System] Shipped "${appName}" to Library (${appId})`]);

        } catch (error: any) {
            toast.dismiss(toastId);
            toast.error(`Ship failed: ${error.message}`);
            console.error("Ship error:", error);
        } finally {
            setIsDeploying(false);
        }
    };

    const handleCompile = async () => {
        setIsCompiling(true);
        toast.loading("Compiling Anchor program...");
        try {
            const result = await compileProgram(files as any); // Type cast for now
            toast.dismiss();
            toast.success("Compilation complete! IDL generated.");

            // Add IDL to files so user can see it
            setFiles(prev => ({
                ...prev,
                "idl.json": {
                    name: "idl.json",
                    content: JSON.stringify(result.idl, null, 2),
                    language: "json"
                }
            }));

            // Mock buffer for now
            setProgramBuffer(Buffer.from("Mock Program Binary"));

        } catch (e) {
            toast.dismiss();
            toast.error("Compilation failed.");
        } finally {
            setIsCompiling(false);
        }
    };

    return (
        <div className="h-screen flex flex-col bg-background text-foreground selection:bg-primary/20 overflow-hidden min-h-0">
            {/* Studio Header */}
            <header className="h-12 border-b border-border bg-muted/40 flex items-center justify-between px-6 shrink-0">
                <div className="flex items-center gap-8">
                    <div className="flex items-center gap-3 pr-6 border-r border-border/60">
                        <div className="w-2 h-2 rounded-full bg-primary shadow-[0_0_10px_rgba(54,226,-123,0.5)]" />
                        <span className="text-[10px] font-black tracking-[0.2em] text-foreground/90 uppercase">
                            Keystone OS // Studio Node
                        </span>
                    </div>

                    <div className="flex items-center gap-3">
                        <Input
                            value={appName}
                            onChange={(e) => setAppName(e.target.value)}
                            className="h-7 w-48 text-[10px] font-black uppercase tracking-widest text-muted-foreground/80 bg-muted/20 border-border/40 focus:border-primary/40 focus:text-foreground px-2 rounded"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowWalletModal(true)}
                            className="h-8 gap-2 text-[10px] font-bold uppercase tracking-widest bg-muted/50 border-border/40 hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-all"
                        >
                            <Shield size={12} />
                            <span>Vault Keys</span>
                        </Button>
                    </div>

                    <div className="h-4 w-px bg-border/60" />

                    <div className="flex items-center gap-2.5 px-2">
                        <Avatar className="h-6 w-6 border border-primary/20">
                            <AvatarImage src={getAvatarUrl(user?.info?.name || "operator")} />
                            <AvatarFallback className="text-[10px] font-black">
                                {user?.info?.name?.charAt(0) || "U"}
                            </AvatarFallback>
                        </Avatar>
                        <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">
                            {user?.info?.name || "Operator"}
                        </span>
                    </div>

                    <div className="h-4 w-px bg-border/60" />

                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setShowProjectBrowser(true)} className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground">
                            <FolderOpen size={16} />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={handleSave} disabled={isSaving} className="h-8 text-[9px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground">
                            {isSaving ? "SAVING..." : "SAVE"}
                        </Button>
                        <Button
                            variant="default"
                            size="sm"
                            onClick={handleShip}
                            disabled={isDeploying}
                            className="h-8 text-[10px] font-black uppercase tracking-[0.2em] px-6 rounded-sm shadow-lg transition-all bg-primary hover:bg-primary/90 text-background shadow-primary/10"
                        >
                            {isDeploying ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : null}
                            {isDeploying ? "SHIPPING..." : "SHIP"}
                        </Button>
                    </div>
                </div>
            </header>

            {/* Main Studio Area */}
            <ResizablePanelGroup direction="horizontal" className="flex-1 overflow-hidden min-h-0">
                {/* Left Panel: AI Chat */}
                <ResizablePanel defaultSize={30} minSize={20} maxSize={50}>
                    <div className="h-full flex flex-col bg-muted/20 border-r border-border overflow-hidden min-h-0">
                        <div className="px-5 py-3 border-b border-border flex items-center justify-between bg-muted/10 shrink-0">
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-foreground/80">
                                AI ARCHITECT
                            </span>
                            <div className="flex items-center gap-2">
                                <div className="w-1 h-1 rounded-full bg-primary animate-pulse" />
                                <span className="text-[8px] font-black text-primary/60 tracking-widest uppercase">NODE ACTIVE</span>
                            </div>
                        </div>
                        <div className="flex-1 overflow-hidden min-h-0">
                            <PromptChat
                                onGenerate={handleAIGenerate}
                                isGenerating={isGenerating}
                                setIsGenerating={setIsGenerating}
                                userFiles={files}
                                runtimeLogs={runtimeLogs} // Pass logs to Architect
                            />
                        </div>
                    </div>
                </ResizablePanel>

                <ResizableHandle withHandle />

                {/* Middle Panel: Code Editor */}
                <ResizablePanel defaultSize={35} minSize={20}>
                    <div className="h-full flex flex-col bg-[#1e1e1e]">
                        {/* File Tabs */}
                        <div className="flex items-center gap-0.5 px-1 h-9 border-b border-zinc-800 bg-[#252526] shrink-0">
                            {Object.keys(files).map((fileName) => (
                                <button
                                    key={fileName}
                                    onClick={() => setActiveFile(fileName)}
                                    className={`group flex items-center gap-2.5 px-4 h-full text-[10px] font-bold uppercase tracking-wider transition-all relative ${activeFile === fileName
                                        ? "bg-[#1e1e1e] text-white border-x border-zinc-700/50 z-10 shadow-[0_-2px_10px_rgba(0,0,0,0.3)]"
                                        : "text-zinc-500 hover:text-zinc-300 hover:bg-[#2a2d2e]"
                                        }`}
                                >
                                    <div className="flex items-center justify-center shrink-0">
                                        <FileIcon fileName={fileName} active={activeFile === fileName} />
                                    </div>
                                    <span className="leading-none mt-[1px]">{fileName}</span>
                                    {activeFile === fileName && (
                                        <div className="absolute top-0 left-0 right-0 h-[2px] bg-primary animate-in fade-in slide-in-from-top-1 duration-300" />
                                    )}
                                </button>
                            ))}
                        </div>
                        <div className="flex-1 relative overflow-hidden bg-[#1e1e1e]">
                            <CodeEditor
                                code={files[activeFile]?.content || ""}
                                language={files[activeFile]?.language || "typescript"}
                                onChange={handleCodeChange}
                                fileName={activeFile}
                                allFiles={files}
                            />
                        </div>
                    </div>
                </ResizablePanel>

                <ResizableHandle withHandle />

                {/* Right Panel: Live Preview */}
                <ResizablePanel defaultSize={35} minSize={20}>
                    <div className="h-full flex flex-col bg-background">
                        {/* Preview Tabs */}
                        <div className="flex items-center gap-2 px-3 h-10 border-b border-border bg-muted/40 shrink-0">
                            <button
                                onClick={() => setActiveTab("preview")}
                                className={`flex items-center gap-2 px-5 h-7 text-[10px] font-black uppercase tracking-[0.2em] rounded transition-all ${activeTab === "preview"
                                    ? "bg-background text-primary shadow-[0_2px_8px_rgba(0,0,0,0.15)] border border-primary/20 scale-[1.05]"
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                                    }`}
                            >
                                <div className="flex items-center justify-center">
                                    <Eye size={14} strokeWidth={2.5} />
                                </div>
                                <span className="leading-none mt-[2px]">Preview</span>
                            </button>
                            <button
                                onClick={() => setActiveTab("code")}
                                className={`flex items-center gap-2 px-5 h-7 text-[10px] font-black uppercase tracking-[0.2em] rounded transition-all ${activeTab === "code"
                                    ? "bg-background text-primary shadow-[0_2px_8px_rgba(0,0,0,0.15)] border border-primary/20 scale-[1.05]"
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                                    }`}
                            >
                                <div className="flex items-center justify-center">
                                    <Terminal size={14} strokeWidth={2.5} />
                                </div>
                                <span className="leading-none mt-[2px]">Console</span>
                                {runtimeLogs.length > 0 && (
                                    <span className="ml-1 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                )}
                            </button>
                            <button
                                onClick={() => setActiveTab("contract")}
                                className={`flex items-center gap-2 px-5 h-7 text-[10px] font-black uppercase tracking-[0.2em] rounded transition-all ${activeTab === "contract"
                                    ? "bg-background text-primary shadow-[0_2px_8px_rgba(0,0,0,0.15)] border border-primary/20 scale-[1.05]"
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                                    }`}
                            >
                                <div className="flex items-center justify-center">
                                    <Cpu size={14} strokeWidth={2.5} />
                                </div>
                                <span className="leading-none mt-[2px]">Contracts</span>
                            </button>
                        </div>
                        <div className="flex-1 relative overflow-hidden">
                            {activeTab === "contract" ? (
                                <ContractEditor
                                    files={files}
                                    onCompile={handleCompile}
                                    isCompiling={isCompiling}
                                />
                            ) : (
                                <LivePreview
                                    files={files}
                                    tab={activeTab as "preview" | "code"}
                                    onLogsChange={(newLogs) => setRuntimeLogs(newLogs)}
                                    appId={currentAppId}
                                />
                            )}
                        </div>
                    </div>
                </ResizablePanel>
            </ResizablePanelGroup>

            <Dialog open={showWalletModal} onOpenChange={setShowWalletModal}>
                <DialogContent className="bg-transparent border-none p-0 max-w-sm [&>button]:text-zinc-400 [&>button]:hover:text-white [&>button]:top-4 [&>button]:right-4">
                    <div className="sr-only">
                        <DialogTitle>Secure Enclave Wallet</DialogTitle>
                        <DialogDescription>Initialize and establish your non-custodial Studio signer.</DialogDescription>
                    </div>
                    <WalletManager />
                </DialogContent>
            </Dialog>


            <ProjectBrowser
                userId="7KeY...StUdIo"
                isOpen={showProjectBrowser}
                onClose={() => setShowProjectBrowser(false)}
                onLoadProject={handleLoadProject}
                onNewProject={handleNewProject}
            />
        </div >
    );
}
