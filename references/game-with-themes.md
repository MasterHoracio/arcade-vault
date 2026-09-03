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

- [x] **Asteroides** (`asteroides`) — 3 skins · 2026-09-02
  - clasico: vector blanco sobre `#000`, power-up `#0ff`, llama `rgba(255,130,0,0.85)` (idéntico al original)
  - neon: nave `--cyan`, bala `--yellow`, power-up `--green`, propulsor `--magenta`, asteroide `--silver` (5º rol jugable: roca neutra en vez de un 5º matiz saturado) + `shadowBlur` 8
  - retro: fósforo ámbar sobre `#0a0a0a`, jerarquía por luminancia nave > bala > power-up > propulsor > asteroide (`#cc7a00`, el más oscuro, 5.99:1)
  - Sprites: no · Notas: código en `lib/games/asteroids/` (carpeta en inglés) aunque el id del registry es `asteroides`. Helpers `glow()`/`clearGlow()` en el closure; `shadowBlur: 0` en clasico/retro los vuelve no-op. `initialized` guarda el repintado de `setSkin` antes del primer `initGame()`.

## Pendientes

- [ ] **Arkanoid** (`arkanoid`) — sprites en PNG (`spritesheet-breakout.png`), requiere re-tinte offscreen por skin
- [ ] **Serpentina** (`serpentina`) — cuerpo por fill, frutas en PNG (`fruits.png`)
