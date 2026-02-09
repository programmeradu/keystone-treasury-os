import React from "react";
import { Star, Zap, Shield, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";
import { getAvatarUrl } from "@/lib/avatars";

interface MiniAppCardProps {
    app: {
        id: string;
        name: string;
        description: string;
        priceUsdc: number;
        rating?: number;
        installs: number;
        creatorWallet: string;
        category: string;
        iconUrl?: string;
    };
    onInstall?: () => void;
}

export function MiniAppCard({ app, onInstall }: MiniAppCardProps) {
    return (
        <div className="group relative flex flex-col p-6 rounded-2xl border border-border/40 bg-card/10 backdrop-blur-md overflow-hidden transition-all duration-300 hover:border-primary/50 hover:bg-card/20 hover:shadow-[0_0_30px_rgba(54,226,123,0.15)] hover:-translate-y-1">

            {/* Ambient Glow Effect */}
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors" />

            <div className="relative z-10 flex flex-col h-full">
                <div className="flex justify-between items-start mb-5">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-white/10 to-transparent border border-white/5 flex items-center justify-center shrink-0 shadow-inner group-hover:scale-110 transition-transform duration-300 overflow-hidden">
                        <Avatar className="h-full w-full rounded-2xl">
                            <AvatarImage src={app.iconUrl || `https://api.dicebear.com/7.x/shapes/svg?seed=${app.id}`} />
                            <AvatarFallback><Zap size={24} className="text-primary" /></AvatarFallback>
                        </Avatar>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                        {app.priceUsdc === 0 ? (
                            <span className="px-2 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-black uppercase tracking-wider text-emerald-400">
                                FREE
                            </span>
                        ) : (
                            <span className="px-2 py-1 rounded-md bg-primary/10 border border-primary/20 text-[10px] font-black uppercase tracking-wider text-primary shadow-[0_0_8px_rgba(54,226,123,0.2)]">
                                {app.priceUsdc} SOL
                            </span>
                        )}
                        <Badge variant="outline" className="text-[9px] font-mono opacity-50 border-white/10 uppercase tracking-widest">
                            {app.category}
                        </Badge>
                    </div>
                </div>

                <div className="mb-4">
                    <h3 className="text-lg font-black tracking-tight group-hover:text-primary transition-colors cursor-pointer">
                        {app.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1.5 opacity-60">
                        <div className="flex items-center gap-0.5 text-orange-400">
                            <Star size={10} fill="currentColor" />
                            <span className="text-[11px] font-bold ml-1 text-foreground">{app.rating?.toFixed(1) || "New"}</span>
                        </div>
                        <span className="text-[10px]">•</span>
                        <span className="text-[11px] font-mono">{app.installs.toLocaleString()} users</span>
                    </div>
                </div>

                <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed mb-6 font-medium">
                    {app.description}
                </p>

                <div className="mt-auto pt-4 border-t border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6 ring-2 ring-transparent group-hover:ring-white/10 transition-all">
                            <AvatarImage src={getAvatarUrl(app.creatorWallet)} />
                            <AvatarFallback>C</AvatarFallback>
                        </Avatar>
                        <span className="text-[10px] font-mono text-muted-foreground group-hover:text-foreground transition-colors uppercase tracking-wider">
                            {app.creatorWallet.slice(0, 4)}...{app.creatorWallet.slice(-4)}
                        </span>
                    </div>

                    <Link href={`/app/marketplace/${app.id}`}>
                        <Button size="sm" variant="ghost" className="h-8 px-0 text-xs font-bold uppercase tracking-widest hover:text-primary hover:bg-transparent group/btn icon-glow transition-all">
                            Details <ChevronRight size={14} className="ml-1 group-hover/btn:translate-x-1 transition-transform" />
                        </Button>
                    </Link>
                </div>
            </div>
        </div>
    );
}
