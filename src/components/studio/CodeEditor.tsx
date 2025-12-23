"use client";

import React from "react";
import Editor from "@monaco-editor/react";

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
                path={`file:///${fileName}`} // Use dynamic path for proper case/extension mapping
                value={code}
                onChange={handleEditorChange}
                theme="vs-dark"
                onMount={(editor, monaco) => {
                    // Configure TypeScript Compiler
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
                        typeRoots: ["node_modules/@types"],
                        baseUrl: "file:///",
                        paths: {
                            "*": ["*"]
                        }
                    });

                    // Add all other files as libraries for cross-file resolution
                    Object.entries(allFiles).forEach(([name, file]) => {
                        if (name === fileName) return;
                        const path = `file:///${name}`;
                        try {
                            monaco.languages.typescript.typescriptDefaults.addExtraLib(file.content, path);
                        } catch (e) {
                            // Ignore duplicates
                        }
                    });

                    // Add Keystone Specific Stubs if not present
                    if (!allFiles["keystone.ts"]) {
                        monaco.languages.typescript.typescriptDefaults.addExtraLib(`
                            export declare const useVault: () => any;
                            export declare const useTurnkey: () => any;
                            export declare const AppEventBus: any;
                        `, "file:///keystone.ts");
                    }

                    // Add React Type Definitions (Simplified for Performance)
                    monaco.languages.typescript.typescriptDefaults.addExtraLib(
                        `
                        declare module 'react' {
                            export = React;
                        }
                        declare namespace React {
                            function useState<T>(initialState: T): [T, (newState: T) => void];
                            function useEffect(effect: () => void | (() => void), deps?: any[]): void;
                            function createElement(type: any, props?: any, ...children: any[]): any;
                            type ReactNode = any;
                            type FC<P = {}> = (props: P) => ReactNode;
                        }
                        declare namespace JSX {
                            interface IntrinsicElements {
                                [elemName: string]: any;
                            }
                        }
                        `,
                        "file:///node_modules/@types/react/index.d.ts"
                    );

                    // Add Lucide Types
                    monaco.languages.typescript.typescriptDefaults.addExtraLib(
                        `declare module 'lucide-react' { 
                            export const Activity: any; 
                            export const Shield: any; 
                            export const Zap: any; 
                            export const RefreshCw: any;
                            export const Layers: any;
                            export const Database: any;
                            export const ArrowRight: any;
                            export const Box: any;
                            export const Terminal: any;
                            export const Cpu: any;
                            export const Loader2: any;
                         }`,
                        "file:///node_modules/@types/lucide-react/index.d.ts"
                    );
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
                    scrollbar: {
                        verticalScrollbarSize: 8,
                        horizontalScrollbarSize: 8,
                    },
                }}
            />
        </div>
    );
}
