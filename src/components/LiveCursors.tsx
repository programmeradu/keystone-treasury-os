"use client";

import React from "react";
import { useOthers, useUpdateMyPresence } from "@/liveblocks.config";
import { motion, AnimatePresence } from "framer-motion";

export const LiveCursors = () => {
    const others = useOthers();
    const updateMyPresence = useUpdateMyPresence();

    return (
        <div
            className="absolute inset-0 pointer-events-none z-[100] overflow-hidden"
            onPointerMove={(e) => {
                updateMyPresence({
                    cursor: { x: Math.round(e.clientX), y: Math.round(e.clientY) },
                });
            }}
            onPointerLeave={() => {
                updateMyPresence({ cursor: null });
            }}
        >
            <AnimatePresence>
                {others.map(({ connectionId, presence, info }) => {
                    if (!presence?.cursor) return null;

                    return (
                        <motion.div
                            key={connectionId}
                            className="absolute top-0 left-0"
                            initial={{ opacity: 0 }}
                            animate={{
                                opacity: 1,
                                x: presence.cursor.x,
                                y: presence.cursor.y,
                            }}
                            exit={{ opacity: 0 }}
                            transition={{
                                type: "spring",
                                damping: 30,
                                mass: 0.8,
                                stiffness: 350,
                            }}
                        >
                            <CursorSVG color={info?.color || "#36e27b"} />
                            {info?.name && (
                                <div
                                    className="ml-4 px-2 py-0.5 rounded-full text-[10px] font-bold text-white shadow-lg whitespace-nowrap"
                                    style={{ backgroundColor: info.color || "#36e27b" }}
                                >
                                    {info.name}
                                </div>
                            )}
                        </motion.div>
                    );
                })}
            </AnimatePresence>
        </div>
    );
};

const CursorSVG = ({ color }: { color: string }) => (
    <svg
        width="24"
        height="36"
        viewBox="0 0 24 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
    >
        <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M5.65376 12.3755H5.46026L5.31717 12.5076L0.500002 16.9516L0.500002 0.500002L12.5039 12.5039H5.65376V12.3755Z"
            fill={color}
        />
    </svg>
);
