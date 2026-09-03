# 07 · Juego real — Tetris ("TETRIS")

**Estado:** Implementado
**Depende de:** SPEC 01, SPEC 04, SPEC 06
**Fecha:** 2026-08-31

**Objetivo:** Portar el juego de referencia `references/started-games/03-tetris/game.js` a TypeScript e integrarlo como motor real en `/juegos/tetris/jugar`, con su fila propia en Supabase, cover y registro en `lib/games/registry.ts` (creado en esta spec, el primer refactor de este tipo tras Asteroides), sin tocar `caida` ni los demás juegos simulados de la biblioteca.

## Alcance

**Incluye:**

- Puerto TypeScript de `game.js` a `lib/games/tetris/engine.ts`, exportando `createTetrisGame(canvas, callbacks)`. Conserva íntegras las mecánicas y constantes del original: tablero `10×20` (`COLS`/`ROWS`), bloque de `30px` (`BLOCK`), las **8 piezas** definidas en `PIECES`/`COLORS` (I, O, T, S, Z, J, L y la 8ª pieza "N" gris tipo tuerca — el `game.js` real tiene 8, no 7 como dice su README), rotación con wall kicks `[0, -1, 1, -2, 2]` (`rotateCW`/`tryRotate`), colisión (`collide`), fusión y limpieza de líneas (`merge`/`clearLines`), pieza fantasma (`ghostY`, `globalAlpha 0.2`), soft drop (+1 punto/fila) y hard drop (+2 puntos/celda), puntuación por líneas `LINE_SCORES = [0, 100, 300, 500, 800]` multiplicada por `level`, nivel `Math.floor(lines / 10) + 1`, y velocidad de caída `dropInterval = Math.max(100, 1000 - (level - 1) * 90)`.
- Segundo canvas de previsualización de la siguiente pieza, `120×120` (igual que `#next-canvas` del original), vivo dentro del mismo `components/TetrisCanvas.tsx` como parte del mismo componente (no una pieza aparte del árbol).
- `components/TetrisCanvas.tsx`: client component con el canvas principal (buffer interno `300×600`, igual que el original) más el canvas de preview, montados en un wrapper dentro de `.crt-screen`. Como `300×600` no es `4:3` (relación de `.crt-screen`), el canvas principal se ajusta con **letterbox centrado** (`height: 100%; width: auto; margin: 0 auto; display: block;`) en vez de estirarse — preserva la relación de aspecto sin distorsionar bloques ni hitboxes. El canvas de preview se posiciona superpuesto (`position: absolute`) en una esquina del wrapper, con un borde/fondo propio para distinguirlo del tablero.
- `lib/games/registry.ts` (nuevo archivo, no existe todavía): registro `Record<string, GameRegistryEntry>` con entradas `asteroides` y `tetris`, más el refactor de `components/PlayerClient.tsx` para leer de ahí en vez de la rama manual `isAsteroides` (ver Modelo de datos y Plan de implementación).
- Fila nueva en la tabla `games` de Supabase: `id: "tetris"`, `title: "TETRIS"`, `short: "Encaja las piezas, limpia líneas y sube de nivel."`, `long: "El clásico de bloques que caen: gira, desliza y limpia líneas completas antes de que el tablero se desborde. Ocho piezas, velocidad creciente y puntuación clásica."`, `cat: "PUZZLE"`, `cover: "cover-tetris"`, `color: "magenta"`, `best: 0`, `plays: 0`.
- `.cover-tetris` en `app/globals.css`: bloques apilados tipo tetromino con la paleta `--magenta`/`--cyan`/`--yellow`/`--green` sobre `--ink`, imitando la cuadrícula de 10 columnas del tablero real (patrón de rejilla similar a `.cover-tetro` existente pero con paleta e identidad propias), más un `::before` de una sola pieza "cayendo" con resplandor.
- Controles de teclado: `←`/`→` mover, `↑` o `X` rotar (con wall kick), `↓` soft drop, `Espacio` hard drop (con `preventDefault`). Activos solo mientras el canvas está montado; los listeners se remueven al desmontar. La tecla `P` del original **no se porta** — la pausa la controla exclusivamente el botón "PAUSA" del Reproductor vía `setPaused`.
- `onGameOver(finalScore)` se dispara una sola vez, exactamente cuando `spawn()` detecta que la pieza recién generada colisiona de inmediato (equivalente al `endGame()` del original).
- `.player-hud`: para `tetris`, "Puntuación" y "Nivel" muestran los valores reales del engine (`hud.score`, `hud.level`); "Vidas" muestra `—` porque Tetris no tiene ese concepto. El conteo de líneas (`hud.lines`) se mantiene en `TetrisHudState` pero **no se agrega** como campo nuevo al `.player-hud` genérico en esta spec.

