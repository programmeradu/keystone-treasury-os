"use client";

import React, { useEffect, useCallback } from "react";
import { Bell, BellOff, Check, Trash2, ShoppingCart, Store, Download, AlertTriangle, Shield, Cpu, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useNotificationStore, notify, type Notification, type NotificationType } from "@/lib/notifications";
import { AppEventBus } from "@/lib/events";
import { formatDistanceToNow } from "date-fns";

function getNotificationIcon(type: NotificationType) {
    switch (type) {
        case "purchase": return <ShoppingCart size={14} className="text-emerald-400" />;
        case "listing": return <Store size={14} className="text-primary" />;
        case "install": return <Download size={14} className="text-blue-400" />;
        case "delist": return <X size={14} className="text-amber-400" />;
        case "agent_alert": return <Cpu size={14} className="text-purple-400" />;
        case "security": return <Shield size={14} className="text-red-400" />;
        case "system": return <AlertTriangle size={14} className="text-muted-foreground" />;
        default: return <Bell size={14} className="text-muted-foreground" />;
    }
}

function NotificationItem({ item, onRead, onRemove }: {
    item: Notification;
    onRead: () => void;
    onRemove: () => void;
}) {
    return (
        <div
            className={`flex items-start gap-3 p-3 rounded-lg transition-colors group ${item.read ? "opacity-60" : "bg-primary/5"}`}
        >
            <div className="mt-0.5 shrink-0">{getNotificationIcon(item.type)}</div>
            <div className="flex-1 min-w-0">
                {item.href ? (
                    <a
                        href={item.href}
                        onClick={onRead}
                        className="block hover:text-primary transition-colors"
                    >
                        <p className={`text-xs font-bold truncate ${item.read ? "" : "text-foreground"}`}>{item.title}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{item.message}</p>
                    </a>
                ) : (
                    <div onClick={onRead} className="cursor-pointer">
                        <p className={`text-xs font-bold truncate ${item.read ? "" : "text-foreground"}`}>{item.title}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{item.message}</p>
                    </div>
                )}
                <p className="text-[9px] text-muted-foreground/60 mt-1 font-mono">
                    {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
                </p>
            </div>
            <button
                onClick={onRemove}
                className="shrink-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-400 transition-all p-1"
                title="Remove"
            >
                <Trash2 size={12} />
            </button>
        </div>
    );
}

export function NotificationBell() {
    const { notifications, markRead, markAllRead, remove, clearAll, unreadCount } = useNotificationStore();
    const count = unreadCount();

    // Subscribe to AppEventBus UI_NOTIFICATION events and route them into the notification store
    const handleAppEvent = useCallback((event: { type: string; payload?: any }) => {
        if (event.type === "UI_NOTIFICATION" && event.payload?.message) {
            notify.agentAlert(event.payload.message);
        }
    }, []);

    useEffect(() => {
        return AppEventBus.subscribe(handleAppEvent);
    }, [handleAppEvent]);

    // Show newest first
    const sorted = [...notifications].reverse();

    return (
        <Popover>
            <PopoverTrigger asChild>
                <button className="p-2 rounded-lg hover:bg-muted text-muted-foreground transition-colors relative">
                    <Bell size={18} />
                    {count > 0 && (
                        <div className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-primary flex items-center justify-center shadow-[0_0_8px_rgba(54,226,123,0.4)]">
                            <span className="text-[9px] font-black text-black leading-none px-1">
                                {count > 99 ? "99+" : count}
                            </span>
                        </div>
                    )}
                </button>
            </PopoverTrigger>

            <PopoverContent align="end" className="w-[360px] p-0 max-h-[480px] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
                    <div className="flex items-center gap-2">
                        <h3 className="text-xs font-black uppercase tracking-widest">Notifications</h3>
                        {count > 0 && (
                            <span className="text-[9px] font-bold bg-primary/15 text-primary px-1.5 py-0.5 rounded-full">
                                {count} new
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-1">
                        {count > 0 && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={markAllRead}
                                className="h-6 px-2 text-[10px] font-bold text-muted-foreground hover:text-foreground"
                            >
                                <Check size={10} className="mr-1" /> Read all
                            </Button>
                        )}
                        {notifications.length > 0 && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={clearAll}
                                className="h-6 px-2 text-[10px] font-bold text-muted-foreground hover:text-red-400"
                            >
                                Clear
                            </Button>
                        )}
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto scrollbar-thin">
                    {sorted.length === 0 ? (
                        <div className="flex flex-col items-center gap-2 py-10 text-center">
                            <BellOff size={24} className="text-muted-foreground/40" />
                            <p className="text-xs text-muted-foreground">No notifications</p>
                        </div>
                    ) : (
                        <div className="p-2 space-y-1">
                            {sorted.map((item) => (
                                <NotificationItem
                                    key={item.id}
                                    item={item}
                                    onRead={() => markRead(item.id)}
                                    onRemove={() => remove(item.id)}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                {notifications.length > 0 && (
                    <div className="border-t border-border px-4 py-2 shrink-0">
                        <a
                            href="/app/settings"
                            className="text-[10px] text-muted-foreground hover:text-primary transition-colors font-bold uppercase tracking-wider"
                        >
                            Notification Settings
                        </a>
                    </div>
                )}
            </PopoverContent>
        </Popover>
    );
}
