"use client";

import React, { useEffect, useRef, useCallback } from "react";
import Editor from "@monaco-editor/react";

import { KEYSTONE_SDK_TYPES } from "@/generated/keystone-sdk-types";

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

// ─── Matrix Rain Canvas ─────────────────────────────────────────────

interface ColumnState {
  y: number;
  speed: number;
  chars: string[];
}

const MATRIX_CHARS = "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ{}[]<>/\\|=+*&@#$";
const MATRIX_FONT_SIZE = 14;

function MatrixRain({ active }: { active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const columnsRef = useRef<ColumnState[]>([]);
  const fadingRef = useRef(false);
  const opacityRef = useRef(0);

  const initColumns = useCallback((w: number, h: number) => {
    const colCount = Math.floor(w / MATRIX_FONT_SIZE);
    const maxRow = Math.floor(h / MATRIX_FONT_SIZE);
    columnsRef.current = Array.from({ length: colCount }, () => ({
      y: Math.floor(Math.random() * maxRow),
      speed: 0.5 + Math.random() * 1.5,
      chars: Array.from({ length: maxRow + 10 }, () =>
        MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)]
      ),
    }));
  }, []);

  const draw = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number) => {
    ctx.fillStyle = "rgba(10, 14, 23, 0.06)";
    ctx.fillRect(0, 0, w, h);

    ctx.font = `${MATRIX_FONT_SIZE}px 'JetBrains Mono', monospace`;

    const cols = columnsRef.current;
    for (let i = 0; i < cols.length; i++) {
      const col = cols[i];
      const x = i * MATRIX_FONT_SIZE;
      const headY = Math.floor(col.y);
      const headPx = headY * MATRIX_FONT_SIZE;

      // Head character: bright white-green with strong glow
      ctx.shadowColor = "#36e27b";
      ctx.shadowBlur = 12;
      ctx.fillStyle = "rgba(220, 255, 230, 0.95)";
      const headChar = MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)];
      ctx.fillText(headChar, x, headPx);

      // Trail: 3-5 chars behind the head with decreasing brightness
      ctx.shadowBlur = 3;
      const trailLen = 3 + Math.floor(Math.random() * 3);
      for (let t = 1; t <= trailLen; t++) {
        const trailY = (headY - t) * MATRIX_FONT_SIZE;
        if (trailY < 0) break;
        const alpha = 0.6 - (t / trailLen) * 0.5;
        ctx.fillStyle = `rgba(54, 226, 123, ${alpha})`;
        ctx.fillText(col.chars[(headY - t + col.chars.length) % col.chars.length], x, trailY);
      }

      ctx.shadowBlur = 0;

      // Random character flicker in the column
      if (Math.random() > 0.95) {
        const flickerRow = Math.floor(Math.random() * headY);
        const flickerY = flickerRow * MATRIX_FONT_SIZE;
        ctx.fillStyle = `rgba(54, 226, 123, ${0.15 + Math.random() * 0.2})`;
        ctx.fillText(MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)], x, flickerY);
      }

      // Advance at per-column speed
      col.y += col.speed;

      // Reset when past bottom
      if (headPx > h + MATRIX_FONT_SIZE * 8 && Math.random() > 0.98) {
        col.y = 0;
        col.speed = 0.5 + Math.random() * 1.5;
      }
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;
      initColumns(canvas.width, canvas.height);
    };

    if (active) {
      fadingRef.current = false;
      opacityRef.current = 0;
      resize();
      ctx.fillStyle = "#0a0e17";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else if (opacityRef.current > 0) {
      fadingRef.current = true;
    }

    let lastTime = 0;
    const FPS_INTERVAL = 1000 / 30;

    const loop = (timestamp: number) => {
      const elapsed = timestamp - lastTime;
      if (elapsed >= FPS_INTERVAL) {
        lastTime = timestamp - (elapsed % FPS_INTERVAL);

        if (active && opacityRef.current < 0.35) {
          opacityRef.current = Math.min(0.35, opacityRef.current + 0.02);
        }
        if (fadingRef.current) {
          opacityRef.current = Math.max(0, opacityRef.current - 0.015);
          if (opacityRef.current <= 0) {
            fadingRef.current = false;
            cancelAnimationFrame(animRef.current);
            return;
          }
        }

        canvas.style.opacity = String(opacityRef.current);
        draw(ctx, canvas.width, canvas.height);
      }

      if (active || fadingRef.current) {
        animRef.current = requestAnimationFrame(loop);
      }
    };

    if (active || fadingRef.current) {
      animRef.current = requestAnimationFrame(loop);
    }

    const observer = new ResizeObserver(resize);
    observer.observe(parent);

    return () => {
      cancelAnimationFrame(animRef.current);
      observer.disconnect();
    };
  }, [active, draw, initColumns]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 z-10 pointer-events-none"
      style={{ opacity: 0 }}
    />
  );
}