**No incluye:**

- Controles táctiles/móviles.
- El toggle de tema claro/oscuro del `index.html` original (`theme-toggle`, `localStorage["tetris-theme"]`) — Arcade Vault ya tiene su propio tema, no se porta.
- Sonido o música (el `game.js` de referencia no tiene audio).
- Ajustes de balance respecto al original (velocidades, puntuación, wall kicks, probabilidad de cada pieza). Se porta tal cual.
- El campo "Líneas" en el `.player-hud` de React (queda disponible en `TetrisHudState` para una spec futura si se decide mostrarlo).
- Cambios al juego `caida` (`PUZZLE`, magenta, `cover-tetro`) ni a los demás 7 juegos simulados de la biblioteca (`bloque-buster`, `duelo-pixel`, `gloton`, `invasores`, `ranaria`, `rocas`, `serpentina`). Siguen con la simulación decorativa actual sin ningún cambio.
- Guardado automático de puntuación al terminar; sigue el flujo existente (iniciales + "GUARDAR PUNTUACIÓN" en el modal).
- Cálculo dinámico de `best`/`plays` desde `scores` — quedan estáticos como en el resto del catálogo (SPEC 06).

## Modelo de datos

```ts
// lib/games/tetris/engine.ts
export interface TetrisHudState {
  score: number;
  lines: number;
  level: number;
}

export interface TetrisCallbacks {
  onStateChange: (state: TetrisHudState) => void;
  onGameOver: (finalScore: number) => void;
}

export function createTetrisGame(
  canvas: HTMLCanvasElement,
  nextCanvas: HTMLCanvasElement,
  callbacks: TetrisCallbacks,
): {
  start: () => void;
  stop: () => void;
  setPaused: (paused: boolean) => void;
};
```

```ts
// lib/games/registry.ts (nuevo)
export interface HudFields {
  score: number;
  lives?: number; // undefined = el juego no tiene concepto de vidas
  level: number;
}

export interface GameRegistryEntry {
  Canvas: React.ComponentType<{
    paused: boolean;
    onStateChange: (state: HudFields) => void;
    onGameOver: (finalScore: number) => void;
  }>;
}

export const GAME_REGISTRY: Record<string, GameRegistryEntry> = {
  asteroides: { Canvas: AsteroidsCanvas },
  tetris: { Canvas: TetrisCanvas },
};
```

`AsteroidsHudState` (`score`, `lives`, `level`, `tripleShotRemaining`) y `TetrisHudState` (`score`, `lines`, `level`) son ambos compatibles estructuralmente con `HudFields` para lectura (`lives` opcional cubre el caso de Tetris); el campo extra de cada uno (`tripleShotRemaining`, `lines`) no se lee desde el registro genérico, solo desde el `.player-hud` para Asteroides como ya ocurre hoy.

No se introduce persistencia nueva más allá de lo ya definido en SPEC 06 (`games`, `scores`); esta spec solo agrega una fila a `games`.

## Plan de implementación

