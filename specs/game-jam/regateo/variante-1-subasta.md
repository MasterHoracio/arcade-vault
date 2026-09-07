# Game Jam · Mercado Nocturno — REGATEO · Variante 1 ("subasta")

> **Estado:** Borrador
> **Depende de:** SPEC 01, SPEC 04, SPEC 06, SPEC 07
> **Fecha:** 2026-09-07
> **Objetivo:** Diseñar el motor de subasta por rondas contra un vendedor rival, con puja numérica y riesgo de sobreofertar, integrado en `/juegos/regateo/jugar` sobre `lib/games/regateo/engine.ts`.

## Alcance

**Incluye:**

- Motor nuevo en `lib/games/regateo/engine.ts`, exportando `createRegateoGame(canvas, callbacks)`. Canvas interno `800×600` (4:3 exacto, sin letterbox, mismo criterio que Asteroides/Arkanoid/Serpentina).
- Concepto: el mercado nocturno saca a subasta un lote de mercancía por ronda (farol, seda, especias, pescado o amuleto, elegido al azar, dibujado con primitivas de canvas — círculo, rombo, triángulo, óvalo — sin sprites). Cada ítem tiene un **valor real oculto** `V`, un entero aleatorio entre `50` y `150 + (nivel-1) * 15` (crece con el nivel: `50-150` en nivel 1, hasta `50-255` en nivel 8).
- Fase de puja: el jugador ajusta su oferta con `↑` (+10) / `↓` (-10), acotada entre `0` y `300`, arrancando cada ronda en `100`. Tiene una ventana de `6s` (`bidTimeLimit`) para decidir; `Espacio` fija la oferta de inmediato, o se fija automáticamente al valor actual cuando el timer llega a `0`.
- El rival CPU fija su propia oferta dentro de la misma ventana: `ofertaRival = round(V * factor)`, con `factor` uniforme en `[1 - riesgo, 1 + riesgo]`, `riesgo = max(0.05, 0.25 - (nivel-1) * 0.025)` — en nivel 1 el rival puede desviarse hasta 25% del valor real; en nivel 8 solo hasta 7.5%, cada vez más certero y difícil de superar.
- Resolución: se revela `V`. El **límite justo** es `V * 1.3`; cualquier oferta que lo supere queda descalificada (se penaliza sobreofertar, no premia pujar sin límite). Entre las ofertas no descalificadas, gana la más alta (empate favorece al jugador). Si ambas ofertas quedan descalificadas, la ronda es nula: no cambia el puntaje ni las vidas, pasa a la siguiente ronda.
- El jugador gana la ronda: `score += V` (entero, monótono, nunca baja). El jugador pierde la ronda (rival gana, o el jugador queda descalificado mientras el rival es válido): `lives -= 1`.
- `3` vidas iniciales. Al llegar a `0` vidas: game over, `onGameOver(score)` se dispara exactamente una vez.
- Nivel: `level = min(8, floor(roundsPlayed / 4) + 1)`, donde `roundsPlayed` suma 1 tras cada ronda resuelta (incluidas las nulas). Empieza en nivel 1.
- Controles: `↑`/`↓` ajustan la oferta, `Espacio` la fija. Listeners activos solo mientras el canvas está montado, removidos al desmontar.
- `components/RegateoCanvas.tsx`: client component que monta `<canvas width={800} height={600}>` al 100%/100% dentro de `.crt-screen`, mismo patrón que `SerpentinaCanvas.tsx`. Expone `onStateChange({ score, lives, level })` tras cada frame y `onGameOver(finalScore)` una sola vez, exactamente al llegar a `0` vidas.
- `setPaused(true)` congela el loop (timer de ronda, animaciones) sin resetear estado; ningún timer avanza mientras está pausado.
- `.cover-regateo` en `app/globals.css`: gradiente diagonal azul-violeta muy oscuro evocando un mercado de noche, `::after` con `radial-gradient` repetido simulando faroles colgantes en `--yellow` con distintas opacidades, `::before` con un rombo pequeño en `--yellow` (una gema/moneda) representando el lote en subasta.
- Fila nueva en `games`: `id: "regateo"`, `title: "REGATEO"`, `short: "Regatea contra un rival vendedor por los últimos tesoros del mercado nocturno."`, `long: "Cada noche el mercado abre sus puestos por última vez antes del amanecer. Compite ronda a ronda contra un vendedor rival por el mismo lote de mercancía: farol, seda, especias, pescado y amuletos. Gana el regateo y súmalo a tu ganancia; piérdelo y se va con el rival."`, `cat: "VERSUS"`, `cover: "cover-regateo"`, `color: "yellow"`, `best: 0`, `plays: 0`.
- Entrada `regateo: { Canvas: RegateoCanvas }` en `GAME_REGISTRY` de `lib/games/registry.ts`.
- `.player-hud`: "Puntuación" muestra `hud.score`, "Vidas" muestra `♥` repetido `hud.lives` veces (o `—` en `0`), "Nivel" muestra `hud.level`, igual de simple que el resto del catálogo.

