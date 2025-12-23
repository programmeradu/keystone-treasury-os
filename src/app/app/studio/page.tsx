"use client";

import React, { useState, useCallback } from "react";
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
import { toast } from "sonner";
import { ProjectBrowser } from "@/components/studio/ProjectBrowser";

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

export default function StudioPage() {
    const user = useSelf();
    const [appName, setAppName] = useState("Untitled Mini-App");
    const [files, setFiles] = useState<Record<string, StudioFile>>({
        "App.tsx": {
            name: "App.tsx",
            content: `export default function App() {
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-lg shadow-emerald-400/50 animate-pulse"></div>
        <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">System Ready</span>
      </div>
      
      <h1 className="text-4xl font-bold tracking-tight mb-4 text-white">
        Keystone <span className="text-emerald-400">Architect</span> Node
      </h1>
      
      <p className="text-zinc-400 max-w-2xl mb-12 leading-relaxed text-lg">
        You have successfully initialized the Treasury OS construction environment.
        Use the AI Architect to synthesize custom mini-apps or build directly on the Keystone kernel.
      </p>
      
      <div className="grid md:grid-cols-2 gap-6 mb-12">
        <div className="p-8 rounded-2xl border border-zinc-800 bg-zinc-900/40 backdrop-blur-sm hover:border-emerald-400/30 transition-all duration-300 group">
          <div className="text-emerald-400 text-xs font-black uppercase tracking-[0.2em] mb-3 group-hover:translate-x-1 transition-transform">Protocol Synthesis</div>
          <p className="text-zinc-500 text-sm leading-relaxed">Direct integration with Jupiter, Marinade, and Squads for complex DeFi operations.</p>
        </div>
        
        <div className="p-8 rounded-2xl border border-zinc-800 bg-zinc-900/40 backdrop-blur-sm hover:border-emerald-400/30 transition-all duration-300 group">
          <div className="text-emerald-400 text-xs font-black uppercase tracking-[0.2em] mb-3 group-hover:translate-x-1 transition-transform">Treasury Logic</div>
          <p className="text-zinc-500 text-sm leading-relaxed">Multisig-native vaults, asset streaming, and role-based access control systems.</p>
        </div>
        
        <div className="p-8 rounded-2xl border border-zinc-800 bg-zinc-900/40 backdrop-blur-sm hover:border-emerald-400/30 transition-all duration-300 group">
          <div className="text-emerald-400 text-xs font-black uppercase tracking-[0.2em] mb-3 group-hover:translate-x-1 transition-transform">Real-time Automation</div>
          <p className="text-zinc-500 text-sm leading-relaxed">Event-driven triggers, scheduled operations, and autonomous strategy execution.</p>
        </div>
        
        <div className="p-8 rounded-2xl border border-zinc-800 bg-zinc-900/40 backdrop-blur-sm hover:border-emerald-400/30 transition-all duration-300 group">
          <div className="text-emerald-400 text-xs font-black uppercase tracking-[0.2em] mb-3 group-hover:translate-x-1 transition-transform">Interface Architect</div>
          <p className="text-zinc-500 text-sm leading-relaxed">Generate custom dashboards, monitoring widgets, and operational interfaces.</p>
        </div>
      </div>
      
      <div className="text-center text-zinc-600 text-[10px] font-bold uppercase tracking-[0.3em] pt-12 border-t border-zinc-900/50">
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
        "keystone.ts": {
            name: "keystone.ts",
            content: `// Keystone Node API Definitions
export const useVault = () => ({
  activeVault: "Main Portfolio",
  balances: { SOL: 124.5, USDC: 5400.2 },
  tokens: [
    { symbol: "SOL", name: "Solana", balance: 124.5, price: 23.40 },
    { symbol: "USDC", name: "USD Coin", balance: 5400.2, price: 1.00 }
  ]
});

export const useTurnkey = () => ({
  getPublicKey: async () => "7KeY...StUdIo",
  signTransaction: async (tx: any) => {
     console.log("[Turnkey] Signing transaction...", tx);
     return "signed_tx_placeholder";
  }
});

export const AppEventBus = {
  emit: (type: string, payload: any) => console.log(\`[EventBus] \${type}\`, payload)
};`,
            language: "typescript",
        },
    });
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
        if (!user?.info?.name) {
            toast.error("Please connect wallet to save.");
            return;
        }

        setIsSaving(true);
        const toastId = toast.loading("Saving to secure enclave...");

        try {
            // Transform files to satisfy ProjectCode interface
            const projectCode = {
                files: Object.entries(files).reduce((acc, [name, file]) => ({
                    ...acc,
                    [name]: { content: file.content }
                }), {})
            };

            const result = await saveProject(
                "7KeY...StUdIo", // Mock User ID for now (until Auth is fully integrated)
                projectCode,
                { name: appName, description: "Created in Keystone Studio" },
                currentAppId
            );

            if (result.success && result.appId) {
                setCurrentAppId(result.appId);
                toast.success("Project saved successfully!");
            } else {
                throw new Error(result.error || "Unknown error");
            }
            toast.dismiss(toastId);
        } catch (error) {
            console.error(error);
            toast.error("Failed to save project.");
            toast.dismiss(toastId);
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

    // Deploy logic (mocked for now, will connect to Turnkey later)
    // Deploy logic
    const handleDeploy = async () => {
        if (!programBuffer) {
            toast.error("Please compile the contract first.");
            return;
        }

        setIsDeploying(true);
        const toastId = toast.loading("Deploying to Solana Devnet...");

        try {
            // Get wallet address
            const walletId = localStorage.getItem("keystone_wallet_id");
            if (!walletId) {
                throw new Error("No wallet connected. Please create or select a Vault.");
            }

            // We use a dummy address for now if not fully connected, or we need to get it from Turnkey
            // For this demo, let's assume we have it or fetch it. 
            // In a real app we'd have the address in state from WalletManager.
            const walletAddress = "7KeY...StUdIo"; // Placeholder until connected

            // Mock Connection
            const { Connection } = await import("@solana/web3.js");
            const connection = new Connection("https://api.devnet.solana.com", "confirmed");

            // Import dynamically to avoid SSR issues if any
            const { deployProgram } = await import("@/lib/studio/solana-playground");

            const programId = await deployProgram(connection, walletAddress, programBuffer);

            toast.dismiss(toastId);
            toast.success(`Deployment successful! Program ID: ${programId}`);

            // Log to console
            setRuntimeLogs(prev => [...prev, `[System] Program Deployed: ${programId}`]);

        } catch (error: any) {
            toast.dismiss(toastId);
            toast.error(`Deployment failed: ${error.message}`);
            console.error("Deployment error:", error);
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
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 px-2 py-0.5 border border-border/40 rounded bg-muted/20">
                            {appName}
                        </span>
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
                            onClick={handleDeploy}
                            disabled={!programBuffer}
                            className={`h-8 text-[10px] font-black uppercase tracking-[0.2em] px-6 rounded-sm shadow-lg transition-all ${programBuffer
                                ? "bg-primary hover:bg-primary/90 text-background shadow-primary/10"
                                : "bg-muted text-muted-foreground cursor-not-allowed"
                                }`}
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
            />
        </div >
    );
}
