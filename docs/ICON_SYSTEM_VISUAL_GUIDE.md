# Icon System Visual Guide

## Design System Overview

### Color & Styling
- **Stroke Width**: 1.6-1.8px for consistency
- **Stroke Linecap/Linejoin**: Round for modern aesthetic
- **Fill**: Inherited via `currentColor` (theme-aware)
- **Opacity Variations**: Used for visual hierarchy
- **Responsive**: Works from 16px to 64px+ scales

### Icon Grid Reference (24x24 viewBox)

```
0    4    8    12   16   20   24
0 ┌────┬────┬────┬────┬────┬────┐
4 │    │    │    │    │    │    │
  ├────┼────┼────┼────┼────┼────┤
8 │    │    │    │    │    │    │
  ├────┼────┼────┼────┼────┼────┤
12│    │    │    │    │    │    │
  ├────┼────┼────┼────┼────┼────┤
16│    │    │    │    │    │    │
  ├────┼────┼────┼────┼────┼────┤
20│    │    │    │    │    │    │
24└────┴────┴────┴────┴────┴────┘
```

---

## Icon Gallery with Specifications

### 1. AirDropScout 🎯

**Purpose**: Scan and discover eligible airdrops

**Visual Elements**:
- Outer compass ring (radius 10)
- Cardinal direction markers (N, S, E, W)
- Inner concentric circles for depth
- Center dot (filled)
- Subtle crosshairs pattern

**Semantic Meaning**:
- Compass = Navigation/Discovery
- Target = Precision
- Rings = Scanning/Radar effect

**Usage Context**: Airdrop Compass card, Quest tab selector

```
┌─ Compass outer circle (r=10)
│  ┌─ Direction markers at cardinal points
│  │  ┌─ Inner targeting circle (r=5)
│  │  │  ┌─ Center dot (r=2)
│  │  │  │
```

---

### 2. StrategyLab 🧪

**Purpose**: Experimental strategies and advanced tools

**Visual Elements**:
- Erlenmeyer flask silhouette
- Liquid level indicator line
- Bubbles inside (ascending pattern)
- Subtle beaker accent in corner
- Translucent fill for liquid

**Semantic Meaning**:
- Flask = Scientific experimentation
- Bubbles = Activity/Reaction
- Laboratory = Advanced/Complex

**Usage Context**: Strategy Lab tab selector, advanced tools section

```
  Flask Outline (erlenmeyer shape)
  ├─ Liquid level indicator
  ├─ Rising bubbles (3 circles at different heights)
  └─ Beaker accent
```

---

### 3. WalletCopy 💼

**Purpose**: Duplicate wallet configurations

**Visual Elements**:
- Primary wallet card (solid outline)
- Secondary wallet card (offset, lighter opacity)
- Bidirectional arrows connecting them
- Center dot indicating copy action
- Slight offset creates 3D depth

**Semantic Meaning**:
- Overlapping cards = Duplication
- Arrows = Copying action
- Two instances = Before/After states

**Usage Context**: Copy My Wallet tool card

```
├─ Primary wallet card (x=3, y=3, w=12, h=8)
├─ Secondary wallet card (x=9, y=9, w=12, h=8, opacity=0.6)
├─ Connecting arrows
└─ Copy indicator dot
```

---

### 4. FeeOptimizer 💰

**Purpose**: Minimize and optimize transaction fees

**Visual Elements**:
- Dollar/currency symbol base structure
- Downward trend arrow through center
- Small coin indicator in corner
- Savings emphasizer (secondary element)

**Semantic Meaning**:
- Currency symbol = Money/Fees
- Down arrow = Reduction/Savings
- Coin = Financial optimization

**Usage Context**: Fee Saver tool card, cost analysis displays

```
├─ Dollar sign outline
├─ Downward trend arrow (primary)
└─ Savings coin accent (secondary)
```

---

### 5. TokenSwap ↔️

**Purpose**: Exchange tokens with optimal routing

**Visual Elements**:
- Left circle (input token)
- Right circle (output token)
- Horizontal arrows showing flow
- Crossover paths for complex routing
- Exchange indicator in center

**Semantic Meaning**:
- Bidirectional arrows = Swap/Exchange
- Token circles = Input/Output tokens
- Crossover = Routing complexity

