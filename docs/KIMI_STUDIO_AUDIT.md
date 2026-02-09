# KIMI_STUDIO_AUDIT.md

**Chief Architect Audit: Keystone Studio**  
**Date:** January 2026 | **Status:** CRITICAL FINDINGS  
**Model:** Kimi | **Classification:** Pre-Launch Audit Required

---

## SECTION 1: AUDIT & GAP ANALYSIS

### 1.1 The Sandpack Conflict

**FINDING:** PROJECT_OVERVIEW.md lists Sandpack as the Studio runtime, but our Master Plan specifies a custom Monaco + esm.sh implementation.

| Criteria | Sandpack | Custom Iframe |
|----------|----------|---------------|
| **Bundle Size** | ~2.3MB WASM | ~45KB custom |
| **Build Step** | Required | Zero-build (esm.sh) |
| **AI Streaming** | Static file updates | Real-time DOM injection |
| **Keystone Hooks** | Requires custom preset | Native virtual module |
| **Mobile** | Poor | Acceptable |

**VERDICT:** **Retain Custom Iframe** - The 51x size difference and AI streaming capability are decisive for "The Architect" feature.

### 1.2 Dependency Hell: Version Resolution

**BUG:** Current implementation has no version pinning. `framer-motion` + `recharts` + `lucide-react` will clash.

**SOLUTION:** Semantic Import Map Registry

```typescript
// lib/studio/dependency-registry.ts
export const DEPENDENCY_REGISTRY = {
  "react": { 
    url: "https://esm.sh/react@18.3.1", 
    exports: ["default", "useState", "useEffect", "useCallback"]
  },
  "react-dom/client": { 
    url: "https://esm.sh/react-dom@18.3.1/client",
    peerDeps: ["react"]
  },
  "framer-motion": { 
    url: "https://esm.sh/framer-motion@11.0.0",
    peerDeps: ["react", "react-dom"],
    bundle: true // Force bundled build
  },
  "recharts": {
    url: "https://esm.sh/recharts@2.12.0",
    bundle: true
  },
  "lucide-react": {
    url: "https://esm.sh/lucide-react@0.400.0",
    exports: ["*"]
  }
} as const;

// Runtime version conflict detection
export function resolveDependencies(requested: string[]): ImportMap {
  const resolved: Record<string, string> = {};
  const conflicts: string[] = [];
  
  for (const pkg of requested) {
    const [name, version] = pkg.split('@');
    const registryEntry = DEPENDENCY_REGISTRY[name];
    
    if (version && !version.startsWith(registryEntry.url.match(/@(\d+)/)?.[1] || '')) {
      conflicts.push(`${name}: requested ${version}, registry has ${registryEntry.url}`);
    }
    
    resolved[name] = registryEntry?.url || `https://esm.sh/${pkg}`;
  }
  
  if (conflicts.length > 0) {
    console.warn('[Dependency Resolver] Version mismatches:', conflicts);
  }
  
  return { imports: resolved };
}
```

### 1.3 UI/UX Gaps: From "Functional" to "Cyberpunk Bloomberg"

**CRITICAL GAPS IDENTIFIED:**

1. **No Syntax Theme** - Current Monaco uses `vs-dark`. Missing neon Emerald/Cyan glow.
2. **No Minimap Glow** - Bloomberg terminals have "hot" edge indicators.
3. **No Streaming Visuals** - AI code appears instantly; should type character-by-character.
4. **No Security Visualization** - Simulation Firewall blocks are invisible to users.

**REQUIRED ENHANCEMENTS:**

```css
/* Cyberpunk Monaco Theme */
.monaco-editor[data-theme="keystone-cyber"] {
  --editor-bg: #0a0a0f;
  --editor-fg: #e2e8f0;
  --keyword: #36e27b;      /* Keystone Emerald */
  --keyword-glow: 0 0 10px rgba(54, 226, 123, 0.3);
  --string: #00d4ff;       /* Cyber Cyan */
  --function: #f59e0b;     /* Amber */
  --type: #c084fc;         /* Purple */
  
  /* Neon glow on focused lines */
  .cursor-line {
    background: linear-gradient(90deg, rgba(54, 226, 123, 0.05) 0%, transparent 100%);
    border-left: 2px solid #36e27b;
  }
  
  /* Minimap heat zones */
  .minimap-slider {
    box-shadow: 0 0 15px rgba(54, 226, 123, 0.4);
  }
}
```

---

## SECTION 2: "THE ARCHITECT" (Prompt-to-App Engine)

### 2.1 The Streaming Pipeline

**ARCHITECTURE:**

```
User Prompt → Orchestrator → Stream Handler → Monaco Editor
                    ↓
            Error Detector ← TypeScript Worker
                    ↓
            Self-Correction Loop