// ─── Ghost Cursor CSS ───────────────────────────────────────────────

const GHOST_CURSOR_STYLES = `
.ghost-typed-line {
  background: rgba(54, 226, 123, 0.05);
  border-left: 2px solid rgba(54, 226, 123, 0.5);
  animation: ghost-line-reveal 0.5s ease-out forwards;
  opacity: 0;
}
@keyframes ghost-line-reveal {
  0% { opacity: 0; transform: translateX(-4px); }
  60% { opacity: 1; }
  100% { opacity: 1; transform: translateX(0); background: rgba(54, 226, 123, 0.02); }
}
.ghost-cursor-after::after {
  content: '';
  display: inline-block;
  width: 2px;
  height: 18px;
  background: #36e27b;
  box-shadow: 0 0 6px rgba(54, 226, 123, 1), 0 0 16px rgba(54, 226, 123, 0.5), 0 0 30px rgba(54, 226, 123, 0.2);
  animation: ghost-blink 0.6s ease-in-out infinite;
  vertical-align: text-bottom;
  margin-left: 1px;
  border-radius: 1px;
}
@keyframes ghost-blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.15; }
}
.ghost-text-inline {
  color: #36e27b !important;
  animation: ghost-text-fade 1.2s ease-out forwards;
}
@keyframes ghost-text-fade {
  0% { color: #36e27b; text-shadow: 0 0 4px rgba(54, 226, 123, 0.4); }
  100% { color: inherit; text-shadow: none; }
}
`;

// ─── Component ──────────────────────────────────────────────────────

interface CodeEditorProps {
  code: string;
  language: string;
  onChange: (value: string) => void;
  fileName: string;
  allFiles?: Record<string, { content: string }>;
  isGenerating?: boolean;
}

