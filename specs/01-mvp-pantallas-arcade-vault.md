# 01 · MVP — Pantallas de Arcade Vault

**Estado:** Aprobado
**Depende de:** —
**Fecha:** 2026-08-25

**Objetivo:** Implementar las 5 pantallas visuales del prototipo (`references/templates/`) como rutas reales de Next.js 16 (App Router) — Biblioteca, Detalle de juego, Reproductor, Autenticación y Salón de la Fama — sin implementar lógica de ningún juego real.

## Alcance

**Incluye:**

- Migrar las 5 pantallas del prototipo estático (React vía CDN + hash-router) a componentes React/TSX de Next.js 16 con App Router y rutas reales:
  - `/` — Biblioteca (`biblioteca.jsx`)
  - `/juegos/[id]` — Detalle de juego (`detalle.jsx`)
  - `/juegos/[id]/jugar` — Reproductor (`reproductor.jsx`), con la simulación decorativa de puntaje/pausa/fin de partida tal como está en el prototipo (sin lógica de juego real)
  - `/auth` — Autenticación (`auth.jsx`)
  - `/salon` — Salón de la Fama (`salon.jsx`)
- Nav (`nav.jsx`) como client component montado una sola vez en `app/layout.tsx`, junto con el footer que ya existe ahí como placeholder.
- Datos mock (`data.jsx`: `GAMES`, `CATS`, `PLAYERS`, `seededScores`) migrados a `lib/games.ts`, tipados en TypeScript.
- Sesión de usuario (`av_user`) y puntuaciones guardadas (`av_scores`) persistidas en `localStorage`, replicando el comportamiento del prototipo (sin backend).
- Reemplazo del hero placeholder actual de `app/page.tsx` por la pantalla Biblioteca completa.
- Reutilización directa de las clases del `globals.css` actual (ya portado 1:1 desde `references/templates/styles.css`, según `git diff` — no requiere cambios de diseño).

**No incluye:**

- Lógica de ningún juego real (los "juegos" de la biblioteca siguen siendo mockups; el Reproductor solo simula puntaje con `setInterval`, igual que el prototipo).
- Backend, API routes, base de datos o autenticación real (contraseñas, OAuth, verificación de email). Los botones "GOOGLE"/"GITHUB" y el formulario de auth quedan como UI no funcional más allá de guardar `{ name }` en `localStorage`.
- Tests automatizados (no hay test runner configurado en el proyecto).
- SEO/metadata avanzado por ruta, accesibilidad auditada más allá de lo que ya trae el prototipo.
- Cambios de diseño visual respecto al prototipo — esta spec es una migración de fidelidad visual, no un rediseño.

## Modelo de datos

Nuevo archivo `lib/games.ts`, migrado desde `references/templates/data.jsx`:

```ts
export type GameCategory = "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";
export type GameColor = "cyan" | "magenta" | "yellow" | "green";

export interface Game {
  id: string;
  title: string;
  short: string;
  long: string;
  cat: GameCategory;
  cover: string; // clase CSS de cover- ya definida en globals.css
  color: GameColor;
  best: number;
  plays: string;
}

export interface ScoreRow {
  rank: number;
  name: string;
  score: number;
  date: string;
}

export const GAMES: Game[];
export const CATS: readonly ["TODOS", "ARCADE", "PUZZLE", "SHOOTER", "VERSUS"];
export const PLAYERS: readonly string[];
export function seededScores(seed: number, count?: number): ScoreRow[];
```

Sesión de usuario en `localStorage` (clave `av_user`): `{ name: string } | null`.
Puntuaciones guardadas en `localStorage` (clave `av_scores`): array de `{ game: string; score: number; name: string; at: number }`.

## Plan de implementación

1. **`lib/games.ts`** — Migrar `data.jsx` a TypeScript: `GAMES`, `CATS`, `PLAYERS`, `seededScores`, con los tipos de arriba. El sistema sigue funcional (build pasa, sin rutas nuevas todavía).
2. **`components/Nav.tsx`** — Migrar `nav.jsx` a client component (`"use client"`). Usa `usePathname()` de `next/navigation` para resaltar el link activo (equivalente a `isActive` del prototipo) en vez de comparar contra un objeto `route`. Lee/escribe `av_user` de `localStorage` para mostrar "Iniciar Sesión" o el nombre del usuario; expone `onSignOut`.
3. **`app/layout.tsx`** — Renderizar `<Nav />` dentro de `<div id="root">`, y mover el footer del prototipo (`app.jsx`, líneas 43-45) al layout junto a `{children}`. El layout raíz sigue siendo server component.
4. **`app/page.tsx`** — Reemplazar el hero placeholder por la pantalla Biblioteca completa (client component: `"use client"` por `useState`/`useMemo` de búsqueda y filtro). Incluye `GameCard` como componente en `components/GameCard.tsx`, con el efecto de tilt por mouse (`biblioteca.jsx` líneas 4-43). Los cards navegan con `next/link` o `useRouter().push` a `/juegos/[id]`.
5. **`app/juegos/[id]/page.tsx`** — Migrar `detalle.jsx`. Puede ser server component (no usa `useState`), pero `seededScores` no depende de datos server-only, así que se puede computar en el servidor directamente. Botón "JUGAR AHORA" navega a `/juegos/[id]/jugar`; "VOLVER AL VAULT" navega a `/`. Si el `id` no existe en `GAMES`, usar `notFound()` de `next/navigation`.
6. **`app/juegos/[id]/jugar/page.tsx`** — Migrar `reproductor.jsx` a client component. Mantiene la simulación decorativa completa: `setInterval` de puntaje, subida de nivel, pausa, fin de partida, modal con formulario de iniciales y guardado en `localStorage` (`av_scores`). Lee el nombre inicial desde `av_user` si existe sesión, si no usa "INVITADO". "SALIR" navega a `/juegos/[id]`.
7. **`app/auth/page.tsx`** — Migrar `auth.jsx` a client component. Al enviar el formulario o pulsar "JUGAR COMO INVITADO", escribe `av_user` en `localStorage` (o lo limpia, para invitado) y navega a `/`. Tabs "INICIAR SESIÓN"/"CREAR CUENTA" solo cambian el formulario mostrado, sin llamada a backend.
8. **`app/salon/page.tsx`** — Migrar `salon.jsx` a client component (usa `useState` para la pestaña de juego activo y `useMemo` para las filas). Botón "VOLVER A LA BIBLIOTECA" navega a `/`.
9. **Verificación final** — `npm run lint` y `npm run build` sin errores; navegar manualmente las 5 rutas en el navegador (`npm run dev`) confirmando: búsqueda/filtro en Biblioteca, detalle con leaderboard, reproductor con simulación de puntaje y guardado de score, login/invitado, y tabs del Salón de la Fama.

