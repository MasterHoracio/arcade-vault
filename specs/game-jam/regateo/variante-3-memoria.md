# Game Jam · Mercado Nocturno — REGATEO · Variante 3 ("memoria")

> **Estado:** Borrador
> **Depende de:** SPEC 01, SPEC 04, SPEC 06, SPEC 07
> **Fecha:** 2026-09-07
> **Objetivo:** Diseñar el motor de regateo por secuencias de memoria contra reloj frente a un vendedor rival, con longitud creciente por nivel, integrado en `/juegos/regateo/jugar` sobre `lib/games/regateo/engine.ts`.

## Alcance

**Incluye:**

- Motor nuevo en `lib/games/regateo/engine.ts`, exportando `createRegateoGame(canvas, callbacks)`. Canvas interno `800×600` (4:3 exacto, sin letterbox, mismo criterio que Asteroides/Arkanoid/Serpentina).
- Concepto: el regateo se cierra repitiendo la "seña" exacta del vendedor: una secuencia de gestos de mercado. Cada ronda ofrece un ítem (farol, seda, especias, pescado o amuleto, elegido al azar) con un valor `V`, entero aleatorio entre `50` y `150 + (nivel-1) * 15`.
- 4 símbolos posibles, cada uno con forma **y** color distintos (para no depender solo del color): farol = triángulo `--cyan` (tecla `↑`), moneda = círculo `--magenta` (tecla `↓`), pescado = óvalo `--green` (tecla `←`), especia = rombo `--yellow` (tecla `→`).
- Longitud de la secuencia: `len = level + 2` (nivel 1 → 3 símbolos, nivel 8 → 10 símbolos, tope). `level = min(8, floor(roundsPlayed / 2) + 1)`, donde `roundsPlayed` suma 1 tras cada ronda resuelta. Empieza en nivel 1.
- Fase de exhibición: al inicio de cada ronda se genera una secuencia aleatoria de `len` símbolos y se muestra en pantalla, resaltando un símbolo a la vez durante `500ms` con `150ms` de pausa entre símbolos — cadencia fija, no cambia con el nivel (solo la longitud cambia la dificultad, no la velocidad de exhibición).
- Fase de respuesta: termina la exhibición y arranca un cronómetro `rivalTime = max(1.5, 4.0 - 0.25 * (level-1))` segundos (4.0s en nivel 1, hasta 2.25s en nivel 8) — representa cuánto tarda el vendedor rival en cerrar el trato con otro comprador. El jugador debe reproducir la secuencia completa con `↑`/`↓`/`←`/`→`, en orden, dentro de esa ventana.
- Una tecla incorrecta en cualquier punto de la secuencia termina la ronda de inmediato como perdida (no espera a que expire el tiempo). Completar la secuencia entera correctamente dentro de `rivalTime`: ronda ganada, `score += V`. Expirar el tiempo sin completarla (incluso si lo llevado hasta ahora es correcto): ronda perdida.
- Ronda perdida (tecla incorrecta o tiempo agotado): `lives -= 1`. Ronda ganada: no cambia `lives`.
- `3` vidas iniciales. Al llegar a `0` vidas: game over, `onGameOver(score)` se dispara exactamente una vez.
- Controles: solo `↑`/`↓`/`←`/`→` (sin `Espacio`). Listeners activos solo mientras el canvas está montado, removidos al desmontar.
- `components/RegateoCanvas.tsx`: client component que monta `<canvas width={800} height={600}>` al 100%/100% dentro de `.crt-screen`, mismo patrón que `SerpentinaCanvas.tsx`. Expone `onStateChange({ score, lives, level })` tras cada frame y `onGameOver(finalScore)` una sola vez, exactamente al llegar a `0` vidas.
- `setPaused(true)` congela el loop (exhibición, cronómetro de respuesta) sin resetear estado; ningún timer avanza mientras está pausado.
- `.cover-regateo` en `app/globals.css`: gradiente diagonal azul-violeta muy oscuro evocando un mercado de noche, `::after` con `radial-gradient` repetido simulando faroles colgantes en `--yellow` con distintas opacidades, `::before` con un rombo pequeño en `--yellow` (una gema/moneda) representando el lote en negociación.
- Fila nueva en `games`: `id: "regateo"`, `title: "REGATEO"`, `short: "Regatea contra un rival vendedor por los últimos tesoros del mercado nocturno."`, `long: "Cada noche el mercado abre sus puestos por última vez antes del amanecer. Compite ronda a ronda contra un vendedor rival por el mismo lote de mercancía: farol, seda, especias, pescado y amuletos. Gana el regateo y súmalo a tu ganancia; piérdelo y se va con el rival."`, `cat: "VERSUS"`, `cover: "cover-regateo"`, `color: "yellow"`, `best: 0`, `plays: 0`.
- Entrada `regateo: { Canvas: RegateoCanvas }` en `GAME_REGISTRY` de `lib/games/registry.ts`.
- `.player-hud`: "Puntuación" muestra `hud.score`, "Vidas" muestra `♥` repetido `hud.lives` veces (o `—` en `0`), "Nivel" muestra `hud.level`, igual de simple que el resto del catálogo.

