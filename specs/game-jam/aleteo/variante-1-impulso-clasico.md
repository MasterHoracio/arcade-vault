# Game Jam · Aleteo — ALETEO · Variante 1 ("impulso-clasico")

> **Estado:** Borrador
> **Depende de:** SPEC 01, SPEC 04, SPEC 06, SPEC 07
> **Fecha:** 2026-09-02
> **Objetivo:** Diseñar el motor de vuelo continuo con un solo input, mecánica de tap discreto contra tuberías clásicas, integrado en `/juegos/aleteo/jugar` sobre `lib/games/aleteo/engine.ts`.

## Alcance

**Incluye:**

- Motor nuevo en `lib/games/aleteo/engine.ts`, exportando `createAleteoGame(canvas, callbacks)`. Canvas interno `800×600` (4:3 exacto, sin letterbox).
- Ave: círculo de radio `15px`, posición horizontal fija en `x = 150px`, solo se mueve en el eje vertical. Empieza centrada en `y = 300px`.
- Física de **tap discreto**: cada input (tecla `Espacio`) fija instantáneamente la velocidad vertical a `-320px/s` (impulso hacia arriba), sin importar la velocidad previa — el clásico "aleteo" de un solo golpe. Gravedad constante `900px/s²` acelera la caída en todo momento, incluso inmediatamente después de un aleteo. Velocidad de caída tope `600px/s` (terminal velocity).
- Tuberías: pares verticales (superior + inferior) de `70px` de ancho, con un hueco vertical entre ambas. Se generan a intervalos horizontales fijos de `320px`, entran por el borde derecho y se desplazan a la izquierda a velocidad constante por nivel.
- Velocidad de scroll inicial `220px/s`. Hueco inicial `170px` de alto, centrado en una posición vertical aleatoria entre `120px` y `480px` por cada par nuevo.
- Dificultad por niveles discretos: cada `10` tuberías superadas sube un nivel; por nivel, la velocidad de scroll sube `+15px/s` (tope `340px/s` en nivel 9) y el hueco se achica `-10px` (tope mínimo `110px` en nivel 7, no sigue achicándose después). `level = min(10, floor(tuberiasSuperadas / 10) + 1)`.
- Puntaje: `+1` por cada par de tuberías que el ave cruza completamente (el borde derecho del ave pasa el borde derecho de las tuberías). Monótono, apto para `saveScore`.
- Colisión: el ave choca contra cualquier tubería, el techo (`y < 0`) o el suelo (`y > 600`) → fin de partida inmediato (sin sistema de vidas múltiples: `lives` HUD siempre vale `1` mientras se juega y pasa a `0` en la colisión que dispara `onGameOver`).
- Control: **una sola tecla** (`Espacio`) más clic/tap sobre el canvas, ambos disparan el mismo impulso. Listener activo solo mientras el canvas está montado, removido al desmontar.
- `components/AleteoCanvas.tsx`: client component que monta `<canvas width={800} height={600}>` al 100%/100% dentro de `.crt-screen`, mismo patrón que `SerpentinaCanvas.tsx`. Expone `onStateChange({ score, lives, level })` tras cada frame y `onGameOver(finalScore)` una sola vez, exactamente en la colisión que termina la partida.
- `setPaused(true)` congela el loop (gravedad, scroll, spawn) sin resetear estado; ningún timer avanza mientras está pausado.
- `.cover-aleteo` en `app/globals.css`: gradiente vertical cian/negro evocando cielo nocturno, `::after` con `repeating-linear-gradient` vertical simulando la silueta de pares de tuberías, `::before` con un rombo/triángulo CSS pequeño en `--cyan` representando el ave en pleno vuelo.
- Fila nueva en `games`: `id: "aleteo"`, `title: "ALETEO"`, `short: "Un solo aleteo, gravedad constante, esquiva las tuberías."`, `long: "Un ave cae sin parar por gravedad constante. Un solo botón la impulsa hacia arriba: cronometra cada aleteo para colarte entre pares de tuberías cada vez más cerrados."`, `cat: "ARCADE"`, `cover: "cover-aleteo"`, `color: "cyan"`, `best: 0`, `plays: 0`.
- Entrada `aleteo: { Canvas: AleteoCanvas }` en `GAME_REGISTRY` de `lib/games/registry.ts`.
- `.player-hud`: "Puntuación" y "Nivel" muestran `hud.score`/`hud.level` reales; "Vidas" muestra `♥` mientras `hud.lives === 1` y desaparece en el frame de game over, igual de simple que el resto del catálogo.

**No incluye:**