export function CodeEditor({ code, language, onChange, fileName, allFiles = {}, isGenerating = false }: CodeEditorProps) {
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);
  const previousCodeRef = useRef<string>(code);
  const ghostDecorationsRef = useRef<string[]>([]);
  const cursorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cursorLineQueueRef = useRef<number[]>([]);
  const cursorColRef = useRef<number>(1);
  const isFirstMount = useRef(true);

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      onChange(value);
    }
  };

  // Ghost Cursor: character-level cursor walk with staggered line reveals
  useEffect(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;

    if (!editor || !monaco) return;

    if (!isGenerating) {
      if (ghostDecorationsRef.current.length > 0) {
        ghostDecorationsRef.current = editor.deltaDecorations(ghostDecorationsRef.current, []);
      }
      if (cursorTimerRef.current) {
        clearTimeout(cursorTimerRef.current);
        cursorTimerRef.current = null;
      }
      cursorLineQueueRef.current = [];
      previousCodeRef.current = code;
      return;
    }

    if (isFirstMount.current) {
      isFirstMount.current = false;
      previousCodeRef.current = code;
      return;
    }

    const oldCode = previousCodeRef.current;
    if (oldCode === code) return;

    const oldLines = oldCode.split("\n");
    const newLines = code.split("\n");

    const changedLineNumbers: number[] = [];
    const maxLen = Math.max(oldLines.length, newLines.length);
    for (let i = 0; i < maxLen; i++) {
      if (oldLines[i] !== newLines[i]) {
        changedLineNumbers.push(i + 1);
      }
    }

    if (changedLineNumbers.length === 0) {
      previousCodeRef.current = code;
      return;
    }

    // Build staggered decorations: each line gets an incremental animation-delay
    const LINE_REVEAL_DELAY_MS = 30;
    const decorations: Array<{ range: any; options: any }> = [];

    changedLineNumbers.forEach((lineNum, idx) => {
      decorations.push({
        range: new monaco.Range(lineNum, 1, lineNum, 1),
        options: {
          isWholeLine: true,
          className: "ghost-typed-line",
          inlineClassName: "ghost-text-inline",
          stickiness: 1,
        },
      });

      // Per-line stagger via inline style injection
      const styleId = `ghost-delay-${lineNum}`;
      if (!document.getElementById(styleId)) {
        const s = document.createElement("style");
        s.id = styleId;
        s.textContent = `.ghost-typed-line[data-line="${lineNum}"] { animation-delay: ${idx * LINE_REVEAL_DELAY_MS}ms; }`;
        document.head.appendChild(s);
        setTimeout(() => s.remove(), 2000);
      }
    });

    // Cursor animation: walk through changed lines character by character
    if (cursorTimerRef.current) {
      clearTimeout(cursorTimerRef.current);
    }
    cursorLineQueueRef.current = [...changedLineNumbers];
    cursorColRef.current = 1;

    const walkCursor = () => {
      const ed = editorRef.current;
      const mc = monacoRef.current;
      if (!ed || !mc || cursorLineQueueRef.current.length === 0) return;

      const currentLine = cursorLineQueueRef.current[0];
      const lineContent = newLines[currentLine - 1] || "";
      const col = cursorColRef.current;

      // Update cursor decoration at current position
      const cursorDec = [{
        range: new mc.Range(currentLine, col, currentLine, col),
        options: {
          isWholeLine: false,
          className: "",
          afterContentClassName: "ghost-cursor-after",
          stickiness: 1,
        },
      }];

      // Keep existing line decorations, update cursor position
      const lineDecos = cursorLineQueueRef.current.map((ln) => ({
        range: new mc.Range(ln, 1, ln, 1),
        options: { isWholeLine: true, className: "ghost-typed-line", stickiness: 1 },
      }));

      ghostDecorationsRef.current = ed.deltaDecorations(
        ghostDecorationsRef.current,
        [...lineDecos, ...cursorDec],
      );

      ed.revealLineInCenterIfOutsideViewport(currentLine);

      // Advance: walk columns then move to next line
      const CHARS_PER_TICK = 4;
      if (col + CHARS_PER_TICK < lineContent.length + 1) {
        cursorColRef.current = col + CHARS_PER_TICK;
        cursorTimerRef.current = setTimeout(walkCursor, 12);
      } else {
        cursorLineQueueRef.current.shift();
        cursorColRef.current = 1;
        if (cursorLineQueueRef.current.length > 0) {
          cursorTimerRef.current = setTimeout(walkCursor, 18);
        }
      }
    };

    // Apply initial decorations immediately, then start cursor walk
    ghostDecorationsRef.current = editor.deltaDecorations(
      ghostDecorationsRef.current,
      decorations,
    );

    cursorTimerRef.current = setTimeout(walkCursor, 30);
    previousCodeRef.current = code;
  }, [code, isGenerating]);

  // Cleanup cursor timer on unmount
  useEffect(() => {
    return () => {
      if (cursorTimerRef.current) clearTimeout(cursorTimerRef.current);
    };
  }, []);

  return (
    <div className="flex-1 h-full relative">
      <style dangerouslySetInnerHTML={{ __html: GHOST_CURSOR_STYLES }} />

      {/* Matrix Rain Canvas Overlay */}
      <MatrixRain active={isGenerating} />

      {/* Agent Status Badge (corner) */}
      {isGenerating && (
        <div className="absolute top-3 right-3 z-20 flex items-center gap-2 px-3 py-1.5 bg-black/80 border border-[#36e27b]/40 rounded-full text-[#36e27b] text-[10px] font-mono tracking-widest uppercase shadow-[0_0_15px_rgba(54,226,123,0.2)] pointer-events-none">
          <span className="w-1.5 h-3 bg-[#36e27b] rounded-[1px] animate-pulse" />
          Agent Typing
        </div>
      )}

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
          editorRef.current = editor;
          monacoRef.current = monaco;

          // ─── TypeScript Compiler Options (strict) ────
          monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
            target: monaco.languages.typescript.ScriptTarget.ESNext,
            allowNonTsExtensions: true,
            moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
            module: monaco.languages.typescript.ModuleKind.ESNext,
            noEmit: true,
            esModuleInterop: true,
            jsx: monaco.languages.typescript.JsxEmit.React,
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