**No incluye:**

- Implementar esta variante descarta las otras dos (`variante-1-subasta.md`, `variante-2-reflejo.md`): comparten el mismo `game-id` `regateo`, la misma fila en `games` y la misma clase `.cover-regateo` — son alternativas excluyentes, no capas que se combinan.
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
  level: number; // 1-8, define la longitud de la secuencia y el tiempo de respuesta
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
2. **`.cover-regateo`** en `app/globals.css`, junto a las demás clases `.cover-*` (sección "Cover art generators"). Solo gradientes CSS y variables del tema (`--yellow`, `--cyan`, `--magenta`, `--green`, `--ink`).
3. **`lib/games/regateo/engine.ts`** — Implementar `createRegateoGame(canvas, callbacks)`: estado del closure (`itemActual: {tipo, valorReal}`, `secuencia: Simbolo[]`, `indiceExhibicion`, `indiceRespuesta`, `fase: "exhibiendo" | "esperando-input" | "resuelto"`, `cronometroExhibicion`, `cronometroRespuesta`, `roundsPlayed`, `score`, `lives`, `level`, `gameState`). El loop (`requestAnimationFrame`, `dt` capado en `0.05`) avanza `cronometroExhibicion` durante la fase de exhibición (resaltando un símbolo a la vez según la cadencia `500ms`/`150ms` de Alcance) y, al terminar, arranca `cronometroRespuesta` en `rivalTime`. El listener de `↑`/`↓`/`←`/`→` (registrado en `start()`, removido en `stop()`) solo actúa en `fase: "esperando-input"`: compara la tecla contra `secuencia[indiceRespuesta]`; si coincide, avanza `indiceRespuesta` (ronda ganada si llega al final antes de que expire `cronometroRespuesta`); si no coincide, ronda perdida de inmediato. Si `cronometroRespuesta` llega a `0` antes de completar la secuencia, ronda perdida. Tras resolver (`score += V` o `lives -= 1`), `roundsPlayed++`, recalcula `level`/`len`/`rivalTime`, y tras una breve pausa visual (`~1.2s`, sin bloquear el loop) genera la siguiente ronda con una secuencia nueva. Dispara `callbacks.onGameOver(score)` una sola vez, exactamente cuando `lives` llega a `0`. `callbacks.onStateChange({score, lives, level})` se llama al final de cada frame. `setPaused(true)` cancela el `requestAnimationFrame` sin resetear estado, incluidos ambos cronómetros.
4. **`components/RegateoCanvas.tsx`** — Client component (`"use client"`) con `<canvas ref={canvasRef} width={800} height={600} style={{ width: "100%", height: "100%", display: "block" }} />`, mismo patrón que `SerpentinaCanvas.tsx`. Props: `{ paused: boolean; onStateChange: (s: RegateoHudState) => void; onGameOver: (score: number) => void }`. Un `useEffect` (deps `[]`) crea la instancia, la guarda en un ref y llama `.start()`; el cleanup llama `.stop()`. Un segundo `useEffect` (dep `[paused]`) llama `instance.setPaused(paused)`.
5. **`lib/games/registry.ts`** — Agregar la entrada `regateo: { Canvas: RegateoCanvas }` a `GAME_REGISTRY`. No se toca `PlayerClient.tsx` más allá de que ya lee del registro.
6. **Assets** — ninguno; los 4 símbolos (triángulo, círculo, óvalo, rombo) y el ítem del mercado se dibujan con primitivas de canvas y colores del tema, sin sprites ni imágenes.
7. **Verificación final** — `npm run lint` y `npm run build` sin errores. Jugar manualmente `/juegos/regateo/jugar`: observar la exhibición de una secuencia de 3 símbolos en nivel 1, reproducirla correctamente con `↑`/`↓`/`←`/`→` dentro del tiempo y confirmar que el puntaje sube exactamente en `V`, fallar deliberadamente una tecla a mitad de secuencia y confirmar que la ronda termina de inmediato restando una vida sin esperar al cronómetro, dejar expirar el cronómetro de respuesta sin completar la secuencia y confirmar que también resta una vida, jugar hasta nivel 2 (2 rondas) y notar que la secuencia crece a 4 símbolos y el tiempo de respuesta se acorta, perder las 3 vidas y confirmar que se abre automáticamente el modal de fin con el puntaje final correcto, pulsar "PAUSA" durante la exhibición y confirmar que se congela a mitad de la animación, "REANUDAR" continúa sin saltos ni perder el progreso de la secuencia mostrada. Luego navegar a `/juegos/serpentina/jugar` y a `/juegos/tetris/jugar` y confirmar que ambos siguen funcionando exactamente igual que antes.

