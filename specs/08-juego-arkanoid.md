# 08 · Juego real — Arkanoid ("ARKANOID")

> **Estado:** Aprobado
> **Depende de:** SPEC 01, SPEC 04, SPEC 06, SPEC 07
> **Fecha:** 2026-08-31
> **Objetivo:** Portar el juego de referencia `references/started-games/04-arkanoid/game.js` a TypeScript e integrarlo como motor real en `/juegos/arkanoid/jugar`, reemplazando la fila y el juego simulado `bloque-buster` (mismo `id` renombrado a `arkanoid`), con sprites reales, cover propio y su entrada en `lib/games/registry.ts` (ya existente).

## Alcance

**Incluye:**

- Puerto TypeScript de `game.js` a `lib/games/arkanoid/engine.ts`, exportando `createArkanoidGame(canvas, callbacks)`. Conserva íntegras las mecánicas y constantes del original: canvas `800×600`, `PADDLE_SPEED = 400`, paddle `81×14` (el valor real en `game.js`, no el `162×14` que dice el `README.md` desactualizado) inicializado centrado en `y: 560`, bola `16×16` con `BASE_BALL_VX = 200`/`BASE_BALL_VY = -300`, rebotes en paredes izquierda/derecha/arriba y en la paleta (con tolerancia de `+8px` bajo la paleta), colisión AABB bloque-bola (`collideAABB`, un bloque por frame), `10 pts` por bloque, `5 niveles` (`LEVELS` de `levels.js`: parrilla completa, pirámide centrada, tablero de ajedrez, filas con huecos, marco + cruz central) con velocidad de bola `×1.00/×1.10/×1.21/×1.33/×1.46` respectivamente, `3 vidas` (se reposiciona la bola con `initBall()` al perderla, game over al llegar a 0), y animación de explosión de 4 frames al romper un bloque (`EXPLOSION_DURATION = 150`ms, frames de `EXPLOSION_FRAMES` en `assets/spritesheet.js`).
- Sprites reales: se copia `assets/spritesheet-breakout.png` a `public/juegos/arkanoid/spritesheet-breakout.png` y se porta la lógica de `assets/spritesheet.js` (`loadSpritesheet`, `drawSprite`, `drawFrame`, `SPRITES`, `EXPLOSION_FRAMES`, `EXPLOSION_DURATION`) dentro de `lib/games/arkanoid/engine.ts` (o un módulo auxiliar en la misma carpeta), cargando la imagen por ruta absoluta `/juegos/arkanoid/spritesheet-breakout.png`. El juego no arranca su loop hasta que `loadSpritesheet` confirma la imagen cargada.
- `components/ArkanoidCanvas.tsx`: client component que monta un `<canvas>` (buffer interno `800×600`, igual que el original) escalado por CSS al 100%/100% dentro de `.crt-screen` (ya `aspect-ratio: 4/3`, compatible sin distorsión ni letterbox — mismo caso que Asteroides). Arranca/detiene el loop con `useEffect`, expone `onStateChange({ score, lives, level })` (llamado tras cada `update()`) y `onGameOver(finalScore)`.
- Se **reemplaza** la fila existente de `bloque-buster` en la tabla `games` de Supabase: `UPDATE games SET id = 'arkanoid', title = 'ARKANOID', short = ..., long = ..., cover = 'cover-arkanoid', color = 'magenta' WHERE id = 'bloque-buster'` (o `DELETE` + `INSERT` si el motor de Supabase no permite `UPDATE` de clave primaria referenciada por `scores.game_id`; en ese caso, revisar si existen puntajes previos bajo `bloque-buster` en `scores` y decidir si se migran o se descartan al implementar). `cat` se mantiene `ARCADE` (el mismo de `bloque-buster`). `short`: "Rompe bloques con tu paleta antes de perder las 3 vidas." `long`: "El clásico rompebloques: controla la paleta, rebota la bola y destruye los 10x6 bloques de cada uno de los 5 niveles antes de que la bola se te escape. La velocidad aumenta con cada nivel."
- `.cover-arkanoid` en `app/globals.css` (reemplaza `.cover-bricks`, que queda huérfano y se puede eliminar en esta misma spec ya que ningún otro juego lo usa): franjas horizontales de colores imitando las filas de bloques del original sobre `--ink`, más un `::before` de una paleta/bola en la parte inferior con resplandor `--magenta`.
- Controles de teclado: solo `←`/`→` para mover la paleta (sin soporte de mouse/arrastre, a diferencia del original). Activos solo mientras el canvas está montado; los listeners se remueven al desmontar.
- `onGameOver(finalScore)` se dispara una sola vez: tanto al llegar a 0 vidas (`gameState = 'gameover'`) como al limpiar el nivel 5 (`gameState = 'win'` en el original) — ambos casos terminan la partida abriendo el modal de fin existente con el puntaje final.
- Pausa: exclusivamente vía `setPaused` del Reproductor, que congela el loop sin resetear estado (ningún timer/posición avanza mientras `update(dt)` no se llama). El overlay de pausa con selector de nivel (botones 1–5) y las teclas `P`/`Escape` del original **no se portan**.
- `.player-hud`: para `arkanoid`, "Puntuación", "Vidas" y "Nivel" muestran los valores reales del engine (`hud.score`, `hud.lives`, `hud.level`), igual que Asteroides.
- Se agrega la entrada `arkanoid: { Canvas: ArkanoidCanvas }` a `GAME_REGISTRY` en `lib/games/registry.ts` (ya existe desde SPEC 07 — no se repite el refactor de `PlayerClient.tsx`, solo se agrega la línea).

