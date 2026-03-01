"use client";

/**
 * MCPVisualizer — Model Context Protocol connection visualizer & Agent Swarm builder.
 *
 * Displays a visual graph of MCP server connections, registered tools,
 * and agent handoff chains. Shows real-time status of each connection
 * and provides a drag-and-drop interface for composing agent swarms.
 *
 * [Phase 9] — Agentic Interoperability
 */

import React, { useState } from "react";
import {
    Cpu, Globe, Zap, ArrowRight, CheckCircle,
    AlertTriangle, Plus, X, ChevronDown, ChevronRight,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────

export interface MCPConnection {
    id: string;
    serverUrl: string;
    status: "connected" | "disconnected" | "error";
    tools: MCPToolEntry[];
    lastPing?: number;
}

export interface MCPToolEntry {
    name: string;
    description: string;
    callCount: number;
    lastUsed?: number;
}

export interface AgentNode {
    id: string;
    name: string;
    type: "source" | "processor" | "sink";
    connected: string[];
    status: "active" | "idle" | "error";
}

interface MCPVisualizerProps {
    connections: MCPConnection[];
    agents: AgentNode[];
    isOpen: boolean;
    onClose: () => void;
    onAddConnection?: (serverUrl: string) => void;
}

// ─── Component ──────────────────────────────────────────────────────

export function MCPVisualizer({
    connections,
    agents,
    isOpen,
    onClose,
    onAddConnection,
}: MCPVisualizerProps) {
    const [activeTab, setActiveTab] = useState<"connections" | "agents">("connections");
    const [newServerUrl, setNewServerUrl] = useState("");
    const [expandedId, setExpandedId] = useState<string | null>(null);

    if (!isOpen) return null;

    return (
        <div className="h-full bg-zinc-950 border-l border-zinc-800 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
                <div className="flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-purple-400" />
                    <h3 className="text-sm font-bold text-white">MCP Visualizer</h3>
                </div>
                <button
                    onClick={onClose}
                    className="text-xs text-zinc-500 hover:text-white transition-colors"
                >
                    Close
                </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-zinc-800">
                <button
                    onClick={() => setActiveTab("connections")}
                    className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider transition-colors ${activeTab === "connections"
                            ? "text-purple-400 border-b-2 border-purple-400"
                            : "text-zinc-500 hover:text-zinc-300"
                        }`}
                >
                    Connections ({connections.length})
                </button>
                <button
                    onClick={() => setActiveTab("agents")}
                    className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider transition-colors ${activeTab === "agents"
                            ? "text-cyan-400 border-b-2 border-cyan-400"
                            : "text-zinc-500 hover:text-zinc-300"
                        }`}
                >
                    Agent Swarm ({agents.length})
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto">
                {activeTab === "connections" && (
                    <div className="p-4 space-y-3">
                        {/* Add New Connection */}
                        {onAddConnection && (
                            <div className="flex items-center gap-2">
                                <input
                                    value={newServerUrl}
                                    onChange={(e) => setNewServerUrl(e.target.value)}
                                    placeholder="https://mcp.example.com"
                                    className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white placeholder:text-zinc-600 focus:border-purple-500 outline-none"
                                />
                                <button
                                    onClick={() => {
                                        if (newServerUrl.trim()) {
                                            onAddConnection(newServerUrl.trim());
                                            setNewServerUrl("");
                                        }
                                    }}
                                    className="p-2 bg-purple-600 hover:bg-purple-500 rounded-lg transition-colors"
                                >
                                    <Plus className="w-3.5 h-3.5 text-white" />
                                </button>
                            </div>
                        )}

                        {/* Connection Cards */}
                        {connections.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-zinc-600">
                                <Globe className="w-8 h-8 mb-3 opacity-30" />
                                <p className="text-xs">No MCP connections</p>
                                <p className="text-[10px] text-zinc-700 mt-1">
                                    Use useMCPClient() in your Mini-App
                                </p>
                            </div>
                        ) : (
                            connections.map((conn) => {
                                const isExpanded = expandedId === conn.id;
                                return (
                                    <div
                                        key={conn.id}
                                        className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden"
                                    >
                                        <button
                                            onClick={() => setExpandedId(isExpanded ? null : conn.id)}
                                            className="w-full flex items-center gap-3 px-3 py-3 hover:bg-zinc-800/30 transition-colors text-left"
                                        >
                                            <div className={`w-2 h-2 rounded-full ${conn.status === "connected"
                                                    ? "bg-emerald-500"
                                                    : conn.status === "error"
                                                        ? "bg-red-500"
                                                        : "bg-zinc-600"
                                                }`} />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-semibold text-zinc-200 truncate">
                                                    {conn.serverUrl}
                                                </p>
                                                <p className="text-[10px] text-zinc-500 mt-0.5">
                                                    {conn.tools.length} tools
                                                    {conn.lastPing && ` · ${Math.round((Date.now() - conn.lastPing) / 1000)}s ago`}
                                                </p>
                                            </div>
                                            {isExpanded
                                                ? <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
                                                : <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />
                                            }
                                        </button>

                                        {isExpanded && conn.tools.length > 0 && (
                                            <div className="border-t border-zinc-800 divide-y divide-zinc-800/50">
                                                {conn.tools.map((tool) => (
                                                    <div key={tool.name} className="flex items-center gap-2 px-3 py-2 pl-7">
                                                        <Zap className="w-3 h-3 text-amber-400 shrink-0" />
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-[11px] font-mono text-zinc-300 truncate">
                                                                {tool.name}
                                                            </p>
                                                            <p className="text-[10px] text-zinc-600 truncate">
                                                                {tool.description}
                                                            </p>
                                                        </div>
                                                        <span className="text-[10px] text-zinc-600">
                                                            {tool.callCount}×
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}

                {activeTab === "agents" && (
                    <div className="p-4 space-y-3">
                        {agents.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-zinc-600">
                                <Cpu className="w-8 h-8 mb-3 opacity-30" />
                                <p className="text-xs">No agents registered</p>
                                <p className="text-[10px] text-zinc-700 mt-1">
                                    Use useAgentHandoff() to compose agents
                                </p>
                            </div>
                        ) : (
                            <>
                                {/* Agent Flow Visualization */}
                                <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                                    <h4 className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold mb-3">
                                        Agent Flow
                                    </h4>
                                    <div className="flex flex-wrap items-center gap-2">
                                        {agents.map((agent, i) => (
                                            <React.Fragment key={agent.id}>
                                                <div className={`px-3 py-2 rounded-lg border text-xs font-semibold ${agent.status === "active"
                                                        ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-400"
                                                        : agent.status === "error"
                                                            ? "bg-red-500/10 border-red-500/30 text-red-400"
                                                            : "bg-zinc-800 border-zinc-700 text-zinc-400"
                                                    }`}>
                                                    {agent.name}
                                                </div>
                                                {i < agents.length - 1 && (
                                                    <ArrowRight className="w-3.5 h-3.5 text-zinc-600" />
                                                )}
                                            </React.Fragment>
                                        ))}
                                    </div>
                                </div>

                                {/* Agent Details */}
                                {agents.map((agent) => (
                                    <div
                                        key={agent.id}
                                        className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-3"
                                    >
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full ${agent.status === "active" ? "bg-cyan-500" :
                                                    agent.status === "error" ? "bg-red-500" : "bg-zinc-600"
                                                }`} />
                                            <span className="text-xs font-semibold text-zinc-200">{agent.name}</span>
                                            <span className="text-[10px] text-zinc-600 bg-zinc-800 px-1.5 py-0.5 rounded">
                                                {agent.type}
                                            </span>
                                        </div>
                                        {agent.connected.length > 0 && (
                                            <p className="text-[10px] text-zinc-500 mt-1 pl-4">
                                                → {agent.connected.join(", ")}
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
