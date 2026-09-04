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
- [x] **Reproductor — controles táctiles en Frogger** (`lib/games/registry.ts`,
      `lib/games/frogger/engine.ts`, `components/TouchControls.tsx`) —
      auditoría (sin código nuevo) · 2026-09-04
  - Ya venía cableado igual que serpentina: `registry.ts` define
    `touchControls: { up, down, left, right }` (mismos slots, sin `a`/`b`),
    `PlayerClient` lo renderiza sin condicional por `game.id`, y el engine
    escucha `ArrowUp/Down/Left/Right` en `window` con `keyMap` sobre
    `e.key` — coincide exactamente con las teclas sintéticas que despacha
    `TouchControls` (`document.dispatchEvent(new KeyboardEvent(...))`, hace
    bubble hasta `window`). Verificado leyendo código, no hace falta tocar
    `engine.ts` (regla dura respetada).
  - `TouchControls` se renderiza como hermano de `.crt` en el flujo normal
    del documento (no absolute-position sobre el canvas), así que no tapa
    el tablero ni las casas/metas de Frogger en ningún ancho — esto es
    estructural al componente compartido, no depende del canvas de cada
    juego.
  - El canvas de Frogger es 640×560 (ratio ≈1.14:1) dentro de
    `.crt-screen` con `aspect-ratio: 4/3` (≈1.33:1): queda con
    letterboxing lateral, más ajustado que el peor caso ya documentado
    (Tetris 300×600, ratio 0.5) y sin overflow. No requirió cambios.
  - No se encontraron hallazgos que arreglar; no se tocó código. La
    entrada "Reproductor — chasis" (pendiente, abajo) sigue abierta y no
    es específica de Frogger — no se resuelve en esta corrida.

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