**No incluye:**

- Control de paleta por mouse/arrastre. Solo teclado (`←`/`→`), a diferencia del original.
- El overlay de pausa con selector de nivel (botones 1–5 dibujados en canvas) y las teclas `P`/`Escape`. La pausa es exclusivamente el botón "PAUSA" del Reproductor.
- Sonido o música (`ball-bounce.mp3`, `break-sound.mp3` del original). Mismo precedente que Asteroides/Tetris: fuera de alcance.
- Controles táctiles/móviles.
- Ajustes de balance respecto al original (velocidades, puntos por bloque, patrones/velocidad de los 5 niveles). Se porta tal cual.
- Un estado de "victoria" distinto al de fin de partida. Limpiar el nivel 5 dispara el mismo modal de fin que perder las 3 vidas, con el puntaje final acumulado.
- Migración/conservación de puntajes históricos guardados bajo `game_id = "bloque-buster"` en `scores` (si existen) — se decide al implementar según lo que exponga `mcp__supabase__list_tables`/`execute_sql`; si hay filas, esta spec no define su tratamiento y debe resolverse antes de aplicar la migración.
- Cambios a los demás 6 juegos simulados de la biblioteca (`duelo-pixel`, `gloton`, `invasores`, `ranaria`, `rocas`, `serpentina`). Siguen con la simulación decorativa actual sin ningún cambio.
- Cálculo dinámico de `best`/`plays` desde `scores` — quedan estáticos como en el resto del catálogo (SPEC 06).

## Modelo de datos

```ts
// lib/games/arkanoid/engine.ts
export interface ArkanoidHudState {
  score: number;
  lives: number;
  level: number; // 1-5
}

export interface ArkanoidCallbacks {
  onStateChange: (state: ArkanoidHudState) => void;
  onGameOver: (finalScore: number) => void;
}

export function createArkanoidGame(
  canvas: HTMLCanvasElement,
  callbacks: ArkanoidCallbacks,
): {
  start: () => void;
  stop: () => void;
  setPaused: (paused: boolean) => void;
};
```

`ArkanoidHudState` (`score`, `lives`, `level`) es estructuralmente compatible con `HudFields` de `lib/games/registry.ts` (`score`, `lives?`, `level`) sin necesidad de adaptar el tipo.

