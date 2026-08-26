# 02 · Home y reubicación de Biblioteca

**Estado:** Implementado
**Depende de:** SPEC 01
**Fecha:** 2026-08-26

**Objetivo:** Añadir la pantalla de inicio (`home.jsx` del prototipo) como nueva ruta `/`, moviendo la Biblioteca (actualmente en `/`) a `/juegos`, sin implementar la pantalla "Acerca de".

## Alcance

**Incluye:**

- Migrar `references/templates/home-about/home.jsx` a `app/page.tsx` (client component), reemplazando el contenido actual de Biblioteca que hoy vive ahí.
- Mover el contenido actual de `app/page.tsx` (pantalla Biblioteca) a una nueva ruta `app/juegos/page.tsx`, sin cambios de comportamiento.
- Migrar los bloques de CSS `HOME PAGE` (líneas 930–1070), `ACTIVITY` (líneas 1621–1671) y `PRICING` (líneas 1672–1744) de `references/templates/home-about/styles.css` a `app/globals.css`, adaptando `--pixel`/`--mono` a las variables ya conectadas con `next/font/google` (ya presentes en `app/globals.css`, no se tocan).
- Actualizar `components/Nav.tsx`:
  - Agregar el link "Inicio" (orden: Inicio · Biblioteca · Salón de la Fama), apuntando a `/`.
  - Cambiar el link "Biblioteca" para apuntar a `/juegos`.
  - Ajustar `isActive`: "Inicio" activo solo en `pathname === "/"`; "Biblioteca" activo en `/juegos` y en `/juegos/[id]` y `/juegos/[id]/jugar` (mismo criterio que hoy usa para `/`).
  - El logo (click) sigue navegando a `/`.
- Los CTAs de Home navegan así (igual que `navigate` en el prototipo):
  - "▶ EXPLORAR JUEGOS", "VER TODOS LOS JUEGOS →" e "INSERTAR MONEDA →" → `/juegos`.
  - "✦ CREAR CUENTA" y "EMPEZAR GRATIS →" → `/auth`.
  - "VER SALÓN →" → `/salon`.
  - Los mini-cards de la sección "JUEGOS DISPONIBLES AHORA" navegan a `/juegos/[id]` usando `GAMES` real de `lib/games.ts` (primeros 6 juegos, igual que el prototipo).
- Los datos de la sección "ACTIVIDAD EN VIVO" (ticker de puntuaciones recientes) y "TOP JUGADORES · HOY" quedan hardcodeados dentro de `app/page.tsx`, igual que en el prototipo — contenido decorativo, no leen `av_scores` de `localStorage`.
- La sección de precios ("PRECIOS") se migra tal cual, con su botón "EMPEZAR GRATIS →" navegando a `/auth`.
- Los subcomponentes propios de Home (`FloatingSilhouettes`, `MiniCard`, `FeatureIcon`, y el hook `useReveal` para las animaciones de scroll-reveal) se declaran como funciones locales dentro de `app/page.tsx`, igual que en el prototipo (no se extraen a `components/`), consistente con cómo hoy vive la Biblioteca en un solo archivo.
- `GameCard` (`components/GameCard.tsx`) y `lib/games.ts` no cambian.

**No incluye:**

- La pantalla "Acerca de" (`about.jsx` y el bloque CSS `ABOUT PAGE`). Queda para una spec futura; el link "Acerca de" no se agrega al Nav en esta spec.
- Datos de actividad/leaderboard reales derivados de `av_scores`. Se mantienen mock, igual que el prototipo.
- Cambios de diseño visual respecto al prototipo `home.jsx` — esta spec es una migración de fidelidad visual, no un rediseño.
- Cambios a `app/juegos/[id]/page.tsx`, `app/juegos/[id]/jugar/page.tsx`, `app/auth/page.tsx`, `app/salon/page.tsx` más allá de que sigan funcionando con la nueva ruta `/juegos` (sus enlaces internos ya usan `/juegos/[id]` y no cambian).

## Modelo de datos

No se introducen estructuras de datos nuevas. Home reutiliza `GAMES` de `lib/games.ts` para el rail de juegos disponibles; el resto de contenido (actividad, top jugadores, precios/FAQ) es JSX estático dentro de `app/page.tsx`, igual que en el prototipo.

## Plan de implementación