1. **Migración Supabase** — `insert into games (...)` con la fila `tetris` descrita en Alcance, vía `mcp__supabase__apply_migration`. Verificar con `select id, title, cat, color, cover from games where id = 'tetris'`.
2. **`.cover-tetris`** en `app/globals.css`, junto a las demás clases `.cover-*` (sección `/* ===== Cover art generators (pure CSS) ===== */`, línea ~664). Solo gradientes CSS y las variables del tema.
3. **`lib/games/tetris/engine.ts`** — Portar `game.js` íntegro a TypeScript. Constantes (`COLS`, `ROWS`, `BLOCK`, `COLORS`, `PIECES`, `LINE_SCORES`) y funciones (`createBoard`, `randomPiece`, `collide`, `rotateCW`, `tryRotate`, `merge`, `clearLines`, `ghostY`, `hardDrop`, `softDrop`, `lockPiece`, `spawn`, `drawBlock`, `drawGrid`, `draw`, `drawNext`) se mantienen iguales, encapsuladas dentro del closure de `createTetrisGame(canvas, nextCanvas, callbacks)`. El estado module-level del original (`board`, `current`, `next`, `score`, `lines`, `level`, `paused`, `gameOver`, `dropInterval`, `dropAccum`, `lastTime`, `animId`) pasa a vivir dentro del closure. `spawn()` invoca `callbacks.onStateChange({ score, lines, level })` tras cada actualización de HUD y `callbacks.onGameOver(score)` una sola vez, exactamente cuando la pieza recién generada colisiona (`endGame()` equivalente). `setPaused(true)` cancela el `requestAnimationFrame` sin resetear estado (ningún timer avanza porque `loop` no se vuelve a llamar); `setPaused(false)` reanuda. Los listeners de teclado (`keydown`) se registran en `start()` y se remueven en `stop()`, sin la tecla `P` (pausa fuera del engine) ni el bloque de `theme-toggle`. El build sigue pasando aunque nada lo use todavía.
4. **`components/TetrisCanvas.tsx`** — Client component (`"use client"`) con el canvas principal (`width={300} height={600}`, letterbox: `style={{ height: "100%", width: "auto", margin: "0 auto", display: "block" }}`) y el canvas de preview (`width={120} height={120}`, posicionado `absolute` en una esquina del wrapper). Props: `{ paused: boolean; onStateChange: (s: TetrisHudState) => void; onGameOver: (score: number) => void }`. Un `useEffect` (deps `[]`) llama `createTetrisGame(canvasRef.current, nextCanvasRef.current, { onStateChange, onGameOver })`, guarda la instancia y llama `.start()`; el cleanup llama `.stop()`. Un segundo `useEffect` (dep `[paused]`) llama `instance.setPaused(paused)`.
5. **`lib/games/registry.ts`** (nuevo) — Definir `HudFields`, `GameRegistryEntry` y `GAME_REGISTRY` con las entradas `asteroides` (`AsteroidsCanvas`) y `tetris` (`TetrisCanvas`), según el Modelo de datos.
6. **`components/PlayerClient.tsx`** — Reemplazar `const isAsteroides = game.id === "asteroides"` y sus cuatro ramificaciones (`setInterval` de puntaje simulado, y los tres campos del HUD) por `const entry = GAME_REGISTRY[game.id]`. Si `entry` existe: renderizar `<entry.Canvas paused={paused} onStateChange={setHud} onGameOver={(finalScore) => { setScore(finalScore); endGame(); }} />` dentro de `.crt-screen` en vez de `.game-arena`, el `setInterval` decorativo se condiciona a `!entry`, y el `.player-hud` lee `hud.score`/`hud.level` siempre que `entry` exista, mostrando `hud.lives !== undefined ? "♥ ".repeat(hud.lives).trim() || "—" : "—"` para Vidas. Si `entry` no existe: se deja el bloque `.game-arena` decorativo y los `score`/`lives`/`level` simulados exactamente como están hoy, sin cambios de comportamiento para los 7 juegos restantes.
7. **Verificación final** — `npm run lint` y `npm run build` sin errores. Jugar manualmente `/juegos/tetris/jugar`: mover/rotar (incluyendo wall kick contra el borde)/soft drop/hard drop con teclado, ver la pieza fantasma, ver la vista previa de la siguiente pieza actualizarse en cada `spawn`, limpiar una o más líneas y confirmar que el puntaje del HUD de React sube y el nivel avanza cada 10 líneas (la caída se acelera), pulsar "PAUSA" y confirmar que el juego se congela con el overlay "EN PAUSA", "REANUDAR" continúa sin saltos, apilar el tablero hasta perder y confirmar que se abre automáticamente el modal de fin con el puntaje final correcto, guardar la puntuación con iniciales y confirmarla en `/salon` bajo "TETRIS". Luego navegar a `/juegos/asteroides/jugar` y a un juego simulado (`/juegos/caida/jugar`) y confirmar que ambos siguen funcionando exactamente igual que antes de este refactor.

