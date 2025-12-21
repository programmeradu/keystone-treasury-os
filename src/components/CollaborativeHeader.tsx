"use client";

import React from "react";
import { useOthers, useSelf } from "@/liveblocks.config";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getAvatarUrl } from "@/lib/avatars";

export const CollaborativeHeader = () => {
    const others = useOthers();
    const self = useSelf();

    return (
        <div className="flex items-center -space-x-2 overflow-hidden px-4">
            <TooltipProvider>
                {/* Active User (Self) */}
                {self && (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div className="relative inline-block">
                                <Avatar className="h-8 w-8 ring-2 ring-primary ring-offset-2 ring-offset-background shadow-[0_0_10px_var(--dashboard-accent-muted)]">
                                    <AvatarImage src={getAvatarUrl(self.info?.name || "ME")} />
                                    <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                                        {self.info?.name?.substring(0, 2).toUpperCase() || "ME"}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="absolute bottom-0 right-0 h-2 w-2 rounded-full border border-background bg-primary" />
                            </div>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">
                            <p>You ({self.info?.name || "Anonymous"})</p>
                        </TooltipContent>
                    </Tooltip>
                )}

                {/* Others */}
                {others.map(({ connectionId, info }) => (
                    <Tooltip key={connectionId}>
                        <TooltipTrigger asChild>
                            <div className="relative inline-block">
                                <Avatar className="h-8 w-8 ring-2 ring-border ring-offset-2 ring-offset-background hover:ring-primary/40 transition-all">
                                    <AvatarImage src={getAvatarUrl(info?.name || "Collaborator")} />
                                    <AvatarFallback
                                        className="font-bold text-xs"
                                        style={{ backgroundColor: `${info?.color || 'var(--dashboard-accent)'}22`, color: info?.color || 'var(--dashboard-accent)' }}
                                    >
                                        {info?.name?.substring(0, 2).toUpperCase() || "??"}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="absolute bottom-0 right-0 h-2 w-2 rounded-full border border-background" style={{ backgroundColor: info?.color || 'var(--dashboard-accent)' }} />
                            </div>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">
                            <p>{info?.name || "Collaborator"}</p>
                        </TooltipContent>
                    </Tooltip>
                ))}
            </TooltipProvider>

            {others.length > 0 && (
                <div className="ml-4 flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse shadow-[0_0_8px_var(--dashboard-accent)]" />
                    <div className="text-[10px] uppercase font-black tracking-[0.2em] text-primary">
                        LIVE MATES
                    </div>
                </div>
            )}
        </div>
    );
};
