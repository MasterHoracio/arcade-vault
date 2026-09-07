# Game Jam · Mercado Nocturno — REGATEO · Variante 2 ("reflejo")

> **Estado:** Borrador
> **Depende de:** SPEC 01, SPEC 04, SPEC 06, SPEC 07
> **Fecha:** 2026-09-07
> **Objetivo:** Diseñar el motor de regateo por timing de un solo botón contra un vendedor rival, con una zona justa cada vez más angosta, integrado en `/juegos/regateo/jugar` sobre `lib/games/regateo/engine.ts`.

## Alcance

**Incluye:**

- Motor nuevo en `lib/games/regateo/engine.ts`, exportando `createRegateoGame(canvas, callbacks)`. Canvas interno `800×600` (4:3 exacto, sin letterbox, mismo criterio que Asteroides/Arkanoid/Serpentina).
- Concepto: cada ronda ofrece un ítem del mercado (farol, seda, especias, pescado o amuleto, elegido al azar, dibujado con primitivas de canvas — sin sprites) con un valor `V`, entero aleatorio entre `50` y `150 + (nivel-1) * 15`. Una barra horizontal representa el "ánimo del vendedor": un marcador oscila automáticamente de un extremo a otro siguiendo `posicion(t) = 50 + 50 * sin(t * ω)` en escala `0-100`, con `ω = 2.0 + 0.3 * (nivel-1)` rad/s (más rápido en niveles altos).
- Sobre la barra hay una **zona verde** ("precio justo") de ancho `30 - 2.5 * (nivel-1)` (mínimo `12`, en escala `0-100`), posicionada al azar en cada ronda (`inicioZona = randInt(0, 100 - ancho)`).
- El jugador tiene una ventana de `5s` por ronda para presionar `Espacio` una sola vez. Si el marcador está dentro de la zona verde en el instante de la pulsación: ronda ganada, `score += V`. Si está fuera de la zona, o si expira el tiempo sin pulsar: ronda perdida, `lives -= 1` (el vendedor "cierra el trato" con el rival).
- `3` vidas iniciales. Al llegar a `0` vidas: game over, `onGameOver(score)` se dispara exactamente una vez.
- Nivel: `level = min(8, floor(roundsPlayed / 4) + 1)`, donde `roundsPlayed` suma 1 tras cada ronda resuelta. Empieza en nivel 1.
- Controles: **un solo botón** (`Espacio`). Listener activo solo mientras el canvas está montado, removido al desmontar.
- `components/RegateoCanvas.tsx`: client component que monta `<canvas width={800} height={600}>` al 100%/100% dentro de `.crt-screen`, mismo patrón que `SerpentinaCanvas.tsx`. Expone `onStateChange({ score, lives, level })` tras cada frame y `onGameOver(finalScore)` una sola vez, exactamente al llegar a `0` vidas.
- `setPaused(true)` congela el loop (oscilación del marcador, timer de ronda) sin resetear estado; ningún timer avanza mientras está pausado.
- `.cover-regateo` en `app/globals.css`: gradiente diagonal azul-violeta muy oscuro evocando un mercado de noche, `::after` con `radial-gradient` repetido simulando faroles colgantes en `--yellow` con distintas opacidades, `::before` con un rombo pequeño en `--yellow` (una gema/moneda) representando el lote en negociación.
- Fila nueva en `games`: `id: "regateo"`, `title: "REGATEO"`, `short: "Regatea contra un rival vendedor por los últimos tesoros del mercado nocturno."`, `long: "Cada noche el mercado abre sus puestos por última vez antes del amanecer. Compite ronda a ronda contra un vendedor rival por el mismo lote de mercancía: farol, seda, especias, pescado y amuletos. Gana el regateo y súmalo a tu ganancia; piérdelo y se va con el rival."`, `cat: "VERSUS"`, `cover: "cover-regateo"`, `color: "yellow"`, `best: 0`, `plays: 0`.
- Entrada `regateo: { Canvas: RegateoCanvas }` en `GAME_REGISTRY` de `lib/games/registry.ts`.
- `.player-hud`: "Puntuación" muestra `hud.score`, "Vidas" muestra `♥` repetido `hud.lives` veces (o `—` en `0`), "Nivel" muestra `hud.level`, igual de simple que el resto del catálogo.

