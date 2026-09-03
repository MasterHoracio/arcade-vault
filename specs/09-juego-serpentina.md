# 09 · Juego real — Serpentina ("SERPENTINA")

> **Estado:** Implementado
> **Depende de:** SPEC 01, SPEC 04, SPEC 06, SPEC 07
> **Fecha:** 2026-09-01
> **Objetivo:** Diseñar e implementar desde cero (sin `game.js` de referencia) el motor real de Snake en `lib/games/serpentina/engine.ts`, integrado en `/juegos/serpentina/jugar` sobre la fila ya existente `serpentina` en Supabase, usando los sprites de fruta de `references/game-assets/snake-assets/`.

## Alcance

**Incluye:**

- Motor de Snake nuevo en `lib/games/serpentina/engine.ts`, exportando `createSerpentinaGame(canvas, callbacks)`. Tablero de grid `40×30` celdas de `20px` sobre un canvas interno `800×600` (encaja exacto en el `aspect-ratio: 4/3` de `.crt-screen`, sin letterbox).
- Serpiente con longitud inicial `3`, arrancando centrada en el grid (celda `(20, 15)` aprox.) moviéndose hacia la derecha. Movimiento por ticks de grid (una celda por tick, no continuo en píxeles).
- Velocidad inicial `6 celdas/seg`. Sube `+1 celda/seg` por cada nivel; nivel sube cada `10` frutas comidas acumuladas (`level = min(10, floor(frutasComidas / 10) + 1)`); tope en nivel `10` (velocidad máxima `15 celdas/seg`), sin seguir subiendo después.
- Una fruta a la vez en el tablero, en una celda vacía elegida al azar (nunca sobre el cuerpo de la serpiente). Cada fruta usa un sprite aleatorio entre los 22 de `fruits` en el atlas (`apple`, `banana`, `orange`, `grape`, `garlic`, `eggplant`, `strawberry`, `cherry`, `carrot`, `mushroom`, `broccoli`, `watermelon`, `pepper`, `kiwi`, `lemon`, `peach`, `peanut`, `tomato`, `berries`, `grapes2`, `pineapple`, `melon`) — todas valen los mismos `10 pts`, el sprite es solo variedad visual.
- Comer una fruta: `+10` puntos, la serpiente crece un segmento (la cola no se retrae ese tick), se genera una fruta nueva en otra celda vacía.
- `3` vidas. Al chocar contra el borde del tablero o contra el propio cuerpo: se resta una vida y la serpiente se reinicia a longitud `3`, centrada, moviéndose a la derecha — **el score y el nivel/velocidad NO se resetean**. Al llegar a `0` vidas, game over.
- Controles: flechas `↑`/`↓`/`←`/`→` para cambiar de dirección. No se permite invertir 180° directamente sobre el propio cuello (ignorar el input que causaría eso), regla estándar de Snake. Listeners activos solo mientras el canvas está montado, removidos al desmontar.
- `components/SerpentinaCanvas.tsx`: client component que monta el `<canvas width={800} height={600}>` escalado al 100%/100% dentro de `.crt-screen`, mismo patrón que `AsteroidsCanvas.tsx`/`ArkanoidCanvas.tsx`. Expone `onStateChange({ score, lives, level })` tras cada tick de movimiento y `onGameOver(finalScore)` una sola vez, exactamente al pasar a `0` vidas.
- `setPaused(true)` congela el loop/tick de movimiento sin resetear estado; ningún timer avanza mientras está pausado.
- Sprites reales: se copia `references/game-assets/snake-assets/fruits.png` a `public/juegos/serpentina/fruits.png`. Se porta `references/game-assets/snake-assets/sprites.js` (solo la sección `fruits` del `SPRITE_ATLAS`, las 22 entradas `{x, y, w, h}`) a `lib/games/serpentina/sprites.ts`, tipado, con `sources.fruits` apuntando a `/juegos/serpentina/fruits.png`. El engine no arranca el loop hasta que la imagen carga.
- Se agrega la entrada `serpentina: { Canvas: SerpentinaCanvas }` a `GAME_REGISTRY` en `lib/games/registry.ts` (ya existe desde SPEC 07 — no se repite el refactor de `PlayerClient.tsx`, solo se agrega la línea).
- `.player-hud`: para `serpentina`, "Puntuación", "Vidas" y "Nivel" muestran los valores reales del engine (`hud.score`, `hud.lives`, `hud.level`), igual que Arkanoid/Asteroides.