No se introduce persistencia nueva más allá de lo ya definido en SPEC 06 (`games`, `scores`); esta spec reemplaza (no agrega) una fila de `games`.

## Plan de implementación

1. **Verificación previa de `scores`** — `select count(*) from scores where game_id = 'bloque-buster'` (solo lectura). Si hay filas, decidir en el momento (no en esta spec) si se migran a `game_id = 'arkanoid'` o se conservan huérfanas; documentar la decisión tomada en el commit.
2. **Migración Supabase** — Reemplazar la fila `bloque-buster` por los valores de `arkanoid` descritos en Alcance, vía `mcp__supabase__apply_migration`. Verificar con `select id, title, cat, color, cover from games where id = 'arkanoid'` y confirmar que `bloque-buster` ya no existe.
3. **`.cover-arkanoid`** en `app/globals.css`, junto a las demás clases `.cover-*`. Eliminar `.cover-bricks` (huérfana tras el paso 2).
4. **`public/juegos/arkanoid/spritesheet-breakout.png`** — copiar el asset binario desde `references/started-games/04-arkanoid/assets/spritesheet-breakout.png`.
5. **`lib/games/arkanoid/engine.ts`** — Portar `game.js` + `levels.js` + `assets/spritesheet.js` íntegros a TypeScript, encapsulados dentro del closure de `createArkanoidGame(canvas, callbacks)`. Constantes (`PADDLE_SPEED`, `BLOCK_*`, `BASE_BALL_V*`, `LEVELS`, `SPRITES`, `EXPLOSION_FRAMES`, `EXPLOSION_DURATION`) y funciones (`initPaddle`, `initBall`, `loadLevel`, `collideAABB`, `update`, `draw`, `drawSprite`, `drawFrame`, `loadSpritesheet`) se mantienen iguales. El estado module-level del original (`paddle`, `ball`, `blocks`, `explosions`, `lives`, `score`, `gameState`, `currentLevel`) pasa a vivir dentro del closure. Los listeners de mouse (`click`, `mousemove`) del original **no se portan**; solo `keydown`/`keyup` para `←`/`→`, registrados en `start()` y removidos en `stop()`. `update(dt)` invoca `callbacks.onStateChange({ score, lives, level: currentLevel })` al final de cada frame; cuando `gameState` pasa a `'gameover'` o `'win'`, se invoca `callbacks.onGameOver(score)` una sola vez. `setPaused(true)` cancela el `requestAnimationFrame` sin resetear estado (ningún timer avanza porque `loop` no se vuelve a llamar); `setPaused(false)` reanuda. El loop no arranca hasta que `loadSpritesheet` confirma la imagen cargada. El build sigue pasando aunque nada lo use todavía.
6. **`components/ArkanoidCanvas.tsx`** — Client component (`"use client"`) con `<canvas ref={canvasRef} width={800} height={600} style={{ width: "100%", height: "100%", display: "block" }} />`, igual patrón que `AsteroidsCanvas.tsx`. Props: `{ paused: boolean; onStateChange: (s: ArkanoidHudState) => void; onGameOver: (score: number) => void }`. Un `useEffect` (deps `[]`) llama `createArkanoidGame(canvasRef.current, { onStateChange, onGameOver })`, guarda la instancia y llama `.start()`; el cleanup llama `.stop()`. Un segundo `useEffect` (dep `[paused]`) llama `instance.setPaused(paused)`.
7. **`lib/games/registry.ts`** — Agregar la entrada `arkanoid: { Canvas: ArkanoidCanvas }` a `GAME_REGISTRY`. No se toca `components/PlayerClient.tsx` más allá de que ya lee del registro (sin cambios de esta spec, el refactor ya existe desde SPEC 07).
8. **Verificación final** — `npm run lint` y `npm run build` sin errores. Jugar manualmente `/juegos/arkanoid/jugar`: mover la paleta con `←`/`→`, rebotar la bola contra paredes/paleta, romper bloques viendo la animación de explosión y el puntaje del HUD subir de a 10 puntos, limpiar el nivel 1 y confirmar que carga el nivel 2 con su patrón y velocidad de bola mayor, perder las 3 vidas y confirmar que se abre automáticamente el modal de fin con el puntaje final correcto, pulsar "PAUSA" y confirmar que el juego se congela (paleta y bola detenidas) sin overlay de selector de nivel, "REANUDAR" continúa sin saltos. Luego navegar a `/juegos/tetris/jugar` y a un juego simulado (`/juegos/rocas/jugar`) y confirmar que ambos siguen funcionando exactamente igual que antes.

