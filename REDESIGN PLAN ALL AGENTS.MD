CLAUDE AGENT:
Landing Page Premium Overhaul Plan
Complete redesign of the Keystone landing page, replacing all basic patterns with premium, advanced UI components and a refined visual identity that conveys institutional-grade credibility for a Web3 treasury operating system.
Audit Summary: Current State
What exists (13 files in src/components/home/)
home-client.tsx -- orchestrator
site-header.tsx / site-footer.tsx -- navigation
hero-section.tsx -- headline, badge, stats, CTAs
problem-section.tsx -- "Death by Fragmentation" before/after
pillars-section.tsx -- 6 pillar cards
demo-section.tsx -- interactive command terminal
deep-dive-section.tsx -- tabbed module features
atlas-section.tsx -- Atlas tools grid + live prices
how-it-works-section.tsx -- 3-step process
ecosystem-section.tsx -- integration partners (text only)
use-cases-section.tsx -- 6 use-case cards
cta-section.tsx -- final CTA
Critical Problems
Design/Visual:
Monotone palette -- entire page is #0B0C10 black + #36e27b green. No depth, no secondary accents, no visual hierarchy.
Every card uses identical rounded-2xl border-white/[0.06] bg-white/[0.02] -- zero visual variety across 10+ sections.
No product screenshots, mockups, or visual demonstrations anywhere. Users never see the actual product.
Single font (Spline Sans) for everything. No display/headline distinction.
Backgrounds are just faint green blur circles. No texture, pattern, or depth.
No scroll progress, no parallax, no scroll-triggered sequences -- only basic opacity fade-ins.
Content gaps: 7. No security/trust section (critical for a treasury product handling real funds). 8. No product screenshots or app previews -- the dashboard, studio, atlas are all rich UIs that go unseen. 9. Ecosystem section shows partner names as plain text -- no logos, no credibility signal. 10. No "Who is this for?" targeting (DAOs, protocols, VCs, treasury teams). 11. Missing features from the actual app: Yield Optimizer, Risk Radar, Payroll Streams, Directive Hub, real-time collaboration (Liveblocks War Room), light/dark theme, Marketplace with revenue sharing. 12. Footer has no social links, no newsletter, no community links. 13. Hero stats are static text -- should be animated counters. 14. No comparison or differentiation vs competitors.
Library/Component issues: 15. Framer Motion used at basic level only (opacity + translateY). No spring physics, layout animations, or gesture interactions. 16. shadcn Button is the only UI component used. Everything else is hand-rolled divs. 17. No premium animation components (no number tickers, animated beams, bento grids, marquees, shimmer effects, etc.).
Content Corrections Found
"Solana Atlas" section says "Free Public Good" -- should clarify this is a gateway/funnel, not charity
The six pillars list "Agents" as a pillar but the actual app organizes agents as part of the Command Layer, not a separate pillar
"5 Agents" stat in hero -- the actual codebase shows more nuanced agent architecture (Lookup, Builder, Analysis, Transaction, Coordinator + monitoring + risk profiles)
Missing mention of Turnkey integration for institutional key management
Missing mention of Liveblocks real-time collaboration (War Room, live cursors, team notes)
Missing mention of theme customization (dark/light modes)
Marketplace "80/20 revenue split" is mentioned but never emphasized as a differentiator
Recommended Premium Libraries
Primary: Magic UI (free, MIT, shadcn-compatible)
Already built on Tailwind + Framer Motion + React -- drops in cleanly. Components to use:
Number Ticker -- animated stat counters in hero
Animated Beam -- agent orchestration visualization
Bento Grid -- pillars section layout
Marquee -- ecosystem logos strip
Shimmer Button -- primary CTAs
Border Beam -- card highlights
Dot Pattern / Grid Pattern -- section backgrounds
Terminal -- demo section replacement
Blur Fade -- section entry animations (replaces basic fade-in)
Text Animate -- headline entrance effects
Particles -- hero background depth
Safari frame -- product screenshot mockups
Orbiting Circles -- Atlas tools visualization
Secondary: Aceternity UI (select components, free)
Spotlight effect for cards
Moving Border for featured elements
Lamp effect for CTA section
Keep: Framer Motion (already installed)
Upgrade usage to spring physics, layout animations, scroll-linked transforms, and useScroll + useTransform for parallax.
Typography upgrade
Add Inter (or Geist Sans which Next.js bundles) as body font, keep Spline Sans or switch to Cabinet Grotesk / Satoshi for display headlines. A two-font system creates immediate visual hierarchy.
Color system upgrade
Expand beyond green monochrome:
Primary: #36e27b (keep the green, it is Keystone's identity)
Secondary accents per module: blue for Agents, purple for Treasury, pink for Studio, amber for Foresight, cyan for Atlas
Neutral depth: introduce subtle warm grays instead of pure black (#0C0D12 -> #0D0F14 gradient)
Add subtle noise/grain texture overlay for depth
Use gradient borders (not flat border-white/6 everywhere)
Implementation Plan (Section by Section)
Phase 0: Foundation
Install Magic UI CLI and required components
Set up premium color tokens and CSS variables for the landing page
Add display font (Inter Tight or Satoshi via Google Fonts / next/font)
Create shared landing page utility components: gradient borders, noise texture overlay, section wrapper with dot/grid pattern backgrounds
Add a subtle scroll progress bar to the header
Phase 1: Site Header
Add scroll progress indicator (thin accent-colored bar at top)
Refined blur + gradient border on scroll (not just opacity change)
Replace plain text nav links with subtle hover underline animations
Use Shimmer Button for "Open App" CTA
Ensure mobile menu feels premium (staggered animation, backdrop blur)
Phase 2: Hero Section
Background: Dot Pattern or subtle Particles field instead of plain blur circles
Badge: Animated Shiny Text effect for "The Sovereign OS" badge
Headline: Text Animate (blur-fade-in word by word) instead of simple opacity fade. Consider "Command-Ops" with Animated Gradient Text
Stats: Number Ticker for animated counting. Redesign stat cards with subtle gradient borders
CTAs: Shimmer Button for primary "Open App". Interactive Hover Button for secondary
Add product mockup: Safari frame component showing a screenshot of the actual dashboard below the hero text (this is the single biggest missing element)
Consider a subtle grid pattern overlay on the hero background
Phase 3: Problem Section
Replace the basic before/after grid with an Animated Beam diagram: fragmented tools on the left connected by chaotic lines, flowing into a single Keystone node on the right
Or: use a more sophisticated visual metaphor -- scattered tool logos (with real logos where available) converging into the Keystone logo
Better typography: larger "Death by Fragmentation" with Line Shadow Text or similar treatment
Add subtle Dot Pattern background
Phase 4: Pillars Section -- Bento Grid
Replace the uniform 3x2 grid with a Bento Grid layout (varying card sizes based on importance)
Command Layer and Agent System get larger cards (2-column span) with richer content
Use Magic Card with spotlight hover effect instead of flat cards
Add Border Beam to one or two featured cards
Each card gets a subtle gradient background matching its accent color (not just icon color)
Consider adding mini-illustrations or diagrams inside the larger cards
Phase 5: Demo Section (Command Terminal)
Replace hand-built terminal with Magic UI Terminal component for the chrome/frame
Add Typing Animation for the command input (auto-types example commands)
Better execution visualization: staggered step reveal with checkmarks, progress indicators
Add a subtle pulsing glow around the terminal when "executing"
Consider split view: terminal on left, execution plan visualization on right
Phase 6: Deep Dive Section
Add Safari frame product screenshots for each tab (Treasury Hub, Studio, Foresight)
When user switches tabs, show the corresponding app screenshot alongside the feature list
This is where the user finally sees the actual product -- make it count
Use layout animations (Framer Motion layoutId) for smooth tab transitions
Reduce text density: fewer words, more visual
Phase 7: Atlas Section
Replace plain text tool grid with Orbiting Circles or an interactive visualization
Or: keep grid but use Neon Gradient Card for each tool
Live price ticker should use Number Ticker with animated updates
Add a mini Atlas screenshot in Safari frame
Phase 8: How It Works
Connect the 3 steps with Animated Beam lines
Use large step numbers with gradient treatment
Add subtle animations: each step "lights up" as user scrolls to it
Consider a horizontal layout on desktop with a connecting line/beam
Phase 9: Ecosystem Section (Integrations)
Replace text-only boxes with actual integration partner logos (Solana, Squads, Jupiter, Helius, Marinade, Jito, Liveblocks, Turnkey)
Use Marquee (infinite scroll) for the logo strip -- this is industry standard and looks polished
Add a second row scrolling in the opposite direction for visual depth
Logos should be grayscale by default, full color on hover
Phase 10: Use Cases Section
Redesign as a more visually distinct section (not another card grid identical to Pillars)
Option A: Alternating left-right layout with illustrations
Option B: Horizontal scrolling cards (carousel-style)
Option C: Accordion/expandable format
Whichever we pick, it must look different from the Pillars and Deep Dive grids
Phase 11: New Section -- Security & Trust
Insert between Use Cases and CTA. Content:
"Non-custodial. Simulation-first. Your keys, your control." (currently buried in tiny footer text)
Key trust signals: Squads multisig integration, Turnkey institutional key management, simulation-before-execution pipeline, full audit trails
Visual: clean 3-4 column layout with large, clear trust badges/statements
No fluff -- this section should feel authoritative and minimal
Phase 12: CTA Section
Lamp effect or dramatic gradient background (not just a green blur)
Larger, bolder typography
Shimmer Button for primary CTA
Add a secondary hook: "Start with Atlas for free" vs "Launch the full OS"
Subtle Particles or Retro Grid background for visual drama
Phase 13: Site Footer
Add social links (Twitter/X, Discord, GitHub) -- even if placeholder
Add newsletter signup input
Richer link structure
Subtle gradient top border instead of plain border-white/4
Questions for You Before Implementation
Product screenshots: Can you provide screenshots of the Dashboard, Studio, Atlas, and Treasury pages? These are critical for the Safari frame mockups. If not, I can build placeholder mockups, but real screenshots would be far more impactful.
Integration logos: Do you have SVG logos for Solana, Jupiter, Squads, Helius, Marinade, Jito, Liveblocks, Turnkey? Or should I source them from official brand kits?
Social links: Do you have Twitter/X, Discord, GitHub URLs to include in the footer?
Any sections you want to cut? The page currently has 10 content sections. With the new Security section, that is 11. Are there any you feel are redundant or should be merged? (My recommendation: merge "Use Cases" into "Pillars" to reduce repetition, and merge "Ecosystem" into the footer or make it a thin marquee strip.)
Video or demo: Do you have a product demo video? A Hero Video Dialog (from Magic UI) could replace or supplement the Safari frame screenshot and would be extremely high-impact.
Budget for premium components: Magic UI free tier covers most needs. Magic UI Pro ($149) adds 50+ blocks and templates that could accelerate this significantly. Aceternity UI Pro is $99. Are either of these options you'd consider?
Any APIs I need access to: The existing SOL price fetch in the hero/atlas sections -- should that stay? Any other live data you want on the landing page?
Implementation Priority
If we want to maximize impact with the least effort first:
Phase 0 (Foundation) -- must come first
Phase 2 (Hero) -- first impression, highest impact
Phase 6 (Deep Dive with screenshots) -- proves the product is real
Phase 4 (Bento Grid pillars) -- visual variety
Phase 9 (Logo marquee) -- instant credibility
Phase 1 (Header polish)
Phase 5 (Terminal upgrade)
Phase 11 (Security section)
Phase 12 (CTA)
Everything else
GEMINI AGENT:
Redesign Plan: Keystone Treasury OS Landing Page
Summary
A comprehensive overhaul of the Keystone landing page to elevate it from a basic "startup" look to a premium, high-tech financial operating system interface. We will use a "Deep Void" aesthetic with "Aurora" gradients, integrating user-provided dashboard screenshots into high-fidelity parallax displays.
1. Design & Visual Identity Overhaul
Goal: Move away from "basic black and green" to a sophisticated "Command Center" aesthetic (Agent's Choice).
Color Palette:
Base: Deep "Void" styling (Rich Slate/Gray 950 oklch(0.12 0.02 260)), moving away from pure black for better depth.
Accents: Evolve the "Keystone Green" (#36e27b) into a multi-layered system:
Primary: Electric Emerald (for high-priority actions/CTAs).
Secondary: Deep Teal & Violet (for data visualization & AI).
Gradients: Use subtle "Aurora" mesh gradients (Green/Teal/Violet) for backgrounds to add depth without clutter.
Visual Style:
Glassmorphism 2.0: High-quality backdrops with noise textures, complex gradient borders, and inner glows.
Typography:
Headings: Spline Sans (Refined weights/tracking).
Data/Technical: Geist Mono or JetBrains Mono for that "operating system" feel.
Lighting: Dynamic lighting effects on hover (cursor tracking spotlights).
2. Advanced Component Library & Tools
Strategy: Leverage "Copy-Paste" high-fidelity component architectures (inspired by Aceternity UI, Magic UI) using framer-motion + tailwind.
Hero Section:
New: "Hero Parallax" or "3D Card Perspective". A floating, tilted 3D interface mockup of the dashboard.
Content: User-Uploaded Screenshots. We will build the container to accept the high-res dashboard screenshots provided by the user.
Background: "Background Beams" or "Particle Vortex" to suggest data flow.
Feature Showcase (Bento Grid):
New: "Bento Grid" layout with varying cell sizes, video backgrounds, and internal micro-interactions.
Interactive Demo:
New: "Typewriter Effect" + "Live Code Block". A visually rich "Command Bar" simulation that types out complex commands and shows a high-fidelity "Execution Plan" card.
Testimonials / Trust:
New: "Infinite Moving Cards" with detailed partner logos.
3. Content Strategy & Feature Alignment
Goal: Bridge "Marketing Hype" with "Actual Product Capability".
"The Command Bar" Spotlight:
Highlight the Natural Language -> Execution pipeline. Show the "Thinking..." state and "Proposed Action" UI.
Agent Intelligence:
Showcase specific agents (Lookup, Builder, Analysis) as "Active Processes" with scanning visuals.
Foresight / Simulation:
Dedicated section for "Generative Foresight" visualizing the "What-If" engine.
Security & Approvals:
Emphasize Multisig Integration (Squads) with "Threshold Signatures" visuals.
4. Implementation Steps
Foundation: Update global CSS variables for the new premium palette and typography.
Component Build:
Build Hero3D component (Placeholder for screenshot).
Build BentoFeatures component.
Build LiveCommandBar component.
Refine & Polish:
Add scroll-triggered animations (entry effects).
Optimize performance (lazy load heavy visuals).
5. Technology Stack
Framework: Next.js 15 (Existing)
Styling: Tailwind CSS v4 (Existing)
Motion: Framer Motion (Existing)
Icons: Lucide React (Existing)
GPT AGENT:
Keystone Landing Page Revamp Plan
This plan upgrades Keystone’s landing page into a premium, high-trust, high-conversion experience by tightening positioning, introducing a cohesive design system, and replacing “generic UI” patterns with distinctive, high-quality components and motion.
1) Current stack & landing page structure (what we have)
Framework: Next.js 15 (App Router), React 19, TypeScript.
Styling: Tailwind v4 (@import "tailwindcss"; in globals.css) + shadcn/ui (New York) + Radix primitives.
Motion: Framer Motion.
Landing entry: src/app/page.tsx -> HomeClient -> sections:
HeroSection, ProblemSection, PillarsSection, DemoSection, DeepDiveSection, AtlasSection, HowItWorksSection, EcosystemSection, UseCasesSection, CTASection
2) Critical audit (design, UX, content)
Design/UX gaps (most important)
Over-reliance on black + green: most elements share the same surface + border + accent pattern. It reads as “template/shadcn default”, not a bespoke product.
Hard-coded colors across sections (#0B0C10, #36e27b) bypass the existing CSS variable system; prevents cohesive theming and makes refinement slow.
Icon density is high: many cards/steps rely on Lucide icons, which can signal “generic UI kit” if used everywhere.
Visual hierarchy: many sections are visually similar (card grids). This creates fatigue and reduces the sense of narrative progression.
Trust & proof are underpowered: there’s little “evidence” (screens, metrics with context, security model explanation, operational guarantees).
Content/copy risks & corrections
Brand consistency: repo uses both “KeyStone” and “Keystone”. Pick one canonical spelling and apply everywhere (metadata, headings, footer).
Unverifiable stats in hero (e.g., “0 Security Incidents”, “<2s Avg Response”) are high-risk unless you can substantiate. If not, rephrase to qualitative claims or add clear qualifiers.
Audience clarity: landing currently mixes “enterprise OS” language with “free public good Atlas” messaging. This can work, but needs a clearer funnel:
Atlas = acquisition
App = product
Enterprise access = conversion
3) What the landing page is missing (based on the rest of the app)
The app has meaningful, differentiating features that aren’t strongly “proved” on the landing page:
Collaboration (Liveblocks presence / shared context) deserves a trust-grade narrative: “war-room operations”, shared approvals, auditability.
Studio + Marketplace is a major differentiator; currently described, but not shown with credible visuals and outcomes.
Security model is not explained at a decision-maker level:
non-custodial
multisig approval (Squads)
simulation-first
policy enforcement
key management options (Turnkey exists in codebase)
Lead capture / enterprise conversion: there is no dedicated “request access / book demo” capture flow in the product surface.
There is email infrastructure in the repo (resend, /api/alerts/*) that can be reused, but currently it’s for gas alerts.
4) Premium direction (experience goals)
Tone: calm, technical, decisive. Less “hype”, more “operational clarity”.
Visual identity: keep Keystone green as an accent, but introduce a richer palette:
deep neutral surfaces (multiple layers)
secondary accent (cyan/blue) used sparingly
controlled gradients + subtle noise, not “glow everywhere”
Narrative flow: single story arc from problem → command layer → safety/approvals → modules → proof → CTA.
5) Library & component strategy (premium-first, minimal “AI-template” feel)
Keep (already solid)
Radix + shadcn/ui for accessibility and primitives.
Framer Motion for purposeful motion (but used more selectively).
Add (high impact, low bloat)
Typography quality:
next/font with a distinctive display + text pairing (e.g., Space Grotesk / Spline Sans), tuned weights and optical sizing.
react-wrap-balancer for premium headline line breaks.
Premium scroll + reveal (optional):
studio-freight/lenis for high-quality smooth scrolling (must respect prefers-reduced-motion).
Premium backgrounds (optional, only if we can keep performance tight):
shadergradient (GPU animated gradients) OR a single bespoke canvas background.
Alternative: a well-crafted static + subtle CSS noise approach (lower risk).
Data-viz polish:
keep recharts where needed, but present a single “proof” visualization on landing (not a dashboard replica).
“Wow” component (pick 1, do it extremely well)
Option A (lowest risk, highest clarity):
Interactive “Command → Plan → Approvals → Execution” pipeline
A narrative component that animates through the lifecycle.
Backed by the existing demo prompt UI, but redesigned as a premium product artifact.
Option B (higher risk, high wow):
Rive state-machine animation of the Keystone OS pipeline
Requires a .riv asset. If you can provide one (or we agree on a starter asset), we wire it in.
Option C (highest risk):
Spline/Three hero (3D)
Only if we commit to performance budgets and graceful fallback.
6) Landing page content/section changes (concrete)
Hero
Replace generic stat tiles with:
1 strong claim (what Keystone replaces)
2–3 “operational outcomes” (time saved, fewer approvals, faster execution) with conservative language
1 proof element (short clip / screenshot / interactive pipeline)
Proof strip (new)
Real UI screenshots (Dashboard, Treasury Hub, Studio) shown in a premium device frame.
Security & Control (new)
Explain: non-custodial, simulation-first, multisig gates, audit trail, key mgmt (Turnkey).
Modules
Keep pillars + deep-dive, but reduce repetition:
fewer card grids
more “artifact” layouts (screens, annotated callouts, short lists)
Atlas
Position it clearly as the acquisition flywheel; link out, but don’t let it dilute the enterprise narrative.
CTA
Add a second CTA path:
“Open App” (self-serve)
“Request access / Book demo” (lead capture)
7) Lead capture implementation proposal (no third-party forms unless you want them)
Create a dedicated endpoint like /api/leads:
stores leads in DB (drizzle) and/or emails you via Resend
supports “Request access” with fields: name, role, org, treasury size range, email, message
Optional: integrate Calendly if you already use it (but only if it matches the premium feel).
8) Performance & quality bar (acceptance criteria)
Lighthouse (target, not guaranteed): 90+ Performance on desktop; no heavy continuous animations above-the-fold.
Design system: landing uses CSS variables/tokens rather than hard-coded hex everywhere.
Motion: all motion respects prefers-reduced-motion and avoids “constant shimmer”.
Trust: security model and approvals are explicitly explained with a dedicated section.
Conversion: CTA supports both self-serve and enterprise lead capture.
9) Execution plan (phased)
Phase 1 — Visual system + content rewrite (fast, high leverage)
Define a landing-specific theme layer (tokens for surfaces, borders, accent, gradients).
Rewrite hero + section intros for clarity and credibility.
Reduce icon usage; rely on typography, spacing, and screenshots.
Phase 2 — Premium components + proof
Build the “Proof strip” with screenshots + device frames.
Implement the chosen “Wow” component (Option A/B/C).
Upgrade section layouts to reduce repetitive card grids.
Phase 3 — Enterprise conversion
Implement “Request access / Book demo” lead capture.
Add a lightweight “Security & Control” page or modal if the landing needs more depth.
10) Open questions (need your answers before implementation)
Primary conversion goal:
Should the main CTA be “Open App” or “Request access”?
Audience priority:
DAOs/protocol treasuries vs VCs vs teams/individuals?
Brand direction:
Keep Keystone green as primary, or evolve to a broader palette (green as accent only)?
Wow component preference:
Option A (interactive pipeline), Option B (Rive), or Option C (3D)?
Proof assets:
Do you want to provide 3–6 curated screenshots (Dashboard/Treasury/Studio/Marketplace), or should we capture them from local dev?
KIMI AGENT:
Keystone Landing Page Redesign Plan
A comprehensive premium redesign of the Keystone landing page to replace basic black/green aesthetic with world-class UI/UX that matches the sophistication of the product.
Critical Assessment of Current Landing Page
Design Issues
Issue Current State Impact
Color Palette Single green (#36e27b) on black Looks like every AI-generated crypto site
Components Basic shadcn/ui with no customization No brand differentiation
Visual Effects Simple blur glows Dated, lacks depth and sophistication
Typography System fonts, standard weights No premium feel
Layout Standard grid, predictable Boring, doesn't showcase innovation
Icons Only Lucide icons Generic, lacks custom identity
Animations Basic framer-motion fades Expected, nothing memorable
Content Gaps (Missing from Landing Page)
War Room / Team Collaboration - Liveblocks-powered real-time collaboration not showcased
Security Architecture - MPC wallet via Turnkey, non-custodial architecture not emphasized
Live Data Displays - Real-time price feeds, market pulse, vault sync status not demonstrated
Agent System Visualization - 5 AI agents orchestration not visualized
Performance Metrics - Transaction throughput, uptime, execution speed not proven
Integration Partners - Helius, Jupiter, Birdeye, Squads partnerships not highlighted
Social Proof - No testimonials, case studies, or trust signals
Marketplace Preview - Protocol marketplace for mini-apps completely absent
Studio IDE Preview - Monaco editor, live preview not demonstrated
Mobile Experience - No mention of mobile responsiveness or app-like features
Recommended Premium Libraries & Tools
Animation & Visual Effects
Library Purpose Cost Implementation
@magicui Animated components (particles, blur-fade, ripple) Free Premium animated components
@aceternity Spotlight, animated cards, 3D effects Free Hero spotlight effects
react-bits Animated backgrounds, interactive patterns Free Background effects
@number-flow Animated number transitions Free Price/stats counters
framer-motion Advanced page transitions, gestures Already have Enhanced animations
gsap ScrollTrigger, timeline animations Free Scroll-driven reveals
UI Components (Premium Alternatives)
Component Current Recommended Why
Buttons shadcn default Custom with glow, magnetic hover Differentiation
Cards Basic border Bento grid, spotlight hover Modern aesthetic
Tabs Standard Animated underline, pill style Premium feel
Input Basic Floating labels, command palette Innovation
Data Display Text only Animated counters, sparklines Engagement
3D & WebGL Effects
Library Purpose Implementation
three.js + @react-three/fiber 3D hero scene, floating elements Hero background
@react-three/drei Pre-built 3D components Orb, mesh gradients
particles.js or tsparticles Network/constellation background Agent connections visualization
spline (embedded) Interactive 3D if needed Export from Spline tool
Typography & Icons
Resource Purpose
Cal Sans or Satoshi Headlines - geometric, modern
Inter or Geist Body - already have via Next.js
Tabler Icons More premium than Lucide
Phosphor Icons Weight variants for hierarchy
Custom animated icons Lottie or Rive for product features
Section-by-Section Redesign Plan
1. Navigation (SiteHeader)
Current Issues:
Standard sticky header with blur
Basic nav links, no visual interest
Mobile menu is generic slide-down
Redesign:
Glass morphism with dynamic blur based on scroll position
Active indicator - animated pill that slides between items
Logo animation - subtle pulse on hover, gradient text
Command palette trigger - Cmd+K shortcut visible
Network status - Live connection indicator (green pulse)
Scroll progress - Thin line at top of page
New Libraries:
magicui/blur-fade for entrance
Custom glass effect with backdrop-filter
2. Hero Section
Current Issues:
Basic blur glows, no depth
Text-only headline
Simple stat cards
Redesign - "The Command Layer Reimagined":
Visual Concept:
3D floating elements - Abstract geometric shapes (cubes, orbs) representing the 6 pillars
Gradient mesh background - Animated morphing gradient (not just green)
Particle network - Connecting lines showing agent orchestration
Depth layers - Parallax scrolling with 3 depth planes
Content Improvements:
Headline: "Command Your Treasury Like a Natural Language OS"
Subhead: "From fragmented DeFi tools to unified command intelligence"
Add: Live SOL price ticker with sparkline chart
Add: "Trusted by [DAO logos placeholder]"
Interactive Element:
Typing animation showing commands being executed
Floating command bubbles that fade in/out
Mouse-follow spotlight effect
New Libraries:
three.js - 3D floating elements
aceternity/spotlight - Mouse tracking
magicui/particles - Network effect
@number-flow - Animated stats
recharts - Mini sparkline (already have)
3. Problem Section ("Death by Fragmentation")
Current Issues:
Static before/after comparison
Red/green color coding (too basic)
No interaction
Redesign - "The Fragmentation Crisis":
Visual Concept:
Exploded view diagram - Tools fly apart in 3D space
Tab chaos visualization - Animated browser tabs multiplying
Context loss meter - Animated gauge showing cognitive load
Interaction:
Hover over tools shows integration complexity
Click "Before" to see animation of problem
Click "After" to see Keystone unify
Content Improvements:
Add specific metrics: "47 min avg to complete treasury operation"
Add: "12 context switches per transaction"
Add: "$X lost to MEV attacks last month"
New Libraries:
framer-motion layout animations
magicui/blur-fade for tool cards
4. Six Pillars Section
Current Issues:
Static grid of cards
Simple icon + text
No visual hierarchy
Redesign - "The Keystone Architecture":
Visual Concept:
Hexagon/orbital layout - Pillars arranged around central hub
Gradient orbs - Each pillar has unique color, not just green
Connection lines - Animated SVG paths connecting pillars
Hover expansion - Cards expand with detailed sub-features
Color System (Beyond Just Green):
Command Layer: Emerald → Teal gradient (#10b981 → #14b8a6)
Agent System: Blue → Indigo gradient (#3b82f6 → #6366f1)
Treasury Hub: Violet → Purple gradient (#8b5cf6 → #a855f7)
Keystone Studio: Pink → Rose gradient (#ec4899 → #f43f5e)
Foresight: Amber → Orange gradient (#f59e0b → #f97316)
Solana Atlas: Cyan → Sky gradient (#06b6d4 → #0ea5e9)
Interaction:
Hover triggers micro-animation on icon
Click expands to show sub-modules
Scroll-triggered stagger animation
New Libraries:
aceternity/timeline for connections
magicui/animated-beam for pillar connections
Custom gradient orbs with CSS + animation
5. Demo Section (Command Terminal)
Current Issues:
Static terminal mockup
No real execution visualization
Limited command examples
Redesign - "Live Command Interface":
Visual Concept:
Split-screen terminal - Command input + live visualization
Agent visualization - See 5 agents activate in real-time
Execution flowchart - Animated diagram showing validation steps
3D vault visualization - Abstract representation of treasury
Interaction:
Real-time typing response
Agent avatars that activate (Lookup, Builder, Analysis, Transaction, Coordinator)
Step-by-step execution visualization
Success/failure state animations
Content Improvements:
Add 8 more command examples covering all use cases
Show actual plan output with syntax highlighting
Add "Confidence score" visualization
New Libraries:
magicui/terminal component
framer-motion AnimatePresence for agent activation
Custom agent avatar components
6. Deep Dive Section (Tabbed Modules)
Current Issues:
Basic tab switcher
Static feature cards
No visual connection to actual product
Redesign - "Module Deep Dives":
Visual Concept:
Immersive tab transition - Full section color shift per module
Interactive mockups - Mini UI previews of actual features
Feature spotlight - One feature expanded at a time
Data visualization - Charts showing actual capabilities
Tabs Redesigned:
Treasury Hub - Vault visualization, transaction flow
Studio - Monaco editor preview, live code preview
Foresight - Interactive scenario simulator
New Libraries:
radix-ui/react-tabs (already have) with custom styling
recharts for data visualizations (already have)
magicui/marquee for feature scrolling
7. NEW: War Room Showcase Section
Missing Content: Real-time collaboration is a MAJOR differentiator
Visual Concept:
Live cursor simulation - Multiple cursors moving on mock interface
Chat bubbles - Animated conversation between team members
Presence indicators - Who's online, what are they working on
Conflict resolution visualization - Quorum approval animation
Content:
"Real-time Treasury Collaboration"
"See who's viewing what. Resolve conflicts instantly."
Feature bullets: Live cursors, Team chat, Conflict alerts, Quorum tracking
New Libraries:
liveblocks/react (already integrated) for demo
Custom cursor animation component
8. NEW: Security & Trust Section
Missing Content: Non-custodial architecture needs emphasis
Visual Concept:
Security layers visualization - Concentric rings showing protection
Key architecture diagram - MPC/Turnkey flow
Compliance badges - Animated trust signals
Audit trail preview - Immutable transaction log
Content:
"Your Keys. Your Control."
MPC via Turnkey
Simulation-first execution
Immutable audit trails
Squads multisig integration
9. Atlas Section (Free Tools)
Current Issues:
Simple grid layout
No demonstration of tools
Static descriptions
Redesign - "Solana Atlas Toolkit":
Visual Concept:
Interactive tool preview - Hover shows mini-demo of each tool
Live data integration - Real market data in previews
Tool connections - How tools work together
Usage counter - "X scans today" social proof
Content Improvements:
Add: "MEV Scanner detected $X attacks today"
Add: "Y airdrops found this week"
Add: Live usage statistics
New Libraries:
magicui/hover-card for tool previews
Custom sparkline components
10. How It Works Section
Current Issues:
3 static cards
Simple connector lines
No progression feeling
Redesign - "From Intent to Execution":
Visual Concept:
Horizontal timeline - Scroll-triggered progression
Agent activation - See agents come alive at step 2
Approval visualization - Multisig signing animation
Success state - Confetti/celebration on completion
New Libraries:
aceternity/timeline
magicui/confetti for success
GSAP ScrollTrigger for scroll-driven animation
11. Use Cases Section
Current Issues:
Generic grid
No differentiation between use cases
Redesign - "Operations Playbook":
Visual Concept:
Bento grid layout - Asymmetric, visually interesting
Use case depth - Expand to show workflow diagram
ROI calculator - Interactive: "Save X hours per month"
Industry tags - DAO, Protocol, VC categories
New Libraries:
magicui/bento-grid
Custom ROI calculator component
12. NEW: Testimonials / Trust Section
Missing Content: No social proof
Design:
Animated testimonial cards - Auto-rotating with pause on hover
Company logos - Infinite marquee of partner/protocol logos
Stats row - Transactions processed, Assets secured, Time saved
New Libraries:
magicui/marquee for logo scroll
magicui/testimonial cards
13. NEW: Integration Ecosystem Section
Missing Content: No mention of key integrations
Design:
Logo constellation - Partners arranged in orbital pattern
Hover reveals - Integration details on hover
Categories - Wallets, Protocols, Data, Infrastructure
Partners to show:
Jupiter, Helius, Birdeye, Squads, Marinade, Jito, Turnkey
14. CTA Section
Current Issues:
Simple centered text
Standard buttons
Redesign - "Join the Command Layer":
Visual Concept:
Immersive gradient - Full-width gradient takeover
Floating UI elements - App screenshots floating in 3D space
Urgency elements - Limited early access, waitlist counter
Multiple entry points - Atlas (free), App (early access), Demo (book)
New Libraries:
aceternity/background-gradient
magicui/number-ticker for waitlist count
15. Footer
Current Issues:
Basic 4-column layout
No personality
Redesign:
Newsletter signup - Command-style input ("Subscribe to updates")
GitHub activity - Live contribution graph
Status page link - System status indicator
Social links - Animated icons
Technical Implementation Plan
Phase 1: Foundation (Week 1)
Install Premium Libraries
bash
npm install @magicui/react @aceternity/ui gsap @gsap/react three @react-three/fiber @react-three/drei @number-flow/react
Set Up Design Tokens
Extended color palette (6 pillar colors)
Typography system (Cal Sans + Geist)
Animation timing constants
Spacing scale refinement
Create Base Components
AnimatedGradient - Background component
SpotlightCard - Hover spotlight effect
GradientOrb - 3D-style gradient orbs
BeamConnector - Animated SVG connections
Phase 2: Core Sections (Week 2)
Hero Section - 3D elements, particle network
Navigation - Glass morphism, command palette
Problem Section - Exploded view animation
Six Pillars - Hexagonal/orbital layout
Phase 3: Interactive Elements (Week 3)
Demo Terminal - Live agent visualization
Deep Dive Tabs - Immersive transitions
War Room Showcase - Live cursor demo
Atlas Tools - Interactive previews
Phase 4: Polish & Launch (Week 4)
Security Section - New addition
Testimonials - New addition
Integration Ecosystem - New addition
Performance optimization - Lazy loading, reduced motion
Mobile responsive - Ensure all effects work on mobile
Content Improvements Needed
New Copy Required
Headline Options to Test:
"The Command Layer for Web3 Treasury"
"Natural Language Treasury OS"
"From Click Chaos to Command Clarity"
New Section Content:
Security architecture explanation
War Room collaboration features
Integration partner details
Performance benchmarks
Case study placeholders
Microcopy:
Button text: "Initialize" instead of "Open App"
Stats labels: "Vaults Secured" instead of "Security Incidents"
Feature descriptions: More active, benefit-focused
Visual Assets Needed
Custom Icons:
Agent avatars (5 unique designs)
Feature illustrations (6 pillar icons)
Integration partner logos (if not using SVG)
3D Assets:
Abstract geometric shapes for hero
Vault visualization model
Network constellation background
Lottie/Rive:
Command execution animation
Agent activation sequence
Success state celebration
Questions for You
Budget for APIs/Tools:
Spline 3D integration (free tier available)
LottieFiles Pro (if needed)
Any premium icon sets?
Content Priorities:
Do you have existing testimonials/partners we can reference?
Should we include a pricing section?
Any specific metrics you want to highlight?
Brand Direction:
Keep "Keystone" name or considering rebrand?
Any color preferences beyond moving away from basic green?
Tone: Technical/finance-focused or more approachable?
Timeline:
Is 4 weeks realistic or need faster iteration?
Can we A/B test headline options?
3D Complexity:
Full Three.js scene or simpler CSS 3D transforms?
Performance concerns for lower-end devices?
Success Metrics
After redesign, the landing page should:
Visual Differentiation: Not look like any other crypto/DeFi landing page
Performance: Lighthouse score 90+ despite animations
Engagement: 50%+ scroll depth, 2+ min average time on page
Conversion: 20%+ improvement in "Open App" click-through
Brand Perception: Survey users describing it as "premium" and "professional"
Premium Library Cost Summary
Library License Cost
@magicui MIT Free
@aceternity MIT Free
GSAP Standard Free
Three.js MIT Free
@number-flow MIT Free
Cal Sans font OFL Free
Tabler Icons MIT Free
Total $0
All recommended libraries are open-source and free. Quality comes from implementation, not licensing fees.
Next Steps
Awaiting your feedback on this plan
Confirm priorities - which sections are most critical
Provide any assets - logos, testimonials, metrics
Approve color palette - 6-color system vs. current green
Begin Phase 1 implementation once approved