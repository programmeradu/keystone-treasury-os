"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { XIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export function PremiumModal({
    isOpen,
    onClose,
    children,
    className,
    showCloseButton = true,
}: {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
    className?: string;
    showCloseButton?: boolean;
}) {
    return (
        <DialogPrimitive.Root open={isOpen} onOpenChange={(val) => { if (!val) onClose(); }}>
            <AnimatePresence>
                {isOpen && (
                    <DialogPrimitive.Portal forceMount>
                        <DialogPrimitive.Overlay asChild>
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.3 }}
                                className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
                            />
                        </DialogPrimitive.Overlay>
                        <DialogPrimitive.Content asChild>
                            <motion.div
                                initial={{ opacity: 0, scale: 0.96, y: 15 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.96, y: 10 }}
                                transition={{ type: "spring", damping: 25, stiffness: 400 }}
                                className={cn(
                                    "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 p-0 shadow-[0_0_80px_rgba(0,0,0,0.4)] outline-none overflow-hidden",
                                    "bg-background/40 backdrop-blur-2xl border border-white/10 rounded-2xl",
                                    className
                                )}
                            >
                                {/* Premium Glow Effects */}
                                <div className="absolute top-0 right-0 -mt-24 -mr-24 w-48 h-48 bg-primary/20 rounded-full blur-[60px] pointer-events-none" />
                                <div className="absolute bottom-0 left-0 -mb-24 -ml-24 w-48 h-48 bg-purple-500/20 rounded-full blur-[60px] pointer-events-none" />

                                {/* Content Container */}
                                <div className="relative z-10 p-6 max-h-[85vh] overflow-y-auto scrollbar-transparent">
                                    {children}
                                </div>

                                {/* Close Button */}
                                {showCloseButton && (
                                    <DialogPrimitive.Close className="absolute right-4 top-4 z-20 rounded-full p-2 bg-black/20 hover:bg-black/40 border border-white/5 opacity-70 transition-all hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
                                        <XIcon className="h-4 w-4 text-white" />
                                        <span className="sr-only">Close</span>
                                    </DialogPrimitive.Close>
                                )}
                            </motion.div>
                        </DialogPrimitive.Content>
                    </DialogPrimitive.Portal>
                )}
            </AnimatePresence>
        </DialogPrimitive.Root>
    );
}

export function PremiumModalHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return <div className={cn("flex flex-col gap-1.5 text-center sm:text-left mb-6", className)} {...props} />;
}

export function PremiumModalFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return <div className={cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end mt-8 pt-4 border-t border-white/10", className)} {...props} />;
}

export function PremiumModalTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
    return <h2 className={cn("text-xl font-bold tracking-tight text-white", className)} {...props} />;
}

export function PremiumModalDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
    return <p className={cn("text-[13px] text-white/60 leading-relaxed font-medium", className)} {...props} />;
}