## Criterios de aceptación

- [ ] La tabla `games` en Supabase ya no tiene una fila `id: "bloque-buster"`; en su lugar existe `id: "arkanoid"` con `title: "ARKANOID"`, `cat: "ARCADE"`, `color: "magenta"`, `cover: "cover-arkanoid"` y los `short`/`long` descritos en Alcance.
- [ ] `.cover-arkanoid` existe en `app/globals.css`, `.cover-bricks` fue eliminada, y el cover se ve correctamente en la card de `/juegos` y en el detalle `/juegos/arkanoid`.
- [ ] `public/juegos/arkanoid/spritesheet-breakout.png` existe y el juego lo carga sin error 404 en consola.
- [ ] `lib/games/arkanoid/engine.ts` exporta `createArkanoidGame(canvas, callbacks)` con `start()`, `stop()` y `setPaused(paused)`, portando íntegras las mecánicas de `game.js` (paleta, bola, colisiones, 5 niveles con velocidad progresiva, 3 vidas, animación de explosión de 4 frames por sprite).
- [ ] `components/ArkanoidCanvas.tsx` monta el canvas (800×600, sin distorsión dentro de `.crt-screen`) y llama `start()`/`stop()` correctamente en el ciclo de vida de React, sin dejar listeners de teclado activos tras desmontar.
- [ ] `lib/games/registry.ts` incluye la entrada `arkanoid: { Canvas: ArkanoidCanvas }`.
- [ ] En `/juegos/arkanoid/jugar`, el juego responde a `←`/`→` y el `.player-hud` muestra Puntuación, Vidas y Nivel reales, actualizándose en tiempo real.
- [ ] Romper un bloque otorga exactamente 10 puntos y muestra la animación de explosión de 4 frames.
- [ ] Limpiar un nivel carga el siguiente con su patrón de bloques y velocidad de bola correspondientes (×1.00 a ×1.46); limpiar el nivel 5 dispara el modal de fin con el puntaje final.
- [ ] Perder las 3 vidas dispara automáticamente el modal de fin de partida con el puntaje final correcto.
- [ ] Pulsar "PAUSA" congela paleta, bola y bloques sin mostrar ningún selector de nivel; "REANUDAR" continúa sin saltos de posición.
- [ ] Guardar la puntuación persiste en Supabase con `game_id: "arkanoid"` y aparece en `/salon` bajo "ARKANOID".
- [ ] Navegar a `/juegos/tetris/jugar` y a cualquier juego simulado restante (ej. `/juegos/rocas/jugar`) sigue funcionando exactamente igual que antes de esta spec.
- [ ] `npm run lint` y `npm run build` terminan sin errores.

## Decisiones tomadas y descartadas

