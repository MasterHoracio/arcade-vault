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

- `lib/games/<slug>/engine.ts` — factory closure `create<X>Game(canvas, callbacks, options?: { skin?: SkinId })` que devuelve `{ start, stop, setPaused, setSkin }`, y exporta `<X>HudState` y `<X>Callbacks` (`onStateChange`, `onGameOver`). Todo el estado vive dentro del closure, nunca a nivel de módulo. `onGameOver` se dispara exactamente una vez. `setSkin` reasigna la paleta activa y repinta sin reiniciar la partida.
- `components/<X>Canvas.tsx` — client component: un `useEffect` con deps `[]` que crea el juego, lo arranca y lo detiene en el cleanup; otro `useEffect` con dep `[paused]` que llama `setPaused`; otro con dep `[skin]` que llama `setSkin`.
- `lib/games/registry.ts` — `GAME_REGISTRY: Record<string, { Canvas, skins }>` mapea el `id` del juego (el mismo de la tabla `games`) a su componente y a los skins que de verdad implementa. `PlayerClient` resuelve el canvas por ahí; **no agregues condicionales por `game.id` en `PlayerClient`**.
- El cover de cada juego es una clase CSS `.cover-<slug>` generada con puros gradientes en `app/globals.css` (sección "Cover art generators"), y el valor de la columna `cover` en Supabase es ese nombre de clase.
- Assets binarios de juegos van en `public/juegos/<slug>/`.

### Skins

Todo juego debe ofrecer 3 skins: `clasico` (default, idéntico al look
original), `neon` (paleta del sitio + glow) y `retro` (fósforo CRT
monocromo). `lib/games/skins.ts` es el contrato compartido (`SkinId`,
persistencia en `localStorage` bajo `av_skin`); `lib/games/<slug>/skins.ts`
es la paleta propia de cada juego. Reglas de diseño, contraste sobre el
fondo oscuro, y la técnica de re-tinte de sprites viven en
`references/skins-contract.md`. La app es dark-only — no hay modo claro ni
`prefers-color-scheme`; "verse bien en modo oscuro" se verifica con las
reglas de contraste de ese documento, no a ojo.

### Responsive móvil

Los 3 breakpoints canónicos (`480px`/`768px`/`1024px`, convención
`max-width`), los 4 puntos de falla recurrentes del layout de este repo
(estilos inline con px fijos, filas flex sin wrap, padding/radius fijo,
grids sin colapso) y las reglas verificables de pantalla chica viven en
`references/mobile-contract.md`. Es solo web responsive de navegador — sin
PWA, manifest ni wrapper nativo.

`references/started-games/` guarda las versiones originales en JS vanilla de los juegos que se portan; `references/templates/` los mockups JSX/HTML de los que salió la UI. Es material de consulta — no se compila.

## Next.js 16 breaking changes — read before writing code

This is Next.js 16, not the version in your training data. Before touching routing, layouts, data fetching, or config, read the matching guide under `node_modules/next/dist/docs/` (`01-app` for App Router, `03-architecture` for framework internals) and follow any deprecation notices there.

Convenciones ya visibles en este repo: los props de layouts y páginas usan los tipos generados globales (`LayoutProps<"/">`, `PageProps<"/juegos/[id]">`) en vez de tipos escritos a mano, y `params` es una promesa (`const { id } = await params`).

## Spec-driven workflow

El proyecto usa diseño dirigido por specs. Las specs viven en `specs/NN-slug.md` (van 09 a la fecha) y `specs/.spec-config.yml` controla si `/spec-impl` crea la rama `spec-NN-slug` automáticamente (hoy: sí). Cada spec se implementa en su propia rama y entra a `main` por PR.

Skills disponibles:

- `/spec` y `/spec-impl` (`.agents/skills/`) — del pack `Klerith/fernando-skills`, versionados en `skills-lock.json`. Son upstream: no los edites a mano.
- `/spec-juego` (`.claude/skills/spec-juego/`) — skill propia del proyecto. Especializa `/spec` para agregar un juego nuevo (engine, canvas, HUD, cover, fila en `games`, leaderboard). Su `integracion.md` documenta los 6 puntos de cableado de un juego. Úsala antes de escribir el código de un juego nuevo.
- `/spec-impl-game` (`.claude/skills/spec-impl-game/`) — skill propia del proyecto. Envuelve `/spec-impl` para specs de juego: implementa la spec y, al terminar, encadena los agentes `skin-designer` y `mobile-porter` sobre el juego nuevo, en ese orden y nunca en paralelo.

## Skills

Usa siempre /frontend-design para diseñar la interfaz de usuario.

## Agentes

`game-planner` (`.claude/agents/game-planner.md`) decide qué juego nuevo agregar: analiza el catálogo (Supabase + `references/implemented-games.md`) contra criterios de balance, factibilidad y encaje con el leaderboard, y lleva memoria de lo ya sugerido/descartado en `references/game-suggestions-todo.md` para no repetirse entre corridas. Corre antes de `/spec-juego`, que ya recibe el juego decidido.

`game-jam` (`.claude/agents/game-jam.md`) recibe un tema libre (ej. "espacio profundo") y explora 3 variantes de un mismo juego inspirado en ese tema, cada una como spec completa en `specs/game-jam/<game-id>/`. No decide qué juego agregar por balance de catálogo (eso es `game-planner`) ni escribe código ni migra Supabase; solo produce las 3 specs para revisión. Elegida una variante, se numera en `specs/` vía `/spec-juego <game-id>`.

`skin-designer` (`.claude/agents/skin-designer.md`) audita e implementa los 3 skins (`clasico`, `neon`, `retro`) del juego que le indiques — uno por corrida, nunca decide cuál por su cuenta. Lleva memoria de qué juegos ya tienen los 3 skins en `references/game-with-themes.md`. No agrega juegos nuevos ni explora temas de concepto (eso es `game-planner`/`game-jam`); solo re-tematiza un juego ya implementado.

`mobile-porter` (`.claude/agents/mobile-porter.md`) audita e implementa el responsive móvil de la zona (ruta o componente compartido) que le indiques — una por corrida, nunca decide cuál por su cuenta. Sigue el contrato de breakpoints y reglas verificables de `references/mobile-contract.md`, y lleva memoria de qué zonas ya están portadas en `references/mobile-audit.md`. No toca ningún `engine.ts`, no agrega PWA/manifest/service worker, y no cambia skins ni mecánica de ningún juego.
