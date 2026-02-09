"use client";

import { create } from "zustand";

// ─── Types ───────────────────────────────────────────────────────────

export type NotificationType =
    | "purchase"
    | "listing"
    | "install"
    | "delist"
    | "agent_alert"
    | "security"
    | "system";

export interface Notification {
    id: string;
    type: NotificationType;
    title: string;
    message: string;
    timestamp: number;
    read: boolean;
    href?: string;          // optional link to navigate to
    meta?: Record<string, any>;
}

export interface NotificationPreferences {
    purchases: boolean;
    listings: boolean;
    agentAlerts: boolean;
    security: boolean;
    system: boolean;
}

interface NotificationStore {
    notifications: Notification[];
    preferences: NotificationPreferences;
    /** Add a new notification (respects preferences) */
    addNotification: (n: Omit<Notification, "id" | "timestamp" | "read">) => void;
    /** Mark a single notification as read */
    markRead: (id: string) => void;
    /** Mark all notifications as read */
    markAllRead: () => void;
    /** Remove a single notification */
    remove: (id: string) => void;
    /** Clear all notifications */
    clearAll: () => void;
    /** Get unread count */
    unreadCount: () => number;
    /** Update a preference toggle */
    setPreference: (key: keyof NotificationPreferences, value: boolean) => void;
}

// ─── LocalStorage helpers ────────────────────────────────────────────

const LS_KEY = "keystone_notifications";
const LS_PREFS_KEY = "keystone_notification_prefs";
const MAX_NOTIFICATIONS = 100;

function loadNotifications(): Notification[] {
    if (typeof window === "undefined") return [];
    try {
        return JSON.parse(localStorage.getItem(LS_KEY) || "[]");
    } catch {
        return [];
    }
}

function saveNotifications(items: Notification[]) {
    if (typeof window === "undefined") return;
    // Keep only the most recent MAX_NOTIFICATIONS
    const trimmed = items.slice(-MAX_NOTIFICATIONS);
    localStorage.setItem(LS_KEY, JSON.stringify(trimmed));
}

function loadPreferences(): NotificationPreferences {
    const defaults: NotificationPreferences = {
        purchases: true,
        listings: true,
        agentAlerts: true,
        security: true,
        system: true,
    };
    if (typeof window === "undefined") return defaults;
    try {
        const stored = JSON.parse(localStorage.getItem(LS_PREFS_KEY) || "{}");
        return { ...defaults, ...stored };
    } catch {
        return defaults;
    }
}

function savePreferences(prefs: NotificationPreferences) {
    if (typeof window === "undefined") return;
    localStorage.setItem(LS_PREFS_KEY, JSON.stringify(prefs));
}

// ─── Preference-to-type mapping ──────────────────────────────────────

function isAllowedByPreferences(type: NotificationType, prefs: NotificationPreferences): boolean {
    switch (type) {
        case "purchase":
        case "install":
            return prefs.purchases;
        case "listing":
        case "delist":
            return prefs.listings;
        case "agent_alert":
            return prefs.agentAlerts;
        case "security":
            return prefs.security;
        case "system":
            return prefs.system;
        default:
            return true;
    }
}

// ─── Zustand Store ───────────────────────────────────────────────────

export const useNotificationStore = create<NotificationStore>((set, get) => ({
    notifications: loadNotifications(),
    preferences: loadPreferences(),

    addNotification: (n) => {
        const prefs = get().preferences;
        if (!isAllowedByPreferences(n.type, prefs)) return;

        const item: Notification = {
            ...n,
            id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            timestamp: Date.now(),
            read: false,
        };

        set((state) => {
            const updated = [...state.notifications, item].slice(-MAX_NOTIFICATIONS);
            saveNotifications(updated);
            return { notifications: updated };
        });
    },

    markRead: (id) => {
        set((state) => {
            const updated = state.notifications.map((n) =>
                n.id === id ? { ...n, read: true } : n
            );
            saveNotifications(updated);
            return { notifications: updated };
        });
    },

    markAllRead: () => {
        set((state) => {
            const updated = state.notifications.map((n) => ({ ...n, read: true }));
            saveNotifications(updated);
            return { notifications: updated };
        });
    },

    remove: (id) => {
        set((state) => {
            const updated = state.notifications.filter((n) => n.id !== id);
            saveNotifications(updated);
            return { notifications: updated };
        });
    },

    clearAll: () => {
        saveNotifications([]);
        set({ notifications: [] });
    },

    unreadCount: () => {
        return get().notifications.filter((n) => !n.read).length;
    },

    setPreference: (key, value) => {
        set((state) => {
            const updated = { ...state.preferences, [key]: value };
            savePreferences(updated);
            return { preferences: updated };
        });
    },
}));

// ─── Convenience emitters ────────────────────────────────────────────

export const notify = {
    purchase: (appName: string, price: number, txSignature?: string) => {
        useNotificationStore.getState().addNotification({
            type: "purchase",
            title: "Purchase Complete",
            message: price > 0
                ? `"${appName}" purchased for ${price} SOL`
                : `"${appName}" installed for free`,
            href: "/app/library",
            meta: txSignature ? { txSignature } : undefined,
        });
    },

    listing: (appName: string, price: number) => {
        useNotificationStore.getState().addNotification({
            type: "listing",
            title: "App Listed",
            message: price > 0
                ? `"${appName}" listed for ${price} SOL on Marketplace`
                : `"${appName}" listed as FREE on Marketplace`,
            href: "/app/marketplace",
        });
    },

    delist: (appName: string) => {
        useNotificationStore.getState().addNotification({
            type: "delist",
            title: "App Delisted",
            message: `"${appName}" removed from Marketplace`,
        });
    },

    install: (appName: string) => {
        useNotificationStore.getState().addNotification({
            type: "install",
            title: "App Installed",
            message: `"${appName}" added to your Library`,
            href: "/app/library",
        });
    },

    agentAlert: (message: string) => {
        useNotificationStore.getState().addNotification({
            type: "agent_alert",
            title: "Agent Alert",
            message,
            href: "/app",
        });
    },

    security: (message: string) => {
        useNotificationStore.getState().addNotification({
            type: "security",
            title: "Security Alert",
            message,
        });
    },

    system: (title: string, message: string) => {
        useNotificationStore.getState().addNotification({
            type: "system",
            title,
            message,
        });
    },
};
