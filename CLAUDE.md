# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## ⚠️ Next.js 16 — non-standard

Per `AGENTS.md` above: this Next.js version has breaking changes vs. what you likely know. **Before writing any Next.js code, read the relevant guide** in `node_modules/next/dist/docs/` — App Router docs live under `01-app/` (e.g. `01-app/01-getting-started/`, `01-app/03-api-reference/`). Do not rely on training-data APIs/conventions.

## Commands

```bash
npm run dev      # dev server at http://localhost:3000
npm run build    # production build (also runs full type-check)
npm run start    # serve the production build
npm run lint     # ESLint (flat config, next core-web-vitals + typescript)
npx tsc --noEmit # type-check only (no dedicated script exists)
```

Add a UI component from the RetroUI registry (configured in `components.json`):

```bash
npx shadcn@latest add @retroui/<name>   # e.g. @retroui/button
```

The first-run shadcn prompts (component library, preset) are already answered and committed in `components.json`, so subsequent adds skip them.

**Testing:** the audit engine is covered by **Vitest** (`vitest.config.ts`; tests in `lib/**/*.test.ts`) plus a zero-dep CLI verifier (`scripts/verify-engine.ts`) that runs realistic transcript fixtures through the engine. Scripts: `npm test` / `npm run test:watch`, and `npm run verify`. ⚠️ `vitest`/`tsx` may not be installed: `npm install` fails in this shell with `UNABLE_TO_VERIFY_LEAF_SIGNATURE` (TLS interception) — run `npm i -D vitest tsx` in your own terminal. Until then, run the verifier via the bundled compiler: `npx tsc scripts/verify-engine.ts --outDir .verify-build --module commonjs --moduleResolution node10 --target ES2020 --esModuleInterop --skipLibCheck && node .verify-build/scripts/verify-engine.js`.

## Architecture

App Router project (`app/`), React Server Components enabled (`rsc: true`). No `src/` directory — code lives at the repo root.

- **Path alias:** `@/*` maps to the repo root (`@/lib/utils`, `@/components/...`), not a `src/` folder. Defined in `tsconfig.json`.
- **`lib/utils.ts`** exports `cn()` (clsx + tailwind-merge) — the standard class-merge helper used by all components.

### Styling: Tailwind v4, CSS-first

There is **no `tailwind.config.js`** (Tailwind v4, CSS-first). The global stylesheet is **`app/styles/global.css`** (imported by `app/layout.tsx`):
- `@import "tailwindcss"` + `@import "tw-animate-css"` + `@import "shadcn/tailwind.css"`.
- It holds the **RetroUI (neubrutalist) theme**: hex tokens in `:root` (e.g. `--primary: #ffdb33`, `--primary-hover`, `--radius: 0`) and a hard offset-shadow scale (`--shadow-*: Npx Npx 0 0 var(--border)`), surfaced to utilities via `@theme inline { … }`.
- Light-only for now (no `.dark` block). PostCSS uses `@tailwindcss/postcss` (`postcss.config.mjs`).
- A legacy `app/globals.css` (oklch/Sera theme) may still exist but is **unused** — the layout imports `./styles/global.css`.

### Fonts

`app/layout.tsx` loads two `next/font/google` families (the RetroUI pairing) and binds them to CSS variables on `<body>`:
- `--font-head` → Archivo Black (`font-head`; RetroUI headings / `Button`)
- `--font-sans` → Space Grotesk (`font-sans`; default body font)

### Components: shadcn registry + Base UI

Components are vendored **source you own and edit** (shadcn model), not a dependency. RetroUI components land in `components/retroui/`. Styling uses `class-variance-authority` (`cva`) variant maps merged through `cn()`.

**Important — RetroUI components are built on Base UI (`@base-ui/react`), not Radix**, even though `components.json` style is `radix-sera`. Both `radix-ui` and `@base-ui/react` are installed. Consequences when composing RetroUI components:
- Use Base UI's **`render` prop** for polymorphism (e.g. `<Button render={<a href="…" />}>`), which is Base UI's equivalent of Radix's `asChild` — there is no `asChild` prop.
- The icon library is **Lucide** (`lucide-react`), per `components.json`.

The RetroUI theme in `app/styles/global.css` defines the tokens its components reference (`--font-head`, `--primary-hover`, the hard-shadow scale, `--radius: 0`), so RetroUI's `Button` renders as intended.

## Domain: degree-audit engine (`lib/`)

KU-Credit computes a student's graduation progress for the CS **2565** curriculum. See `CONTEXT.md` (glossary), `docs/implementation-plan.md`, and `docs/adr/0001-local-first-single-user-mvp.md`. Three layers:

- **`lib/curriculum/`** — static, read-only seed. `types.ts` (Course, Requirement tree, Prerequisite) + `cs-2565.ts` (verified curriculum: 4 core + 20 required with corrected prereqs, ~36 elective options, the Gen-Ed requirement tree, ≥124 total). Never mutated.
- **`lib/storage/types.ts`** — the mutable `Progress` (Attempts, CustomCourses, manual Assignments, flags). The persistence seam (`ProgressStore`, localStorage) is **not built yet** — types only.
- **`lib/audit/`** — `engine.ts` exports the **pure** `computeAudit(curriculum, progress, regulation)` (no I/O, fully unit-tested); `grades.ts` (§14.1 scale), `regulation.ts` (graduation rules **verified against ข้อบังคับฯ 2566** — note GPAX counts *every* attempt of a retake, §22.2, not the latest), `report.ts` (CLI formatter), `fixtures.ts` (9 transcripts), `engine.test.ts`.

Rules the engine encodes: per-Requirement credit minimums (incl. nested Gen-Ed groups + Language sub-slots); **manual** Course→Requirement assignment (fixed Core/Required auto-home); GPAX over all graded attempts; soft prereq warnings; a done/honors verdict. The engine is the trusted core — the dashboard UI and localStorage persistence are the remaining work.