- **Se reemplaza `bloque-buster` por `arkanoid` (mismo concepto de juego, id/título/color/cover nuevos), en vez de crear un id separado y dejar `bloque-buster` intacto como hicieron Asteroides (`rocas`) y Tetris.** Motivo (decisión del usuario): a diferencia de `rocas`/`caida`, `bloque-buster` es conceptualmente el mismo juego que Arkanoid (rompebloques), no vale la pena mantener dos entradas para la misma idea de juego.
- **Color `magenta`.** Motivo (decisión del usuario): es el color menos usado en el catálogo al momento de escribir esta spec (solo `tetris`).
- **Port literal de mecánicas y balance (velocidades, puntos, patrones y velocidad de los 5 niveles), sin ajustar constantes.** Motivo (decisión del usuario): mismo criterio que Asteroides/Tetris.
- **Solo teclado (`←`/`→`), sin soporte de mouse/arrastre.** Motivo (decisión del usuario): consistencia con Asteroides/Tetris, que son 100% teclado; evita gestionar el mapeo de coordenadas del mouse sobre el canvas escalado dentro del Reproductor.
- **Se descarta el overlay de pausa con selector de nivel y las teclas `P`/`Escape`; la pausa es exclusivamente `setPaused` del Reproductor.** Motivo (decisión del usuario): mismo criterio que Asteroides/Tetris — evita un atajo redundante que podría desincronizarse del estado `paused` de React, y el Reproductor ya tiene su propio overlay "EN PAUSA".
- **El estado `'win'` del original (limpiar los 5 niveles) dispara `onGameOver(score)`, igual que perder.** Motivo (decisión del usuario): el Reproductor solo tiene un flujo de fin de partida con un modal; no se agrega un estado de victoria separado.
- **Se porta el spritesheet real (`spritesheet-breakout.png`) a `public/juegos/arkanoid/`, incluyendo la animación de explosión de 4 frames, en vez de redibujar vectorialmente.** Motivo (decisión del usuario): fidelidad visual al original; sigue el patrón de assets binarios ya documentado en `integracion.md` para este caso.
- **Sonido fuera de alcance.** Motivo (decisión del usuario): mismo precedente que Asteroides/Tetris — ningún juego portado hasta ahora tiene audio.
- **Controles táctiles fuera de alcance.** Motivo: mismo criterio que las specs anteriores de juegos.

## Riesgos identificados

- **La fila `bloque-buster` puede tener puntajes asociados en `scores` (`game_id = 'bloque-buster'`).** Se mitiga verificando con `select count(*)` antes de migrar (paso 1 del plan); si existen, la decisión de migrarlos o dejarlos huérfanos se toma explícitamente al implementar, ya que esta spec no la resuelve de antemano.
- **Cambiar la clave primaria `id` de una fila existente (`bloque-buster` → `arkanoid`) puede fallar si hay una foreign key sin `ON UPDATE CASCADE` desde `scores.game_id`.** Si el `UPDATE` falla, la alternativa es `DELETE` de la fila vieja + `INSERT` de la nueva, aceptando la pérdida de cualquier puntaje huérfano documentada en el riesgo anterior.
- **Carga asíncrona del spritesheet antes de arrancar el loop.** Si `loadSpritesheet` falla (red, archivo movido), el juego no debe quedar en un loop dibujando sprites vacíos; se verifica manualmente que la consola no muestre errores 404 y que el juego arranque solo tras la carga exitosa (mismo patrón que el `loadSpritesheet(cb)` original, que ya bloquea el `requestAnimationFrame` inicial hasta el callback).
- **Fuga de listeners o loop si `stop()` no se llama correctamente al desmontar.** Se mitiga con el cleanup del `useEffect` en `ArkanoidCanvas`, verificado manualmente navegando fuera de `/juegos/arkanoid/jugar` durante una partida activa.

## Lo que **no** está en esta spec

- Control de paleta por mouse/arrastre.
- El overlay de pausa con selector de nivel y las teclas `P`/`Escape`.
- Sonido o música.
- Controles táctiles/móviles.
- Un estado de victoria distinto al modal de fin de partida existente.
- Migración de puntajes históricos de `bloque-buster` (se resuelve al implementar, no aquí).
- Cambios a los demás juegos simulados de la biblioteca.
- Cálculo dinámico de `best`/`plays` desde `scores`.

Cada uno de estos, si se necesita, va en su propia spec futura.
