"use client";

import { create } from "zustand";

// ─── Types ──────────────────────────────────────────────────────────

export interface SimulationVariable {
    id: string;
    label: string;
    type: "price_change" | "burn_rate" | "inflow" | "outflow" | "yield_apy" | "custom";
    asset?: string;
    value: number;
    unit: "percent" | "usd" | "tokens";
}

export interface SimulationSummary {
    currentValue: number;
    projectedEndValue: number;
    delta: number;
    deltaPercent: number;
    runwayMonths: number | null;
    depletionDate: string | null;
    riskFlags: string[];
}

export interface ProjectionPoint {
    date: string;
    totalValue: number;
    breakdown: Record<string, number>;
}

export interface SimulationResult {
    projection: ProjectionPoint[];
    summary: SimulationSummary;
    metadata: {
        variables: SimulationVariable[];
        timeframeMonths: number;
        computedAt: number;
    };
}

export interface SimulationState {
    /** Whether a simulation overlay is active on the Analytics page */
    active: boolean;
    /** The original user prompt that triggered the simulation */
    prompt: string | null;
    /** Parsed variables from the prompt */
    variables: SimulationVariable[];
    /** The simulation result from /api/simulation */
    result: SimulationResult | null;
    /** Loading state while simulation is computing */
    loading: boolean;
    /** Error message if simulation failed */
    error: string | null;
    /** Timeframe in months */
    timeframeMonths: number;

    // ─── Actions ─────────────────────────────────────────────────
    /** Start a simulation — sets loading, stores prompt + variables */
    startSimulation: (prompt: string, variables: SimulationVariable[], timeframeMonths?: number) => void;
    /** Set the simulation result (called after /api/simulation responds) */
    setResult: (result: SimulationResult) => void;
    /** Set error state */
    setError: (error: string) => void;
    /** Clear all simulation state — return Analytics to normal mode */
    clearSimulation: () => void;
}

// ─── Store ──────────────────────────────────────────────────────────

export const useSimulationStore = create<SimulationState>((set) => ({
    active: false,
    prompt: null,
    variables: [],
    result: null,
    loading: false,
    error: null,
    timeframeMonths: 12,

    startSimulation: (prompt, variables, timeframeMonths = 12) => set({
        active: true,
        prompt,
        variables,
        result: null,
        loading: true,
        error: null,
        timeframeMonths,
    }),

    setResult: (result) => set({
        result,
        loading: false,
        error: null,
    }),

    setError: (error) => set({
        error,
        loading: false,
    }),

    clearSimulation: () => set({
        active: false,
        prompt: null,
        variables: [],
        result: null,
        loading: false,
        error: null,
        timeframeMonths: 12,
    }),
}));