**No incluye:**

- Implementar esta variante descarta las otras dos (`variante-1-subasta.md`, `variante-3-memoria.md`): comparten el mismo `game-id` `regateo`, la misma fila en `games` y la misma clase `.cover-regateo` — son alternativas excluyentes, no capas que se combinan.
- Controles táctiles/móviles.
- Sonido o música.
- Cálculo dinámico de `best`/`plays` desde `scores` — quedan estáticos como en el resto del catálogo (SPEC 06).
- Sin cambios a los demás juegos de la biblioteca (`arkanoid`, `asteroides`, `frogger`, `serpentina`, `tetris`). Siguen exactamente igual.

## Modelo de datos

```ts
// lib/games/regateo/engine.ts
export interface RegateoHudState {
  score: number; // monedas ganadas, monótono, solo sube
  lives: number; // 3 al inicio, -1 por ronda perdida
  level: number; // 1-8, velocidad del marcador y ancho de la zona justa
}

export interface RegateoCallbacks {
  onStateChange: (state: RegateoHudState) => void;
  onGameOver: (finalScore: number) => void;
}

export function createRegateoGame(
  canvas: HTMLCanvasElement,
  callbacks: RegateoCallbacks,
): {
  start: () => void;
  stop: () => void;
  setPaused: (paused: boolean) => void;
};
```

`RegateoHudState` (`score`, `lives`, `level`) es estructuralmente compatible con `HudFields` de `lib/games/registry.ts` (`score`, `lives?`, `level`) sin adaptar el tipo. No se introduce persistencia nueva más allá de lo ya definido en SPEC 06 (`games`, `scores`).

## Plan de implementación

