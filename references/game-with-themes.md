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

- [x] **Serpentina** (`serpentina`) — 3 skins · 2026-09-02
  - clasico: cuerpo `#2fbf4f` sobre `#000`, frutas con el PNG original sin filtro (idéntico al original)
  - neon: cuerpo `--green`, cabeza `--yellow`, `shadowColor` `--magenta` + `shadowBlur` 8; frutas conservan su matiz propio (`saturate(2.2) brightness(1.1)`) porque volverlas monocromas perdería la variedad de las 22 frutas
  - retro: fósforo ámbar sobre `#0a0a0a`, jerarquía por luminancia cabeza `#ffe0a0` (15.48:1) > fruta `#b37b00`–`#ffb000` (5.42–10.80:1) > cuerpo `#cc7a00` (5.99:1)
  - Sprites: sí (`public/juegos/serpentina/fruits.png`, 3790×442) · Notas: re-tinte en 3 pasos (filter → `multiply` del matiz → `lighten` del piso de luminancia → `destination-in` para recuperar el alfa) en canvas offscreen cacheado por skin al cargar; clasico reusa el `HTMLImageElement` crudo. El piso de `lighten` es lo que garantiza el 4.5:1 de las frutas oscuras (uva, berenjena) — en neon `#7a7a7a` da 4.89:1. Se agregó el rol `snakeHead`, igual al cuerpo en clasico para no alterar el render original.

- [x] **Arkanoid** (`arkanoid`) — 3 skins · 2026-09-02
  - clasico: spritesheet PNG intacto sobre `#000`, texto `#fff` (`sprites: null` ⇒ ninguna región se filtra; pixel-idéntico)
  - neon: paleta del sitio (magenta/yellow/green/cyan/silver/gold/bronze) + violeta `#bb55ff` y blanco frío `#eaf6ff` fuera de tokens (9 roles contra 7 tokens) + `shadowBlur` 8
  - retro: fósforo ámbar sobre `#0a0a0a`, las 7 familias de bloque por luminancia (`#a67200` la más oscura, 4.74:1) y paleta/bola por encima de todas (12.47:1 y 15.23:1)
  - Sprites: sí (`public/juegos/arkanoid/spritesheet-breakout.png`) · Notas: re-tinte offscreen cacheado por skin en `buildSheets`/`tintRegion` — `grayscale(1) brightness(norm)` → `multiply` con el color del skin → `destination-in` para recuperar el alfa. `norm = 255 / luminancia del cuerpo original`, medida sobre el PNG y guardada en `TINT_REGIONS`; deja el cuerpo del sprite exactamente en el color de la paleta, así que el contraste WCAG se calcula sobre él y el bisel/borde conserva su gradación. Las claves de color del original mienten (`green` es azul, `magenta` violeta, `hotpink` naranja) — se conservan para no tocar `LEVELS`. La explosión del bloque `gray` reusa los frames de `red` (igual que el original), así que en neon/retro estalla con el tinte de `red`. Deuda heredada: en `clasico` los bloques `gray` (1.65:1) y `red` (3.64:1) no llegan a 4.5:1 contra `#000` — es el look original y `clasico` no se toca; neon y retro sí lo corrigen.

- [x] **Frogger** (`frogger`) — 3 skins · 2026-09-04
  - clasico: literales originales del port (asfalto `#0a0a0a`, río `#0a1a3a`, zona segura `#0a2a1a`, fila de metas `#2a5a2a`, coches `#e33/#ee2/#38f`, camión `#888/#555`, tronco `#7a4a20`, tortuga `#2fbf4f`, rana `#39ff5f`) — idéntico al look previo a tener skins
  - neon: paleta del sitio (cyan/yellow/green en coches, verde en rana/tronco, magenta en tortuga y como glow) + acento neutro fuera de tokens (`#c9d6e3`) para el camión, igual convención que el "silver" de Asteroides; `goalRowBg`/`safeBg` se oscurecieron respecto al literal original (`#2a5a2a` violaba la regla 1 del contrato, ~0.078 de luminancia contra el techo ~0.0116) + `shadowBlur` 8
  - retro: fósforo ámbar monocromo, las 4 zonas oscurecidas a variantes casi-negras (< 0.0116 de luminancia) y los literales reutilizados del retro ya auditado de Serpentina (rana `#ffe0a0` ~15:1 > tortuga/tronco `#ffb000`/`#cc7a00` ~5.8–9:1 > vehículo `#cc7a00`/`#b37b00` ~4.6–5.6:1 > barra de tiempo en reposo `#b37b00` ~5.1:1 contra la fila de metas, la más clara de las 4)
  - Sprites: no (solo fills/arcos de canvas) · Notas: paleta escrita junto con el port inicial del engine (`lib/games/frogger/skins.ts`), no en una pasada separada de `skin-designer` — decisión del usuario al pedir el port al patrón estándar. `glow()`/`clearGlow()` en el closure igual que Asteroides/Serpentina; `turtleSubmerged` queda deliberadamente fuera de la regla de 4.5:1 (translúcido a propósito, señala "sin soporte", mismo criterio que el original).

## Pendientes

<!-- el agente lista aquí los juegos de lib/games/ que aún no tiene -->

Ninguno: los 5 juegos de `lib/games/` tienen sus 3 skins.
