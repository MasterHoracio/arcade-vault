# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project

Arcade Vault — a platform for playing games online and competing for high scores (per README, in Spanish). Currently a fresh, unmodified `create-next-app` scaffold: only `app/layout.tsx`, `app/page.tsx`, and `app/globals.css` exist, no game logic yet.

Stack: Next.js 16.3.2 (App Router), React 19.2.8, TypeScript, Tailwind CSS 4, ESLint 9 (flat config).

## Commands

```bash
npm run dev      # start dev server (also regenerates the AGENTS.md block above)
npm run build
npm run start
npm run lint
```

No test runner is configured yet.

## Next.js 16 breaking changes — read before writing code

This is Next.js 16, not the version in your training data. Before touching routing, layouts, data fetching, or config, read the matching guide under `node_modules/next/dist/docs/` (`01-app` for App Router, `03-architecture` for framework internals) and follow any deprecation notices there.

One breaking change already visible in this repo: `app/layout.tsx` types its props with the generated `LayoutProps<"/">` global (from `.next/types`) instead of a hand-written `{ children: React.ReactNode }` prop type — follow this pattern for new layouts/pages rather than the older manual typing.

## Spec-driven workflow

The README indicates this project follows spec-driven design via `/spec` and `/spec-impl`, using the skill pack from `Klerith/fernando-skills` (installed via `npx skills@latest add Klerith/fernando-skills`). No `/spec` command or skill files are present in this checkout yet — if asked to add a feature, check whether that skill pack has since been installed before improvising a spec format.