```

**IMPLEMENTATION:**

```typescript
// components/studio/ArchitectEngine.ts
export class ArchitectEngine {
  private editor: monaco.editor.IStandaloneCodeEditor;
  private streamBuffer: string = '';
  private typingInterval: NodeJS.Timeout | null = null;
  
  async generate(prompt: string, context: CodeContext): Promise<void> {
    // 1. Initial system prompt injection
    const systemPrompt = this.buildSystemPrompt(context);
    
    // 2. SSE connection to LLM
    const response = await fetch('/api/architect/stream', {
      method: 'POST',
      body: JSON.stringify({ prompt, systemPrompt })
    });
    
    const reader = response.body?.getReader();
    if (!reader) throw new Error('No stream available');
    
    // 3. Character-by-character typing simulation
    this.simulateTyping(reader);
  }
  
  private simulateTyping(reader: ReadableStreamDefaultReader): void {
    let buffer = '';
    let position = 0;
    
    const typeNextChar = () => {
      if (position < buffer.length) {
        // Insert at current cursor position
        const char = buffer[position];
        this.editor.trigger('keyboard', 'type', { text: char });
        position++;
        
        // Variable speed for "human" feel
        const delay = Math.random() * 15 + 5; // 5-20ms
        this.typingInterval = setTimeout(typeNextChar, delay);
      }
    };
    
    // Read from stream
    const readChunk = async () => {
      const { done, value } = await reader.read();
      if (done) return;
      
      buffer += new TextDecoder().decode(value);
      if (!this.typingInterval) typeNextChar();
      
      // Check for TypeScript errors every 50 chars
      if (buffer.length % 50 === 0) {
        this.validateAndFix();
      }
      
      readChunk();
    };
    
    readChunk();
  }
}
```

### 2.2 Self-Correction System

**TYPE ERROR AUTO-FIX:**

```typescript
// lib/studio/error-healer.ts
export class ErrorHealer {
  private monaco: typeof import('monaco-editor');
  
  async detectAndFix(editor: monaco.editor.IStandaloneCodeEditor): Promise<boolean> {
    const model = editor.getModel();
    if (!model) return false;
    
    // Get all markers (errors/warnings)
    const markers = this.monaco.editor.getModelMarkers({ resource: model.uri });
    const errors = markers.filter(m => m.severity === this.monaco.MarkerSeverity.Error);
    
    if (errors.length === 0) return true;
    
    // Extract error context
    const errorContext = errors.map(e => ({
      message: e.message,
      line: model.getLineContent(e.startLineNumber),
      lineNumber: e.startLineNumber,
      column: e.startColumn
    }));
    
    // Send to LLM for fix
    const fix = await this.requestFix(errorContext, model.getValue());
    
    if (fix) {
      // Apply edit
      editor.executeEdits('error-healer', [{
        range: new this.monaco.Range(
          fix.startLine, fix.startColumn,
          fix.endLine, fix.endColumn
        ),
        text: fix.replacement
      }]);
      
      // Visual feedback
      this.showFixNotification(fix.explanation);
      return true;
    }
    
    return false;
  }
  
  private async requestFix(errors: ErrorContext[], fullCode: string): Promise<Fix | null> {
    const response = await fetch('/api/architect/fix', {
      method: 'POST',
      body: JSON.stringify({
        errors,
        code: fullCode,
        constraints: [
          'Only use useVault() and useTurnkey() from @keystone-os/sdk',
          'Do not use fs, path, or node-only modules',
          'All React hooks must be imported from react'
        ]
      })
    });
    
    return response.json();
  }
}
```

### 2.3 Architect Agent System Prompt

```
You are The Architect, an AI coding agent specialized for the Keystone Treasury OS Studio.
Your task is to generate React TypeScript code that runs in a browser sandbox.

CRITICAL CONSTRAINTS:
1. Runtime Environment: Zero-build browser sandbox using esm.sh imports
2. Allowed Imports: react, react-dom/client, lucide-react, framer-motion, recharts
3. Keystone SDK: Use ONLY these hooks:
   - useVault() → Returns { balances, tokens, totalUsdValue }
   - useTurnkey() → Returns { signTransaction, getPublicKey }
   - useAppEventBus() → Returns { subscribe, emit }
4. FORBIDDEN: fs, path, child_process, any Node.js-only modules
5. FORBIDDEN: Direct fetch() calls - use the SDK hooks for data

