## 2026-04-09 - Fix PromptChat API Request Injection
**Vulnerability:** Prompt injection and length attack vulnerability in the `PromptChat` component, where user input was submitted directly without length validation.
**Learning:** Hard-coded limits like 2000 characters are too restrictive for prompt interfaces because users frequently paste code, so using a larger limit like 100000 characters combined with an appropriate error notification (using `toast` instead of native `alert`) provides better UX while defending against excessively large payloads.
**Prevention:** Implement reasonable character boundaries and standard error handling via toast notification on all user inputs before invoking LLM generation functions.
