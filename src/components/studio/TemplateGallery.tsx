"use client";

/**
 * TemplateGallery — Modal for selecting a project template on new project creation.
 *
 * Shows categorized template cards with preview descriptions.
 * Selecting a template populates the Studio with starter files.
 *
 * [P3] — Project Templates Gallery
 */

import React, { useState, useMemo } from "react";
import { X, Sparkles, LayoutGrid } from "lucide-react";
import { PROJECT_TEMPLATES, type ProjectTemplate } from "@/lib/studio/templates";

interface TemplateGalleryProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectTemplate: (template: ProjectTemplate) => void;
    onBlank: () => void;
}

export function TemplateGallery({ isOpen, onClose, onSelectTemplate, onBlank }: TemplateGalleryProps) {
    const [activeCategory, setActiveCategory] = useState<string | null>(null);

    const categories = useMemo(() => {
        const cats = new Set<string>();
        for (const t of PROJECT_TEMPLATES) cats.add(t.category);
        return Array.from(cats);
    }, []);

    const filtered = useMemo(() => {
        if (!activeCategory) return PROJECT_TEMPLATES;
        return PROJECT_TEMPLATES.filter((t) => t.category === activeCategory);
    }, [activeCategory]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div
                className="w-full max-w-2xl bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
                    <div className="flex items-center gap-3">
                        <LayoutGrid className="w-5 h-5 text-emerald-400" />
                        <div>
                            <h2 className="text-sm font-bold text-white">New Project</h2>
                            <p className="text-[11px] text-zinc-500">Start from a template or blank canvas</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Category Filters */}
                <div className="flex items-center gap-2 px-6 py-3 border-b border-zinc-800/50">
                    <button
                        onClick={() => setActiveCategory(null)}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                            !activeCategory
                                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                                : "text-zinc-500 hover:text-zinc-300 border border-transparent"
                        }`}
                    >
                        All
                    </button>
                    {categories.map((cat) => (
                        <button
                            key={cat}
                            onClick={() => setActiveCategory(cat)}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                                activeCategory === cat
                                    ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                                    : "text-zinc-500 hover:text-zinc-300 border border-transparent"
                            }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                {/* Template Grid */}
                <div className="p-6 grid grid-cols-2 gap-3 max-h-[50vh] overflow-auto">
                    {/* Blank Project Card */}
                    <button
                        onClick={onBlank}
                        className="group p-5 rounded-xl border border-dashed border-zinc-700 hover:border-emerald-500/30 bg-zinc-800/20 hover:bg-emerald-500/5 transition-all text-left"
                    >
                        <div className="flex items-center gap-3 mb-3">
                            <span className="text-2xl">📄</span>
                            <div>
                                <p className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors">
                                    Blank Project
                                </p>
                                <p className="text-[10px] text-zinc-600">Start from scratch</p>
                            </div>
                        </div>
                        <p className="text-[11px] text-zinc-500 leading-relaxed">
                            Empty canvas with default SDK hooks. Build anything from zero.
                        </p>
                    </button>

                    {/* Template Cards */}
                    {filtered.map((template) => (
                        <button
                            key={template.id}
                            onClick={() => onSelectTemplate(template)}
                            className="group p-5 rounded-xl border border-zinc-800 hover:border-emerald-500/30 bg-zinc-800/20 hover:bg-emerald-500/5 transition-all text-left"
                        >
                            <div className="flex items-center gap-3 mb-3">
                                <span className="text-2xl">{template.icon}</span>
                                <div>
                                    <p className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors">
                                        {template.name}
                                    </p>
                                    <p className="text-[10px] text-zinc-600">{template.category}</p>
                                </div>
                            </div>
                            <p className="text-[11px] text-zinc-500 leading-relaxed">
                                {template.description}
                            </p>
                            <div className="mt-3 flex items-center gap-1.5">
                                <Sparkles className="w-3 h-3 text-emerald-500/40" />
                                <span className="text-[9px] text-zinc-600 font-bold uppercase tracking-wider">
                                    {Object.keys(template.files).length} file{Object.keys(template.files).length > 1 ? "s" : ""}
                                </span>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