CODE STRUCTURE:
- Default export: React component function
- Use Tailwind classes for styling
- Handle loading states gracefully
- Include error boundaries

SECURITY RULES:
- Never generate code that requests private keys
- All signatures must go through useTurnkey().signTransaction()
- Display simulation results before any signing UI

OUTPUT FORMAT:
Return ONLY the code, wrapped in:
```tsx
// App.tsx
[code here]
```
```

---

## SECTION 3: TOOLING & STACK RECOMMENDATIONS

### 3.1 Editor Engine: Monaco vs CodeMirror 6

| Feature | Monaco | CodeMirror 6 |
|---------|--------|--------------|
| Bundle Size | ~1MB | ~200KB |
| TypeScript | Native | Via plugin |
| Mobile Support | Poor | **Excellent** |
| Streaming Text | Supported | Supported |
| IntelliSense | **Superior** | Good |

**VERDICT:** **Keep Monaco** - TypeScript IntelliSense is non-negotiable for Keystone hooks. Mobile degradation acceptable (Studio is desktop-first tool).

### 3.2 Language Enforcement

**POLICY:** TypeScript-only. No plain JavaScript option.

**RATIONALE:**
- Keystone SDK has complex types (VaultData, TurnkeyAPI)
- AI-generated code needs type checking for self-correction
- Treasury operations cannot have "undefined" errors

### 3.3 Starter Templates

| Template | Purpose | Key Features |
|----------|---------|--------------|
| **Arbitrage Scanner** | MEV detection | Jupiter routing, price delta calc |
| **Yield Heatmap** | DeFi opportunities | APY visualization, risk scoring |
| **DAO Voting Booth** | Governance UI | Proposal list, vote simulation |
| **Rebalance Bot UI** | Portfolio mgmt | Target allocation, drag-drop |
| **Payroll Stream** | Treasury outflows | Scheduled payments, CSV upload |

---

## SECTION 4: UI/UX BLUEPRINT

### 4.1 Split-Screen Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  KEYSTONE STUDIO // ARCHITECT NODE v2.4                        │
├────────────────┬──────────────────────┬───────────────────────┤
│                │                      │                       │
│  ARCHITECT     │   CODE EDITOR        │   LIVE PREVIEW      │
│  CHAT          │   (Monaco)           │   + SIMULATION      │
│                │                      │   CONSOLE           │
│  [User Prompt]  │  ┌────────────────┐   │  ┌────────────────┐ │
│  [AI Response]  │  │ Neon Syntax  │   │  │ Visual Output │ │
│  [Context]      │  │ Streaming    │   │  │ ┌───────────┐ │ │
│                │  │ Char-by-char │   │  │ │ Component │ │ │
│  [Research]     │  │              │   │  │ │ Rendered  │ │ │
│  [Fixes Applied]│  │              │   │  │ └───────────┘ │ │
│                │  └────────────────┘   │  │               │ │
│                │                      │  │ ┌───────────┐ │ │
│                │                      │  │ │ SIMULATION│ │ │
│                │                      │  │ │ FIREWALL  │ │ │
│                │                      │  │ │ Status    │ │ │
│                │                      │  │ └───────────┘ │ │
│                │                      │  └────────────────┘ │
├────────────────┴──────────────────────┴───────────────────────┤
│  STATUS: Connected | Block: 285,432,912 | TPS: 2,847        │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Simulation Firewall Visualization

**VISUAL DESIGN:**

```tsx
// components/studio/SimulationFirewall.tsx
export function SimulationFirewall({ status, details }: FirewallProps) {
  return (
    <div className={cn(
      "border-2 rounded-lg p-4 transition-all duration-500",
      status === 'scanning' && "border-yellow-500/50 bg-yellow-500/5 animate-pulse",
      status === 'blocked' && "border-red-500/50 bg-red-500/5",
      status === 'approved' && "border-emerald-500/50 bg-emerald-500/5"
    )}>
      <div className="flex items-center gap-3 mb-3">
        <Shield className={cn(
          "w-5 h-5",
          status === 'scanning' && "text-yellow-500 animate-spin",
          status === 'blocked' && "text-red-500",
          status === 'approved' && "text-emerald-500"
        )} />
        <span className="text-xs font-bold uppercase tracking-widest">
          Simulation Firewall
        </span>
      </div>
      
      {/* Visual scan progress */}
      {status === 'scanning' && (
        <div className="space-y-2">
          <div className="h-1 bg-zinc-800 rounded overflow-hidden">
            <div className="h-full bg-yellow-500 animate-[scan_2s_ease-in-out_infinite]" 
                 style={{ width: '30%' }} />
          </div>
          <p className="text-[10px] text-zinc-500">
            Forking mainnet state... Simulating transaction...
          </p>
        </div>
      )}
      
      {/* Block details */}
      {status === 'blocked' && (
        <div className="space-y-1">
          <p className="text-xs text-red-400 font-mono">⚠ {details.error}</p>
          <p className="text-[10px] text-zinc-500">
            Transaction would fail. AI auto-correcting...
          </p>
        </div>
      )}
      
      {/* Approval */}
      {status === 'approved' && (
        <div className="space-y-1">
          <p className="text-xs text-emerald-400">✓ Simulation passed</p>
          <p className="text-[10px] text-zinc-500">
            {details.simulationResult?.computeUnits} CU | 
            {details.simulationResult?.fee} SOL fee
          </p>
        </div>
      )}
    </div>
  );
}
```

---

## SECTION 5: CRITICAL BUGS & FIXES

### BUG #1: No Nonce Validation on Bridge
**SEVERITY:** CRITICAL  
**CURRENT:** Messages accepted from any iframe origin.  
**FIX:** Implement crypto nonces.

```typescript
// lib/studio/bridge-security.ts
export function generateNonce(): string {
  return crypto.randomUUID();
}

