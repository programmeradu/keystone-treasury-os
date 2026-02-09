"use client";

import React from "react";
import Editor from "@monaco-editor/react";

// ─── Full @keystone-os/sdk Type Definitions ─────────────────────────

const KEYSTONE_SDK_TYPES = `
declare module '@keystone-os/sdk' {
  // ─── Vault ──────────────────────────────────────────────
  interface Token {
    symbol: string;
    name: string;
    balance: number;
    price: number;
    mint?: string;
    decimals?: number;
    logoURI?: string;
  }

  interface VaultState {
    activeVault: string;
    balances: Record<string, number>;
    tokens: Token[];
  }

  export function useVault(): VaultState;

  // ─── Turnkey (Wallet) ───────────────────────────────────
  interface TurnkeyState {
    getPublicKey: () => Promise<string>;
    signTransaction: (
      transaction: unknown,
      description?: string
    ) => Promise<{ signature: string }>;
  }

  export function useTurnkey(): TurnkeyState;

  // ─── Fetch (Proxy Gate) ─────────────────────────────────
  interface FetchOptions {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    headers?: Record<string, string>;
    body?: unknown;
  }

  interface FetchResult<T = unknown> {
    data: T | null;
    error: string | null;
    loading: boolean;
    refetch: () => Promise<void>;
  }

  export function useFetch<T = unknown>(
    url: string,
    options?: FetchOptions
  ): FetchResult<T>;

  // ─── Event Bus ──────────────────────────────────────────
  interface EventBus {
    emit: (type: string, payload?: unknown) => void;
  }

  export const AppEventBus: EventBus;
}

// Backward-compat alias
declare module './keystone' {
  export { useVault, useTurnkey, AppEventBus } from '@keystone-os/sdk';
}
`;

const REACT_TYPES = `
declare module 'react' {
  export = React;
  export as namespace React;
}

declare namespace React {
  type ReactNode = string | number | boolean | null | undefined | ReactElement | ReactNode[];
  type ReactElement = { type: any; props: any; key: string | number | null };
  type FC<P = {}> = (props: P) => ReactNode;
  type PropsWithChildren<P = {}> = P & { children?: ReactNode };

  function useState<T>(initialState: T | (() => T)): [T, (newState: T | ((prev: T) => T)) => void];
  function useEffect(effect: () => void | (() => void), deps?: readonly any[]): void;
  function useCallback<T extends (...args: any[]) => any>(callback: T, deps: readonly any[]): T;
  function useMemo<T>(factory: () => T, deps: readonly any[]): T;
  function useRef<T>(initialValue: T | null): { current: T | null };
  function useContext<T>(context: React.Context<T>): T;
  function useReducer<R extends React.Reducer<any, any>>(reducer: R, initialState: any): [any, React.Dispatch<any>];

  function createElement(type: any, props?: any, ...children: any[]): ReactElement;
  function createContext<T>(defaultValue: T): Context<T>;
  function memo<T extends FC<any>>(component: T): T;
  function forwardRef<T, P>(render: (props: P, ref: React.Ref<T>) => ReactNode): FC<P>;
  function Fragment(props: { children?: ReactNode }): ReactNode;

  interface Context<T> { Provider: FC<{ value: T; children?: ReactNode }>; Consumer: FC<{ children: (value: T) => ReactNode }> }
  type Ref<T> = { current: T | null } | ((instance: T | null) => void);
  type Dispatch<A> = (value: A) => void;
  type Reducer<S, A> = (prevState: S, action: A) => S;
  type SetStateAction<S> = S | ((prevState: S) => S);
  type ChangeEvent<T = Element> = { target: T & { value: string; checked?: boolean } };
  type FormEvent<T = Element> = { preventDefault: () => void; target: T };
  type MouseEvent<T = Element> = { preventDefault: () => void; stopPropagation: () => void; clientX: number; clientY: number; target: T };
  type KeyboardEvent<T = Element> = { key: string; code: string; preventDefault: () => void; shiftKey: boolean; ctrlKey: boolean; metaKey: boolean };
  type CSSProperties = Record<string, string | number>;
}

declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: any;
  }
}
`;

const LUCIDE_TYPES = `
declare module 'lucide-react' {
  import { FC } from 'react';
  interface IconProps {
    size?: number | string;
    color?: string;
    strokeWidth?: number | string;
    className?: string;
    style?: React.CSSProperties;
  }
  // Common icons
  export const Activity: FC<IconProps>;
  export const AlertTriangle: FC<IconProps>;
  export const ArrowDown: FC<IconProps>;
  export const ArrowLeft: FC<IconProps>;
  export const ArrowRight: FC<IconProps>;
  export const ArrowUp: FC<IconProps>;
  export const ArrowUpDown: FC<IconProps>;
  export const BarChart3: FC<IconProps>;
  export const Box: FC<IconProps>;
  export const Check: FC<IconProps>;
  export const ChevronDown: FC<IconProps>;
  export const ChevronRight: FC<IconProps>;
  export const Clock: FC<IconProps>;
  export const Copy: FC<IconProps>;
  export const Cpu: FC<IconProps>;
  export const Database: FC<IconProps>;
  export const ExternalLink: FC<IconProps>;
  export const Eye: FC<IconProps>;
  export const Globe: FC<IconProps>;
  export const Hash: FC<IconProps>;
  export const Layers: FC<IconProps>;
  export const Loader2: FC<IconProps>;
  export const Lock: FC<IconProps>;
  export const RefreshCw: FC<IconProps>;
  export const Search: FC<IconProps>;
  export const Settings: FC<IconProps>;
  export const Shield: FC<IconProps>;
  export const Sparkles: FC<IconProps>;
  export const Terminal: FC<IconProps>;
  export const TrendingDown: FC<IconProps>;
  export const TrendingUp: FC<IconProps>;
  export const Wallet: FC<IconProps>;
  export const X: FC<IconProps>;
  export const Zap: FC<IconProps>;
  // Catch-all for unlisted icons
  const _default: Record<string, FC<IconProps>>;
  export default _default;
}
`;

