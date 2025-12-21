"use client";

import { RoomProvider } from "@/liveblocks.config";
import { LiveCursors } from "@/components/LiveCursors";
import { CollaborativeHeader } from "@/components/CollaborativeHeader";
import { WalletButton } from "@/components/WalletButton";
import { Suspense } from "react";
import { useSelf } from "@/liveblocks.config";
import { getAvatarUrl } from "@/lib/avatars";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Logo, LogoFilled, WalletCards, PieChart, Users, Settings, Database, LayoutGrid } from "@/components/icons";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CommandBar } from "@/components/CommandBar";
import { useAppEvent } from "@/lib/events";
import { ThemeProvider, useTheme } from "@/lib/contexts/ThemeContext";
import { Sun, Moon } from "lucide-react";

function AppLayoutContent({ children }: { children: React.ReactNode }) {
    const { theme } = useTheme();
    const router = useRouter();
    const pathname = usePathname();

    useAppEvent((event) => {
        if (event.type === "NAVIGATE" && event.payload) {
            router.push(event.payload);
        }
    });

    return (
        <div
            className="flex bg-background font-sans text-foreground overflow-hidden h-screen selection:bg-[#36e27b] selection:text-[#0B0C10] dashboard-theme relative"
            data-theme={theme}
        >
            <Suspense fallback={null}>
                <LiveCursors />
            </Suspense>

            {/* Side Navigation (Slim Rail - Ultra Compact w-20) */}
            <nav className="hidden md:flex flex-col items-center w-20 h-full py-4 border-r border-border bg-sidebar z-50">
                <Link href="/" className="mb-6 p-2 rounded-xl bg-[#36e27b]/5 border border-[#36e27b]/20 flex items-center justify-center shadow-[0_0_15px_rgba(54,226,123,0.1)] hover:scale-105 transition-transform group">
                    <LogoFilled size={36} fillColor={theme === 'light' ? '#16A34A' : "#36e27b"} className="group-hover:drop-shadow-[0_0_8px_rgba(54,226,123,0.4)] transition-all" />
                </Link>
                <TooltipProvider>
                    <div className="flex flex-col gap-3 w-full px-3">
                        <NavButton icon={LayoutGrid} label="Dashboard" href="/app" active={pathname === "/app"} />
                        <NavButton icon={WalletCards} label="Treasury" href="/app/treasury" active={pathname === "/app/treasury"} />
                        <NavButton icon={Database} label="Assets" href="/app/assets" active={pathname === "/app/assets"} />
                        <NavButton icon={PieChart} label="Analytics" href="/app/analytics" active={pathname === "/app/analytics"} />
                        <NavButton icon={Users} label="Team" href="/app/team" active={pathname === "/app/team"} />
                        <NavButton icon={Settings} label="Settings" href="/app/settings" active={pathname === "/app/settings"} />
                        <div className="my-2 border-t border-border opacity-50" />
                        <ThemeToggle />
                    </div>
                </TooltipProvider>

                <div className="mt-auto mb-4">
                    <Suspense fallback={<div className="w-9 h-9 rounded-full bg-white/5 animate-pulse" />}>
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

export default function AppLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <ThemeProvider>
            <RoomProvider
                id="keystone-global"
                initialPresence={{ cursor: null }}
                initialStorage={{
                    teamNotes: "",
                    chatMessages: []
                }}
            >
                <AppLayoutContent>{children}</AppLayoutContent>
            </RoomProvider>
        </ThemeProvider>
    );
}

function NavButton({ icon: Icon, label, href, active }: { icon: any, label: string, href: string, active?: boolean }) {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <Link
                    href={href}
                    className={`group flex flex-col items-center justify-center gap-1 w-full aspect-square rounded-xl transition-all duration-300 border border-transparent
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
    const name = self?.info?.name || "User";

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <div className="relative group cursor-pointer">
                    <Avatar className="h-10 w-10 ring-2 ring-primary/10 ring-offset-2 ring-offset-background group-hover:ring-primary/40 transition-all">
                        <AvatarImage src={getAvatarUrl(name)} />
                        <AvatarFallback className="bg-primary/10 text-primary font-bold text-[10px]">
                            {name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                    <div className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-background bg-primary" />
                </div>
            </TooltipTrigger>
            <TooltipContent side="right">
                <p>{name} (Active)</p>
            </TooltipContent>
        </Tooltip>
    );
}

function ThemeToggle() {
    const { theme, toggleTheme } = useTheme();

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <button
                    onClick={toggleTheme}
                    className="group flex flex-col items-center justify-center gap-1 w-full aspect-square rounded-xl transition-all duration-300 border border-transparent bg-muted text-muted-foreground hover:bg-primary/20 hover:text-foreground"
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
