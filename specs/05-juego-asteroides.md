# 05 · Juego real — Asteroides ("ASTEROIDES")

**Estado:** Implementado
**Depende de:** SPEC 01
**Fecha:** 2026-08-28

**Objetivo:** Portar el juego de referencia `references/started-games/02-asteroids/game.js` a TypeScript e integrarlo como el motor real del Reproductor en `/juegos/asteroides/jugar`, sincronizando su HUD (puntaje, vidas, nivel) con el `.player-hud` de React existente y disparando el modal de fin de partida al perder las 3 vidas, sin tocar los demás juegos de la biblioteca (que siguen simulados).

## Alcance

**Incluye:**

- Puerto TypeScript de `game.js` a `lib/games/asteroids/engine.ts`, exportando `createAsteroidsGame(canvas, callbacks)`. Conserva íntegras las mismas clases y mecánicas del original: `Bullet`, `Asteroid` (tamaños 1/2/3 con split), `Ship` (rotación, propulsión, invencibilidad de reaparición), `Particle` (explosiones), `PowerUp` (disparo triple), envolvimiento toroidal (`wrap`), colisiones circulares, niveles progresivos (`spawnAsteroids(3 + level)`), puntuación (20/50/100 por tamaño) y el power-up de disparo triple con su drop garantizado/aleatorio, ícono pulsante e indicador de tiempo restante.
- `components/AsteroidsCanvas.tsx`: client component que monta un `<canvas>` (buffer interno 800×600, igual que el original) escalado por CSS al 100%/100% dentro de `.crt-screen` (ya `aspect-ratio: 4/3`, compatible sin distorsión). Arranca/detiene el loop del juego con `useEffect`, y expone hacia el padre `onStateChange({ score, lives, level, tripleShotRemaining })` (llamado tras cada `update()`) y `onGameOver(finalScore)` (llamado una sola vez al pasar a `state === 'gameover'`).
- `app/juegos/[id]/jugar/page.tsx`: cuando `game.id === "asteroides"`, renderiza `<AsteroidsCanvas>` dentro de `.crt-screen` en lugar de la `.game-arena` decorativa (divs de enemigos/nave falsos). El `.player-hud` existente (puntaje, vidas, nivel) se alimenta de los callbacks reales en vez del `setInterval` simulado, solo para este juego. El botón "PAUSA" llama a `setPaused` del canvas, que detiene el loop real (pausa agregada como capacidad nueva; el original no la tenía) y sigue mostrando el overlay "EN PAUSA" ya existente. Al recibir `onGameOver`, se dispara el mismo flujo actual: `setOver(true)` abre el modal de fin con el puntaje final real.
- Controles de teclado idénticos al original (`←`/`→` rotar, `↑` propulsar, `Espacio` disparar), activos solo mientras el canvas está montado; los listeners se remueven al desmontar o salir de la ruta.
- Las vidas, antes fijas en `useState(3)` sin bajar nunca, ahora reflejan el valor real del engine (pueden llegar a 0 y disparan el fin de partida).
- El nivel mostrado en el HUD deja de calcularse como `Math.floor(score / 2500) + 1` (simulado) y pasa a ser el valor real que expone el engine, que sube al limpiar cada oleada de asteroides.

**No incluye:**