**Usage Context**: Jupiter Swap card, token exchange operations

```
├─ Left token circle (input)
├─ Right token circle (output)
├─ Forward/backward arrows
└─ Crossover exchange indicator
```

---

### 6. MarketPulse 📈

**Purpose**: Real-time market trends and momentum

**Visual Elements**:
- Ascending trend line (primary)
- Mountain peak overlay (secondary)
- Pulse dots along the line
- Grid background (subtle)
- Color coding ready (inherit theme)

**Semantic Meaning**:
- Trending line = Market movement
- Peaks = Highs/Momentum
- Pulse points = Real-time data

**Usage Context**: Market Snapshot card, price trend displays

```
├─ Ascending line chart
├─ Peak indicators
├─ Pulse animation points
└─ Grid background reference
```

---

### 7. HolderAnalytics 👥

**Purpose**: Token holder distribution analysis

**Visual Elements**:
- Central hub node (large, filled)
- 6-8 peripheral nodes (varying sizes)
- Connection lines from center to edges
- Node size variation = Distribution concentration
- Radial pattern

**Semantic Meaning**:
- Hub = Central authority/token
- Nodes = Holders
- Connections = Network/Distribution
- Size variation = Concentration risk

**Usage Context**: Holder Insights card, distribution risk display

```
├─ Central hub (r=3, filled)
├─ 6-8 peripheral nodes (r=1-3 varying)
├─ Connection lines (opacity=0.5)
└─ Size gradient = Concentration
```

---

### 8. MEVDetector 🔍

**Purpose**: Identify and detect MEV opportunities

**Visual Elements**:
- Grid network background (light)
- Spotlight cone/search beam
- Highlighted anomaly block
- Alert indicator badge
- Transparency layers for depth

**Semantic Meaning**:
- Grid = Network/Blockchain
- Spotlight = Detection/Search
- Highlight = Anomaly/Target
- Alert = Warning/Opportunity

**Usage Context**: MEV Scanner tool card, anomaly detection

```
├─ Grid background (opacity=0.3)
├─ Spotlight cone overlay
├─ Highlighted transaction block
└─ Alert indicator circle
```

---

### 9. PortfolioBalancer ⚖️

**Purpose**: Rebalance portfolio to target allocations

**Visual Elements**:
- Fulcrum/pivot point (triangle)
- Left balance pan (rectangle)
- Right balance pan (rectangle)
- Balance arms extending to center
- Token weights as filled circles
- Equilibrium indicator

**Semantic Meaning**:
- Balance scale = Equilibrium/Optimization
- Pans = Asset allocation sides
- Weights = Token quantities
- Center = Optimal state

**Usage Context**: Portfolio Rebalancer card, allocation optimization

```
├─ Fulcrum (triangular pivot)
├─ Left arm + pan
├─ Right arm + pan
├─ Left weights (circles)
├─ Right weights (circles)
└─ Equilibrium line
```

---

### 10. TokenAuditor 🛡️

**Purpose**: Comprehensive token safety analysis

**Visual Elements**:
- Shield outline (primary shape)
- Checkmark inside shield (positive)
- Lock accent at bottom
- Warning indicators in corners
- Layered design for depth

**Semantic Meaning**:
- Shield = Security/Protection
- Checkmark = Verified/Safe
- Lock = Secure/Locked
- Warnings = Risk indicators

**Usage Context**: Rug Pull Detector tool card, token safety display

```
├─ Shield outline
├─ Internal checkmark
├─ Lock accent
├─ Warning corner indicators
└─ Layered design
```

---

### 11. TxExplorer 🔎

**Purpose**: Historical transaction lookup and analysis

**Visual Elements**:
- Vertical timeline (spine)
- Transaction blocks along timeline (rectangles)
- Timestamp markers (side ticks)
- Forward/backward navigation arrows
- Progressive temporal ordering

**Semantic Meaning**:
- Timeline = History/Chronology
- Blocks = Transactions
- Markers = Time points
- Arrows = Navigation/Direction

**Usage Context**: Transaction Time Machine card, history lookup

```
├─ Central vertical timeline
├─ Transaction blocks (3 levels)
├─ Timestamp markers (side)
└─ Navigation arrows (top/bottom)
```