1. **Migración Supabase** — `insert into games (...)` con la fila `regateo` descrita en Alcance, vía `mcp__supabase__apply_migration`. Verificar con `select id, title, cat, color, cover from games where id = 'regateo'`.
2. **`.cover-regateo`** en `app/globals.css`, junto a las demás clases `.cover-*` (sección "Cover art generators"). Solo gradientes CSS y variables del tema (`--yellow`, `--ink`, `--ink-dim`).
3. **`lib/games/regateo/engine.ts`** — Implementar `createRegateoGame(canvas, callbacks)`: estado del closure (`itemActual: {tipo, valorReal}`, `tiempoRonda` acumulado (para calcular `posicion(t)`), `anchoZona`, `inicioZona`, `timerRestante`, `roundsPlayed`, `score`, `lives`, `level`, `gameState`). El loop (`requestAnimationFrame`, `dt` capado en `0.05`) avanza `tiempoRonda` y recalcula la posición del marcador con la fórmula seno de Alcance, descuenta `timerRestante`. El listener de `Espacio` (registrado en `start()`, removido en `stop()`) evalúa si `posicion` cae dentro de `[inicioZona, inicioZona + anchoZona]`: ronda ganada (`score += valorReal`) o perdida (`lives -= 1`); si `timerRestante` llega a `0` sin pulsación, ronda perdida igual. Tras resolver, `roundsPlayed++`, recalcula `level`, y tras una breve pausa visual (`~1.2s`, sin bloquear el loop) genera el siguiente ítem con nueva `inicioZona` aleatoria. Dispara `callbacks.onGameOver(score)` una sola vez, exactamente cuando `lives` llega a `0`. `callbacks.onStateChange({score, lives, level})` se llama al final de cada frame. `setPaused(true)` cancela el `requestAnimationFrame` sin resetear estado, incluidos `tiempoRonda` y `timerRestante`.
4. **`components/RegateoCanvas.tsx`** — Client component (`"use client"`) con `<canvas ref={canvasRef} width={800} height={600} style={{ width: "100%", height: "100%", display: "block" }} />`, mismo patrón que `SerpentinaCanvas.tsx`. Props: `{ paused: boolean; onStateChange: (s: RegateoHudState) => void; onGameOver: (score: number) => void }`. Un `useEffect` (deps `[]`) crea la instancia, la guarda en un ref y llama `.start()`; el cleanup llama `.stop()`. Un segundo `useEffect` (dep `[paused]`) llama `instance.setPaused(paused)`.
5. **`lib/games/registry.ts`** — Agregar la entrada `regateo: { Canvas: RegateoCanvas }` a `GAME_REGISTRY`. No se toca `PlayerClient.tsx` más allá de que ya lee del registro.
6. **Assets** — ninguno; el ítem del mercado, la barra y el marcador se dibujan con primitivas de canvas (círculo, rombo, triángulo, óvalo, rectángulos) y colores del tema, sin sprites ni imágenes.
7. **Verificación final** — `npm run lint` y `npm run build` sin errores. Jugar manualmente `/juegos/regateo/jugar`: observar el marcador oscilar de un lado a otro de la barra, presionar `Espacio` con el marcador dentro de la zona verde y confirmar que el puntaje sube exactamente en `V`, presionar `Espacio` con el marcador fuera de la zona y confirmar que se resta una vida sin cambiar el puntaje, dejar expirar el timer de una ronda sin presionar nada y confirmar que también resta una vida, jugar hasta nivel 2 (4 rondas) y notar que el marcador oscila más rápido y la zona verde se ve más angosta, perder las 3 vidas y confirmar que se abre automáticamente el modal de fin con el puntaje final correcto, pulsar "PAUSA" y confirmar que el marcador se congela en su posición exacta, "REANUDAR" continúa la oscilación sin saltos. Luego navegar a `/juegos/serpentina/jugar` y a `/juegos/tetris/jugar` y confirmar que ambos siguen funcionando exactamente igual que antes.

## Criterios de aceptación

- [ ] La tabla `games` en Supabase tiene una fila `id: "regateo"` con los valores descritos en Alcance.
- [ ] `.cover-regateo` existe en `app/globals.css` y se ve correctamente en la card de `/juegos` y en el detalle `/juegos/regateo`.
- [ ] `lib/games/regateo/engine.ts` exporta `createRegateoGame(canvas, callbacks)` con `start()`, `stop()` y `setPaused(paused)`.
- [ ] `components/RegateoCanvas.tsx` monta el canvas (800×600 sin distorsión) y llama `start()`/`stop()` correctamente en el ciclo de vida de React, sin dejar listeners activos tras desmontar.
- [ ] `lib/games/registry.ts` incluye la entrada `regateo: { Canvas: RegateoCanvas }`.
- [ ] En `/juegos/regateo/jugar`, el marcador oscila continuamente por la barra y `Espacio` es el único input; el `.player-hud` muestra Puntuación, Vidas y Nivel reales actualizándose en tiempo real.
- [ ] Presionar `Espacio` con el marcador dentro de la zona verde suma exactamente el valor real `V` del ítem al puntaje.
- [ ] Presionar `Espacio` fuera de la zona verde, o dejar expirar el timer de la ronda, resta exactamente 1 vida sin modificar el puntaje.
- [ ] Cada 4 rondas resueltas el nivel sube en 1 (hasta el tope 8), la velocidad de oscilación aumenta y la zona verde se achica, hasta el mínimo definido.
- [ ] Al llegar a 0 vidas se abre automáticamente el modal de fin de partida existente con el puntaje final correcto.
- [ ] Pulsar "PAUSA" congela el marcador en su posición exacta; "REANUDAR" continúa la oscilación sin saltos.
- [ ] Guardar la puntuación persiste en Supabase con `game_id: "regateo"` y aparece en `/salon` bajo "REGATEO".
- [ ] Navegar a `/juegos/serpentina/jugar` y a `/juegos/tetris/jugar` sigue funcionando exactamente igual que antes de esta spec.
- [ ] `npm run lint` y `npm run build` terminan sin errores.

