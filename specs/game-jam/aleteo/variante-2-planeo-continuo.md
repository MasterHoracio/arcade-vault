# Game Jam · Aleteo — ALETEO · Variante 2 ("planeo-continuo")

> **Estado:** Borrador
> **Depende de:** SPEC 01, SPEC 04, SPEC 06, SPEC 07
> **Fecha:** 2026-09-02
> **Objetivo:** Diseñar el motor de vuelo continuo con un solo input, mecánica de empuje sostenido contra franjas con hueco móvil, integrado en `/juegos/aleteo/jugar` sobre `lib/games/aleteo/engine.ts`.

## Alcance

**Incluye:**

- Motor nuevo en `lib/games/aleteo/engine.ts`, exportando `createAleteoGame(canvas, callbacks)`. Canvas interno `800×600` (4:3 exacto, sin letterbox).
- Ave: círculo de radio `15px`, posición horizontal fija en `x = 150px`, solo se mueve en el eje vertical. Empieza centrada en `y = 300px`.
- Física de **empuje sostenido** (distinta de un tap discreto): mientras el input está presionado (`Espacio` o clic mantenido), se aplica una aceleración de ascenso de `-700px/s²`; la gravedad `500px/s²` actúa siempre hacia abajo. Aceleración neta mientras se mantiene presionado: `-200px/s²` (sube suavemente); al soltar: `+500px/s²` (cae por gravedad pura). Velocidad vertical acotada entre `-260px/s` (subida máxima) y `500px/s` (caída máxima). Esto convierte el control en algo más parecido a "planear" que a un salto discreto: la trayectoria es una curva continua que responde en todo momento a si el botón está o no presionado, no a un impulso puntual.
- Obstáculos: **franjas horizontales** de `40px` de ancho que cruzan todo el canvas de arriba a abajo salvo por un hueco vertical de `160px`. A diferencia de una tubería fija, el hueco de cada franja **se mueve verticalmente en el tiempo** según una onda senoidal (amplitud `100px` alrededor del centro vertical de la franja, período `2.5s`, fase aleatoria por franja), de modo que el punto de paso seguro cambia mientras la franja se acerca. Se generan a intervalos horizontales fijos de `340px`, entran por el borde derecho y se desplazan a la izquierda a velocidad constante por nivel.
- Velocidad de scroll inicial `200px/s`. Dificultad por niveles discretos: cada `8` franjas superadas sube un nivel; por nivel, la velocidad sube `+20px/s` (tope `300px/s` en nivel 6) y el hueco se achica `-8px` (tope mínimo `120px` en nivel 6). `level = min(10, floor(franjasSuperadas / 8) + 1)`.
- Puntaje: `+1` por cada franja que el ave cruza completamente. Monótono, apto para `saveScore`.
- Colisión: el ave choca contra la parte sólida de una franja, el techo (`y < 0`) o el suelo (`y > 600`) → fin de partida inmediato (`lives` HUD vale `1` mientras se juega, `0` en el frame de colisión que dispara `onGameOver`).
- Control: **una sola tecla** (`Espacio`, mantenida) más clic/tap mantenido sobre el canvas, ambos activan el mismo empuje mientras están presionados. Se registran `keydown`/`keyup` (y `mousedown`/`mouseup`) en `start()` y se remueven en `stop()`.
- `components/AleteoCanvas.tsx`: client component que monta `<canvas width={800} height={600}>` al 100%/100% dentro de `.crt-screen`, mismo patrón que `SerpentinaCanvas.tsx`. Expone `onStateChange({ score, lives, level })` tras cada frame y `onGameOver(finalScore)` una sola vez, exactamente en la colisión que termina la partida.
- `setPaused(true)` congela el loop (gravedad, empuje, scroll, oscilación de huecos, spawn) sin resetear estado; ningún timer avanza mientras está pausado, incluida la fase de la onda senoidal de cada franja.
- `.cover-aleteo` en `app/globals.css`: gradiente vertical cian/negro evocando un túnel de energía, `::after` con `repeating-linear-gradient` horizontal simulando franjas de energía con brillo, `::before` con un rombo/triángulo CSS pequeño en `--cyan` representando el ave planeando entre dos franjas.
- Fila nueva en `games`: `id: "aleteo"`, `title: "ALETEO"`, `short: "Mantén el impulso, planea entre franjas de energía móviles."`, `long: "Un ave planea por un túnel de energía. Mantén presionado el botón para subir, suéltalo para caer: el hueco de cada franja se mueve mientras se acerca, así que hay que anticipar, no solo reaccionar."`, `cat: "ARCADE"`, `cover: "cover-aleteo"`, `color: "cyan"`, `best: 0`, `plays: 0`.
- Entrada `aleteo: { Canvas: AleteoCanvas }` en `GAME_REGISTRY` de `lib/games/registry.ts`.
- `.player-hud`: "Puntuación" y "Nivel" muestran `hud.score`/`hud.level` reales; "Vidas" muestra `♥` mientras `hud.lives === 1` y desaparece en el frame de game over.