**No incluye:**

- Cambios a la fila `serpentina` en Supabase. El `id`, `title` ("SERPENTINA"), `short`, `long`, `cat` ("ARCADE"), `color` ("green") y `cover` ("cover-snake") ya existen y describen correctamente el juego real (confirmado por consulta directa a la tabla `games`); no se migra nada.
- Rediseño de `.cover-snake` en `app/globals.css`. Ya existe (gradiente verde/negro con rastro de segmentos) y se reusa tal cual.
- Cuerpo de la serpiente dibujado con sprites propios (segmentos/cabeza). Se dibuja como bloques sólidos con los colores del tema (`--green`), igual de simple que el resto de los engines portados; solo la fruta usa sprite real.
- Controles táctiles/móviles.
- Sonido o música. Mismo precedente que Asteroides/Tetris/Arkanoid: fuera de alcance.
- Wraparound en los bordes. Se descartó a favor de game over clásico al tocar cualquier borde.
- Cambios a los demás 5 juegos simulados restantes de la biblioteca (`duelo-pixel`, `gloton`, `invasores`, `ranaria`, `rocas`). Siguen con la simulación decorativa actual sin ningún cambio.
- Cálculo dinámico de `best`/`plays` desde `scores` — quedan estáticos como en el resto del catálogo (SPEC 06).

> Nota (2026-09-03): `duelo-pixel`, `gloton`, `invasores`, `ranaria` y
> `rocas` se eliminaron del catálogo; las menciones a ellos en esta spec
> son históricas.

## Modelo de datos

```ts
// lib/games/serpentina/engine.ts
export interface SerpentinaHudState {
  score: number;
  lives: number;
  level: number; // 1-10
}

export interface SerpentinaCallbacks {
  onStateChange: (state: SerpentinaHudState) => void;
  onGameOver: (finalScore: number) => void;
}

export function createSerpentinaGame(
  canvas: HTMLCanvasElement,
  callbacks: SerpentinaCallbacks,
): {
  start: () => void;
  stop: () => void;
  setPaused: (paused: boolean) => void;
};
```

```ts
// lib/games/serpentina/sprites.ts
export interface SpriteRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const SPRITE_ATLAS: {
  sources: { fruits: string };
  fruits: Record<string, SpriteRect>; // 22 entradas, ver Alcance
};
```

`SerpentinaHudState` (`score`, `lives`, `level`) es estructuralmente compatible con `HudFields` de `lib/games/registry.ts` (`score`, `lives?`, `level`) sin adaptar el tipo.

No se introduce persistencia nueva más allá de lo ya definido en SPEC 06 (`games`, `scores`); esta spec no toca filas de `games`.

## Plan de implementación

