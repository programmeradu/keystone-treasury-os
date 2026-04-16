"""One-off: migrate marketing home sections from dark to Stitch-inspired light tokens."""
from __future__ import annotations

import re
from pathlib import Path

SKIP = {
    "site-header.tsx",
    "site-footer.tsx",
    "hero-section.tsx",
    "home-client.tsx",
}

REPLACEMENTS: list[tuple[str, str]] = [
    ("border-t border-white/[0.04]", "border-t border-violet-200/35"),
    ("border border-white/[0.06]", "border border-violet-200/40"),
    ("border-white/[0.08]", "border-violet-200/50"),
    ("border-white/10", "border-violet-200/50"),
    ("border-white/20", "border-violet-200/60"),
    ("border-dreyv-green/10", "border-violet-200/45"),
    ("border-dreyv-green/15", "border-violet-300/50"),
    ("border-dreyv-green/20", "border-violet-300/55"),
    ("border-dreyv-green/30", "border-violet-400/45"),
    ("text-dreyv-green/20", "text-violet-400/70"),
    ("text-dreyv-green/25", "text-violet-600/80"),
    ("text-dreyv-green/30", "text-violet-600/85"),
    ("text-dreyv-green/40", "text-violet-600"),
    ("text-dreyv-green/50", "text-violet-600/90"),
    ("text-dreyv-green/60", "text-violet-700"),
    ("text-dreyv-green/70", "text-violet-700"),
    ("text-dreyv-green/80", "text-violet-800"),
    ("text-dreyv-green", "text-violet-600"),
    ("bg-dreyv-green/[0.02]", "bg-violet-500/[0.06]"),
    ("bg-dreyv-green/[0.03]", "bg-violet-500/[0.07]"),
    ("bg-dreyv-green/[0.04]", "bg-violet-500/[0.08]"),
    ("bg-dreyv-green/[0.05]", "bg-violet-500/[0.09]"),
    ("bg-dreyv-green/[0.06]", "bg-violet-500/[0.10]"),
    ("bg-dreyv-green/10", "bg-violet-100"),
    ("bg-dreyv-green/5", "bg-violet-50"),
    ("from-dreyv-green", "from-violet-600"),
    ("to-dreyv-green/50", "to-violet-500/80"),
    ("to-dreyv-green", "to-violet-600"),
    ("via-dreyv-green", "via-fuchsia-500"),
    ("text-keystone-green", "text-violet-600"),
    ("text-white/80", "text-slate-800"),
    ("text-white/70", "text-slate-600"),
    ("text-white/60", "text-slate-500"),
    ("text-white/55", "text-slate-600"),
    ("text-white/50", "text-slate-500"),
    ("text-white/45", "text-slate-500"),
    ("text-white/40", "text-slate-500"),
    ("text-white/35", "text-slate-600"),
    ("text-white/30", "text-slate-500"),
    ("text-white/25", "text-slate-400"),
    ("text-white/20", "text-slate-400"),
    ("text-white/15", "text-slate-400"),
    ("text-white/10", "text-slate-300"),
    ("hover:text-white/70", "hover:text-slate-700"),
    ("hover:text-white/60", "hover:text-slate-700"),
    ("hover:text-white", "hover:text-violet-800"),
    ("hover:bg-white/[0.05]", "hover:bg-violet-50/90"),
    ("hover:bg-white/[0.06]", "hover:bg-violet-50"),
    ("bg-white/[0.02]", "bg-white/70"),
    ("bg-white/[0.03]", "bg-white/75"),
    ("bg-white/[0.04]", "bg-white/80"),
    ("ring-white/10", "ring-violet-200/50"),
    ("ring-dreyv-green/20", "ring-violet-300/50"),
    ("shadow-dreyv-green/20", "shadow-violet-500/15"),
    ("shadow-dreyv-green/10", "shadow-violet-500/10"),
]

home = Path("src/components/home")


def main() -> None:
    for p in sorted(home.glob("*.tsx")):
        if p.name in SKIP:
            continue
        text = p.read_text(encoding="utf-8")
        orig = text
        for a, b in REPLACEMENTS:
            text = text.replace(a, b)
        text = re.sub(r"\btext-white\b(?!/)", "text-slate-900", text)
        if text != orig:
            p.write_text(text, encoding="utf-8")
            print("updated", p.name)


if __name__ == "__main__":
    main()