- Controles táctiles/móviles. El juego queda solo-teclado en esta spec; soporte táctil se define en una spec futura si se necesita.
- Los otros 8 juegos de la biblioteca (`rocas`, `bloque-buster`, `caida`, `serpentina`, `gloton`, `invasores`, `ranaria`, `duelo-pixel`). Siguen con la simulación decorativa actual (`.game-arena`, `setInterval` de puntaje) sin ningún cambio; en particular `rocas` ("ROCAS") conserva su cover `.cover-rocas` y no se toca en absoluto.
- Guardado automático de puntuación al terminar. El jugador sigue escribiendo sus iniciales y pulsando "GUARDAR PUNTUACIÓN" en el modal existente, igual que hoy.
- Cambios al esquema de `av_scores` en `localStorage` o a `/salon`. Se agrega una entrada nueva `asteroides` en `lib/games.ts` (con su propio `cover: "cover-asteroides"`); no se reutiliza el `id` `rocas` existente, que queda intacto como juego simulado.
- Sonido o música. El `game.js` de referencia no tiene audio y esta spec no lo agrega.
- Ajustes de balance/dificultad respecto al original (velocidades, puntos por tamaño, probabilidad de drop del power-up, duración de invencibilidad). Se porta tal cual, sin retocar constantes.
- Botón "FIN" manual: se deja tal como está hoy (llama a `endGame()` directamente) como salida forzada opcional; no se elimina ni se le cambia comportamiento.

> Nota (2026-09-03): `duelo-pixel`, `gloton`, `invasores`, `ranaria` y
> `rocas` se eliminaron del catálogo; las menciones a ellos en esta spec
> son históricas.

## Modelo de datos

No se introduce persistencia nueva — `av_scores` se sigue usando exactamente igual (`{ game: "asteroides", score, name, at }`). Se agrega un tipo interno, no persistido, para el estado sincronizado entre el engine y el HUD de React:

```ts
// lib/games/asteroids/engine.ts
export interface AsteroidsHudState {
  score: number;
  lives: number;
  level: number;
  tripleShotRemaining: number; // segundos restantes del power-up 3x; 0 si está inactivo
}

export interface AsteroidsCallbacks {
  onStateChange: (state: AsteroidsHudState) => void;
  onGameOver: (finalScore: number) => void;
}

export function createAsteroidsGame(
  canvas: HTMLCanvasElement,
  callbacks: AsteroidsCallbacks,
): {
  start: () => void;
  stop: () => void;
  setPaused: (paused: boolean) => void;
};
```

## Plan de implementación

