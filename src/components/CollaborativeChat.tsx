"use client";

import React, { useState, useRef, useEffect } from "react";
import { useStorage, useMutation, useSelf } from "@/liveblocks.config";
import { MessageSquare, Send, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const CollaborativeChat = () => {
    const [message, setMessage] = useState("");
    const messages = useStorage((root) => root.chatMessages);
    const self = useSelf();
    const scrollRef = useRef<HTMLDivElement>(null);

    const sendMessage = useMutation(({ storage }, text: string, sender: string) => {
        const chat = storage.get("chatMessages");
        chat.push({
            text,
            sender,
            timestamp: Date.now(),
        });
    }, []);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = () => {
        if (!message.trim()) return;
        sendMessage(message, self?.info?.name || "Anonymous");
        setMessage("");
    };

    return (
        <div className="flex flex-col h-[400px] bg-card border border-border rounded-2xl overflow-hidden glass-morphism shadow-sm">
            {/* Header */}
            <div className="p-4 border-b border-border flex items-center justify-between">
                <h3 className="text-foreground font-black uppercase tracking-widest flex items-center gap-2 text-xs">
                    <MessageSquare size={16} className="text-primary" />
                    Team Comms
                </h3>
                <span className="text-[10px] text-muted-foreground uppercase font-black bg-muted px-2 py-1 rounded tracking-widest">Live Sync</span>
            </div>

            {/* Messages */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar"
            >
                {messages?.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2">
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground border border-border">
                            <MessageSquare size={20} />
                        </div>
                        <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest italic">No messages matching current frequency</p>
                    </div>
                ) : (
                    messages?.map((msg, idx) => (
                        <div key={idx} className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] text-primary font-black uppercase">{msg.sender}</span>
                                <span className="text-[9px] text-muted-foreground/40 font-black">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <p className="text-sm text-foreground/80 bg-muted/30 p-2 rounded-lg border border-border inline-block max-w-[95%] font-black uppercase tracking-tight text-[11px]">
                                {msg.text}
                            </p>
                        </div>
                    ))
                )}
            </div>

            {/* Input */}
            <div className="p-4 border-t border-border bg-background/50">
                <div className="flex gap-2">
                    <Input
                        placeholder="Broadcast message..."
                        className="h-9 bg-muted/40 border-border text-foreground placeholder:text-muted-foreground/30 rounded-lg text-xs font-black uppercase tracking-widest"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSend()}
                    />
                    <Button
                        size="icon"
                        className="h-9 w-9 bg-primary text-primary-foreground hover:opacity-90 shadow-sm transition-all"
                        onClick={handleSend}
                    >
                        <Send size={14} />
                    </Button>
                </div>
            </div>
        </div>
    );
};
