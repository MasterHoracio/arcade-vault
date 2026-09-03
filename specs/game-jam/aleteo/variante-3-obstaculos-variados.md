# Game Jam · Aleteo — ALETEO · Variante 3 ("obstaculos-variados")

> **Estado:** Borrador
> **Depende de:** SPEC 01, SPEC 04, SPEC 06, SPEC 07
> **Fecha:** 2026-09-02
> **Objetivo:** Diseñar el motor de vuelo continuo con un solo input, mecánica de tap discreto contra tres tipos de obstáculo alternados con ritmo de dificultad continuo, integrado en `/juegos/aleteo/jugar` sobre `lib/games/aleteo/engine.ts`.

## Alcance

**Incluye:**

- Motor nuevo en `lib/games/aleteo/engine.ts`, exportando `createAleteoGame(canvas, callbacks)`. Canvas interno `800×600` (4:3 exacto, sin letterbox).
- Ave: círculo de radio `15px`, posición horizontal fija en `x = 150px`, solo se mueve en el eje vertical. Empieza centrada en `y = 300px`.
- Física de **tap discreto** (igual que la variante 1): cada input (`Espacio` o clic) fija la velocidad vertical a `-300px/s`. Gravedad constante `850px/s²`. Velocidad de caída tope `580px/s`.
- **Tres tipos de obstáculo**, alternados en ciclo fijo `pipe → disc → meteor → pipe → ...` según el orden de generación (no aleatorio, para que el jugador aprenda el patrón):
  1. **Tubería** (`pipe`): par vertical superior/inferior de `70px` de ancho con un hueco de `170px`, igual que la variante 1, entra por la derecha y se desplaza en línea recta a la izquierda.
  2. **Disco flotante** (`disc`): un único círculo sólido de radio `45px`, posicionado a una altura aleatoria entre `150px` y `450px`; no tiene hueco — el ave debe pasar por encima o por debajo del disco completo, usando todo el ancho del canvas restante como margen.
  3. **Meteoro diagonal** (`meteor`): un par de círculos de radio `20px` que entran por la esquina superior derecha y se desplazan en diagonal (`-180px/s` horizontal, `+90px/s` vertical) hasta salir por el borde inferior o izquierdo; el ave debe esquivarlos, no hay hueco fijo que cruzar.
- Espaciado horizontal entre obstáculos consecutivos: `300px` medidos desde el punto de generación de cada uno, independiente del tipo.
- Velocidad base de scroll `220px/s` para tuberías y discos; el meteoro usa su propio vector diagonal descrito arriba, no el scroll base.
- **Dificultad con ritmo continuo, no por niveles discretos**: la velocidad efectiva de scroll es una función del tiempo transcurrido en la partida, `scrollSpeed(t) = min(400, 220 + 4 * t)` px/s (`t` en segundos desde el inicio de la partida, sin resetear con las colisiones); crece de forma suave frame a frame en vez de saltar en escalones. El `level` del HUD es puramente informativo (`level = min(10, floor(score / 12) + 1)`) y no afecta al motor.
- Puntaje: `+1` por cada obstáculo (de cualquiera de los tres tipos) que el ave supera completamente. Monótono, apto para `saveScore`.
- **3 vidas** (a diferencia de las variantes 1 y 2): al chocar contra un obstáculo, el techo o el suelo, se resta una vida, el ave vuelve a `y = 300px` con velocidad `0`, y gana `1s` de invulnerabilidad (parpadeo visual, sin colisión durante ese segundo) — el score, el nivel y `t` (para el ritmo de dificultad) **no se resetean**. Al llegar a `0` vidas, game over.
- Control: **una sola tecla** (`Espacio`) más clic/tap sobre el canvas, ambos disparan el mismo impulso. Listener activo solo mientras el canvas está montado, removido al desmontar.
- `components/AleteoCanvas.tsx`: client component que monta `<canvas width={800} height={600}>` al 100%/100% dentro de `.crt-screen`, mismo patrón que `SerpentinaCanvas.tsx`. Expone `onStateChange({ score, lives, level })` tras cada frame y `onGameOver(finalScore)` una sola vez, exactamente al pasar a `0` vidas.
- `setPaused(true)` congela el loop (gravedad, scroll, avance de `t`, spawn, invulnerabilidad) sin resetear estado; ningún timer avanza mientras está pausado.
- `.cover-aleteo` en `app/globals.css`: gradiente vertical cian/negro evocando un cielo nocturno con más densidad de elementos, `::after` combinando un `repeating-linear-gradient` vertical (siluetas de tuberías) con `radial-gradient`s puntuales (discos y meteoros) dispersos, `::before` con un rombo/triángulo CSS pequeño en `--cyan` representando el ave esquivando el conjunto.
- Fila nueva en `games`: `id: "aleteo"`, `title: "ALETEO"`, `short: "Esquiva tuberías, discos y meteoros a un ritmo que no para de acelerar."`, `long: "Un ave vuela sin parar por gravedad constante y un solo botón. Tuberías, discos flotantes y meteoros diagonales se alternan mientras la velocidad sube minuto a minuto, sin pausas de nivel: cada partida es una carrera contra el ritmo."`, `cat: "ARCADE"`, `cover: "cover-aleteo"`, `color: "cyan"`, `best: 0`, `plays: 0`.
- Entrada `aleteo: { Canvas: AleteoCanvas }` en `GAME_REGISTRY` de `lib/games/registry.ts`.
- `.player-hud`: "Puntuación", "Vidas" y "Nivel" muestran `hud.score`/`hud.lives`/`hud.level` reales, igual que Arkanoid/Asteroides (`lives` va de 3 a 0).

