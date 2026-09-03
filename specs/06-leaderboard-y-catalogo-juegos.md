# 06 · Leaderboard real y catálogo de juegos en Supabase

**Estado:** Implementado
**Depende de:** SPEC 01, SPEC 04
**Fecha:** 2026-08-29

**Objetivo:** Migrar el catálogo de juegos (`lib/games.ts`) y las puntuaciones a dos tablas nuevas en Supabase (`games`, `scores`), reemplazando el array hardcodeado y el mock `seededScores` por datos reales en `/`, `/juegos`, `/juegos/[id]`, `/juegos/[id]/jugar` y `/salon`, incluyendo el guardado real de puntuaciones al terminar una partida.

## Alcance

**Incluye:**

- Migración SQL en Supabase que crea las tablas `games` y `scores` (sin RLS, ver Riesgos) y siembra `games` con los 9 juegos actuales (mismos datos que hoy tiene `GAMES` en `lib/games.ts`, incluyendo `best` y `plays` tal cual).
- `lib/supabase/queries.ts`: funciones `getGames`, `getGame`, `getTopScores`, `insertScore` sobre un `SupabaseClient` recibido como parámetro (funcionan tanto con el cliente de servidor como con el de navegador ya existentes en `lib/supabase/`).
- `lib/games.ts` deja de exportar `GAMES` y `seededScores`. Conserva los tipos (`Game`, `GameCategory`, `GameColor`, `ScoreRow`), `CATS` y `PLAYERS` deja de usarse y se elimina (ya no hay generación de nombres falsos).
- `app/juegos/page.tsx` pasa a ser un Server Component `async` que llama `getGames` y renderiza `components/GamesLibraryClient.tsx` (contenido actual de buscador/chips/grid, movido tal cual) pasándole `games: Game[]` como prop.
- `app/page.tsx` (Home) pasa a ser un Server Component `async` que llama `getGames` y renderiza `components/HomeClient.tsx` (contenido actual de Home movido tal cual: hero, features, rail, stats, actividad, precios, CTA) pasándole `games: Game[]` como prop; el rail sigue usando `games.slice(0, 6)`.
- `app/juegos/[id]/page.tsx` (ya Server Component) usa `getGame(id)` en vez de `GAMES.find` y `getTopScores(id, 10)` en vez de `seededScores`, manteniendo el mismo layout ("MEJORES PUNTUACIONES" con 10 filas).
- `app/juegos/[id]/jugar/page.tsx` pasa a ser un Server Component `async` que llama `getGame(id)` (`notFound()` si no existe) y renderiza `components/PlayerClient.tsx` (todo el contenido interactivo actual, movido tal cual) pasándole `game: Game` como prop. Dentro de `PlayerClient`, `handleSaveScore` llama `insertScore` con el cliente de navegador (`lib/supabase/client.ts`) en vez de escribir en `localStorage`.
- `app/salon/page.tsx` pasa a ser un Server Component `async` que llama `getGames` y renderiza `components/HallOfFameClient.tsx` (contenido actual movido tal cual) pasándole `games: Game[]`. Dentro de `HallOfFameClient`, un `useEffect` con dependencia `[tab]` llama `getTopScores(tab, 12)` con el cliente de navegador y guarda el resultado en estado; mientras no haya respuesta se muestra el `hall-table` vacío (sin parpadeo agresivo, ver Estados).
- Estado vacío: si `getTopScores` devuelve un array vacío (juego sin puntuaciones guardadas todavía), `/salon` y el aside "MEJORES PUNTUACIONES" de `/juegos/[id]` muestran el texto `SIN PUNTUACIONES TODAVÍA · SÉ EL PRIMERO` en vez de filas vacías; el podio (top 3) no se renderiza si hay menos de 3 filas.
- Se elimina el código que lee/escribe `av_scores` en `localStorage` (`app/juegos/[id]/jugar/page.tsx`). `av_user` no se toca (sigue siendo la sesión local del nombre del jugador).

**No incluye:**