// ─── Keystone Neon Theme ────────────────────────────────────────────

function defineKeystoneTheme(monaco: any) {
    monaco.editor.defineTheme("keystone-neon", {
        base: "vs-dark",
        inherit: true,
        rules: [
            { token: "comment", foreground: "4a5568", fontStyle: "italic" },
            { token: "keyword", foreground: "c792ea" },
            { token: "string", foreground: "c3e88d" },
            { token: "number", foreground: "f78c6c" },
            { token: "type", foreground: "82aaff" },
            { token: "function", foreground: "82aaff" },
            { token: "variable", foreground: "e2e8f0" },
            { token: "constant", foreground: "89ddff" },
            { token: "tag", foreground: "f07178" },
            { token: "attribute.name", foreground: "c792ea" },
            { token: "attribute.value", foreground: "c3e88d" },
            { token: "delimiter", foreground: "89ddff" },
            { token: "delimiter.bracket", foreground: "ffd700" },
        ],
        colors: {
            "editor.background": "#0a0e17",
            "editor.foreground": "#e2e8f0",
            "editor.lineHighlightBackground": "#1a1f2e",
            "editor.selectionBackground": "#36e27b30",
            "editor.inactiveSelectionBackground": "#36e27b15",
            "editorCursor.foreground": "#36e27b",
            "editorLineNumber.foreground": "#2d3748",
            "editorLineNumber.activeForeground": "#36e27b",
            "editorIndentGuide.background": "#1a202c",
            "editorIndentGuide.activeBackground": "#2d3748",
            "editor.selectionHighlightBackground": "#36e27b15",
            "editorBracketMatch.background": "#36e27b20",
            "editorBracketMatch.border": "#36e27b50",
        },
    });
}

// ─── Component ──────────────────────────────────────────────────────

interface CodeEditorProps {
    code: string;
    language: string;
    onChange: (value: string) => void;
    fileName: string;
    allFiles?: Record<string, { content: string }>;
}

export function CodeEditor({ code, language, onChange, fileName, allFiles = {} }: CodeEditorProps) {
    const handleEditorChange = (value: string | undefined) => {
        if (value !== undefined) {
            onChange(value);
        }
    };

    return (
        <div className="flex-1 h-full">
            <Editor
                height="100%"
                defaultLanguage="typescript"
                path={`file:///${fileName}`}
                value={code}
                onChange={handleEditorChange}
                theme="keystone-neon"
                beforeMount={(monaco) => {
                    defineKeystoneTheme(monaco);
                }}
                onMount={(editor, monaco) => {
                    // ─── TypeScript Compiler Options (strict) ────
                    monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
                        target: monaco.languages.typescript.ScriptTarget.ESNext,
                        allowNonTsExtensions: true,
                        moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
                        module: monaco.languages.typescript.ModuleKind.ESNext,
                        noEmit: true,
                        esModuleInterop: true,
                        jsx: monaco.languages.typescript.JsxEmit.ReactJSX,
                        reactNamespace: "React",
                        allowJs: true,
                        strict: true,
                        noImplicitAny: false,
                        strictNullChecks: false,
                        baseUrl: "file:///",
                        paths: {
                            "@keystone-os/sdk": ["file:///node_modules/@keystone-os/sdk/index.d.ts"],
                            "./keystone": ["file:///node_modules/@keystone-os/sdk/index.d.ts"],
                            "*": ["*"],
                        },
                    });

                    monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
                        noSemanticValidation: false,
                        noSyntaxValidation: false,
                    });

                    // ─── Inject Type Definitions ─────────────────
                    monaco.languages.typescript.typescriptDefaults.addExtraLib(
                        KEYSTONE_SDK_TYPES,
                        "file:///node_modules/@keystone-os/sdk/index.d.ts"
                    );

                    monaco.languages.typescript.typescriptDefaults.addExtraLib(
                        REACT_TYPES,
                        "file:///node_modules/@types/react/index.d.ts"
                    );

                    monaco.languages.typescript.typescriptDefaults.addExtraLib(
                        LUCIDE_TYPES,
                        "file:///node_modules/@types/lucide-react/index.d.ts"
                    );

                    // ─── Cross-file Resolution ───────────────────
                    Object.entries(allFiles).forEach(([name, file]) => {
                        if (name === fileName) return;
                        const path = `file:///${name}`;
                        try {
                            monaco.languages.typescript.typescriptDefaults.addExtraLib(file.content, path);
                        } catch (e) {
                            // Ignore duplicates
                        }
                    });
                }}
                options={{
                    minimap: { enabled: false },
                    fontSize: 13,
                    lineNumbers: "on",
                    roundedSelection: true,
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    tabSize: 2,
                    wordWrap: "on",
                    padding: { top: 12 },
                    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                    fontLigatures: true,
                    cursorBlinking: "smooth",
                    cursorSmoothCaretAnimation: "on",
                    smoothScrolling: true,
                    renderLineHighlight: "gutter",
                    bracketPairColorization: { enabled: true },
                    scrollbar: {
                        verticalScrollbarSize: 8,
                        horizontalScrollbarSize: 8,
                    },
                }}
            />
        </div>
    );
}
