"use client";

// Feature: commandbar-god-mode
// ChatMessage — renders a single UIMessage in the CommandBar chat thread.
// User messages: right-aligned chat bubbles.
// Assistant messages: left-aligned with markdown rendering and token logo injection.
// Covers Requirements 3.2, 3.8

import React from "react";
import ReactMarkdown from "react-markdown";
import type { UIMessage } from "ai";
import { ToolCard } from "@/components/commandbar/ToolCard";

class MarkdownErrorBoundary extends React.Component<
  { fallback: React.ReactNode; children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { fallback: React.ReactNode; children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error("[CommandBar] Markdown render failed:", error);
  }

  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

// ─── Token Logo Map (13 tokens) ──────────────────────────────────────────────

export const TOKEN_LOGOS: Record<string, string> = {
  SOL: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png",
  USDC: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png",
  USDT: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB/logo.png",
  JUP: "https://static.jup.ag/jup/icon.png",
  BONK: "https://arweave.net/hQiPZOsRZXGXBJd_82PhVdlM_hACsT_q89jl3D4chJs",
  RAY: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R/logo.png",
  MSOL: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So/logo.png",
  JITOSOL: "https://storage.googleapis.com/token-metadata/JitoSOL-256.png",
  JTO: "https://metadata.jito.network/token/jto/image",
  BSOL: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/bSo13r4TkiE4KumL71LsHTPpL2euBYLFx6h9HP3piy1/logo.png",
  PYTH: "https://pyth.network/token.svg",
  WIF: "https://bafkreibk3covs5ltyqxa272uodhculbr6kea6betidfwy3ajsav2vjzyum.ipfs.nftstorage.link",
  TRUMP: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/6p6xgHyF7AeE6TZkSmFsko444wqoP15icUSqi2jfGiPN/logo.png",
};

// Ordered longest-first so multi-char symbols match before shorter ones (e.g. JITOSOL before SOL)
const TOKEN_SYMBOLS_ORDERED = [
  "JITOSOL", "TRUMP", "BONK", "MSOL", "BSOL", "USDC", "USDT", "PYTH",
  "JUP", "RAY", "WIF", "JTO", "SOL",
];

// ─── injectTokenLogosIntoString ───────────────────────────────────────────────

/**
 * Splits `text` on known token symbols and interleaves inline `<img>` logo elements.
 * Text content is preserved (logos are additive, not substitutive).
 * Exported as a named export for testability (Property 4).
 */
export function injectTokenLogosIntoString(
  text: string,
  logos: Record<string, string>,
): React.ReactNode[] {
  if (!text || typeof text !== "string") return [text];

  const re = new RegExp(`\\b(${TOKEN_SYMBOLS_ORDERED.join("|")})\\b`, "g");
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }
    const symbol = match[1];
    const logoUrl = logos[symbol];
    nodes.push(
      <span
        key={`logo-${match.index}-${symbol}`}
        className="inline-flex items-center gap-0.5 align-middle"
      >
        {logoUrl ? (
          <img
            src={logoUrl}
            alt=""
            className="inline-block h-3.5 w-3.5 rounded-full object-cover"
          />
        ) : null}
        <span className="font-mono text-inherit">{symbol}</span>
      </span>,
    );
    lastIndex = re.lastIndex;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes.length > 0 ? nodes : [text];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Recursively process React children, injecting token logos into string leaves. */
function processChildren(
  children: React.ReactNode,
  logos: Record<string, string>,
): React.ReactNode {
  if (typeof children === "string") {
    return <>{injectTokenLogosIntoString(children, logos)}</>;
  }
  if (Array.isArray(children)) {
    return (
      <>
        {children.map((child, i) => (
          <React.Fragment key={i}>
            {processChildren(child, logos)}
          </React.Fragment>
        ))}
      </>
    );
  }
  return children;
}

type ToolPart = {
  type: "dynamic-tool";
  toolCallId: string;
  toolName: string;
  state: "partial-call" | "call" | "output-available";
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
};

/** Extract tool invocation parts from a UIMessage. */
function getToolParts(message: UIMessage): ToolPart[] {
  return (message.parts ?? []).flatMap((p) => {
    const part = p as Record<string, unknown>;
    if (part.type === "dynamic-tool") {
      return [{
        type: "dynamic-tool" as const,
        toolCallId: part.toolCallId as string,
        toolName: part.toolName as string,
        state: part.state as ToolPart["state"],
        input: (part.input ?? {}) as Record<string, unknown>,
        output: part.output as Record<string, unknown> | undefined,
      }];
    }
    if (typeof part.type === "string" && part.type.startsWith("tool-") && "toolCallId" in part) {
      return [{
        type: "dynamic-tool" as const,
        toolCallId: part.toolCallId as string,
        toolName: (part.type as string).slice(5),
        state: part.state as ToolPart["state"],
        input: (part.input ?? {}) as Record<string, unknown>,
        output: part.output as Record<string, unknown> | undefined,
      }];
    }
    return [];
  });
}

/** Extract concatenated text from a UIMessage. */
function getTextContent(message: UIMessage): string {
  return (message.parts ?? [])
    .filter((p): p is Extract<typeof p, { type: "text" }> => p.type === "text")
    .map((p) => (p as { type: "text"; text: string }).text)
    .join("");
}

// ─── ChatMessageProps ─────────────────────────────────────────────────────────

export interface ChatMessageProps {
  message: UIMessage;
  tokenLogos: Record<string, string>;
  onSign: (toolCallId: string, serialized: string[], operation: string) => void;
}

// ─── ChatMessage ──────────────────────────────────────────────────────────────

export function ChatMessage({ message, tokenLogos, onSign }: ChatMessageProps) {
  const isUser = message.role === "user";
  const textContent = getTextContent(message);
  const toolParts = getToolParts(message);

  if (isUser) {
    return (
      <div className="flex justify-end px-2 py-1">
        <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-zinc-700/70 px-3.5 py-2 text-sm text-zinc-100 leading-relaxed">
          {textContent}
        </div>
      </div>
    );
  }

  // Assistant message
  return (
    <div className="flex flex-col gap-1.5 px-2 py-1">
      {/* Text content with markdown + token logo injection */}
      {textContent && (
        <div className="max-w-[90%] text-sm text-zinc-200 leading-relaxed prose prose-invert prose-sm max-w-none">
          <MarkdownErrorBoundary
            fallback={
              <p className="whitespace-pre-wrap break-words text-zinc-200">
                {textContent}
              </p>
            }
          >
            <ReactMarkdown
              components={{
                p: ({ children }: { children?: React.ReactNode }) => (
                  <p className="mb-1 last:mb-0">
                    {processChildren(children, tokenLogos)}
                  </p>
                ),
                strong: ({ children }: { children?: React.ReactNode }) => (
                  <strong className="font-semibold text-zinc-100">
                    {processChildren(children, tokenLogos)}
                  </strong>
                ),
                em: ({ children }: { children?: React.ReactNode }) => (
                  <em>{processChildren(children, tokenLogos)}</em>
                ),
                li: ({ children }: { children?: React.ReactNode }) => (
                  <li>{processChildren(children, tokenLogos)}</li>
                ),
                code: ({ children, className }: { children?: React.ReactNode; className?: string }) => {
                  const isBlock = className?.includes("language-");
                  if (isBlock) {
                    return (
                      <code className="block rounded bg-zinc-800 px-2 py-1 text-xs font-mono text-zinc-300 overflow-x-auto">
                        {children}
                      </code>
                    );
                  }
                  return (
                    <code className="rounded bg-zinc-800 px-1 py-0.5 text-xs font-mono text-zinc-300">
                      {children}
                    </code>
                  );
                },
              }}
            >
              {textContent}
            </ReactMarkdown>
          </MarkdownErrorBoundary>
        </div>
      )}

      {/* Tool invocation cards */}
      {toolParts.map((part) => (
        <ToolCard
          key={part.toolCallId}
          toolName={part.toolName}
          toolCallId={part.toolCallId}
          input={part.input}
          state={part.state}
          output={part.output}
          onSign={onSign}
        />
      ))}
    </div>
  );
}