## Criterios de aceptación

- [ ] `/` renderiza la Biblioteca: hero, buscador, chips de categoría, grid de `GameCard` filtrable por texto y categoría, con estado vacío "NO HAY RESULTADOS" cuando no hay coincidencias.
- [ ] Cada `GameCard` navega a `/juegos/[id]` al hacer click en la card o en el botón "JUGAR".
- [ ] `/juegos/[id]` muestra portada, tags, descripción, stats (`plays`, `best`, dificultad) y una tabla de mejores puntuaciones (`seededScores`) con estilos de top 1/2/3.
- [ ] Desde `/juegos/[id]`, "▶ JUGAR AHORA" navega a `/juegos/[id]/jugar` y "VOLVER AL VAULT" navega a `/`.
- [ ] `/juegos/[id]/jugar` incrementa el puntaje automáticamente cada ~220ms mientras no está pausado ni terminado, sube de nivel cada 2500 puntos, y "PAUSA"/"REANUDAR" detiene/reanuda el incremento.
- [ ] Pulsar "FIN" en `/juegos/[id]/jugar` abre el modal de fin de partida con el puntaje final; guardar la puntuación con iniciales la persiste en `localStorage` bajo `av_scores` y muestra el toast "▸ PUNTUACIÓN GUARDADA_"; "JUGAR DE NUEVO" reinicia el estado de la partida.
- [ ] `/auth` permite alternar entre "INICIAR SESIÓN" y "CREAR CUENTA"; enviar el formulario o pulsar "JUGAR COMO INVITADO" guarda/limpia `av_user` en `localStorage` y navega a `/`.
- [ ] El Nav muestra "Iniciar Sesión" sin sesión activa y el nombre del usuario (con opción de cerrar sesión) cuando hay una sesión en `av_user`; el link activo según la ruta actual queda resaltado.
- [ ] `/salon` muestra podio (top 3) y tabla de posiciones por juego seleccionado en las pestañas; si hay sesión activa, agrega la fila "TU MEJOR MARCA" al final de la tabla.
- [ ] `npm run lint` y `npm run build` terminan sin errores.
- [ ] Ningún componente contiene lógica de juego real (colisiones, física, input de teclado/táctil jugable) más allá de la simulación decorativa ya presente en el prototipo.

## Decisiones tomadas y descartadas

- **Rutas reales del App Router en español** (`/juegos/[id]`, `/salon`, `/auth`) en vez del hash-router de una sola página del prototipo. Motivo: es el patrón nativo e idiomático de Next.js 16 y evita reimplementar un router propio; el idioma español es consistente con el resto del contenido del sitio.
- **Mantener la simulación decorativa del Reproductor** (`setInterval`, pausa, niveles, guardado de score) en vez de dejarlo estático. Motivo: da la sensación de una app funcional sin implementar ningún juego real, que es exactamente el límite pedido para este MVP.
- **`localStorage` para sesión y puntuaciones, sin backend.** Motivo: el prototipo ya usa este patrón y esta spec es solo visual — no hay backend en el alcance.
- **Nav vive en `app/layout.tsx` como client component, en vez de repetirse por página.** Motivo: aparece en las 5 pantallas; centralizarlo evita duplicación y mantiene el resto de páginas server components donde sea posible.
- **`app/page.tsx` se reemplaza en vez de mantener el hero actual en otra ruta.** Motivo: el hero de `app/page.tsx` es un placeholder del scaffold inicial, no una pantalla del prototipo; la Biblioteca es la pantalla de inicio real (`route: { name: "biblioteca" }` es el default del prototipo).
- **No se toca `app/globals.css`.** Motivo: ya es una migración 1:1 de `references/templates/styles.css` (confirmado por `diff`), con las variables de fuente ya conectadas a `next/font/google` en `app/layout.tsx`.