## Criterios de aceptación

- [ ] La tabla `games` en Supabase tiene una fila `id: "regateo"` con los valores descritos en Alcance.
- [ ] `.cover-regateo` existe en `app/globals.css` y se ve correctamente en la card de `/juegos` y en el detalle `/juegos/regateo`.
- [ ] `lib/games/regateo/engine.ts` exporta `createRegateoGame(canvas, callbacks)` con `start()`, `stop()` y `setPaused(paused)`.
- [ ] `components/RegateoCanvas.tsx` monta el canvas (800×600 sin distorsión) y llama `start()`/`stop()` correctamente en el ciclo de vida de React, sin dejar listeners activos tras desmontar.
- [ ] `lib/games/registry.ts` incluye la entrada `regateo: { Canvas: RegateoCanvas }`.
- [ ] En `/juegos/regateo/jugar`, cada ronda exhibe una secuencia de símbolos y solo `↑`/`↓`/`←`/`→` responden durante la fase de entrada; el `.player-hud` muestra Puntuación, Vidas y Nivel reales actualizándose en tiempo real.
- [ ] Reproducir la secuencia completa y correcta dentro del tiempo suma exactamente el valor real `V` del ítem al puntaje.
- [ ] Presionar una tecla incorrecta en cualquier punto de la secuencia termina la ronda de inmediato y resta exactamente 1 vida, sin esperar a que expire el cronómetro.
- [ ] Dejar expirar el cronómetro de respuesta sin completar la secuencia resta exactamente 1 vida.
- [ ] Cada 2 rondas resueltas el nivel sube en 1 (hasta el tope 8), la secuencia crece un símbolo y el tiempo de respuesta se acorta, hasta los topes definidos.
- [ ] Al llegar a 0 vidas se abre automáticamente el modal de fin de partida existente con el puntaje final correcto.
- [ ] Pulsar "PAUSA" congela la exhibición o el cronómetro de respuesta exactamente donde estaban; "REANUDAR" continúa sin saltos ni perder el progreso de la ronda en curso.
- [ ] Guardar la puntuación persiste en Supabase con `game_id: "regateo"` y aparece en `/salon` bajo "REGATEO".
- [ ] Navegar a `/juegos/serpentina/jugar` y a `/juegos/tetris/jugar` sigue funcionando exactamente igual que antes de esta spec.
- [ ] `npm run lint` y `npm run build` terminan sin errores.