## Criterios de aceptación

- [ ] La tabla `games` en Supabase tiene una fila `id: "tetris"` con los valores descritos en Alcance.
- [ ] `.cover-tetris` existe en `app/globals.css` y se ve correctamente en la card de `/juegos` y en el detalle `/juegos/tetris`.
- [ ] `lib/games/tetris/engine.ts` exporta `createTetrisGame(canvas, nextCanvas, callbacks)` con `start()`, `stop()` y `setPaused(paused)`, portando íntegras las mecánicas de `game.js` (8 piezas, wall kicks, ghost piece, soft/hard drop, limpieza de líneas, niveles, velocidad progresiva).
- [ ] `components/TetrisCanvas.tsx` monta ambos canvases (tablero letterboxed sin distorsión, preview de siguiente pieza) y llama `start()`/`stop()` correctamente en el ciclo de vida de React, sin dejar listeners de teclado activos tras desmontar.
- [ ] `lib/games/registry.ts` existe, exporta `GAME_REGISTRY` con entradas `asteroides` y `tetris`, y `components/PlayerClient.tsx` lo usa en vez de la rama manual `isAsteroides`.
- [ ] En `/juegos/tetris/jugar`, el juego responde a `←`/`→`/`↑`/`X`/`↓`/`Espacio` y el `.player-hud` muestra Puntuación y Nivel reales actualizándose en tiempo real, y "—" en Vidas.
- [ ] Limpiar líneas otorga los puntos correctos según `LINE_SCORES` × nivel, y el nivel sube cada 10 líneas acelerando la caída.
- [ ] Pulsar "PAUSA" congela el tablero y la pieza actual; "REANUDAR" continúa sin perder estado ni saltos de posición.
- [ ] Al apilarse el tablero (nueva pieza colisiona al aparecer), se abre automáticamente el modal de fin con el puntaje final correcto.
- [ ] Guardar la puntuación persiste en Supabase con `game_id: "tetris"` y aparece en `/salon` bajo "TETRIS".
- [ ] Navegar a `/juegos/asteroides/jugar` y a cualquier juego simulado (ej. `/juegos/caida/jugar`) sigue funcionando exactamente igual que antes del refactor a `registry.ts`.
- [ ] `npm run lint` y `npm run build` terminan sin errores.

## Decisiones tomadas y descartadas