1. **`lib/games/asteroids/engine.ts`** — Portar `game.js` íntegro a TypeScript. Las clases (`Bullet`, `Asteroid`, `Ship`, `Particle`, `PowerUp`) y constantes (`RADII`, `SPEEDS`, `POINTS`, `POWERUP_*`, `TRIPLE_SPREAD`) se mantienen igual. El estado module-level del original (`ship`, `bullets`, `asteroids`, `score`, `lives`, `level`, `state`, etc.) se encapsula dentro del closure de `createAsteroidsGame`, que recibe el `canvas` (obtiene su propio `ctx`) y los `callbacks`. `update(dt)` invoca `callbacks.onStateChange({ score, lives, level, tripleShotRemaining: ship.tripleShot })` al final de cada frame; `killShip()` invoca `callbacks.onGameOver(score)` una sola vez, exactamente cuando `lives <= 0` pasa a `state = 'gameover'` (no en frames subsiguientes). Los listeners de teclado (`keydown`/`keyup`) se registran en `start()` y se remueven en `stop()`. `setPaused(true)` detiene el `requestAnimationFrame` sin resetear el estado del juego (los timers como `invincible`/`shootCooldown`/`tripleShot` simplemente no avanzan mientras no se llama `update`); `setPaused(false)` reanuda el loop. El sistema sigue compilando (build pasa) aunque nada lo use todavía.
2. **`components/AsteroidsCanvas.tsx`** — Client component (`"use client"`) con `<canvas ref={canvasRef} width={800} height={600} style={{ width: "100%", height: "100%", display: "block" }} />`, encajando en `.crt-screen` (ya `aspect-ratio: 4/3`, mismo ratio que 800×600). Props: `{ paused: boolean; onStateChange: (s: AsteroidsHudState) => void; onGameOver: (score: number) => void }`. Un `useEffect` (deps `[]`) llama `createAsteroidsGame(canvasRef.current, { onStateChange, onGameOver })`, guarda la instancia y llama `.start()`; el cleanup llama `.stop()`. Un segundo `useEffect` (dep `[paused]`) llama `instance.setPaused(paused)`.
3. **`app/juegos/[id]/jugar/page.tsx`** — Agregar estado `const [hud, setHud] = useState<AsteroidsHudState>({ score: 0, lives: 3, level: 1, tripleShotRemaining: 0 })` usado solo cuando `game.id === "asteroides"`. Renderizado condicional dentro de `.crt-screen`: si `game.id === "asteroides"`, `<AsteroidsCanvas paused={paused} onStateChange={setHud} onGameOver={(finalScore) => { setScore(finalScore); endGame(); }} />` en vez de `.game-arena`; para cualquier otro `id`, se deja el bloque `.game-arena` decorativo exactamente como está hoy (sin cambios). El `.player-hud` (Puntuación, Vidas, Nivel) lee de `hud.score`/`hud.lives`/`hud.level` cuando `game.id === "asteroides"`, y sigue leyendo de los `score`/`lives`/`level` simulados actuales para el resto de juegos. El `useEffect` del `setInterval` de puntaje simulado se condiciona a `game.id !== "asteroides"` (para `asteroides` el puntaje ya no se simula). El indicador visual del power-up 3x (si se agrega al HUD genérico) usa `hud.tripleShotRemaining`.
4. **Verificación de guardado** — `handleSaveScore` no cambia: sigue usando `game.id` y el `score` de React (que para `asteroides` ahora es `hud.score` mientras se juega y el `finalScore` real al terminar).
5. **Verificación final** — `npm run lint` y `npm run build` sin errores. Jugar manualmente `/juegos/asteroides/jugar`: mover/rotar/propulsar/disparar con teclado, destruir asteroides grandes→medianos→pequeños viendo el puntaje del HUD de React subir en tiempo real, ver aparecer y recoger el power-up 3x (ícono cian pulsante e indicador en el HUD), pulsar "PAUSA" y confirmar que el juego se congela con el overlay "EN PAUSA" visible, "REANUDAR" continúa donde quedó, perder las 3 vidas y confirmar que se abre automáticamente el modal de fin con el puntaje final correcto, guardar la puntuación con iniciales y confirmar el toast y que aparece en `/salon` bajo "ASTEROIDES". Luego navegar a `/juegos/caida/jugar` (u otro juego) y confirmar que la simulación decorativa sigue funcionando exactamente igual que antes.

## Criterios de aceptación

- [ ] `lib/games/asteroids/engine.ts` exporta `createAsteroidsGame(canvas, callbacks)` con `start()`, `stop()` y `setPaused(paused)`, portando íntegras las mecánicas de `game.js` (nave, asteroides con split, balas, partículas, power-up de disparo triple, envolvimiento toroidal, niveles, invencibilidad de reaparición).
- [ ] `components/AsteroidsCanvas.tsx` monta el canvas (800×600 interno, escalado por CSS al contenedor) y llama `start()`/`stop()` correctamente en el ciclo de vida de React, sin dejar listeners de teclado activos tras desmontar.
- [ ] En `/juegos/asteroides/jugar`, el juego responde a `←`/`→`/`↑`/`Espacio` y el `.player-hud` de React muestra puntaje, vidas y nivel reales, actualizándose en tiempo real mientras se juega.
- [ ] Destruir asteroides otorga los puntos correctos por tamaño (20/50/100) y los asteroides grandes/medianos se dividen en fragmentos más pequeños al ser destruidos.
- [ ] El power-up de disparo triple aparece, se puede recoger, y mientras está activo el disparo sale en abanico de 3 balas; el HUD refleja el tiempo restante.
- [ ] Pulsar "PAUSA" detiene el juego (congela nave, asteroides y balas) y muestra el overlay "EN PAUSA"; "REANUDAR" continúa la partida sin perder el estado.
- [ ] Al perder las 3 vidas, se abre automáticamente el modal de fin de partida existente con el puntaje final correcto, sin necesidad de pulsar "FIN".
- [ ] Guardar la puntuación desde el modal persiste en `localStorage` bajo `av_scores` con `game: "asteroides"` y aparece correctamente en `/salon`.
- [ ] Navegar a cualquier otro juego de la biblioteca (`/juegos/caida/jugar`, etc.) sigue mostrando la simulación decorativa actual sin cambios de comportamiento.
- [ ] `npm run lint` y `npm run build` terminan sin errores.