- Supabase Auth real ni vincular `scores` a un usuario autenticado. `player_name` sigue siendo texto libre escrito por el jugador en el modal de fin de partida, igual que hoy.
- RLS (Row Level Security) en `games` ni `scores`. Ambas tablas quedan sin RLS habilitado: lectura y escritura abiertas a cualquiera con la publishable key. Documentado como riesgo conocido, se endurece en una spec futura de Auth.
- Cálculo dinámico de `best`/`plays` a partir de `scores` (`MAX(score)`, `COUNT(*)`). Ambas columnas quedan estáticas en `games`, con el mismo valor que tienen hoy en `lib/games.ts`. Puede hacerse real en una spec futura.
- CRUD de juegos (crear/editar/borrar un juego desde la UI). La tabla `games` se puebla solo por la migración inicial; no hay pantalla de administración.
- Los otros 8 juegos siguen simulando el puntaje en pantalla con el `setInterval` decorativo existente (`app/juegos/[id]/jugar/page.tsx`, condicionado a `!isAsteroides`); solo cambia dónde se guarda/lee la puntuación final, no cómo se genera durante la partida simulada.
- Editar `components/GameCard.tsx` — sigue recibiendo `Game` por props igual que hoy, ninguna prop cambia de forma.
- Cambios al engine de Asteroides (`lib/games/asteroids/engine.ts`, `components/AsteroidsCanvas.tsx`).

## Modelo de datos

Tablas nuevas en Supabase (esquema `public`, sin RLS):

```sql
create table public.games (
  id text primary key,
  title text not null,
  short text not null,
  long text not null,
  cat text not null check (cat in ('ARCADE', 'PUZZLE', 'SHOOTER', 'VERSUS')),
  cover text not null,
  color text not null check (color in ('cyan', 'magenta', 'yellow', 'green')),
  best integer not null,
  plays text not null
);

create table public.scores (
  id bigint generated always as identity primary key,
  game_id text not null references public.games(id),
  player_name text not null,
  score integer not null,
  created_at timestamptz not null default now()
);

create index scores_game_id_score_idx on public.scores (game_id, score desc);
```

Siembra de `games` (9 filas, mismos valores que `GAMES` en `lib/games.ts` hoy): `asteroides`, `bloque-buster`, `caida`, `serpentina`, `gloton`, `invasores`, `rocas`, `ranaria`, `duelo-pixel`, con sus columnas `title`/`short`/`long`/`cat`/`cover`/`color`/`best`/`plays` copiadas tal cual del archivo actual.

> Nota (2026-09-03): `duelo-pixel`, `gloton`, `invasores`, `ranaria` y
> `rocas` se eliminaron del catálogo; las menciones a ellos en esta spec
> son históricas.

Tipos TypeScript (`lib/games.ts`, ya existentes, sin cambios de forma):

```ts
export interface Game {
  id: string;
  title: string;
  short: string;
  long: string;
  cat: GameCategory;
  cover: string;
  color: GameColor;
  best: number;
  plays: string;
}

export interface ScoreRow {
  rank: number;
  name: string;
  score: number;
  date: string; // "DD/MM/YYYY"
}
```

Nuevas funciones (`lib/supabase/queries.ts`):

```ts
export async function getGames(supabase: SupabaseClient): Promise<Game[]>;
export async function getGame(
  supabase: SupabaseClient,
  id: string,
): Promise<Game | null>;
export async function getTopScores(
  supabase: SupabaseClient,
  gameId: string,
  limit: number,
): Promise<ScoreRow[]>;
export async function insertScore(
  supabase: SupabaseClient,
  params: { gameId: string; playerName: string; score: number },
): Promise<void>;
```

`getTopScores` ordena `scores` por `score desc`, aplica `limit`, y mapea cada fila a `ScoreRow` (`rank` = posición en el resultado + 1, `name` = `player_name`, `date` = `created_at` formateado `es-ES` como `DD/MM/YYYY`).

## Plan de implementación

