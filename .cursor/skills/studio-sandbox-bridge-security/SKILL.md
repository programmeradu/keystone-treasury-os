---
name: studio-sandbox-bridge-security
description: Enforces secure iframe sandbox and postMessage bridge rules for Keystone Studio. Use when writing or reviewing code that uses iframes, sandbox attributes, window.postMessage, or host–iframe bridge communication in the Studio, LivePreview, ForesightPreview, or BridgeController.
---

# Studio Sandbox & Bridge Security

When writing or reviewing code that touches the Keystone Studio iframe sandbox or the `window.postMessage` bridge, enforce these rules to prevent sandbox escape and message injection or replay.

---

## 1. Iframe Sandbox Rule

**Never use `allow-same-origin` on the Studio iframe.**

- The sandbox must be restricted **exclusively** to `allow-scripts`.
- Allowing `allow-same-origin` would give the iframe an origin and enable access to `localStorage`, `sessionStorage`, `document.cookie`, and other same-origin APIs, undermining the sandbox.

**Correct:**

```html
<iframe sandbox="allow-scripts" srcDoc={content} ... />
```

**Forbidden:**

```html
<iframe sandbox="allow-scripts allow-same-origin" ... />
<iframe sandbox="allow-same-origin" ... />
```

If you see `sandbox` with `allow-same-origin` in Studio iframe code, remove it and keep only `allow-scripts`.

---

## 2. Bridge Validation (postMessage Listener)

When writing **host-side** code that listens for messages from the iframe:

1. **Validate the sender:** Always verify that the message came from the expected iframe window:
   - `event.source === iframe.contentWindow`
   - Reject or ignore the message if this check fails (do not process messages from other windows/tabs).

2. **Use crypto nonces for requests:** For request/response protocols (e.g. JSON-RPC over postMessage), use **`crypto.randomUUID()`** (or equivalent) to generate request IDs/nonces. Track used nonces and reject duplicates to prevent replay attacks.

**Correct host listener pattern:**

```ts
window.addEventListener("message", (event: MessageEvent) => {
  const iframe = iframeRef.current;
  if (!iframe || event.source !== iframe.contentWindow) return;

  const data = event.data;
  if (!data?.id || !nonceTracker.consume(data.id)) return; // replay check

  // Handle valid message...
});
```

**Forbidden:**

- Processing `event.data` without checking `event.source === iframe.contentWindow`.
- Using predictable or non-crypto request IDs (e.g. sequential numbers) for security-sensitive flows.
- Ignoring duplicate nonces.

---

## 3. Target Origin for postMessage

**Never use `"*"` as the target origin for `postMessage`.**

- When the **host** sends a message to the iframe: use the iframe’s actual origin. For `srcDoc` iframes this is `"null"`.
- When the **iframe** sends a message to the host: use the host’s known origin (e.g. `window.location.origin` or a configured allowed origin), not `"*"`.

**Correct (host → iframe, srcDoc):**

```ts
iframe.contentWindow.postMessage(payload, "null");
```

**Correct (iframe → host, when host origin is known):**

```ts
window.parent.postMessage(payload, window.location.origin);
// or a configured ALLOWED_ORIGIN / parentOrigin
```

**Forbidden:**

```ts
iframe.contentWindow.postMessage(payload, "*");
window.parent.postMessage(payload, "*");
```

If you see `postMessage(..., "*")` in Studio/bridge code, replace it with the specific target origin (`"null"` for srcDoc iframe, or the host origin as appropriate).

---

## Pre-Commit Checklist

Before submitting code that touches the Studio iframe or bridge:

- [ ] No `allow-same-origin` in iframe `sandbox`; only `allow-scripts` (and any other non-origin sandbox flags if ever needed).
- [ ] Host message handler validates `event.source === iframe.contentWindow`.
- [ ] Request/response flows use `crypto.randomUUID()` (or equivalent) for nonces and reject replayed nonces.
- [ ] No `postMessage(..., "*")`; target origin is `"null"` for srcDoc iframe or the specific host origin.

---

## Red Flags to Reject

- Adding `allow-same-origin` to “fix” localStorage/cookie access in the sandbox.
- Using `"*"` for postMessage “for simplicity” or “to avoid origin issues.”
- Handling bridge messages without checking `event.source`.
- Using sequential or predictable IDs instead of crypto nonces for bridge requests.