**No incluye:**

- Implementar esta variante descarta las otras dos (`variante-1-impulso-clasico.md`, `variante-3-obstaculos-variados.md`): comparten el mismo `game-id` `aleteo`, la misma fila en `games` y la misma clase `.cover-aleteo` — son alternativas excluyentes, no capas que se combinan.
- Controles táctiles/móviles dedicados (más allá del clic mantenido genérico ya descrito, que no es un control táctil optimizado con gestos).
- Sonido o música.
- Cálculo dinámico de `best`/`plays` desde `scores` — quedan estáticos como en el resto del catálogo (SPEC 06).
- Sin cambios a los demás juegos de la biblioteca (`arkanoid`, `asteroides`, `serpentina`, `tetris`, `duelo-pixel`, `gloton`, `invasores`, `ranaria`, `rocas`). Siguen exactamente igual.

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
3. **`lib/games/aleteo/engine.ts`** — Implementar `createAleteoGame(canvas, callbacks)`: estado del closure (`birdY`, `birdVelocity`, `thrustHeld: boolean`, `bars: {x, gapCenterBase, gapHeight, phase, passed}[]`, `elapsedTime`, `score`, `level`, `gameState`, `scrollSpeed`, `gapHeight` actuales). El loop (`requestAnimationFrame`, `dt` capado en `0.05`) calcula la aceleración neta (`thrustHeld ? -200 : 500` px/s²), integra `birdVelocity` (acotada a `[-260, 500]`) y `birdY`, mueve y genera franjas, recalcula el centro del hueco de cada franja con `gapCenterBase + amplitude * sin(2π * elapsedTime / period + phase)`, detecta colisión contra la parte sólida de la franja/techo/suelo (dispara `onGameOver(score)` una sola vez), detecta cruce de franja (`score++`, recalcula `level`, ajusta `scrollSpeed`/`gapHeight` según el nivel). `keydown`/`mousedown` fijan `thrustHeld = true`, `keyup`/`mouseup` lo fijan en `false`, registrados en `start()` y removidos en `stop()`. `callbacks.onStateChange({score, lives, level})` se llama al final de cada frame. `setPaused(true)` cancela el `requestAnimationFrame` sin resetear estado ni avanzar `elapsedTime`.
4. **`components/AleteoCanvas.tsx`** — Client component (`"use client"`) con `<canvas ref={canvasRef} width={800} height={600} style={{ width: "100%", height: "100%", display: "block" }} />`, mismo patrón que `SerpentinaCanvas.tsx`. Props: `{ paused: boolean; onStateChange: (s: AleteoHudState) => void; onGameOver: (score: number) => void }`. Un `useEffect` (deps `[]`) crea la instancia, la guarda en un ref y llama `.start()`; el cleanup llama `.stop()`. Un segundo `useEffect` (dep `[paused]`) llama `instance.setPaused(paused)`.
5. **`lib/games/registry.ts`** — Agregar la entrada `aleteo: { Canvas: AleteoCanvas }` a `GAME_REGISTRY`. No se toca `PlayerClient.tsx` más allá de que ya lee del registro.
6. **Assets** — ninguno; el ave y las franjas se dibujan con primitivas de canvas (círculo, rectángulos) y colores del tema, sin sprites.
7. **Verificación final** — `npm run lint` y `npm run build` sin errores. Jugar manualmente `/juegos/aleteo/jugar`: mantener presionado `Espacio` y confirmar que el ave sube suavemente mientras se sostiene y cae por gravedad al soltar (curva continua, no salto discreto), cruzar varias franjas viendo el hueco moverse mientras se acercan y el puntaje subir de a 1, llegar a 8 franjas y confirmar que el nivel sube a 2, el scroll se acelera y el hueco se nota más angosto, chocar contra la parte sólida de una franja o tocar el techo/suelo y confirmar que se abre automáticamente el modal de fin con el puntaje final correcto, pulsar "PAUSA" y confirmar que el ave, las franjas y su oscilación se congelan, "REANUDAR" continúa sin saltos. Luego navegar a `/juegos/serpentina/jugar` y a un juego simulado (`/juegos/rocas/jugar`) y confirmar que ambos siguen funcionando exactamente igual que antes.

## Criterios de aceptación

