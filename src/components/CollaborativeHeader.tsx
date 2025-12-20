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
                                <Avatar className="h-8 w-8 ring-2 ring-[#36e27b] ring-offset-2 ring-offset-[#0B0C10] shadow-[0_0_10px_#36e27b44]">
                                    <AvatarImage src={getAvatarUrl(self.info?.name || "ME")} />
                                    <AvatarFallback className="bg-[#36e27b]/10 text-[#36e27b] font-bold text-xs">
                                        {self.info?.name?.substring(0, 2).toUpperCase() || "ME"}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="absolute bottom-0 right-0 h-2 w-2 rounded-full border border-[#0B0C10] bg-[#36e27b]" />
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
                                <Avatar className="h-8 w-8 ring-2 ring-white/5 ring-offset-2 ring-offset-[#0B0C10] hover:ring-[#36e27b]/40 transition-all">
                                    <AvatarImage src={getAvatarUrl(info?.name || "Collaborator")} />
                                    <AvatarFallback
                                        className="font-bold text-xs"
                                        style={{ backgroundColor: `${info?.color || '#36e27b'}22`, color: info?.color || '#36e27b' }}
                                    >
                                        {info?.name?.substring(0, 2).toUpperCase() || "??"}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="absolute bottom-0 right-0 h-2 w-2 rounded-full border border-[#0B0C10]" style={{ backgroundColor: info?.color || '#36e27b' }} />
                            </div>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">
                            <p>{info?.name || "Collaborator"}</p>
                        </TooltipContent>
                    </Tooltip>
                ))}
            </TooltipProvider>

            {others.length > 0 && (
                <div className="ml-4 text-[10px] uppercase font-black tracking-widest text-[#36e27b] animate-pulse">
                    Live Multiplayer Active
                </div>
            )}
        </div>
    );
};