- **Se portan las 8 piezas del `game.js` real (incluida la "N" gris), no las 7 que describe el README.** Motivo (decisión del usuario): fidelidad al código ejecutable, no a la documentación desactualizada.
- **Id nuevo y separado `tetris`, no se reutiliza `caida`.** Motivo (decisión del usuario): sigue el mismo precedente que Asteroides/`rocas` — el juego decorativo existente queda intacto, el motor real vive en su propia identidad.
- **Se crea `lib/games/registry.ts` en esta spec, en vez de seguir apilando condicionales en `PlayerClient.tsx`.** Motivo (decisión del usuario): es el segundo juego real; el patrón `isAsteroides`/`isTetris` no escala. El registro deja `PlayerClient.tsx` listo para futuros juegos sin más refactors de este tamaño.
- **Segundo canvas de previsualización portado tal cual (120×120), viviendo dentro de `TetrisCanvas.tsx`.** Motivo (decisión del usuario): es parte del comportamiento validado del original y no requiere decisiones de diseño nuevas más allá de su posicionamiento dentro del wrapper.
- **Tecla `P` del original no se porta; la pausa es exclusivamente el botón "PAUSA" del Reproductor.** Motivo (decisión del usuario): evita un atajo redundante que podría desincronizarse del estado `paused` de React (mismo criterio que ya aplicó Asteroides, que tampoco tenía pausa en el original y la agregó solo vía `setPaused`).
- **El campo "Vidas" del HUD muestra `—` para Tetris, en vez de ocultar el campo o rediseñar el layout.** Motivo (decisión del usuario): menor cambio de UI; `HudFields.lives` queda opcional para que cualquier juego futuro sin vidas siga el mismo patrón.
- **El conteo de líneas no se agrega al `.player-hud` genérico en esta spec.** Motivo (decisión del usuario): se documenta en el estado interno (`TetrisHudState.lines`) para una spec futura si se decide exponerlo, pero no es indispensable para jugar ni para el criterio de aceptación de esta spec.
- **Canvas principal con letterbox centrado (no estirado), en vez de forzar `.crt-screen` a otra relación de aspecto.** Motivo: `.crt-screen` mantiene `aspect-ratio: 4/3` para todos los juegos; el letterbox preserva la geometría 300×600 del original sin tocar la lógica de coordenadas ni distorsionar hitboxes/bloques.
- **Port literal de mecánicas y balance (velocidades, puntuación, wall kicks), sin ajustar constantes.** Motivo (decisión del usuario): mismo criterio que Asteroides — es el comportamiento ya validado del juego de referencia.
- **Sonido, controles táctiles y el toggle de tema del original quedan fuera de alcance.** Motivo: Arcade Vault ya tiene su propio tema y esta spec no agrega audio ni soporte móvil, igual que Asteroides.

## Riesgos identificados

- **`AsteroidsCanvas` y `TetrisCanvas` exponen callbacks con formas de estado distintas (`AsteroidsHudState` vs `TetrisHudState`) bajo el mismo tipo `GameRegistryEntry.Canvas`.** Al implementar, puede ser necesario adaptar la firma exacta de `onStateChange` en `AsteroidsCanvas` para que sea estructuralmente compatible con `HudFields` sin romper su comportamiento actual (verificado con `npm run build`, que fallaría en tiempo de compilación si la variancia de tipos no cuadra).
- **Fuga de listeners o loops si `stop()` no se llama correctamente al desmontar.** Se mitiga con el cleanup del `useEffect` en `TetrisCanvas`, verificado manualmente navegando fuera de `/juegos/tetris/jugar` durante una partida activa.
- **Regresión en el refactor de `PlayerClient.tsx`.** Al reemplazar la rama manual `isAsteroides` por `GAME_REGISTRY`, existe riesgo de romper el comportamiento ya validado de Asteroides o de los juegos simulados. Se mitiga verificando explícitamente ambos casos en el paso final del plan de implementación antes de dar la spec por terminada.

## Lo que **no** está en esta spec

- Controles táctiles/móviles.
- Sonido o música.
- El campo "Líneas" en el `.player-hud` genérico.
- Cambios a `caida` o a cualquier otro juego simulado de la biblioteca.
- Cálculo dinámico de `best`/`plays` desde `scores`.

Cada uno de estos, si se necesita, va en su propia spec futura.
