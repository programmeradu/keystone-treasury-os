"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface Notification {
  id: number;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  createdAt: string;
}

interface UseNotificationsReturn {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  markRead: (ids: number[]) => Promise<void>;
  markAllRead: () => Promise<void>;
  dismiss: (ids: number[]) => Promise<void>;
  refresh: () => void;
}

const POLL_INTERVAL = 30_000; // 30s polling as lightweight SSE alternative

export function useNotifications(): UseNotificationsReturn {
  const [items, setItems] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications?limit=30");
      if (!res.ok) return;
      const data = await res.json();
      setItems(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch {
      // silent
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    timerRef.current = setInterval(fetchNotifications, POLL_INTERVAL);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [fetchNotifications]);

  const markRead = useCallback(async (ids: number[]) => {
    try {
      await fetch("/api/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, action: "read" }),
      });
      setItems((prev) => prev.map((n) => (ids.includes(n.id) ? { ...n, read: true } : n)));
      setUnreadCount((c) => Math.max(0, c - ids.length));
    } catch {}
  }, []);

  const markAllRead = useCallback(async () => {
    try {
      await fetch("/api/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "read_all" }),
      });
      setItems((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {}
  }, []);

  const dismiss = useCallback(async (ids: number[]) => {
    try {
      await fetch("/api/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, action: "dismiss" }),
      });
      setItems((prev) => prev.filter((n) => !ids.includes(n.id)));
    } catch {}
  }, []);

  const refresh = useCallback(() => { fetchNotifications(); }, [fetchNotifications]);

  return { notifications: items, unreadCount, isLoading, markRead, markAllRead, dismiss, refresh };
}
