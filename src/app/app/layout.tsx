"use client";

import { RoomProvider } from "@/liveblocks.config";
import { LiveList } from "@liveblocks/client";
import { LiveCursors } from "@/components/LiveCursors";
import { CollaborativeHeader } from "@/components/CollaborativeHeader";
import { WalletButton } from "@/components/WalletButton";
import { Suspense, useEffect, useRef, useState } from "react";
import { useSelf } from "@/liveblocks.config";
import { getAvatarUrl } from "@/lib/avatars";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { WalletCards, PieChart, Users, Settings, Database, LayoutGrid, ArchitectIcon } from "@/components/icons";
import { DreyvMark } from "@/components/brand/dreyv-mark";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CommandBar } from "@/components/CommandBar";
import { VaultStatusBar } from "@/components/VaultStatusBar";
import { useAppEvent } from "@/lib/events";
import { ThemeProvider, useTheme } from "@/lib/contexts/ThemeContext";
import { Sun, Moon, ShoppingBag, Library, LogOut } from "lucide-react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { useKeystoneAuth } from "@/hooks/useKeystoneAuth";
import { authClient } from "@/lib/auth/client";
import { useWallet } from "@solana/wallet-adapter-react";
import { useProfile } from "@/lib/hooks/useProfile";
import { useVault } from "@/lib/contexts/VaultContext";

function AppLayoutContent({ children }: { children: React.ReactNode }) {
    const { theme } = useTheme();
    const router = useRouter();
    const pathname = usePathname();

    useAppEvent((event) => {
        if (event.type === "NAVIGATE" && event.payload) {
            router.push(event.payload);
        }
    });

    // Lazy sync Neon Auth user to DB on first load
    const syncedRef = useRef(false);
    useEffect(() => {
        if (syncedRef.current) return;
        syncedRef.current = true;
        fetch('/api/auth/sync', { method: 'POST' }).catch(() => {});
    }, []);

    return (
        <div
            className="flex bg-background font-sans text-foreground overflow-hidden h-screen selection:bg-[#36e27b] selection:text-[#0B0C10] dashboard-theme relative"
            data-theme={theme}
        >
            <Suspense fallback={null}>
                <LiveCursors />
            </Suspense>

            {/* Side Navigation (Slim Rail - Auto-fit, No Scroll) */}
            <nav className="flex flex-col items-center w-20 h-full py-3 border-r border-border bg-sidebar z-50 shrink-0 select-none">
                <Link href="/" className="mb-2 p-1.5 rounded-xl bg-violet-500/5 border border-violet-500/20 flex items-center justify-center shadow-[0_0_15px_rgba(139,92,246,0.12)] hover:scale-105 transition-transform group shrink-0">
                    <DreyvMark size={34} className="group-hover:drop-shadow-[0_0_10px_rgba(139,92,246,0.45)] transition-all" />
                </Link>

                <TooltipProvider>
                    {/* Navigation Items Container - Flex Grow to fill space, Center aligned */}
                    <div className="flex-1 flex flex-col items-center justify-center w-full px-3 gap-1.5 min-h-0">
                        <div className="flex flex-col gap-1.5 w-full items-center justify-center overflow-y-auto scrollbar-none">
                            <NavButton icon={LayoutGrid} label="Dashboard" href="/app" active={pathname === "/app"} />
                            <NavButton icon={ArchitectIcon} label="Studio" href="/app/studio" active={pathname?.startsWith("/app/studio")} />
                            <NavButton icon={ShoppingBag} label="Marketplace" href="/app/marketplace" active={pathname?.startsWith("/app/marketplace")} />
                            <NavButton icon={Library} label="Library" href="/app/library" active={pathname?.startsWith("/app/library")} />
                            <NavButton icon={WalletCards} label="Treasury" href="/app/treasury" active={pathname === "/app/treasury"} />
                            <NavButton icon={PieChart} label="Analytics" href="/app/analytics" active={pathname === "/app/analytics"} />
                            <NavButton icon={Users} label="Team" href="/app/team" active={pathname === "/app/team"} />
                            <NavButton icon={Settings} label="Settings" href="/app/settings" active={pathname === "/app/settings"} />
                        </div>

                        <div className="my-1 border-t border-border opacity-50 w-8 shrink-0" />
                        <VaultStatusBar />
                        <ThemeToggle />
                    </div>
                </TooltipProvider>

                <div className="mt-2 mb-2 shrink-0">
                    <Suspense fallback={<div className="w-10 h-10 rounded-full bg-white/5 animate-pulse" />}>
                        <UserAccount />
                    </Suspense>
                </div>
            </nav>

            {/* Main Content */}
            <main className="flex-1 flex flex-col h-full relative overflow-hidden">
                {/* Ambient Bg Glow */}
                <div className={`absolute top-[-20%] right-[-10%] w-[600px] h-[600px] ${theme === 'light' ? 'bg-green-500/10' : 'bg-[#36e27b]/5'} rounded-full blur-[120px] pointer-events-none`} />
                <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[120px] pointer-events-none" />

                <Suspense fallback={
                    <div className="flex-1 flex items-center justify-center">
                        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                }>
                    {children}
                </Suspense>

                {/* Floating Command Bar */}
                <CommandBar />
            </main>
        </div>
    );
}

