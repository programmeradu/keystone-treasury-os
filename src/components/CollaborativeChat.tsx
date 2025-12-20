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
        <div className="flex flex-col h-[400px] bg-[#0f1115] border border-white/5 rounded-2xl overflow-hidden glass-morphism">
            {/* Header */}
            <div className="p-4 border-b border-white/5 flex items-center justify-between">
                <h3 className="text-white font-bold uppercase tracking-tighter flex items-center gap-2">
                    <MessageSquare size={16} className="text-[#36e27b]" />
                    Team Comms
                </h3>
                <span className="text-[10px] text-[#9eb7a8] uppercase font-bold bg-white/5 px-2 py-1 rounded">Live Sync</span>
            </div>

            {/* Messages */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar"
            >
                {messages?.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2">
                        <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-[#9eb7a8]">
                            <MessageSquare size={20} />
                        </div>
                        <p className="text-[10px] text-[#9eb7a8] uppercase font-bold">No messages matching current frequency</p>
                    </div>
                ) : (
                    messages?.map((msg, idx) => (
                        <div key={idx} className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] text-[#36e27b] font-bold uppercase">{msg.sender}</span>
                                <span className="text-[9px] text-white/20 font-black">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <p className="text-sm text-white/80 bg-white/5 p-2 rounded-lg border border-white/5 inline-block max-w-[90%]">
                                {msg.text}
                            </p>
                        </div>
                    ))
                )}
            </div>

            {/* Input */}
            <div className="p-4 border-t border-white/5 bg-black/20">
                <div className="flex gap-2">
                    <Input
                        placeholder="Broadcast message..."
                        className="h-9 bg-black/40 border-white/10 text-white placeholder:text-white/20 rounded-lg text-xs"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSend()}
                    />
                    <Button
                        size="icon"
                        className="h-9 w-9 bg-[#36e27b] text-[#0B0C10] hover:bg-[#25a85c]"
                        onClick={handleSend}
                    >
                        <Send size={14} />
                    </Button>
                </div>
            </div>
        </div>
    );
};