1. **Migración Supabase** — Crear `games` y `scores` (esquema de arriba) vía `mcp__supabase__apply_migration`, incluyendo los 9 `insert into games (...)` con los datos actuales de `lib/games.ts`. Verificar con `mcp__supabase__list_tables` que ambas tablas existen y `select count(*) from games` devuelve 9.
2. **`lib/supabase/queries.ts`** — Implementar `getGames`, `getGame`, `getTopScores`, `insertScore` sobre `@supabase/supabase-js`. El build sigue pasando (nada las usa todavía).
3. **`lib/games.ts`** — Quitar `GAMES`, `seededScores` y `PLAYERS`. Conservar `Game`, `GameCategory`, `GameColor`, `ScoreRow`, `CATS`.
4. **`components/GamesLibraryClient.tsx`** — Mover el contenido actual de `app/juegos/page.tsx` (buscador, chips, grid, `handleSelect`) a este componente cliente, recibiendo `games: Game[]` por props en vez de importar `GAMES`.
5. **`app/juegos/page.tsx`** — Server Component `async`: `const games = await getGames(createClient())` (cliente de servidor) y `return <GamesLibraryClient games={games} />`.
6. **`components/HomeClient.tsx`** — Mover el contenido actual de `app/page.tsx` (hero, `FloatingSilhouettes`, features, rail con `MiniCard`, stats, actividad, precios, CTA, `useReveal`) a este componente cliente, recibiendo `games: Game[]` por props; el rail usa `games.slice(0, 6)` igual que hoy.
7. **`app/page.tsx`** — Server Component `async`: `const games = await getGames(createClient())` y `return <HomeClient games={games} />`.
8. **`app/juegos/[id]/page.tsx`** — Reemplazar `GAMES.find(...)` por `await getGame(id, createClient())` (`notFound()` si `null`) y `seededScores(...)` por `await getTopScores(createClient(), id, 10)`. Si el resultado está vacío, mostrar el estado vacío descrito en Alcance en vez del `.map` de filas.
9. **`components/PlayerClient.tsx`** — Mover el contenido actual de `app/juegos/[id]/jugar/page.tsx` (todo el JSX y los hooks: HUD, canvas/arena, modal de fin) a este componente cliente, recibiendo `game: Game` por props en vez de `GAMES.find`. `handleSaveScore` pasa a llamar `await insertScore(createBrowserClient(), { gameId: game.id, playerName: name, score })` y solo hace `setSaved(true)` si no lanza error; si lanza, se muestra el mismo bloque `input-row` (sin toast) para reintentar. Se elimina el bloque `try { localStorage... av_scores }`.
10. **`app/juegos/[id]/jugar/page.tsx`** — Server Component `async`: `const game = await getGame(id, createClient())` (`notFound()` si `null`) y `return <PlayerClient game={game} />`.
11. **`components/HallOfFameClient.tsx`** — Mover el contenido actual de `app/salon/page.tsx` a este componente cliente, recibiendo `games: Game[]` por props en vez de importar `GAMES`. Agregar estado `rows: ScoreRow[]` y un `useEffect` con dependencia `[tab]` que llama `getTopScores(createBrowserClient(), tab, 12)` y actualiza `rows`. Aplicar el estado vacío (menos de 3 filas → sin podio; 0 filas → mensaje) descrito en Alcance.
12. **`app/salon/page.tsx`** — Server Component `async`: `const games = await getGames(createClient())` y `return <HallOfFameClient games={games} />`.
13. **Verificación final** — `npm run lint` y `npm run build` sin errores. Navegar manualmente: `/` (rail de 6 juegos con datos reales), `/juegos` (buscador/chips funcionando con datos reales), `/juegos/asteroides` (detalle + "MEJORES PUNTUACIONES" con estado vacío inicial), `/juegos/asteroides/jugar` (jugar, terminar partida, guardar puntuación con iniciales, confirmar toast), volver a `/juegos/asteroides` y confirmar que la puntuación guardada aparece en el aside, luego `/salon` con la pestaña de ASTEROIDES y confirmar que la misma puntuación aparece en la tabla/podio. Repetir el guardado 2-3 veces más para confirmar el orden `score desc` y el estado no-vacío del podio.

## Criterios de aceptación

- [ ] Las tablas `games` (9 filas) y `scores` (vacía) existen en el proyecto Supabase, sin RLS habilitado.
- [ ] `lib/games.ts` ya no exporta `GAMES` ni `seededScores`; ningún archivo del proyecto los importa.
- [ ] `/` muestra el rail de juegos disponibles con datos reales de `games` (no hardcodeados).
- [ ] `/juegos` muestra el catálogo completo desde `games`, y el buscador/chips de categoría siguen funcionando igual que antes.
- [ ] `/juegos/[id]` muestra el detalle del juego desde `games` y las "MEJORES PUNTUACIONES" desde `scores` (o el estado vacío si no hay ninguna).
- [ ] Al terminar una partida en `/juegos/[id]/jugar` y guardar la puntuación con iniciales, se inserta una fila real en `scores` (verificable con una nueva consulta) y ya no se escribe nada en `localStorage` bajo `av_scores`.
- [ ] `/salon` muestra, por cada pestaña de juego, el top 12 real de `scores` para ese juego (podio + tabla), con el estado vacío correcto si el juego no tiene puntuaciones.
- [ ] Guardar varias puntuaciones para el mismo juego y confirmar que aparecen ordenadas de mayor a menor tanto en `/juegos/[id]` como en `/salon`.
- [ ] `npm run lint` y `npm run build` terminan sin errores.