---

### 12. DCAScheduler 🔄

**Purpose**: Automate recurring purchases (DCA)

**Visual Elements**:
- Gear/cog (automation base)
- Calendar grid overlay
- Clock/time indicator
- Recurring pattern arrows
- Compound visual indicating both time + automation

**Semantic Meaning**:
- Gear = Automation/Mechanical
- Calendar = Scheduling/Time
- Clock = Recurring intervals
- Arrows = Repeated pattern

**Usage Context**: Create DCA Bot modal, scheduled automation

```
├─ Gear with 8 teeth
├─ Calendar grid overlay
├─ Clock hands indicator
└─ Recurring pattern arrows
```

---

## Implementation Checklist

### Icon Development
- [ ] All 12 icons created as React components
- [ ] Each icon supports className prop (responsive sizing)
- [ ] All icons use `stroke="currentColor"` for theming
- [ ] strokeWidth consistent (1.6-1.8px)
- [ ] Proper `aria-label` support for accessibility
- [ ] Icons tested at 16px, 24px, 32px scales

### Integration
- [ ] Icon components exported from index.ts
- [ ] Icon mapping constants defined
- [ ] Display names standardized (emoji-free)
- [ ] Descriptions provided for tooltips
- [ ] All imports updated in atlas-client.tsx
- [ ] All tool cards updated with new icons

### Styling
- [ ] Icons inherit from currentColor
- [ ] Icons responsive to theme changes
- [ ] No layout shifts on icon load
- [ ] Proper spacing around icons
- [ ] Disabled states handled (opacity)

### Testing
- [ ] Visual inspection at multiple sizes
- [ ] Light/dark theme compatibility
- [ ] Responsive design verification
- [ ] Accessibility audit
- [ ] Performance check (no regressions)
- [ ] TypeScript compilation clean

---

## Icon Sizing Guide

```
Size     Typical Use Case           Example
─────────────────────────────────────────────
16px     Icon in pill badges        "16 SOL"
24px     Button icons              CardTitle icons
32px     Hero/Header sections      Tab triggers
48px     Feature highlights         Coming soon
64px+    Large hero sections       Desktop displays
```

**CSS Classes by Size:**
```css
.icon-sm      { width: 0.875rem; height: 0.875rem; }  /* 14px */
.icon-base    { width: 1rem; height: 1rem; }          /* 16px */
.icon-md      { width: 1.5rem; height: 1.5rem; }      /* 24px */
.icon-lg      { width: 2rem; height: 2rem; }          /* 32px */
.icon-xl      { width: 3rem; height: 3rem; }          /* 48px */
.icon-2xl     { width: 4rem; height: 4rem; }          /* 64px */
```

---

## Responsive Icon Behavior

### At Small Viewports (< 640px)
- Icon size: 16-20px
- Reduced detail (simpler strokes)
- No opacity variations

### At Medium Viewports (640-1024px)
- Icon size: 20-24px
- Standard detail level
- Full opacity variations

### At Large Viewports (> 1024px)
- Icon size: 24-32px
- Enhanced detail
- Hover effects enabled

---

## Animation Considerations

For future enhancements, consider:

1. **Pulse Animation** (MarketPulse)
   - Heartbeat effect on trend lines
   - Information signal

2. **Rotation Animation** (DCAScheduler gear)
   - Continuous slow rotation
   - Indicates active scheduling

3. **Scan Animation** (AirDropScout)
   - Sweep/radar effect
   - Active scanning state

4. **Balance Animation** (PortfolioBalancer)
   - Gentle sway when unbalanced
   - Settling animation on balance

---

## Future Enhancements

1. **Multi-color Support**
   - Add fillColor prop for gradient/multi-tone icons
   - Status indicators (success/error/warning variants)

2. **Icon Variants**
   - Outline vs. Solid versions
   - Animated vs. Static versions

3. **Icon Collections**
   - Status badges (checkmark, X, warning)
   - Loading states (spinner, skeleton)
   - Directional indicators (arrows, chevrons)

4. **Performance**
   - SVG sprite generation
   - Icon minification
   - Lazy loading for large icon sets

5. **Documentation**
   - Storybook component library
   - Icon usage guidelines
   - Brand consistency standards