- [ ] La tabla `games` en Supabase tiene una fila `id: "aleteo"` con los valores descritos en Alcance.
- [ ] `.cover-aleteo` existe en `app/globals.css` y se ve correctamente en la card de `/juegos` y en el detalle `/juegos/aleteo`.
- [ ] `lib/games/aleteo/engine.ts` exporta `createAleteoGame(canvas, callbacks)` con `start()`, `stop()` y `setPaused(paused)`.
- [ ] `components/AleteoCanvas.tsx` monta el canvas (800×600 sin distorsión) y llama `start()`/`stop()` correctamente en el ciclo de vida de React, sin dejar listeners activos tras desmontar.
- [ ] `lib/games/registry.ts` incluye la entrada `aleteo: { Canvas: AleteoCanvas }`.
- [ ] En `/juegos/aleteo/jugar`, mantener presionado `Espacio` o el clic produce ascenso continuo (`-200px/s²` neto) y soltar produce caída por gravedad (`+500px/s²`), con velocidad vertical acotada a `[-260, 500]px/s`; el `.player-hud` muestra Puntuación, Vidas y Nivel reales.
- [ ] El hueco de cada franja se desplaza verticalmente en el tiempo según una onda senoidal visible antes de que la franja llegue al ave.
- [ ] Cruzar una franja suma exactamente 1 punto.
- [ ] Cada 8 franjas superadas el nivel sube en 1 (hasta el tope 10), la velocidad de scroll aumenta y el hueco se achica, hasta los topes definidos.
- [ ] Chocar contra la parte sólida de una franja, el techo o el suelo dispara `onGameOver` exactamente una vez y abre el modal de fin con el puntaje final correcto.
- [ ] Pulsar "PAUSA" congela el ave, las franjas y su oscilación; "REANUDAR" continúa sin saltos.
- [ ] Guardar la puntuación persiste en Supabase con `game_id: "aleteo"` y aparece en `/salon` bajo "ALETEO".
- [ ] Navegar a `/juegos/serpentina/jugar` y a cualquier juego simulado restante sigue funcionando exactamente igual que antes de esta spec.
- [ ] `npm run lint` y `npm run build` terminan sin errores.

## Decisiones tomadas y descartadas

- **Empuje sostenido (aceleración mientras se mantiene presionado) en vez de impulso discreto.** Motivo (decisión del agente): explora un ángulo de física distinto a la variante 1 sin dejar de ser "un solo input" — el control se vuelve continuo (curva) en vez de puntual (salto), premiando la anticipación sobre el reflejo puro.
- **Gravedad `500px/s²`, empuje `-700px/s²` (neto `-200px/s²` sosteniendo), velocidad acotada `[-260, 500]px/s`.** Motivo (decisión del agente): valores más bajos que la variante 1 porque la física continua ya es más difícil de leer; una aceleración neta suave evita que el ave "vibre" entre techo y suelo al mantener presionado.
- **Hueco de cada franja con movimiento senoidal (amplitud `100px`, período `2.5s`, fase aleatoria).** Motivo (decisión del agente): reemplaza la tubería estática de la variante 1 por un obstáculo con estado propio en el tiempo, distinto tipo de obstáculo tal como pide el ángulo de exploración de esta variante.
- **Franjas horizontales en vez de tuberías verticales.** Motivo (decisión del agente): visualmente distingue esta variante de la 1 y encaja con la lectura de "un hueco que se mueve" — una franja completa (no dos piezas separadas) hace más legible dónde está el hueco en cada instante.
- **Dificultad por niveles discretos cada 8 franjas, con topes de velocidad y hueco.** Motivo (decisión del agente): cadencia más corta que la variante 1 (10) porque el obstáculo ya es más exigente por sí mismo; los topes evitan un juego imposible en partidas largas.
- **Sin sistema de vidas múltiples — un solo golpe termina la partida.** Motivo (decisión del agente): mismo criterio que la variante 1, consistencia dentro del mismo `game-id`.
- **Canvas 800×600 sin letterbox.** Motivo (decisión del agente): encaja exacto en el `aspect-ratio: 4/3` de `.crt-screen`.
- **Sin sprites — ave como círculo, franjas como rectángulos con hueco.** Motivo (decisión del agente): primitivas de canvas bastan y evitan el riesgo de assets binarios.

## Riesgos identificados

- **Curva de aprendizaje más alta que un tap discreto** — la física de empuje sostenido es menos intuitiva al primer contacto. Se mitiga con valores de aceleración conservadores (`-200px/s²` neto) y verificando manualmente que un jugador nuevo pueda cruzar al menos 2-3 franjas en su primer intento.
- **Cálculo de colisión contra una franja con hueco móvil requiere recomputar el rectángulo sólido cada frame según la fase actual de la onda**, más costoso que una tubería fija. Se mitiga limitando el cálculo a las franjas visibles en pantalla (nunca más de 3-4 simultáneas dado el intervalo de `340px`); se verifica con el frame rate estable durante una partida larga.
- **Fuga de listeners (`keydown`/`keyup`/`mousedown`/`mouseup`) o loop si `stop()` no se llama correctamente al desmontar.** Se mitiga con el cleanup del `useEffect` en `AleteoCanvas`, verificado manualmente navegando fuera de `/juegos/aleteo/jugar` durante una partida activa, incluyendo el caso de desmontar con el botón todavía presionado.

## Lo que **no** está en esta spec

- Las otras dos variantes de `aleteo` (`variante-1-impulso-clasico.md`, `variante-3-obstaculos-variados.md`) — son alternativas excluyentes, no complementos.
- Controles táctiles/móviles dedicados.
- Sonido o música.
- Cálculo dinámico de `best`/`plays`.
- Cambios a los demás juegos de la biblioteca.

Cada uno de estos, si se necesita, va en su propia spec futura.