function useRoomId() {
    const [roomId, setRoomId] = useState<string | null>(null);
    const { user: siwsUser } = useKeystoneAuth();
    const { activeVault } = useVault();

    useEffect(() => {
        // Tie Liveblocks presence directly to the active Multisig Vault
        if (activeVault) {
            setRoomId(`vault:${activeVault}`);
            return;
        }

        // If no vault is selected, fallback to their personal ID
        if (siwsUser?.id) {
            setRoomId(`user:${siwsUser.id}`);
            return;
        }

        authClient.getSession().then((session) => {
            const userId = session.data?.user?.id;
            if (userId && !activeVault) {
                setRoomId(`user:${userId}`);
            }
        });
    }, [siwsUser, activeVault]);

    return roomId;
}

export default function AppLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <ThemeProvider>
            <AppLayoutWithRoom>{children}</AppLayoutWithRoom>
        </ThemeProvider>
    );
}

function AppLayoutWithRoom({ children }: { children: React.ReactNode }) {
    const roomId = useRoomId();

    if (!roomId) {
        return (
            <div className="flex items-center justify-center h-screen bg-background">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <RoomProvider
            id={roomId}
            initialPresence={{ cursor: null }}
            initialStorage={{
                teamNotes: "",
                chatMessages: new LiveList([])
            }}
        >
            <AppLayoutContent>{children}</AppLayoutContent>
        </RoomProvider>
    );
}

function NavButton({ icon: Icon, label, href, active }: { icon: any, label: string, href: string, active?: boolean }) {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <Link
                    href={href}
                    className={`group flex flex-col items-center justify-center gap-1 w-11 h-11 rounded-xl transition-all duration-300 border border-transparent shrink-0
                  ${active
                            ? 'bg-primary/10 text-primary border-primary/20 shadow-[0_0_10px_var(--dashboard-accent-muted)]'
                            : 'bg-muted text-muted-foreground hover:bg-primary/20 hover:text-foreground'}`}
                >
                    <Icon strokeWidth={active ? 2.5 : 2} size={20} />
                </Link>
            </TooltipTrigger>
            <TooltipContent side="right">
                <p>{label}</p>
            </TooltipContent>
        </Tooltip>

    )
}

function UserAccount() {
    const self = useSelf();
    const { signOut: siwsSignOut } = useKeystoneAuth();
    const { disconnect } = useWallet();
    const router = useRouter();
    const { profile } = useProfile();

    const handleLogout = async () => {
        try {
            await siwsSignOut();
        } catch {}
        try {
            await authClient.signOut();
        } catch {}
        try {
            await disconnect();
        } catch {}
        router.push("/auth");
    };

    const fallbackName = self?.info?.name || "User";

    // Read from DB-backed profile API (replaces localStorage)
    const displayName = profile?.displayName || fallbackName;
    const avatarSeed = profile?.avatarSeed || fallbackName;

    return (
        <HoverCard openDelay={0} closeDelay={200}>
            <HoverCardTrigger asChild>
                <div className="relative group cursor-pointer p-1">
                    <Avatar className="h-10 w-10 ring-2 ring-primary/10 ring-offset-2 ring-offset-background group-hover:ring-primary/40 transition-all bg-background">
                        <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(avatarSeed)}`} />
                        <AvatarFallback className="bg-primary/5 text-primary font-bold text-[10px]">
                            {displayName.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                    <div className="absolute bottom-1 right-1 h-2.5 w-2.5 rounded-full border-2 border-background bg-primary" />
                </div>
            </HoverCardTrigger>
            <HoverCardContent 
                side="right" 
                align="end" 
                sideOffset={14} 
                className="w-auto p-1.5 bg-background/95 backdrop-blur-xl border border-border/60 shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-xl relative overflow-hidden"
            >
                {/* Subtle gradient accent to match premium theme */}
                <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
                
                <button 
                    onClick={handleLogout}
                    className="flex items-center gap-3 px-4 py-2 text-[13px] font-semibold text-muted-foreground hover:text-red-500 hover:bg-destructive/10 rounded-lg transition-all duration-200 whitespace-nowrap group/btn w-full"
                >
                    <LogOut size={15} className="group-hover/btn:scale-110 transition-transform" />
                    <span className="tracking-wide">Sign Out</span>
                </button>
            </HoverCardContent>
        </HoverCard>
    );
}

function ThemeToggle() {
    const { theme, toggleTheme } = useTheme();

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <button
                    onClick={toggleTheme}
                    className="group flex flex-col items-center justify-center gap-1 w-11 h-11 rounded-xl transition-all duration-300 border border-transparent bg-muted text-muted-foreground hover:bg-primary/20 hover:text-foreground shrink-0"
                >
                    {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                </button>
            </TooltipTrigger>
            <TooltipContent side="right">
                <p>Switch to {theme === 'dark' ? 'Light' : 'Dark'} Mode</p>
            </TooltipContent>
        </Tooltip>
    );
}
