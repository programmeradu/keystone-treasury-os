import { useState, useCallback } from "react";

export type NotificationType = "info" | "success" | "warning" | "error";

export interface Notification {
    id: string;
    type: NotificationType;
    title: string;
    message?: string;
    timestamp: number;
    read: boolean;
}

export interface UseNotificationResult {
    notifications: Notification[];
    send: (title: string, options?: { type?: NotificationType; message?: string }) => string;
    dismiss: (id: string) => void;
    markRead: (id: string) => void;
    clearAll: () => void;
    unreadCount: number;
}

/**
 * Hook for in-app notifications within mini-apps.
 * Notifications are ephemeral (per session) in the SDK;
 * the Studio host can persist and relay them.
 */
export function useNotification(): UseNotificationResult {
    const [notifications, setNotifications] = useState<Notification[]>([]);

    const send = useCallback(
        (title: string, options?: { type?: NotificationType; message?: string }) => {
            const id = `notif_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
            const notif: Notification = {
                id,
                type: options?.type || "info",
                title,
                message: options?.message,
                timestamp: Date.now(),
                read: false,
            };
            setNotifications((prev) => [notif, ...prev]);
            return id;
        },
        []
    );

    const dismiss = useCallback((id: string) => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, []);

    const markRead = useCallback((id: string) => {
        setNotifications((prev) =>
            prev.map((n) => (n.id === id ? { ...n, read: true } : n))
        );
    }, []);

    const clearAll = useCallback(() => {
        setNotifications([]);
    }, []);

    const unreadCount = notifications.filter((n) => !n.read).length;

    return { notifications, send, dismiss, markRead, clearAll, unreadCount };
}
