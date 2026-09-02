# TODO — Skins por juego

Memoria del agente `skin-designer`. Cada entrada registra el estado de los
3 skins (`clasico`, `neon`, `retro`) de un juego ya implementado.
Estados: `[x]` los 3 skins listos · `[~]` parcial (con el motivo) · `[ ]` pendiente.
El agente lee este archivo antes de auditar y lo actualiza después de implementar.
Puedes editarlo a mano.

## Listos

- [x] **Tetris** (`tetris`) — 3 skins · 2026-09-02
  - clasico: Material 8 piezas, grid leyendo `--line` en vivo (idéntico al original)
  - neon: paleta del sitio (cyan/yellow/magenta/green/gold/silver/bronze) + violeta eléctrico fuera de tokens para la 8ª pieza (N) + `shadowBlur` 8
  - retro: fósforo ámbar monocromo, las 8 piezas por luminancia (N, la más oscura, da 4.7:1 contra `#0a0a0a`)
  - Sprites: no · Notas: pilotó el contrato compartido (`lib/games/skins.ts`, selector en `PlayerClient`, `useEffect([skin])` en los 4 `*Canvas.tsx`)

## Pendientes

- [ ] **Arkanoid** (`arkanoid`) — sprites en PNG (`spritesheet-breakout.png`), requiere re-tinte offscreen por skin
- [ ] **Asteroides** (`asteroides`) — vectorial, sin sprites
- [ ] **Serpentina** (`serpentina`) — cuerpo por fill, frutas en PNG (`fruits.png`)
