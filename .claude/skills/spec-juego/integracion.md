# Patrón de integración de un juego en Arcade Vault

Referencia para `/spec-juego`. Describe, con archivos y líneas reales del proyecto (según el estado en que se escribió esta guía — verifica que sigan vigentes antes de citarlos en una spec), los 6 puntos que hay que tocar para que un juego nuevo quede jugable, tenga cover y aparezca en el leaderboard. No es texto para copiar en la spec tal cual — es el mapa del que la spec deriva su plan de implementación con rutas concretas.

Un juego nuevo debería nacer con sus 3 skins (`clasico`/`neon`/`retro`) ya
resueltos en vez de necesitar una pasada posterior de `skin-designer` — ver
la nota de skins dentro del punto 3 y `references/skins-contract.md`.

## Los 6 puntos de cableado

1. **Fila en la tabla `games` de Supabase**, vía `mcp__supabase__apply_migration`. Columnas = la interfaz `Game` de `lib/games.ts:6` (`id`, `title`, `short`, `long`, `cat`, `cover`, `color`, `best`, `plays`). `cat` ∈ `ARCADE`/`PUZZLE`/`SHOOTER`/`VERSUS`, `color` ∈ `cyan`/`magenta`/`yellow`/`green` (mismos `check` constraints que las columnas existentes).

2. **`.cover-<slug>`** en `app/globals.css`, dentro de la sección `/* ===== Cover art generators (pure CSS) ===== */` (arranca alrededor de la línea 664). Patrón de las clases existentes (`.cover-bricks`, `.cover-tetro`, `.cover-asteroides`, etc.):
   - `background` con gradientes (nunca imágenes).
   - `::after` opcional para una capa de "sprites" (`repeating-linear-gradient`/`radial-gradient`).
   - `::before` opcional para un elemento focal único (un glifo, un triángulo CSS de nave, etc. — ver `.cover-asteroides::before`).
   - Solo las variables de color del tema: `--cyan`, `--magenta`, `--yellow`, `--green`, `--ink`, `--ink-dim`, `--ink-faint`, `--line`, `--line-2`.
   - El valor de la columna `cover` en Supabase es el nombre de esta clase (ej. `"cover-asteroides"`); `GameCard` y el detalle la concatenan después de `cover-bg `.

3. **`lib/games/<slug>/engine.ts`** — factory closure que exporta `create<X>Game(canvas, callbacks, options?: { skin?: SkinId }): { start, stop, setPaused, setSkin }`, más las interfaces `<X>HudState` (mínimo `score`, `lives`, `level`, más los campos extra que decida la Fase 2 de la skill) y `<X>Callbacks` (`onStateChange`, `onGameOver`). Modelo a copiar: `lib/games/asteroids/engine.ts`, con este orden interno:
   - Input (`keys`, `justPressed`, `onKeyDown`/`onKeyUp`, `pressed(code)`).
   - Utilidades (`wrap`, `dist`, `rand`, `randInt`, etc.).
   - Constantes del juego (velocidades, puntos, duraciones).
   - Clases del dominio (una por tipo de entidad).
   - Estado del juego dentro del closure (nunca module-level, para permitir múltiples instancias).
   - `update(dt)` — llama `callbacks.onStateChange(...)` al final de cada frame.
   - `draw()`.
   - Loop con `requestAnimationFrame`, `dt` capado (0.05 en Asteroides) para evitar saltos tras un tab en background.
   - `start()` — registra listeners de teclado, inicializa estado, arranca el loop.
   - `stop()` — cancela el loop, remueve listeners.
   - `setPaused(paused)` — cancela/reanuda el `requestAnimationFrame` sin resetear estado; ningún timer interno avanza mientras está pausado porque `update(dt)` no se llama.
   - `onGameOver` se invoca **una sola vez**, exactamente en la transición a estado de derrota — nunca en frames subsiguientes.
   - **Skins** — la paleta vive aparte, en `lib/games/<slug>/skins.ts` (`<X>SKINS: Record<SkinId, <X>Palette>`), nunca como literales sueltos en el engine. `draw()` lee la paleta activa; `setSkin(skin)` la reasigna y repinta sin resetear el estado. Ver `references/skins-contract.md` para los 3 skins y las reglas de contraste sobre el fondo oscuro.

4. **`components/<X>Canvas.tsx`** — client component (`"use client"`), forma idéntica a `components/AsteroidsCanvas.tsx`:
   - Un `useEffect` con deps `[]` que llama `create<X>Game(canvasRef.current, { onStateChange, onGameOver }, { skin })`, guarda la instancia en un ref, llama `.start()`; el cleanup llama `.stop()`.
   - Un segundo `useEffect` con dep `[paused]` que llama `instance.setPaused(paused)`.
   - Un tercer `useEffect` con dep `[skin]` que llama `instance.setSkin(skin)`.
   - `<canvas ref={canvasRef} width={W} height={H} style={{ ... }} />` — ver la sección de letterbox abajo para el `style` cuando `W:H` no es 4:3.

