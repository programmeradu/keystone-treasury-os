# dreyv rebrand — plan & progress

Living checklist for the Keystone → **dreyv** (lowercase in UI/marketing) rebrand. Legal entity (e.g. StaUniverse) stays where appropriate for Terms/Privacy.

**Messaging canon:** `docs/DREYV-BRAND-SYNTHESIS.md` (internal) ties research docs to live naming and copy rules.

## Principles

- **Brand:** `dreyv` in product UI, landing, and public marketing copy.
- **Scope:** Site-wide and app-wide; packages (`@keystone-os/*`, CLI, SDK) are a later phase to avoid breaking installs.
- **Design tokens:** `keystone-green` / `--keystone-*` remain as CSS variables for compatibility; `dreyv-*` aliases added in `globals.css` for gradual Tailwind migration.
- **Social / sameAs:** Update URLs when official profiles exist; tracker notes below.

---

## Phase 1 — Tracking & public SEO shell

- Add this progress file (`REBRAND-DREYV-PROGRESS.md`).
- Add `public/llms.txt` for LLM/GEO discovery.
- Add FAQ section on home + **FAQPage** JSON-LD (aligned copy).
- Add **What is dreyv?** section on home (hero + dedicated blurb).
- Align root metadata / manifest naming with lowercase **dreyv** where brand-facing.
- Add `--dreyv-*` / `--color-dreyv-*` theme aliases in `globals.css`.

## Phase 2 — Landing & home components

- Header/footer: logo label, aria-labels, nav (incl. FAQ anchor).
- Hero, problem, pillars, demo, war-room, trust, CTA, command bar, ecosystem, use-cases, how-it-works: user-facing **Keystone** → **dreyv**; mock `keystone://` → `dreyv://` where decorative; accent classes moved to `**dreyv-*`** on these sections.
- Deep dive: dashboard alt text; code sample still uses `@keystone/sdk` until Phase 5 npm scope.
- Public marketing/legal routes: `/pricing`, `/auth`, `/guides/...`, `/legal/*`, `error.tsx`, `/mobile/signer` — product copy **dreyv**; cookie table still lists real cookie names (`keystone-*`).
- Footer socials: **X @dreyvapp** (`https://x.com/dreyvapp`), **LinkedIn** (`https://www.linkedin.com/company/dreyv/`); JSON-LD **sameAs** updated.
- Repo-wide optional sweep: any remaining `keystone-green` / `keystone-void` outside `src/components/home` (aliases exist; not blocking).

## Phase 3 — App shell, auth emails, legal

- `/app` routes + in-app components: user-visible **Keystone** → **dreyv** (headers, marketplace, studio defaults, onboarding, command bar, exports, foresight, billing, etc.). Hooks like `useKeystoneAuth` and runtime bridge identifiers unchanged.
- Transactional email copy + `email-service` subjects/from default; React email layout exported as `**DreyvLayout`**.
- Legal pages: product name **dreyv** in body copy; IP section attributes rights to **StaUniverse**; contact emails unchanged (`@keystone.so`) until mailboxes migrate.
- Global `error.tsx` footer branding; **auth** page visible strings (session keys / hooks unchanged).

## Phase 4 — Risky identifiers

- JWT issuer, cookie names, OAuth app name: audit; migrate only with a coordinated cutover doc.

## Phase 5 — npm / monorepo

- Rename `@keystone-os/*`, CLI, SDK; update imports and docs.
- Deep-dive mock still shows `@keystone/sdk` until packages ship — update when scope publishes.

---

## Blockers / follow-ups

- **LinkedIn:** Company URL `**/company/dreyv/`** (footer + `sameAs` + `llms.txt`).
- **Discord / GitHub:** Footer URLs may still use legacy org slugs; update when official **dreyv** endpoints exist.
- **Legal contact email:** Still **@keystone.so** in Privacy/Terms/Cookies until DNS inboxes are ready.
- **Firecrawl:** Credits were low during research; no blocker for implementation.

---

## Changelog (agent)


| Date       | Notes                                                                                                                                                                                                                                                                  |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-04-13 | Initial tracker; `public/llms.txt`, shared `home-faq.ts`, FAQ UI + FAQPage in `buildRootJsonLd`, What is dreyv section, home batch (header/footer/hero/sections), `--dreyv-*` theme aliases, root metadata + PWA manifest lowercase **dreyv**; `npm run build` passed. |
| 2026-04-13 | Public pages batch: pricing, guide, legal suite, auth UI, global error, mobile signer; footer **X @dreyvapp** + LinkedIn; Organization **sameAs**; `llms.txt` socials.                                                                                                 |
| 2026-04-13 | LinkedIn → `**/company/dreyv/`**; **app** rebrand pass (pages + dashboard/studio/foresight components); emails + PDF export + invite/register API display strings.                                                                                                     |
| 2026-04-13 | LinkedIn slug corrected to **dreyv**; `DreyvLayout` + `DreyvAgentInput` rename (`Keystone`* removed).                                                                                                                                                                  |


