"use client";

import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowUp, Activity, Loader2, Terminal, Cpu } from "lucide-react";
import { Logo, ArchitectIcon } from "@/components/icons";
import { getAvatarUrl } from "@/lib/avatars";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useSelf } from "@/liveblocks.config";
import { cn } from "@/lib/utils";

interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
    timestamp: Date;
    codeGenerated?: boolean;
}

interface PromptChatProps {
    onGenerate: (files: Record<string, string>) => void;
    isGenerating: boolean;
    setIsGenerating: (value: boolean) => void;
    userFiles: Record<string, any>; // Pass current state
    runtimeLogs?: string[]; // Optional runtime context
}

export function PromptChat({ onGenerate, isGenerating, setIsGenerating, userFiles, runtimeLogs }: PromptChatProps) {
    const user = useSelf();
    const [input, setInput] = useState("");
    const [messages, setMessages] = useState<Message[]>([
        {
            id: "welcome",
            role: "assistant",
            content: "Architect initialized. Direct sequence active.\n\nCapabilities:\n• Protocol Synthesizer\n• Treasury Logic Constructor\n• Interface Architect\n\nAwaiting specifications...",
            timestamp: new Date(),
        },
    ]);
    const scrollRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [isResearching, setIsResearching] = useState(false);
    const [useDeepResearch, setUseDeepResearch] = useState(false);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSubmit = async () => {
        if (!input.trim() || isGenerating) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            role: "user",
            content: input.trim(),
            timestamp: new Date(),
        };

        setMessages((prev) => [...prev, userMessage]);
        setInput("");
        setIsGenerating(true);

        // Add thinking message
        const thinkingId = (Date.now() + 1).toString();
        setMessages((prev) => [
            ...prev,
            {
                id: thinkingId,
                role: "assistant",
                content: useDeepResearch ? "Initiating deep research protocol..." : "Analyzing request parameters...",
                timestamp: new Date(),
            },
        ]);

        let researchContext = "";

        try {
            // 1. Conduct Research if enabled
            if (useDeepResearch) {
                setIsResearching(true);
                setMessages((prev) => prev.map(m => m.id === thinkingId ? { ...m, content: "Scanning decentralized protocols..." } : m));

                const researchRes = await fetch("/api/agent/knowledge", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ query: userMessage.content }),
                });

                if (researchRes.ok) {
                    const researchData = await researchRes.json();
                    researchContext = `\n\n[RESEARCH CONTEXT based on: ${researchData.query}]\nSummary: ${researchData.summary}\nTechnical Reference: ${researchData.rawContent}`;

                    setMessages((prev) => prev.map(m => m.id === thinkingId ? {
                        ...m,
                        content: `Research complete. Found data sources: ${researchData.sources.map((s: any) => s.title).join(", ")}.\nSynthesizing implementation plan...`
                    } : m));
                }
            }

            // 2. Generate Code

            // Prepare Runtime Context
            let runtimeContext = "";
            if (runtimeLogs && runtimeLogs.length > 0) {
                const recentLogs = runtimeLogs.slice(-20).join('\n');
                runtimeContext = `\n\n[RUNTIME LOGS (Console Output)]\n${recentLogs}`;
            }

            const response = await fetch("/api/studio/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    prompt: userMessage.content + researchContext + runtimeContext,
                    contextFiles: userFiles
                }),
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                console.error("API Error Details:", errData);
                throw new Error(errData.details || errData.error || "Failed to generate code");
            }

            const data = await response.json();

            // Update thinking message with result
            setMessages((prev) =>
                prev.map((m) =>
                    m.id === thinkingId
                        ? {
                            ...m,
                            content: `Generation complete. ${Object.keys(data.files || {}).length} module(s) synthesized.\n\n${data.explanation || "Preview environment updated."}`,
                            codeGenerated: true,
                        }
                        : m
                )
            );

            if (data.files) {
                // Check for Smart Contract files (.rs)
                const hasContract = Object.keys(data.files).some(f => f.endsWith(".rs"));
                if (hasContract) {
                    console.log("[PromptChat] Smart Contract detected. Triggering Compiler Service...");
                    // In next steps, we will call onCompile(data.files) or switch tab
                }
                onGenerate(data.files);
            }
        } catch (error) {
            console.error("PromptChat Error:", error);
            setMessages((prev) =>
                prev.map((m) =>
                    m.id === thinkingId
                        ? {
                            ...m,
                            content: `Generation failed. System error.\n\n${error instanceof Error ? error.message : "Unknown error"}`,
                        }
                        : m
                )
            );
        } finally {
            setIsGenerating(false);
            setIsResearching(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    return (
        <div className="flex flex-col h-full min-h-0">
            {/* Messages */}
            <ScrollArea className="flex-1 p-3 scrollbar-thin min-h-0" ref={scrollRef}>
                <div className="space-y-4">
                    {messages.map((message) => (
                        <div
                            key={message.id}
                            className={cn(
                                "flex gap-2",
                                message.role === "user" ? "justify-end" : "justify-start"
                            )}
                        >
                            {message.role === "assistant" && (
                                <div className="w-6 h-6 flex items-center justify-center shrink-0">
                                    <ArchitectIcon size={14} />
                                </div>
                            )}
                            <div
                                className={cn(
                                    "max-w-[88%] rounded-xl px-4 py-3 text-[13px] leading-relaxed shadow-sm",
                                    message.role === "user"
                                        ? "bg-primary text-background font-bold tracking-tight"
                                        : "bg-muted/20 text-foreground border border-border/40 font-medium",
                                    message.codeGenerated && "border-primary/40 bg-primary/5 text-primary shadow-[0_0_20px_rgba(54,226,123,0.05)] font-bold tracking-tight"
                                )}
                            >
                                <pre className="whitespace-pre-wrap font-sans">
                                    {message.content}
                                </pre>
                            </div>
                            {message.role === "user" && (
                                <Avatar className="h-6 w-6 shrink-0 border border-border">
                                    <AvatarImage src={getAvatarUrl(user?.info?.name || "User")} />
                                    <AvatarFallback className="text-[8px] font-bold">
                                        {user?.info?.name?.charAt(0) || "U"}
                                    </AvatarFallback>
                                </Avatar>
                            )}
                        </div>
                    ))}
                </div>
            </ScrollArea>

            {/* Input */}
            <div className="p-3 border-t border-border">
                <div className="relative">
                    <Textarea
                        ref={textareaRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Describe what you want to build..."
                        disabled={isGenerating}
                        className="resize-none pr-12 min-h-[80px] bg-background/50 pl-12"
                        rows={3}
                    />

                    <Button
                        size="icon"
                        variant="ghost"
                        className={cn(
                            "absolute top-2 left-2 h-8 w-8 transition-colors",
                            useDeepResearch ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground"
                        )}
                        onClick={() => setUseDeepResearch(!useDeepResearch)}
                        title="Enable Deep Research"
                    >
                        <Cpu size={16} className={cn(useDeepResearch && "animate-pulse")} />
                    </Button>
                    <Button
                        size="icon"
                        className="absolute bottom-2 right-2 h-8 w-8"
                        onClick={handleSubmit}
                        disabled={!input.trim() || isGenerating}
                    >
                        {isGenerating ? (
                            <Loader2 size={14} className="animate-spin" />
                        ) : (
                            <ArrowUp size={14} />
                        )}
                    </Button>
                </div>
                <p className="text-[9px] text-muted-foreground mt-4 text-center font-bold tracking-[0.1em] uppercase opacity-40">
                    <Activity size={10} className="inline mr-2 text-primary" />
                    KeyStone Engine Active
                </p>
            </div>
        </div>
    );
}
