# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project

Arcade Vault — plataforma para jugar juegos arcade online y competir por puntajes (README en español). La UI está en español: rutas (`/juegos`, `/salon`, `/acerca-de`), copy y comentarios de código.

Stack: Next.js 16.3.2 (App Router), React 19.2.8, TypeScript, Tailwind CSS 4, Supabase (`@supabase/ssr` + `supabase-js`), Resend (formulario de contacto), ESLint 9 (flat config) + Prettier 3.

Scripts: `npm run dev | build | start | lint | format`. No hay test runner configurado.

Formato automático: un hook `PostToolUse` en `.claude/settings.json` corre `prettier --write` y `eslint --fix` sobre cada archivo que escribes o editas. No hace falta formatear a mano.

## Arquitectura

**Rutas** (`app/`) — todas las páginas con datos son Server Components que crean el cliente de Supabase con `createClient()` de `lib/supabase/server.ts`, consultan vía `lib/supabase/queries.ts` y pasan los datos a un Client Component `*Client.tsx` en `components/`:

- `/` → `HomeClient`
- `/juegos` → `GamesLibraryClient` (catálogo con filtro por categoría)
- `/juegos/[id]` → detalle + top 10 de puntajes (`getTopScores`)
- `/juegos/[id]/jugar` → `PlayerClient` (el reproductor con canvas y HUD)
- `/salon` → `HallOfFameClient` (leaderboard)
- `/acerca-de`, `/auth` → client components sin datos de servidor

**API y acciones:** `app/api/contact/route.ts` (Resend), `app/api/supabase-ping/route.ts`, y las server actions `registerPlay` / `saveScore` en `app/actions/games.ts`. `proxy.ts` refresca la sesión de Supabase en cada request (equivalente al middleware; ver los docs de Next 16 antes de tocarlo).

**Datos:** dos tablas en Supabase — `games` (forma = la interfaz `Game` de `lib/games.ts`: `id`, `title`, `short`, `long`, `cat`, `cover`, `color`, `best`, `plays`) y `scores` (`game_id`, `player_name`, `score`, `created_at`). Hay un MCP server de Supabase configurado en `.mcp.json`; úsalo para migraciones y consultas. Variables de entorno en `.env.example`.

**Auth:** la pantalla `/auth` es todavía simulada — guarda `{ name }` en `localStorage` bajo la clave `av_user`. No hay auth real de Supabase aún.

## Juegos

Cada juego es un engine de canvas en TypeScript vanilla más un wrapper de React. Juegos actuales: **arkanoid**, **asteroides**, **serpentina** (snake), **tetris**. Todos los juegos ya implementados se pueden consultar en `references/implemented-games.md`.

- `lib/games/<slug>/engine.ts` — factory closure `create<X>Game(canvas, callbacks)` que devuelve `{ start, stop, setPaused }`, y exporta `<X>HudState` y `<X>Callbacks` (`onStateChange`, `onGameOver`). Todo el estado vive dentro del closure, nunca a nivel de módulo. `onGameOver` se dispara exactamente una vez.
- `components/<X>Canvas.tsx` — client component: un `useEffect` con deps `[]` que crea el juego, lo arranca y lo detiene en el cleanup; otro `useEffect` con dep `[paused]` que llama `setPaused`.
- `lib/games/registry.ts` — `GAME_REGISTRY: Record<string, { Canvas }>` mapea el `id` del juego (el mismo de la tabla `games`) a su componente. `PlayerClient` resuelve el canvas por ahí; **no agregues condicionales por `game.id` en `PlayerClient`**.
- El cover de cada juego es una clase CSS `.cover-<slug>` generada con puros gradientes en `app/globals.css` (sección "Cover art generators"), y el valor de la columna `cover` en Supabase es ese nombre de clase.
- Assets binarios de juegos van en `public/juegos/<slug>/`.

`references/started-games/` guarda las versiones originales en JS vanilla de los juegos que se portan; `references/templates/` los mockups JSX/HTML de los que salió la UI. Es material de consulta — no se compila.

## Next.js 16 breaking changes — read before writing code

This is Next.js 16, not the version in your training data. Before touching routing, layouts, data fetching, or config, read the matching guide under `node_modules/next/dist/docs/` (`01-app` for App Router, `03-architecture` for framework internals) and follow any deprecation notices there.

Convenciones ya visibles en este repo: los props de layouts y páginas usan los tipos generados globales (`LayoutProps<"/">`, `PageProps<"/juegos/[id]">`) en vez de tipos escritos a mano, y `params` es una promesa (`const { id } = await params`).

## Spec-driven workflow

El proyecto usa diseño dirigido por specs. Las specs viven en `specs/NN-slug.md` (van 09 a la fecha) y `specs/.spec-config.yml` controla si `/spec-impl` crea la rama `spec-NN-slug` automáticamente (hoy: sí). Cada spec se implementa en su propia rama y entra a `main` por PR.

Skills disponibles:

- `/spec` y `/spec-impl` (`.agents/skills/`) — del pack `Klerith/fernando-skills`, versionados en `skills-lock.json`. Son upstream: no los edites a mano.
- `/spec-juego` (`.claude/skills/spec-juego/`) — skill propia del proyecto. Especializa `/spec` para agregar un juego nuevo (engine, canvas, HUD, cover, fila en `games`, leaderboard). Su `integracion.md` documenta los 6 puntos de cableado de un juego. Úsala antes de escribir el código de un juego nuevo.

## Skills

Usa siempre /frontend-design para diseñar la interfaz de usuario.