1. **`public/juegos/serpentina/fruits.png`** — copiar el asset binario desde `references/game-assets/snake-assets/fruits.png`.
2. **`lib/games/serpentina/sprites.ts`** — portar la sección `fruits` de `references/game-assets/snake-assets/sprites.js` (22 entradas `{x, y, w, h}`), tipado, con `sources.fruits = "/juegos/serpentina/fruits.png"`.
3. **`lib/games/serpentina/engine.ts`** — Implementar `createSerpentinaGame(canvas, callbacks)`: estado del closure (`snake: {x,y}[]`, `direction`, `pendingDirection`, `fruit: {x,y,sprite}`, `score`, `lives`, `level`, `fruitsEaten`, `gameState`). Tick de movimiento controlado por `setInterval`/acumulador de `dt` según la velocidad actual (`6 + (level-1)` celdas/seg, tope `15`); en cada tick: mueve la cabeza en `direction`, detecta colisión con borde o cuerpo propio (resta vida y reinicia serpiente a longitud 3 sin resetear `score`/`level`, o dispara `onGameOver(score)` si `lives` llega a 0), detecta si la cabeza pisa la fruta (crece, `score += 10`, `fruitsEaten++`, recalcula `level`, genera fruta nueva en celda vacía aleatoria). Los listeners de teclado (`keydown` para `←↑→↓`, ignorando reversa de 180° sobre el cuello) se registran en `start()` y se remueven en `stop()`. `callbacks.onStateChange({score, lives, level})` se llama tras cada tick. `setPaused(true)` detiene el tick sin resetear estado; `setPaused(false)` lo reanuda. El loop no arranca hasta que `fruits.png` confirma cargada. El build sigue pasando aunque nada lo use todavía.
4. **`components/SerpentinaCanvas.tsx`** — Client component (`"use client"`) con `<canvas ref={canvasRef} width={800} height={600} style={{ width: "100%", height: "100%", display: "block" }} />`, mismo patrón que `ArkanoidCanvas.tsx`. Props: `{ paused: boolean; onStateChange: (s: SerpentinaHudState) => void; onGameOver: (score: number) => void }`. Un `useEffect` (deps `[]`) llama `createSerpentinaGame(canvasRef.current, { onStateChange, onGameOver })`, guarda la instancia y llama `.start()`; el cleanup llama `.stop()`. Un segundo `useEffect` (dep `[paused]`) llama `instance.setPaused(paused)`.
5. **`lib/games/registry.ts`** — Agregar la entrada `serpentina: { Canvas: SerpentinaCanvas }` a `GAME_REGISTRY`. No se toca `components/PlayerClient.tsx` más allá de que ya lee del registro (sin cambios de esta spec).
6. **Verificación final** — `npm run lint` y `npm run build` sin errores. Jugar manualmente `/juegos/serpentina/jugar`: mover la serpiente con las 4 flechas, confirmar que no se puede invertir 180° sobre el propio cuello, comer frutas viendo el sprite (aleatorio entre las 22) y el puntaje subir de a 10, ver que la serpiente crece un segmento por fruta, comer 10 frutas y confirmar que el nivel sube a 2 y la velocidad aumenta perceptiblemente, chocar contra un borde o contra el propio cuerpo y confirmar que se resta una vida y la serpiente se reinicia a longitud 3 sin perder el puntaje ni el nivel, perder las 3 vidas y confirmar que se abre automáticamente el modal de fin con el puntaje final correcto, pulsar "PAUSA" y confirmar que el juego se congela, "REANUDAR" continúa sin saltos. Luego navegar a `/juegos/arkanoid/jugar` y a un juego simulado (`/juegos/rocas/jugar`) y confirmar que ambos siguen funcionando exactamente igual que antes.

## Criterios de aceptación

- [ ] `public/juegos/serpentina/fruits.png` existe y el juego lo carga sin error 404 en consola.
- [ ] `lib/games/serpentina/sprites.ts` exporta `SPRITE_ATLAS` con las 22 entradas de fruta, coordenadas idénticas a `references/game-assets/snake-assets/sprites.js`.
- [ ] `lib/games/serpentina/engine.ts` exporta `createSerpentinaGame(canvas, callbacks)` con `start()`, `stop()` y `setPaused(paused)`.
- [ ] `components/SerpentinaCanvas.tsx` monta el canvas (800×600, sin distorsión dentro de `.crt-screen`) y llama `start()`/`stop()` correctamente en el ciclo de vida de React, sin dejar listeners de teclado activos tras desmontar.
- [ ] `lib/games/registry.ts` incluye la entrada `serpentina: { Canvas: SerpentinaCanvas }`.
- [ ] En `/juegos/serpentina/jugar`, el juego responde a `↑↓←→` y el `.player-hud` muestra Puntuación, Vidas y Nivel reales, actualizándose en tiempo real; no se puede invertir 180° directamente sobre el propio cuello.
- [ ] Comer una fruta suma exactamente 10 puntos, hace crecer la serpiente un segmento, y dibuja un sprite real de fruta (aleatorio entre los 22 disponibles).
- [ ] Cada 10 frutas comidas el nivel sube en 1 (hasta el tope 10) y la velocidad de movimiento aumenta en 1 celda/seg, hasta un máximo de 15 celdas/seg.
- [ ] Chocar contra un borde o contra el propio cuerpo resta una vida y reinicia la serpiente a longitud 3 en el centro, sin resetear puntaje ni nivel.
- [ ] Al llegar a 0 vidas se abre automáticamente el modal de fin de partida existente con el puntaje final correcto.
- [ ] Pulsar "PAUSA" congela el movimiento; "REANUDAR" continúa sin saltos.
- [ ] Guardar la puntuación persiste en Supabase con `game_id: "serpentina"` y aparece en `/salon` bajo "SERPENTINA".
- [ ] Navegar a `/juegos/arkanoid/jugar` y a cualquier juego simulado restante (ej. `/juegos/rocas/jugar`) sigue funcionando exactamente igual que antes de esta spec.
- [ ] `npm run lint` y `npm run build` terminan sin errores.