## Decisiones tomadas y descartadas

- **Ambas tablas (`games` y `scores`) en Supabase, no solo `scores`.** Motivo (decisión del usuario): "tabla de juegos" se definió como el catálogo (`lib/games.ts`), no solo las puntuaciones; se migran juntas para no dejar el catálogo hardcodeado mientras las puntuaciones ya son reales.
- **Sin RLS en ninguna de las dos tablas.** Motivo (decisión del usuario, elegida explícitamente sobre la alternativa recomendada de RLS básico): simplicidad para este MVP sin Auth real. Documentado como riesgo conocido — cualquiera con la publishable key puede leer, insertar, modificar o borrar filas de `games`/`scores` directamente. Se debe endurecer con RLS + Auth en una spec futura antes de considerar el proyecto listo para producción real.
- **`player_name` como texto libre, sin FK a un usuario autenticado.** Motivo (decisión del usuario): no hay Supabase Auth real todavía (spec 04 lo dejó explícitamente fuera); vincular scores a usuarios es trabajo de una spec de Auth futura.
- **`best`/`plays` estáticos en `games`, no calculados desde `scores`.** Motivo (decisión del usuario): evita agregaciones (`MAX`/`COUNT`) en cada carga de página; se mantiene el mismo comportamiento/valores que hoy. Puede volverse dinámico en una spec futura.
- **`localStorage` (`av_scores`) se elimina por completo, sin fallback.** Motivo (decisión del usuario): Supabase pasa a ser la única fuente de verdad para puntuaciones; mantener un fallback duplicaría la lógica de guardado/lectura sin beneficio claro en este MVP.
- **Patrón Server Component padre + Client Component hijo** (`GamesLibraryClient`, `HomeClient`, `PlayerClient`, `HallOfFameClient`) **en vez de fetch client-side con `useEffect`+loading.** Motivo (decisión del usuario): evita parpadeo/estado de carga en pantallas que hoy renderizan datos inmediatamente (SSR), a cambio de reestructurar 4 archivos en padre+hijo. La única excepción es `HallOfFameClient`, donde el fetch de puntuaciones por pestaña sí ocurre client-side (`useEffect` en `[tab]`) porque depende de una interacción del usuario después del render inicial.
- **Top 12 en `/salon`, top 10 en el aside de `/juegos/[id]`.** Motivo: mismos límites que ya tenían `seededScores(seed, 12)` y `seededScores(seed, 10)` respectivamente; no se cambia el número de filas mostradas en ningún lado.
- **Migración vía `mcp__supabase__apply_migration` con los `INSERT` de siembra incluidos, no un script aparte.** Motivo (decisión del usuario): una sola migración deja el proyecto en estado usable (9 juegos ya visibles) sin pasos manuales adicionales.

## Riesgos identificados

- **Tablas sin RLS: escritura y borrado abiertos a cualquiera con la publishable key.** Sin Auth ni políticas, cualquier cliente puede insertar puntuaciones falsas, vaciar `scores`, o modificar `games` directamente vía la API REST de Supabase. Es una decisión explícita del usuario para este MVP (ver Decisiones); `mcp__supabase__get_advisors` probablemente marque esto como advertencia de seguridad tras la migración — se documenta y se deja pendiente para la spec de Auth.
- **Estado vacío inicial en todos los juegos.** Al eliminar `seededScores`, `scores` arranca vacía: `/salon` y los asides de detalle mostrarán el estado "SIN PUNTUACIONES TODAVÍA" hasta que se jueguen partidas reales. Es el comportamiento esperado (dato real en vez de mock), pero cambia visualmente la primera impresión de esas pantallas respecto a hoy.
- **Reestructuración de 4 páginas en padre (Server) + hijo (Client) puede introducir regresiones de comportamiento si algún estado/efecto queda mal migrado.** Se mitiga verificando manualmente cada pantalla en el paso final del plan (buscador, chips, rail, tabs de `/salon`, guardado de puntuación) antes de dar la spec por terminada.