## Decisiones tomadas y descartadas

- **HUD de React se mantiene y se sincroniza vía callbacks, en vez de que el canvas dibuje su propio HUD.** Motivo (decisión del usuario): mantiene consistencia visual con el resto del Reproductor (mismo `.player-hud` para todos los juegos), en vez de mezclar un HUD dibujado en canvas con uno en HTML.
- **El fin de partida se dispara automáticamente al llegar a 0 vidas, no solo por el botón "FIN" manual.** Motivo (decisión del usuario): es el comportamiento esperado de un juego real; el botón "FIN" se conserva como salida forzada opcional, sin quitarlo.
- **Se agrega pausa real deteniendo el loop, aunque el `game.js` original no la tiene.** Motivo (decisión del usuario): el Reproductor ya tiene el botón "PAUSA" y el overlay correspondiente; no implementarlo dejaría un botón roto. Al no llamar `update(dt)` mientras está pausado, ningún timer interno (invencibilidad, cooldown de disparo, duración del power-up) avanza, evitando desincronización.
- **Código portado en `lib/games/asteroids/engine.ts` + `components/AsteroidsCanvas.tsx`, no inline en la página.** Motivo (decisión del usuario): sigue la convención ya usada en el proyecto (`lib/` para lógica de datos/dominio, componentes reutilizables en `components/`), y dejará espacio ordenado para portar más juegos en specs futuras.
- **Se agrega `asteroides` como entrada nueva en `lib/games.ts` (con cover propio `.cover-asteroides`) en vez de reutilizar el `id` `rocas`; los otros 8 juegos (incluido `rocas`) quedan con la simulación decorativa intacta.** Motivo: `rocas` ("ROCAS") ya existía en el catálogo como juego simulado antes de esta spec; el motor real portado es un juego distinto y merece su propia identidad/ruta en vez de sustituir un juego existente.
- **Controles táctiles fuera de alcance.** Motivo (decisión del usuario): el original es solo teclado; agregar soporte táctil es trabajo adicional para una spec futura si se decide dar soporte móvil.
- **Power-up de disparo triple portado completo, sin recortes.** Motivo (decisión del usuario): es parte del comportamiento ya validado del juego de referencia, no agrega ambigüedad ni requiere decisiones de diseño nuevas.
- **Canvas con buffer interno fijo 800×600, escalado por CSS al 100% del contenedor.** Motivo: `.crt-screen` ya tiene `aspect-ratio: 4/3` (idéntico a 800:600), por lo que escalar por CSS no distorsiona el juego; evita reescribir la lógica de coordenadas del original, que asume `W=800`/`H=600` fijos.

## Riesgos identificados

- **Fuga de listeners o loops si `stop()` no se llama correctamente al desmontar/navegar.** Se mitiga con el cleanup del `useEffect` en `AsteroidsCanvas` llamando siempre `stop()`, verificado manualmente navegando fuera de `/juegos/asteroides/jugar` durante una partida activa y confirmando que no sigue consumiendo CPU (loop detenido).
- **Pausa introducida no existe en el juego original.** Aunque congelar `update(dt)` es la forma más simple y segura de pausar sin tocar la lógica interna, vale la pena confirmar en la verificación manual que reanudar no produce saltos bruscos (p. ej. un asteroide que "teletransporta" por un `dt` acumulado) — no se acumula `dt` mientras está pausado, así que no debería ocurrir, pero es el punto más nuevo respecto al original.