- Implementar esta variante descarta las otras dos (`variante-2-planeo-continuo.md`, `variante-3-obstaculos-variados.md`): comparten el mismo `game-id` `aleteo`, la misma fila en `games` y la misma clase `.cover-aleteo` — son alternativas excluyentes, no capas que se combinan.
- Controles táctiles/móviles dedicados (más allá del clic genérico sobre el canvas ya descrito, que no es un control táctil optimizado con gestos).
- Sonido o música.
- Cálculo dinámico de `best`/`plays` desde `scores` — quedan estáticos como en el resto del catálogo (SPEC 06).
- Sin cambios a los demás juegos de la biblioteca (`arkanoid`, `asteroides`, `serpentina`, `tetris`). Siguen exactamente igual.

## Modelo de datos

```ts
// lib/games/aleteo/engine.ts
export interface AleteoHudState {
  score: number;
  lives: number; // 1 mientras se juega, 0 en el frame de game over
  level: number; // 1-10
}

export interface AleteoCallbacks {
  onStateChange: (state: AleteoHudState) => void;
  onGameOver: (finalScore: number) => void;
}

export function createAleteoGame(
  canvas: HTMLCanvasElement,
  callbacks: AleteoCallbacks,
): {
  start: () => void;
  stop: () => void;
  setPaused: (paused: boolean) => void;
};
```

`AleteoHudState` (`score`, `lives`, `level`) es estructuralmente compatible con `HudFields` de `lib/games/registry.ts` (`score`, `lives?`, `level`) sin adaptar el tipo. No se introduce persistencia nueva más allá de lo ya definido en SPEC 06 (`games`, `scores`).

## Plan de implementación

1. **Migración Supabase** — `insert into games (...)` con la fila `aleteo` descrita en Alcance, vía `mcp__supabase__apply_migration`. Verificar con `select id, title, cat, color, cover from games where id = 'aleteo'`.
2. **`.cover-aleteo`** en `app/globals.css`, junto a las demás clases `.cover-*` (sección "Cover art generators"). Solo gradientes CSS y variables del tema.
3. **`lib/games/aleteo/engine.ts`** — Implementar `createAleteoGame(canvas, callbacks)`: estado del closure (`birdY`, `birdVelocity`, `pipes: {x, gapTop, gapHeight, passed}[]`, `score`, `level`, `gameState`, `scrollSpeed`, `gapHeight` actuales). El loop (`requestAnimationFrame`, `dt` capado en `0.05`) aplica gravedad a `birdVelocity`, mueve el ave, mueve y genera tuberías, detecta colisión con tuberías/techo/suelo (dispara `onGameOver(score)` una sola vez), detecta cruce de tubería (`score++`, recalcula `level`, ajusta `scrollSpeed`/`gapHeight` según el nivel). El listener de `Espacio`/clic fija `birdVelocity = -320` al disparar, registrado en `start()` y removido en `stop()`. `callbacks.onStateChange({score, lives, level})` se llama al final de cada frame. `setPaused(true)` cancela el `requestAnimationFrame` sin resetear estado.
4. **`components/AleteoCanvas.tsx`** — Client component (`"use client"`) con `<canvas ref={canvasRef} width={800} height={600} style={{ width: "100%", height: "100%", display: "block" }} />`, mismo patrón que `SerpentinaCanvas.tsx`. Props: `{ paused: boolean; onStateChange: (s: AleteoHudState) => void; onGameOver: (score: number) => void }`. Un `useEffect` (deps `[]`) crea la instancia, la guarda en un ref y llama `.start()`; el cleanup llama `.stop()`. Un segundo `useEffect` (dep `[paused]`) llama `instance.setPaused(paused)`.
5. **`lib/games/registry.ts`** — Agregar la entrada `aleteo: { Canvas: AleteoCanvas }` a `GAME_REGISTRY`. No se toca `PlayerClient.tsx` más allá de que ya lee del registro.
6. **Assets** — ninguno; el ave y las tuberías se dibujan con primitivas de canvas (círculo, rectángulos) y colores del tema, sin sprites.
7. **Verificación final** — `npm run lint` y `npm run build` sin errores. Jugar manualmente `/juegos/aleteo/jugar`: presionar `Espacio` y confirmar el impulso instantáneo hacia arriba seguido de caída por gravedad, cruzar varias tuberías viendo el puntaje subir de a 1, llegar a 10 tuberías y confirmar que el nivel sube a 2, el scroll se acelera perceptiblemente y el hueco se nota más angosto, chocar contra una tubería o tocar el techo/suelo y confirmar que se abre automáticamente el modal de fin con el puntaje final correcto, pulsar "PAUSA" y confirmar que el ave y las tuberías se congelan, "REANUDAR" continúa sin saltos. Luego navegar a `/juegos/serpentina/jugar` y a `/juegos/tetris/jugar` y confirmar que ambos siguen funcionando exactamente igual que antes.

## Criterios de aceptación