**No incluye:**

- Implementar esta variante descarta las otras dos (`variante-2-reflejo.md`, `variante-3-memoria.md`): comparten el mismo `game-id` `regateo`, la misma fila en `games` y la misma clase `.cover-regateo` — son alternativas excluyentes, no capas que se combinan.
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
  level: number; // 1-8, dificultad del rival y rango de valor
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
3. **`lib/games/regateo/engine.ts`** — Implementar `createRegateoGame(canvas, callbacks)`: estado del closure (`itemActual: {tipo, valorReal}`, `ofertaJugador`, `ofertaRival`, `fase: "pujando" | "revelando" | "siguiente"`, `timerRonda`, `roundsPlayed`, `score`, `lives`, `level`, `gameState`). El loop (`requestAnimationFrame`, `dt` capado en `0.05`) descuenta `timerRonda`; al llegar a `0` o al recibir `Espacio`, fija `ofertaJugador` (si no se fijó antes) y `ofertaRival` (calculado con el `factor` aleatorio descrito en Alcance), pasa a `fase: "revelando"`, resuelve el ganador según el límite justo `valorReal * 1.3`, actualiza `score`/`lives`/`roundsPlayed`/`level`, y tras una breve pausa visual (`~1.5s`, sin bloquear el loop) genera el siguiente ítem y reinicia `ofertaJugador = 100`. Dispara `callbacks.onGameOver(score)` una sola vez, exactamente cuando `lives` llega a `0`. Los listeners de `↑`/`↓`/`Espacio` se registran en `start()` y se remueven en `stop()`. `callbacks.onStateChange({score, lives, level})` se llama al final de cada frame. `setPaused(true)` cancela el `requestAnimationFrame` sin resetear estado, incluido `timerRonda`.
4. **`components/RegateoCanvas.tsx`** — Client component (`"use client"`) con `<canvas ref={canvasRef} width={800} height={600} style={{ width: "100%", height: "100%", display: "block" }} />`, mismo patrón que `SerpentinaCanvas.tsx`. Props: `{ paused: boolean; onStateChange: (s: RegateoHudState) => void; onGameOver: (score: number) => void }`. Un `useEffect` (deps `[]`) crea la instancia, la guarda en un ref y llama `.start()`; el cleanup llama `.stop()`. Un segundo `useEffect` (dep `[paused]`) llama `instance.setPaused(paused)`.
5. **`lib/games/registry.ts`** — Agregar la entrada `regateo: { Canvas: RegateoCanvas }` a `GAME_REGISTRY`. No se toca `PlayerClient.tsx` más allá de que ya lee del registro.
6. **Assets** — ninguno; los 5 tipos de mercancía y el medidor de oferta se dibujan con primitivas de canvas (círculo, rombo, triángulo, óvalo, rectángulos) y colores del tema, sin sprites ni imágenes.
7. **Verificación final** — `npm run lint` y `npm run build` sin errores. Jugar manualmente `/juegos/regateo/jugar`: ajustar la oferta con `↑`/`↓` y confirmar que se acota entre `0` y `300`, fijarla con `Espacio` antes de que expire el timer, dejar que el timer llegue a `0` sin presionar nada y confirmar que la oferta se fija sola, ganar una ronda y ver el puntaje subir exactamente en `V`, perder una ronda y ver una vida menos sin que el puntaje baje, sobreofertar deliberadamente (oferta > `V * 1.3`) y confirmar que la ronda se pierde aunque el rival haya ofertado menos, jugar hasta nivel 2 (4 rondas) y notar que el rival oferta más cerca del valor real, perder las 3 vidas y confirmar que se abre automáticamente el modal de fin con el puntaje final correcto, pulsar "PAUSA" y confirmar que el timer de ronda se congela, "REANUDAR" continúa sin saltos. Luego navegar a `/juegos/serpentina/jugar` y a `/juegos/tetris/jugar` y confirmar que ambos siguen funcionando exactamente igual que antes.

## Criterios de aceptación

