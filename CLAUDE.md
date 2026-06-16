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

**No test runner is configured** — there is no test framework, script, or test files in this repo yet.

## Architecture

App Router project (`app/`), React Server Components enabled (`rsc: true`). No `src/` directory — code lives at the repo root.

- **Path alias:** `@/*` maps to the repo root (`@/lib/utils`, `@/components/...`), not a `src/` folder. Defined in `tsconfig.json`.
- **`lib/utils.ts`** exports `cn()` (clsx + tailwind-merge) — the standard class-merge helper used by all components.

### Styling: Tailwind v4, CSS-first

There is **no `tailwind.config.js`**. All Tailwind configuration lives in `app/globals.css`:
- `@import "tailwindcss"` + `@import "shadcn/tailwind.css"` + `tw-animate-css`.
- Design tokens are CSS custom properties (`oklch`) defined in `:root` and `.dark`, then exposed as Tailwind utilities via the `@theme inline { … }` block.
- Dark mode is class-based: `@custom-variant dark (&:is(.dark *))` — toggled by a `.dark` class on an ancestor.
- PostCSS uses `@tailwindcss/postcss` (`postcss.config.mjs`).

### Fonts

`app/layout.tsx` loads four `next/font/google` families and binds them to CSS variables consumed by the theme:
- `--font-sans` → Noto Sans (the default body font; `font-sans`)
- `--font-heading` → Playfair Display (`font-heading`)
- `--font-geist-mono` → Geist Mono (`font-mono`)
- `--font-geist-sans` → Geist (loaded but not the active sans)

### Components: shadcn registry + Base UI

Components are vendored **source you own and edit** (shadcn model), not a dependency. RetroUI components land in `components/retroui/`. Styling uses `class-variance-authority` (`cva`) variant maps merged through `cn()`.

**Important — RetroUI components are built on Base UI (`@base-ui/react`), not Radix**, even though `components.json` style is `radix-sera`. Both `radix-ui` and `@base-ui/react` are installed. Consequences when composing RetroUI components:
- Use Base UI's **`render` prop** for polymorphism (e.g. `<Button render={<a href="…" />}>`), which is Base UI's equivalent of Radix's `asChild` — there is no `asChild` prop.
- The icon library is **Lucide** (`lucide-react`), per `components.json`.

RetroUI's `Button` references theme tokens/utilities that are **not defined** in `app/globals.css`: `font-head` (the theme only defines `--font-heading` → `font-heading`), `bg-primary-hover`, and `bg-secondary-hover` (no `--color-*-hover` tokens exist). Add these to the `@theme` block if/when you adopt RetroUI styling fully, or those states (notably the hover background) won't render as intended.