5. **Cableado en `components/PlayerClient.tsx`.** Ver "El refactor a registro" abajo — es el punto que cambia según si ya existe `lib/games/registry.ts` o no.

6. **Nada que tocar en rutas ni leaderboard.** `app/juegos/[id]/page.tsx`, `app/salon/page.tsx`, y las server actions `registerPlay`/`saveScore` de `app/actions/games.ts` ya son genéricas sobre `game.id` — no requieren cambios para un juego nuevo.

## El refactor a registro de juegos

Estado actual (después de la spec de Asteroides): `PlayerClient.tsx` ramifica por `game.id === "asteroides"` en cuatro sitios — la constante `isAsteroides`, el guard del `setInterval` de puntaje decorativo, y los tres ternarios del HUD (`score`/`lives`/`level`). Ese patrón no escala a un segundo juego real sin duplicar condicionales.

**Cuando la spec es la primera después de Asteroides** (el `grep` del contexto de sesión de `spec-juego` no encuentra `registry`), el plan de implementación debe incluir crear `lib/games/registry.ts`:

```ts
export interface GameRegistryEntry {
  Canvas: React.ComponentType<{
    paused: boolean;
    skin: SkinId;
    onStateChange: (state: HudState) => void; // HudState = unión o forma común mínima
    onGameOver: (finalScore: number) => void;
  }>;
  skins: SkinId[]; // skins que este juego implementa de verdad hoy
}

export const GAME_REGISTRY: Record<string, GameRegistryEntry> = {
  asteroides: { Canvas: AsteroidsCanvas, skins: ["clasico", "neon", "retro"] },
  // <slug>: { Canvas: <X>Canvas, skins: [...] },
};
```

`PlayerClient.tsx` pasa de `isAsteroides ? <AsteroidsCanvas .../> : <div className="game-arena">...` a: buscar `GAME_REGISTRY[game.id]`; si existe, renderizar su `Canvas` y leer el HUD real; si no, el `.game-arena` decorativo actual sin ningún cambio de comportamiento para los 8 juegos simulados restantes.

**Cuando la spec es posterior** (el registro ya existe), el plan de implementación se reduce a agregar una línea al `Record` — no se repite el refactor.

## Variaciones conocidas

Basado en lo observado en `references/started-games/` (02-asteroids ya portado, 03-tetris y 04-arkanoid pendientes a la fecha de esta guía):

- **Canvas que no es 4:3** (ej. el `#board` de Tetris es 300×600, relación 1:2). `.crt-screen` tiene `aspect-ratio: 4/3` fijo — no se cambia. El canvas del juego se ajusta con letterbox centrado en vez de estirarse:

  ```css
  height: 100%;
  width: auto;
  margin: 0 auto;
  display: block;
  ```

  Esto preserva la relación de aspecto original sin distorsionar sprites ni hitboxes, dejando franjas negras a los lados (el fondo de `.crt-screen` ya es `#000`).

- **Segundo canvas o HUD fuera del canvas** (ej. Tetris tiene `#next-canvas` 120×120 para la pieza siguiente, y elementos DOM `#score`/`#lines`/`#level`/`#overlay` en su HTML original). En el port a React:
  - Los contadores (`lines`, etc.) suben al `.player-hud` existente vía el mismo mecanismo que `tripleShotRemaining` en Asteroides — un campo más en `<X>HudState`.
  - El overlay de fin de partida del original **no se porta** — se reusa el `.modal-bd`/`.modal` que ya dispara `onGameOver`.
  - Un segundo canvas pequeño (pieza siguiente) sí puede vivir dentro de `<X>Canvas.tsx` como parte del mismo componente, si el usuario decide mantenerlo.

- **Assets binarios** (ej. Arkanoid trae `assets/spritesheet-breakout.png` y dos `.mp3`, más `levels.js` con la definición de niveles). Si la spec decide incluirlos:
  - Copiar a `public/juegos/<slug>/` y cargarlos por ruta absoluta (`/juegos/<slug>/spritesheet-breakout.png`).
  - `levels.js` se porta como `lib/games/<slug>/levels.ts`, tipado (`export const LEVELS: LevelDef[] = [...]`), en vez de quedar como script global.
  - Si la spec decide dejar sonido fuera de alcance (como hizo la spec de Asteroides con "Sonido o música... no se agrega"), decláralo explícitamente en "No incluye".
