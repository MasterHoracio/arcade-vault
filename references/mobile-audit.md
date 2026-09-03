# TODO — Responsive móvil por zona

Memoria del agente `mobile-porter`. Cada entrada registra el estado
responsive de una zona de la app (una ruta o un componente compartido).
Estados: `[x]` portado y verificado · `[~]` parcial (con el motivo) ·
`[ ]` pendiente. El agente lee este archivo antes de auditar y lo
actualiza después de implementar. Puedes editarlo a mano.

## Portados

- [x] **Reproductor — controles táctiles** (`components/TouchControls.tsx`)
      — SPEC 10 · 2026-09-03
  - D-pad de 6 slots + estilos `.touch-controls`/`.touch-dpad`/`.touch-btn`,
    visibles bajo `@media (max-width: 768px)`.
  - No cubre el resto del chasis del Reproductor (`.crt`, `.player-hud`,
    `.crt-bottom`, modal de fin de partida) — ver pendiente abajo.

## Pendientes

- [ ] **Reproductor — chasis** (`components/PlayerClient.tsx`,
      `app/globals.css`) — `.crt` con padding/radius fijos (24px/28px) que comen
      espacio a 360px; `.crt-bottom` (3 columnas sin wrap); `.player-hud` /
      `.hud-actions` sin media query; modal de fin de partida (`.modal`,
      `.input-row`, `.actions`) sin reglas responsive; `TetrisCanvas.tsx` usa un
      canvas 300×600 (1:2) dentro de un `.crt-screen` con `aspect-ratio: 4/3` —
      el peor encaje de los 4 juegos.
- [ ] **`app/layout.tsx`** — sin `export const viewport`; `<footer>` con
      `style={{ padding: "20px 32px", fontSize: 11 }}` inline fijo.
- [ ] **Home** (`components/HomeClient.tsx`) — alta densidad de estilos
      inline con píxeles fijos.
- [ ] **Acerca de** (`app/acerca-de/page.tsx`) — estilos inline fijos.
- [ ] **Nav** (`components/Nav.tsx`) — breakpoint 840px fuera del set
      canónico (480/768/1024).
- [ ] **Biblioteca** (`/juegos`, `components/GamesLibraryClient.tsx`).
- [ ] **Salón** (`/salon`, `components/HallOfFameClient.tsx`).