- [ ] La tabla `games` en Supabase tiene una fila `id: "aleteo"` con los valores descritos en Alcance.
- [ ] `.cover-aleteo` existe en `app/globals.css` y se ve correctamente en la card de `/juegos` y en el detalle `/juegos/aleteo`.
- [ ] `lib/games/aleteo/engine.ts` exporta `createAleteoGame(canvas, callbacks)` con `start()`, `stop()` y `setPaused(paused)`.
- [ ] `components/AleteoCanvas.tsx` monta el canvas (800×600 sin distorsión) y llama `start()`/`stop()` correctamente en el ciclo de vida de React, sin dejar listeners activos tras desmontar.
- [ ] `lib/games/registry.ts` incluye la entrada `aleteo: { Canvas: AleteoCanvas }`.
- [ ] En `/juegos/aleteo/jugar`, `Espacio` o un clic sobre el canvas fijan la velocidad vertical del ave a `-320px/s` de inmediato, y el `.player-hud` muestra Puntuación, Vidas y Nivel reales actualizándose en tiempo real.
- [ ] Cruzar un par de tuberías suma exactamente 1 punto.
- [ ] Cada 10 tuberías superadas el nivel sube en 1 (hasta el tope 10), la velocidad de scroll aumenta y el hueco se achica, hasta los topes definidos.
- [ ] Chocar contra una tubería, el techo o el suelo dispara `onGameOver` exactamente una vez y abre el modal de fin con el puntaje final correcto.
- [ ] Pulsar "PAUSA" congela el ave y las tuberías; "REANUDAR" continúa sin saltos.
- [ ] Guardar la puntuación persiste en Supabase con `game_id: "aleteo"` y aparece en `/salon` bajo "ALETEO".
- [ ] Navegar a `/juegos/serpentina/jugar` y a cualquier juego simulado restante sigue funcionando exactamente igual que antes de esta spec.
- [ ] `npm run lint` y `npm run build` terminan sin errores.

## Decisiones tomadas y descartadas

- **Impulso discreto (velocidad fijada, no acumulada) en cada tap.** Motivo (decisión del agente): es el comportamiento "clásico" reconocible del género — cada aleteo anula la caída previa en vez de sumarse a ella, lo que hace el control predecible con un solo botón.
- **Gravedad `900px/s²`, impulso `-320px/s`, velocidad terminal `600px/s`.** Motivo (decisión del agente): con canvas de 600px de alto, esta relación produce un arco de vuelo de ~1.5s por aleteo, suficiente margen para reaccionar sin sentirse lento.
- **Dificultad por niveles discretos cada 10 tuberías, con topes de velocidad y hueco.** Motivo (decisión del agente): progresión predecible y fácil de comunicar en el HUD (`level`); los topes evitan que el juego se vuelva imposible en partidas muy largas, mismo criterio que serpentina.
- **Sin sistema de vidas múltiples — un solo golpe termina la partida.** Motivo (decisión del agente): es la convención del género "vuelo continuo con un solo input"; `lives` se modela igual como `1`/`0` para encajar sin fricción en `HudFields` sin inventar un campo nuevo.
- **Canvas 800×600 sin letterbox.** Motivo (decisión del agente): encaja exacto en el `aspect-ratio: 4/3` de `.crt-screen`, igual que Asteroides/Arkanoid/Serpentina.
- **Sin sprites — ave como círculo, tuberías como rectángulos.** Motivo (decisión del agente): primitivas de canvas bastan para la lectura visual del juego y evitan el riesgo de assets binarios.
- **Un solo control (`Espacio` + clic), sin variantes de tecla.** Motivo (decisión del agente): coherente con el tema "un solo input" — agregar una segunda tecla diluiría la premisa central.

## Riesgos identificados

- **Colisión imprecisa entre círculo (ave) y rectángulos (tuberías) si se usa solo bounding-box.** Se mitiga usando la distancia del centro del círculo al rectángulo más cercano (clamp de coordenadas) en vez de un simple overlap de cajas; se verifica manualmente rozando el borde de una tubería sin llegar a superponerse visualmente.
- **Salto de dificultad perceptible entre niveles si los incrementos son abruptos.** Se mitiga con incrementos pequeños (`+15px/s`, `-10px` de hueco) y topes definidos; se verifica jugando hasta nivel 3-4 y confirmando que el cambio se siente gradual.
- **Fuga de listeners o loop si `stop()` no se llama correctamente al desmontar.** Se mitiga con el cleanup del `useEffect` en `AleteoCanvas`, verificado manualmente navegando fuera de `/juegos/aleteo/jugar` durante una partida activa.

## Lo que **no** está en esta spec

- Las otras dos variantes de `aleteo` (`variante-2-planeo-continuo.md`, `variante-3-obstaculos-variados.md`) — son alternativas excluyentes, no complementos.
- Controles táctiles/móviles dedicados.
- Sonido o música.
- Cálculo dinámico de `best`/`plays`.
- Cambios a los demás juegos de la biblioteca.

Cada uno de estos, si se necesita, va en su propia spec futura.