## Decisiones tomadas y descartadas

- **Un solo botón (`Espacio`), sin ajuste continuo ni segunda tecla.** Motivo (decisión del agente): la mecánica central es el timing puro; agregar más controles diluiría la premisa y la distinguiría menos de la Variante 1 (subasta, que sí usa ajuste numérico).
- **Marcador oscilante con fórmula seno determinista (`ω` creciente por nivel) en vez de movimiento aleatorio.** Motivo (decisión del agente): un movimiento predecible permite que el jugador desarrolle ritmo y mejore con la práctica, en vez de depender de adivinar; la dificultad sube por velocidad, no por imprevisibilidad.
- **Zona verde de ancho decreciente (`30` → `12` en escala `0-100`) con piso mínimo.** Motivo (decisión del agente): el piso evita que el juego se vuelva imposible en niveles altos, mismo criterio de topes que Serpentina/Aleteo.
- **Fallar por tiempo (no presionar) también cuenta como ronda perdida, igual que presionar fuera de la zona.** Motivo (decisión del agente): evita la estrategia degenerada de "nunca presionar para no arriesgar"; el vendedor rival siempre se queda con el ítem si el jugador no actúa.
- **Rango de valor real `50` a `150 + (nivel-1) * 15`, idéntico al de la Variante 1.** Motivo (decisión del agente): mantiene la economía de puntaje comparable entre variantes del mismo `game-id`, aunque solo una se implemente.
- **3 vidas, el puntaje nunca baja (solo las rondas perdidas restan vidas).** Motivo (decisión del agente): mismo criterio que Serpentina/Arkanoid — no penalizar doblemente el progreso ya hecho, y mantener `score` monótono para `saveScore`.
- **Nivel sube cada 4 rondas resueltas, tope en nivel 8.** Motivo (decisión del agente): progresión predecible y fácil de comunicar en el HUD, con techo para que la partida no se vuelva imposible en sesiones largas.
- **Canvas 800×600 sin letterbox.** Motivo (decisión del agente): encaja exacto en el `aspect-ratio: 4/3` de `.crt-screen`, igual que Asteroides/Arkanoid/Serpentina.
- **Sin sprites — ítem, barra y marcador dibujados con primitivas geométricas de colores.** Motivo (decisión del agente): evita el riesgo de assets binarios; la lectura visual del timing no depende de detalle gráfico.

## Riesgos identificados

- **Frustración por una zona verde demasiado angosta en niveles altos.** Se mitiga con el piso mínimo de ancho `12` (nunca desaparece del todo) y con la oscilación determinista que permite anticipar el patrón; se verifica jugando hasta nivel 4-5 y confirmando que sigue siendo posible acertar con práctica, no solo con suerte.
- **Imprecisión de timing si el cálculo de `posicion(t)` depende de un contador de frames en vez de tiempo real (`dt` acumulado).** Se mitiga acumulando `tiempoRonda` en segundos reales vía `dt`, no en frames, para que la velocidad del marcador sea consistente sin importar el framerate; se verifica comparando el ritmo percibido en dos ejecuciones distintas.
- **Fuga de listeners o loop si `stop()` no se llama correctamente al desmontar.** Se mitiga con el cleanup del `useEffect` en `RegateoCanvas`, verificado manualmente navegando fuera de `/juegos/regateo/jugar` durante una partida activa.

## Lo que **no** está en esta spec

- Las otras dos variantes de `regateo` (`variante-1-subasta.md`, `variante-3-memoria.md`) — son alternativas excluyentes, no complementos.
- Controles táctiles/móviles.
- Sonido o música.
- Cálculo dinámico de `best`/`plays`.
- Cambios a los demás juegos de la biblioteca.

Cada uno de estos, si se necesita, va en su propia spec futura.