- [ ] La tabla `games` en Supabase tiene una fila `id: "regateo"` con los valores descritos en Alcance.
- [ ] `.cover-regateo` existe en `app/globals.css` y se ve correctamente en la card de `/juegos` y en el detalle `/juegos/regateo`.
- [ ] `lib/games/regateo/engine.ts` exporta `createRegateoGame(canvas, callbacks)` con `start()`, `stop()` y `setPaused(paused)`.
- [ ] `components/RegateoCanvas.tsx` monta el canvas (800×600 sin distorsión) y llama `start()`/`stop()` correctamente en el ciclo de vida de React, sin dejar listeners activos tras desmontar.
- [ ] `lib/games/registry.ts` incluye la entrada `regateo: { Canvas: RegateoCanvas }`.
- [ ] En `/juegos/regateo/jugar`, `↑`/`↓` ajustan la oferta entre `0` y `300`, `Espacio` la fija, y el `.player-hud` muestra Puntuación, Vidas y Nivel reales actualizándose en tiempo real.
- [ ] Ganar una ronda suma exactamente el valor real `V` del ítem al puntaje; perder una ronda resta exactamente 1 vida sin modificar el puntaje.
- [ ] Ofertar por encima de `V * 1.3` descalifica la oferta y pierde la ronda aunque el rival haya ofertado un valor menor.
- [ ] Cada 4 rondas resueltas el nivel sube en 1 (hasta el tope 8) y el rival oferta con menor desviación respecto al valor real.
- [ ] Al llegar a 0 vidas se abre automáticamente el modal de fin de partida existente con el puntaje final correcto.
- [ ] Pulsar "PAUSA" congela el timer de ronda y toda animación; "REANUDAR" continúa sin saltos.
- [ ] Guardar la puntuación persiste en Supabase con `game_id: "regateo"` y aparece en `/salon` bajo "REGATEO".
- [ ] Navegar a `/juegos/serpentina/jugar` y a `/juegos/tetris/jugar` sigue funcionando exactamente igual que antes de esta spec.
- [ ] `npm run lint` y `npm run build` terminan sin errores.

## Decisiones tomadas y descartadas

- **Puja numérica con riesgo de sobreoferta (límite justo `V * 1.3`), en vez de "el más alto siempre gana".** Motivo (decisión del agente): sin un techo, la estrategia óptima trivial sería ofertar el máximo permitido siempre; el límite obliga a razonar sobre el valor probable del ítem, dándole profundidad a la mecánica.
- **Ventana de decisión de 6 segundos con auto-fijado al expirar.** Motivo (decisión del agente): mantiene el ritmo arcade — sin límite de tiempo, el jugador podría quedarse indefinidamente en una ronda; el auto-fijado evita un softlock si el jugador no interactúa.
- **Rango de valor real `50` a `150 + (nivel-1) * 15`, creciente con el nivel.** Motivo (decisión del agente): valores más altos y variables en niveles avanzados suben el riesgo/recompensa de cada ronda sin cambiar la mecánica base.
- **Rival con `riesgo` decreciente por nivel (`0.25` → `0.075`).** Motivo (decisión del agente): progresión de dificultad legible — el rival pasa de errático a casi óptimo, forzando ofertas cada vez más precisas del jugador.
- **3 vidas, el puntaje nunca baja (solo las rondas perdidas restan vidas).** Motivo (decisión del agente): mismo criterio que Serpentina/Arkanoid — no penalizar doblemente el progreso ya hecho, y mantener `score` monótono para `saveScore`.
- **Nivel sube cada 4 rondas resueltas (ganadas o perdidas), tope en nivel 8.** Motivo (decisión del agente): progresión predecible y fácil de comunicar en el HUD, con techo para que la partida no se vuelva imposible en sesiones largas.
- **Canvas 800×600 sin letterbox.** Motivo (decisión del agente): encaja exacto en el `aspect-ratio: 4/3` de `.crt-screen`, igual que Asteroides/Arkanoid/Serpentina.
- **Sin sprites — mercancía dibujada con primitivas geométricas de colores.** Motivo (decisión del agente): 5 formas simples (círculo, rombo, triángulo, óvalo) bastan para distinguir los ítems y evitan el riesgo de assets binarios.
- **Solo `↑`/`↓`/`Espacio`, sin mouse ni drag.** Motivo (decisión del agente): consistente con el resto del catálogo (todo por teclado), y evita la complejidad de un control de arrastre continuo.

## Riesgos identificados

- **Percepción de injusticia por rachas de mala suerte en el valor real aleatorio.** Se mitiga con el rango relativamente angosto (`50-150` en nivel 1) y el límite justo generoso (`V * 1.3`, no `V` exacto), dando margen de error; se verifica jugando varias rondas seguidas y confirmando que ganar no depende de acertar el valor exacto.
- **Balance del rival demasiado fácil o demasiado difícil según el `factor` aleatorio elegido.** Se mitiga con el rango de `riesgo` progresivo documentado arriba; se verifica jugando hasta nivel 3-4 y confirmando que la dificultad se siente gradual, no un salto abrupto.
- **Fuga de listeners o loop si `stop()` no se llama correctamente al desmontar.** Se mitiga con el cleanup del `useEffect` en `RegateoCanvas`, verificado manualmente navegando fuera de `/juegos/regateo/jugar` durante una partida activa.

## Lo que **no** está en esta spec

- Las otras dos variantes de `regateo` (`variante-2-reflejo.md`, `variante-3-memoria.md`) — son alternativas excluyentes, no complementos.
- Controles táctiles/móviles.
- Sonido o música.
- Cálculo dinámico de `best`/`plays`.
- Cambios a los demás juegos de la biblioteca.

Cada uno de estos, si se necesita, va en su propia spec futura.