## Decisiones tomadas y descartadas

- **4 símbolos con forma y color distintos, mapeados 1:1 a las 4 flechas.** Motivo (decisión del agente): reutiliza los controles ya estándar del catálogo (Serpentina/Frogger) y evita depender solo del color para diferenciar símbolos, más accesible para daltonismo.
- **Cadencia de exhibición fija (`500ms`/`150ms`), la dificultad sube solo por longitud de secuencia y tiempo de respuesta, no por velocidad de exhibición.** Motivo (decisión del agente): evita penalizar doblemente al jugador (memoria + percepción) en niveles altos; mantiene la exhibición siempre legible.
- **Longitud de secuencia `level + 2` (3 a 10 símbolos) y tiempo de respuesta decreciente (`4.0s` → `2.25s`).** Motivo (decisión del agente): dos ejes de dificultad independientes — más para recordar y menos tiempo para teclear — sin tocar la velocidad de exhibición.
- **Una tecla incorrecta termina la ronda de inmediato, no espera al cronómetro.** Motivo (decisión del agente): feedback inmediato es más claro que dejar correr el tiempo tras un error evidente, y simplifica la lógica del engine (no hay "recuperación" de una secuencia ya rota).
- **Nivel sube cada 2 rondas resueltas (más rápido que las otras dos variantes), tope en nivel 8.** Motivo (decisión del agente): las rondas de esta variante son más cortas en promedio que la subasta o el timing, así que una cadencia de nivel más rápida mantiene el ritmo de progresión comparable en tiempo real de juego.
- **Rango de valor real `50` a `150 + (nivel-1) * 15`, idéntico al de las otras dos variantes.** Motivo (decisión del agente): mantiene la economía de puntaje comparable entre variantes del mismo `game-id`, aunque solo una se implemente.
- **3 vidas, el puntaje nunca baja (solo las rondas perdidas restan vidas).** Motivo (decisión del agente): mismo criterio que Serpentina/Arkanoid — no penalizar doblemente el progreso ya hecho, y mantener `score` monótono para `saveScore`.
- **Canvas 800×600 sin letterbox.** Motivo (decisión del agente): encaja exacto en el `aspect-ratio: 4/3` de `.crt-screen`, igual que Asteroides/Arkanoid/Serpentina.
- **Sin sprites — símbolos e ítem dibujados con primitivas geométricas de colores.** Motivo (decisión del agente): evita el riesgo de assets binarios; 4 formas simples bastan para la lectura de la secuencia.

## Riesgos identificados

- **Ambigüedad de lectura si dos símbolos comparten silueta o color en condiciones de bajo contraste.** Se mitiga combinando forma **y** color distintos por símbolo (nunca solo uno de los dos) sobre el fondo oscuro `--ink`; se verifica manualmente exhibiendo secuencias con los 4 símbolos en sucesión y confirmando que cada uno se distingue sin ambigüedad.
- **Frustración por secuencias largas (nivel 7-8, 9-10 símbolos) con tiempo de respuesta corto.** Se mitiga con el piso de `1.5s` en `rivalTime` y con que la cadencia de exhibición no cambia (siempre legible); se verifica jugando hasta nivel 6-7 y confirmando que sigue siendo posible completar la secuencia con concentración, no imposible por diseño.
- **Fuga de listeners, timers o loop si `stop()` no se llama correctamente al desmontar, especialmente durante la fase de exhibición con animación en curso.** Se mitiga con el cleanup del `useEffect` en `RegateoCanvas`, verificado manualmente navegando fuera de `/juegos/regateo/jugar` a mitad de una exhibición.

## Lo que **no** está en esta spec

- Las otras dos variantes de `regateo` (`variante-1-subasta.md`, `variante-2-reflejo.md`) — son alternativas excluyentes, no complementos.
- Controles táctiles/móviles.
- Sonido o música.
- Cálculo dinámico de `best`/`plays`.
- Cambios a los demás juegos de la biblioteca.

Cada uno de estos, si se necesita, va en su propia spec futura.
