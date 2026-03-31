"use client";
import { generateId } from "@/lib/utils";

export interface MonitorIntent {
    id: string;
    type: "PRICE_ALERT" | "BALANCE_THRESHOLD" | "REBALANCE_RULE";
    condition: {
        target: string; // Token symbol or address
        operator: ">" | "<" | "=" | "DRAIN" | "SURGE";
        value: number;
    };
    actions: any[]; // The multi-step actions to execute when triggered
    status: "ACTIVE" | "TRIGGERED" | "PAUSED";
    createdAt: number;
}

class AgentIntentRegistry {
    private intents: MonitorIntent[] = [];

    register(intent: Omit<MonitorIntent, "id" | "createdAt" | "status">) {
        const newIntent: MonitorIntent = {
            ...intent,
            id: generateId(),
            status: "ACTIVE",
            createdAt: Date.now()
        };
        this.intents.push(newIntent);
        console.log(`[AgentRegistry] New Intent Registered: ${newIntent.type} for ${newIntent.condition.target}`);
        return newIntent;
    }

    getActive() {
        return this.intents.filter(i => i.status === "ACTIVE");
    }

    markTriggered(id: string) {
        const intent = this.intents.find(i => i.id === id);
        if (intent) intent.status = "TRIGGERED";
    }

    remove(id: string) {
        this.intents = this.intents.filter(i => i.id !== id);
    }
}

// Singleton for client-side persistence (in-memory for prototype)
export const IntentRegistry = new AgentIntentRegistry();