## Decisiones tomadas y descartadas

- **Se reemplaza el juego simulado bajo el `id` ya existente `serpentina`, sin crear un `id` nuevo ni migrar Supabase.** Motivo (decisión del usuario): mismo criterio que Arkanoid/`bloque-buster` — es conceptualmente el mismo juego. A diferencia de Arkanoid, el `title`/`short`/`long`/`cover`/`color` existentes ya describen fielmente el motor real diseñado en esta spec, así que no hace falta ninguna migración.
- **Sin `game.js` de referencia — diseño desde cero.** Motivo: el usuario no tenía código de referencia, solo los sprites de fruta (`references/game-assets/snake-assets/`); todas las constantes de balance (velocidad, incremento por nivel, cadencia de subida de nivel, tamaño de grid) se definieron en la Fase 2 de preguntas, no se heredaron de ningún original.
- **Game over al chocar contra el borde (sin wraparound).** Motivo (decisión del usuario): comportamiento clásico de Snake.
- **3 vidas, con reinicio de la serpiente a longitud 3 al chocar (sin resetear score/nivel).** Motivo (decisión del usuario): consistente con Arkanoid/Asteroides en vez del Snake clásico de una sola vida; el score/nivel no se resetean para no penalizar doblemente el progreso ya hecho.
- **Canvas 800×600 con grid 40×30 celdas de 20px, sin letterbox.** Motivo (decisión del usuario): encaja exacto en el `aspect-ratio: 4/3` de `.crt-screen`, igual que Asteroides/Arkanoid, evitando la complejidad extra del letterbox que sí necesitó Tetris.
- **Todas las frutas valen 10 puntos; el sprite es aleatorio entre las 22 disponibles solo por variedad visual.** Motivo (decisión del usuario): simplicidad — evita definir una tabla de puntos por fruta sin referencia que la respalde.
- **Velocidad inicial 6 celdas/seg, +1 celda/seg por nivel, nivel sube cada 10 frutas, tope en nivel 10 (15 celdas/seg).** Motivo (decisión del usuario): progresión lineal simple y predecible, con techo para que el juego no se vuelva injugable en partidas largas.
- **Solo flechas `↑↓←→`, sin WASD.** Motivo (decisión del usuario): consistente con Asteroides/Arkanoid/Tetris.
- **`.cover-snake` se reusa tal cual, sin rediseño.** Motivo (decisión del usuario): ya existe y representa bien el juego (gradiente verde/negro con rastro de segmentos).
- **Se portan los sprites reales de fruta (`fruits.png` + `sprites.ts`), pero el cuerpo de la serpiente se dibuja con bloques sólidos de color, no sprites propios.** Motivo: el usuario solo proveyó sprites de fruta, no de la serpiente; dibujar el cuerpo con el color `--green` del tema sigue el patrón simple ya usado en Tetris/Asteroides para piezas propias del juego.
- **Controles táctiles y sonido fuera de alcance.** Motivo: mismo precedente que las specs anteriores de juegos portados.

## Riesgos identificados

- **Carga asíncrona de `fruits.png` antes de arrancar el loop.** Se mitiga verificando manualmente que la consola no muestre error 404 y que el juego arranque solo tras la carga exitosa de la imagen (mismo patrón que `loadSpritesheet` en Arkanoid).
- **Colisión de la fruta nueva con el cuerpo de la serpiente al elegir celda aleatoria en tableros muy llenos.** Se mitiga excluyendo explícitamente todas las celdas ocupadas por el cuerpo al elegir la celda de la fruta nueva; se verifica manualmente dejando crecer la serpiente bastante y confirmando que la fruta nunca aparece sobre ella.
- **Fuga de listeners o loop si `stop()` no se llama correctamente al desmontar.** Se mitiga con el cleanup del `useEffect` en `SerpentinaCanvas`, verificado manualmente navegando fuera de `/juegos/serpentina/jugar` durante una partida activa.

## Lo que **no** está en esta spec

- Migración o cambios a la fila `serpentina` en Supabase.
- Rediseño de `.cover-snake`.
- Sprites propios para el cuerpo de la serpiente.
- Controles táctiles/móviles.
- Sonido o música.
- Wraparound en los bordes.
- Cambios a los demás juegos simulados de la biblioteca.
- Cálculo dinámico de `best`/`plays`.

Cada uno de estos, si se necesita, va en su propia spec futura.
