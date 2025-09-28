# Puter.js – GenAI API Notes

This project integrates a generic AI text endpoint with a preferred provider (Puter) and a free fallback (Pollinations).

Preferred provider: Puter (AI text)
- Set these environment variables to enable Puter first:
  - PUTER_BASE_URL (e.g., https://api.puter.com/ai/text)
  - PUTER_API_KEY (Bearer token)
- API contract used in our code (POST):
  - Request body: { "prompt": string }
  - Expected response examples: { text: string } | { output: string } | string
  - We normalize to: { provider: "puter", text: string }

Fallback provider: Pollinations
- Text generation (GET): https://text.pollinations.ai/{prompt}
- Response is plain text; we normalize to: { provider: "pollinations", text: string }

Image endpoints (reference only; not wired yet):
- Generate image: GET https://image.pollinations.ai/prompt/{prompt}
- List models: GET https://image.pollinations.ai/models

Real-time feeds (reference):
- Image Feed: GET https://image.pollinations.ai/feed
- Text Feed: GET https://text.pollinations.ai/feed

Notes
- If Puter is not configured (no envs) or errors, we automatically fallback to Pollinations in the /api/ai/text route.
- Extend this document with the official Puter.js documentation details as needed (SDK usage, auth, rate limits, models, etc.).