**No incluye:**

- Implementar esta variante descarta las otras dos (`variante-1-impulso-clasico.md`, `variante-2-planeo-continuo.md`): comparten el mismo `game-id` `aleteo`, la misma fila en `games` y la misma clase `.cover-aleteo` — son alternativas excluyentes, no capas que se combinan.
- Controles táctiles/móviles dedicados (más allá del clic genérico sobre el canvas ya descrito, que no es un control táctil optimizado con gestos).
- Sonido o música.
- Cálculo dinámico de `best`/`plays` desde `scores` — quedan estáticos como en el resto del catálogo (SPEC 06).
- Sin cambios a los demás juegos de la biblioteca (`arkanoid`, `asteroides`, `serpentina`, `tetris`). Siguen exactamente igual.

## Modelo de datos

```ts
// lib/games/aleteo/engine.ts
export interface AleteoHudState {
  score: number;
  lives: number; // 3 a 0
  level: number; // informativo, 1-10, no afecta al motor
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
3. **`lib/games/aleteo/engine.ts`** — Implementar `createAleteoGame(canvas, callbacks)`: clases o factories del dominio, una por tipo de obstáculo (`Pipe`, `Disc`, `Meteor`), cada una con su propia lógica de movimiento y colisión (rect-círculo para `Pipe`, círculo-círculo para `Disc`/`Meteor`). Estado del closure (`birdY`, `birdVelocity`, `obstacles: (Pipe | Disc | Meteor)[]`, `nextObstacleType` (cíclico), `elapsedTime`, `score`, `lives`, `level`, `gameState`, `invulnerableUntil`). El loop (`requestAnimationFrame`, `dt` capado en `0.05`) avanza `elapsedTime`, recalcula `scrollSpeed(t)`, aplica gravedad, mueve el ave, mueve/genera obstáculos según el ciclo fijo con espaciado `300px`, detecta colisión (ignorada si `elapsedTime < invulnerableUntil`): si colisiona, resta una vida, reposiciona el ave a `y=300, velocity=0`, fija `invulnerableUntil = elapsedTime + 1`, y dispara `onGameOver(score)` una sola vez exactamente cuando `lives` llega a `0`; si supera un obstáculo, `score++` y recalcula `level` (informativo). El listener de `Espacio`/clic fija `birdVelocity = -300`, registrado en `start()` y removido en `stop()`. `callbacks.onStateChange({score, lives, level})` se llama al final de cada frame. `setPaused(true)` cancela el `requestAnimationFrame` sin resetear estado ni avanzar `elapsedTime`.
4. **`components/AleteoCanvas.tsx`** — Client component (`"use client"`) con `<canvas ref={canvasRef} width={800} height={600} style={{ width: "100%", height: "100%", display: "block" }} />`, mismo patrón que `SerpentinaCanvas.tsx`. Props: `{ paused: boolean; onStateChange: (s: AleteoHudState) => void; onGameOver: (score: number) => void }`. Un `useEffect` (deps `[]`) crea la instancia, la guarda en un ref y llama `.start()`; el cleanup llama `.stop()`. Un segundo `useEffect` (dep `[paused]`) llama `instance.setPaused(paused)`.
5. **`lib/games/registry.ts`** — Agregar la entrada `aleteo: { Canvas: AleteoCanvas }` a `GAME_REGISTRY`. No se toca `PlayerClient.tsx` más allá de que ya lee del registro.
6. **Assets** — ninguno; ave, tuberías, discos y meteoros se dibujan con primitivas de canvas (círculos, rectángulos) y colores del tema, sin sprites.
7. **Verificación final** — `npm run lint` y `npm run build` sin errores. Jugar manualmente `/juegos/aleteo/jugar`: presionar `Espacio` y confirmar el impulso instantáneo seguido de caída por gravedad, cruzar una tubería, luego un disco (pasando por encima o por debajo) y luego un meteoro diagonal, confirmando que el ciclo `pipe → disc → meteor` se repite en ese orden y que el puntaje sube de a 1 con cada tipo, dejar pasar 20-30s de partida y confirmar que la velocidad de scroll sube de forma perceptible y continua (sin saltos bruscos) según `scrollSpeed(t)`, chocar contra un obstáculo y confirmar que se resta una vida, el ave se reposiciona al centro con `1s` de invulnerabilidad visible (parpadeo) y que el score/nivel/velocidad no se resetean, perder las 3 vidas y confirmar que se abre automáticamente el modal de fin con el puntaje final correcto, pulsar "PAUSA" y confirmar que todo se congela incluida la cuenta de invulnerabilidad, "REANUDAR" continúa sin saltos. Luego navegar a `/juegos/serpentina/jugar` y a `/juegos/tetris/jugar` y confirmar que ambos siguen funcionando exactamente igual que antes.

## Criterios de aceptación

- [ ] La tabla `games` en Supabase tiene una fila `id: "aleteo"` con los valores descritos en Alcance.
- [ ] `.cover-aleteo` existe en `app/globals.css` y se ve correctamente en la card de `/juegos` y en el detalle `/juegos/aleteo`.
- [ ] `lib/games/aleteo/engine.ts` exporta `createAleteoGame(canvas, callbacks)` con `start()`, `stop()` y `setPaused(paused)`.
- [ ] `components/AleteoCanvas.tsx` monta el canvas (800×600 sin distorsión) y llama `start()`/`stop()` correctamente en el ciclo de vida de React, sin dejar listeners activos tras desmontar.
- [ ] `lib/games/registry.ts` incluye la entrada `aleteo: { Canvas: AleteoCanvas }`.
- [ ] En `/juegos/aleteo/jugar`, `Espacio` o un clic fijan la velocidad vertical del ave a `-300px/s` de inmediato, y el `.player-hud` muestra Puntuación, Vidas (3 a 0) y Nivel reales.
- [ ] Los obstáculos se generan en el ciclo fijo `pipe → disc → meteor`, cada uno con su propia geometría y lógica de colisión (rect-círculo para tuberías, círculo-círculo para discos y meteoros).
- [ ] Superar cualquier tipo de obstáculo suma exactamente 1 punto.
- [ ] La velocidad de scroll aumenta de forma continua con el tiempo transcurrido (`scrollSpeed(t)`), sin saltos discretos de nivel, hasta el tope de `400px/s`.
- [ ] Chocar contra un obstáculo, el techo o el suelo resta una vida, reposiciona el ave al centro y otorga `1s` de invulnerabilidad, sin resetear puntaje, nivel ni el ritmo de dificultad.
- [ ] Al llegar a 0 vidas se abre automáticamente el modal de fin de partida con el puntaje final correcto, y `onGameOver` se dispara exactamente una vez.
- [ ] Pulsar "PAUSA" congela el ave, los obstáculos, el avance del tiempo y la cuenta de invulnerabilidad; "REANUDAR" continúa sin saltos.
- [ ] Guardar la puntuación persiste en Supabase con `game_id: "aleteo"` y aparece en `/salon` bajo "ALETEO".
- [ ] Navegar a `/juegos/serpentina/jugar` y a cualquier juego simulado restante sigue funcionando exactamente igual que antes de esta spec.
- [ ] `npm run lint` y `npm run build` terminan sin errores.

## Decisiones tomadas y descartadas

- **Tres tipos de obstáculo en ciclo fijo (no aleatorio) en vez de uno solo.** Motivo (decisión del agente): explora el ángulo "distinto tipo de obstáculo" sin volver el juego injusto — un orden predecible permite que el jugador aprenda el patrón en vez de depender de la suerte del RNG, y da variedad visual/mecánica real frente a las variantes 1 y 2.
- **Ritmo de dificultad continuo (`scrollSpeed(t)`) en vez de niveles discretos.** Motivo (decisión del agente): es el eje de exploración específico de esta variante — la presión sube en cada instante en vez de en escalones, dando una sensación de "carrera contra el reloj" distinta a la progresión por hitos de las variantes 1 y 2. El `level` del HUD se mantiene solo como indicador informativo derivado del score, sin gobernar al motor, para no duplicar dos fuentes de verdad sobre la dificultad.
- **3 vidas con invulnerabilidad de 1s tras cada golpe, en vez de un solo golpe fatal.** Motivo (decisión del agente): con tres tipos de obstáculo y ritmo creciente, un solo golpe fatal sería punitivo en exceso frente a la variedad añadida; las vidas compensan la mayor complejidad perceptiva sin bajar la dificultad de fondo (el score/ritmo no se resetean).
- **Espaciado horizontal uniforme (`300px`) entre obstáculos, independiente del tipo.** Motivo (decisión del agente): mantiene el ritmo de aparición legible pese a la variedad de geometría; variar también el espaciado por tipo añadiría una segunda variable de dificultad no planeada.
- **Meteoro con vector diagonal fijo, no perseguidor.** Motivo (decisión del agente): mantiene el juego resoluble con un solo input — un obstáculo que persigue activamente al ave requeriría una segunda dimensión de control que rompe la premisa del tema.
- **Gravedad `850px/s²`, impulso `-300px/s`, ligeramente distintos a la variante 1.** Motivo (decisión del agente): con tres tipos de obstáculo compitiendo por espacio vertical, un arco de vuelo levemente más corto que la variante 1 da más margen de reacción sin cambiar la sensación general del control.
- **Canvas 800×600 sin letterbox.** Motivo (decisión del agente): encaja exacto en el `aspect-ratio: 4/3` de `.crt-screen`, igual que las otras dos variantes.
- **Sin sprites — todos los obstáculos como primitivas geométricas de canvas.** Motivo (decisión del agente): mantiene la promesa de "sin assets binarios necesarios" pese a la variedad de formas.

## Riesgos identificados

- **Tres tipos de colisión distintos (rect-círculo, círculo-círculo x2) multiplican la superficie de bugs frente a las otras variantes.** Se mitiga aislando cada tipo en su propia clase con su propio método de colisión, verificado manualmente chocando deliberadamente contra cada tipo de obstáculo por separado.
- **El disco flotante puede generarse en una posición que deje un margen de paso demasiado angosto arriba o abajo si el rango `150-450px` no se acota bien contra los bordes del canvas.** Se mitiga verificando manualmente que siempre exista un margen navegable de al menos `120px` entre el borde del disco y el techo/suelo, ajustando el rango de generación si hace falta durante la implementación.
- **`scrollSpeed(t)` sin techo perceptible podría volverse injugable en partidas muy largas.** Se mitiga con el tope explícito de `400px/s`; se verifica dejando correr una partida más de 60s y confirmando que la velocidad deja de subir.
- **Fuga de listeners o loop si `stop()` no se llama correctamente al desmontar.** Se mitiga con el cleanup del `useEffect` en `AleteoCanvas`, verificado manualmente navegando fuera de `/juegos/aleteo/jugar` durante una partida activa.

## Lo que **no** está en esta spec

- Las otras dos variantes de `aleteo` (`variante-1-impulso-clasico.md`, `variante-2-planeo-continuo.md`) — son alternativas excluyentes, no complementos.
- Controles táctiles/móviles dedicados.
- Sonido o música.
- Cálculo dinámico de `best`/`plays`.
- Cambios a los demás juegos de la biblioteca.

Cada uno de estos, si se necesita, va en su propia spec futura.
