"use client";

import { useEffect } from "react";

type AppEventType = "REFRESH_DASHBOARD" | "NAVIGATE" | "UI_NOTIFICATION" | "AGENT_COMMAND" | "SHOW_STRATEGY_MODAL" | "AGENT_LOG";

interface AppEvent {
    type: AppEventType;
    payload?: any;
}

/**
 * A simple event bus using standard DOM CustomEvents.
 * This allows client-side components to communicate without complex state management.
 */
export const AppEventBus = {
    emit(type: AppEventType, payload?: any) {
        if (typeof window === "undefined") return;
        const event = new CustomEvent("keystone-app-event", {
            detail: { type, payload }
        });
        window.dispatchEvent(event);
    },

    subscribe(callback: (event: AppEvent) => void) {
        if (typeof window === "undefined") return () => { };

        const handler = (e: any) => {
            callback(e.detail);
        };

        window.addEventListener("keystone-app-event", handler);
        return () => window.removeEventListener("keystone-app-event", handler);
    }
};

/**
 * Hook for components to listen to app events.
 */
export function useAppEvent(callback: (event: AppEvent) => void) {
    useEffect(() => {
        return AppEventBus.subscribe(callback);
    }, [callback]);
}