1. **CSS** — Añadir a `app/globals.css` los bloques `HOME PAGE`, `ACTIVITY` y `PRICING` migrados desde `references/templates/home-about/styles.css`, sin tocar las variables `--pixel`/`--mono` ya existentes. El build sigue pasando (CSS no usado aún no rompe nada).
2. **Mover Biblioteca** — Crear `app/juegos/page.tsx` con el contenido íntegro que hoy tiene `app/page.tsx` (sin cambios de lógica). Verificar que `/juegos` renderiza la Biblioteca igual que antes en `/`.
3. **`app/page.tsx`** — Reemplazar el contenido por la migración de `home.jsx`: hero con `FloatingSilhouettes`, sección "¿POR QUÉ ARCADE VAULT?" con `FeatureIcon`, rail de juegos con `MiniCard` (usa `GAMES.slice(0, 6)` de `lib/games.ts`), sección de stats, actividad en vivo (ticker + top jugadores, mock), precios/FAQ, y CTA final. Todo como client component (`"use client"`, usa `useState`/`useEffect` vía `useReveal` y `useRouter` de `next/navigation` para los `navigate`).
4. **`components/Nav.tsx`** — Agregar el link "Inicio" → `/`; cambiar "Biblioteca" → `/juegos`; ajustar `isActive` según lo descrito en Alcance, tanto en el nav de escritorio como en el panel móvil.
5. **Verificación final** — `npm run lint` y `npm run build` sin errores; navegar manualmente `/` (hero, secciones con scroll-reveal, rail de juegos, ticker de actividad, precios) y `/juegos` (Biblioteca funcionando igual que antes) confirmando que los links del Nav resaltan la ruta activa correctamente.

## Criterios de aceptación

- [ ] `/` renderiza la pantalla Home: hero con CTAs, sección "¿POR QUÉ ARCADE VAULT?", rail de juegos disponibles (datos reales de `GAMES`), stats, actividad en vivo (ticker + top jugadores), precios/FAQ y CTA final.
- [ ] `/juegos` renderiza la Biblioteca (buscador, chips de categoría, grid de `GameCard`, estado vacío "NO HAY RESULTADOS"), igual que antes cuando vivía en `/`.
- [ ] En Home, "▶ EXPLORAR JUEGOS", "VER TODOS LOS JUEGOS →" e "INSERTAR MONEDA →" navegan a `/juegos`.
- [ ] En Home, "✦ CREAR CUENTA" y "EMPEZAR GRATIS →" navegan a `/auth`.
- [ ] En Home, "VER SALÓN →" navega a `/salon`, y cada mini-card del rail de juegos navega a `/juegos/[id]`.
- [ ] El Nav muestra "Inicio · Biblioteca · Salón de la Fama" en ese orden, con "Inicio" resaltado solo en `/` y "Biblioteca" resaltado en `/juegos`, `/juegos/[id]` y `/juegos/[id]/jugar`.
- [ ] El logo del Nav sigue navegando a `/`.
- [ ] Las secciones de Home con clase `reveal` aplican la animación de aparición al hacer scroll (comportamiento `useReveal`/`IntersectionObserver` igual que el prototipo).
- [ ] `npm run lint` y `npm run build` terminan sin errores.

## Decisiones tomadas y descartadas

- **Ruta de Biblioteca: `/juegos` en vez de `/biblioteca`.** Motivo (decisión del usuario): consistencia con `/juegos/[id]` y `/juegos/[id]/jugar`, que ya son subrutas de "juegos".
- **Datos de actividad/leaderboard/precios hardcodeados en `app/page.tsx`, sin leer `av_scores`.** Motivo (decisión del usuario): es contenido decorativo en el prototipo, igual que ya se hizo con el reproductor en la spec 01; conectar actividad real a `localStorage` es trabajo adicional fuera del alcance visual de esta spec.
- **Subcomponentes de Home (`FloatingSilhouettes`, `MiniCard`, `FeatureIcon`, `useReveal`) inline en `app/page.tsx`, no extraídos a `components/`.** Motivo: consistente con cómo se implementó Biblioteca en la spec 01 (todo en `app/page.tsx`, solo `GameCard` se extrajo por ser reutilizable en `/juegos/[id]`); estos subcomponentes solo los usa Home.
- **"Acerca de" queda fuera de esta spec.** Motivo (decisión explícita del usuario): se implementará en una spec futura; el link no se agrega al Nav todavía para no dejar una ruta rota.
- **No se toca `lib/games.ts` ni `components/GameCard.tsx`.** Motivo: Home solo lee `GAMES` para el rail de 6 juegos; no necesita datos ni componentes nuevos.