export function verifyBridgeMessage(
  event: MessageEvent,
  expectedNonce: string
): boolean {
  // 1. Check origin whitelist
  if (!ALLOWED_ORIGINS.includes(event.origin)) return false;
  
  // 2. Verify nonce matches
  if (event.data.nonce !== expectedNonce) return false;
  
  // 3. Check timestamp (prevent replay attacks)
  const age = Date.now() - event.data.timestamp;
  if (age > 30000) return false; // 30s max age
  
  return true;
}
```

### BUG #2: Memory Leak in LivePreview
**SEVERITY:** HIGH  
**CURRENT:** `URL.createObjectURL()` never revoked.  
**FIX:** Cleanup in useEffect.

```typescript
useEffect(() => {
  const urls: string[] = [];
  
  // Create blob URLs...
  const blobUrl = URL.createObjectURL(blob);
  urls.push(blobUrl);
  
  return () => {
    urls.forEach(URL.revokeObjectURL);
  };
}, [appCode]);
```

### BUG #3: No CSP on Iframe
**SEVERITY:** HIGH  
**CURRENT:** `sandbox` only, no Content-Security-Policy.  
**FIX:** Inject CSP meta tag.

```html
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self' blob: https://esm.sh https://unpkg.com; 
               script-src 'self' 'unsafe-eval' blob: https://unpkg.com https://esm.sh;
               style-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com;
               connect-src 'none';" />
```

---

## SECTION 6: IMPLEMENTATION ROADMAP

### Phase 1: Security Hardening (Week 1)
- [ ] Implement nonce validation on Bridge
- [ ] Add CSP headers to iframe
- [ ] Fix URL.revokeObjectURL leaks
- [ ] Add origin whitelist validation

### Phase 2: The Architect Core (Week 2-3)
- [ ] Build streaming text engine
- [ ] Implement TypeScript error detection
- [ ] Create self-correction loop
- [ ] Write system prompt

### Phase 3: Cyberpunk UI (Week 4)
- [ ] Create custom Monaco theme
- [ ] Add neon glow effects
- [ ] Build Simulation Firewall visualization
- [ ] Implement character typing animation

### Phase 4: Dependency Resolution (Week 5)
- [ ] Build semantic registry
- [ ] Add version conflict detection
- [ ] Create dependency graph visualizer
- [ ] Implement peer dependency resolution

### Phase 5: Templates & Polish (Week 6)
- [ ] Build 5 starter templates
- [ ] Template preview thumbnails
- [ ] One-click deploy from template
- [ ] Documentation integration

---

## CONCLUSION

**SCORECARD:**

| Category | Current | Target | Gap |
|----------|---------|--------|-----|
| Security | 6/10 | 10/10 | **Critical** |
| UX | 5/10 | 9/10 | High |
| AI Integration | 4/10 | 9/10 | High |
| Scalability | 7/10 | 8/10 | Medium |
| Performance | 6/10 | 8/10 | Medium |

**GO/NO-GO:** **NO-GO** until Phase 1 security fixes are complete.

The Studio has strong architectural foundations but requires 6 weeks of focused work before Q2 2026 launch readiness.

---

*Audit by: Kimi | Date: January 2026*
