# Contrato de skins

Documento de referencia para el agente `skin-designer` y para cualquiera que
agregue un skin a mano. Define los 5 puntos de cableado, las reglas de
contraste sobre el fondo oscuro de Arcade Vault, y la técnica para re-tintar
sprites. No lo reinventes por juego — lo que cambia entre juegos es la
paleta (`lib/games/<slug>/skins.ts`), nunca esta estructura.

## Los 3 skins

- **`clasico`** (default) — reproduce **exactamente** los colores actuales
  del juego, literal por literal. Si el jugador no elige nada, el juego se ve
  idéntico a como se veía antes de tener skins. Esto hace la migración
  verificable a simple vista: cualquier diferencia en `clasico` es un bug.
- **`neon`** — la paleta del sitio (`--cyan #00f5ff`, `--magenta #ff006e`,
  `--yellow #f5ff00`, `--green #00ff88`) sobre negro, con
  `ctx.shadowColor`/`ctx.shadowBlur` para el glow. Copia estos valores como
  literales en el `skins.ts` del juego — los engines no deben depender de
  `getComputedStyle` dentro del loop de dibujo (es lento y frágil si CSS
  cambia).
- **`retro`** — fósforo CRT monocromo: ámbar `#ffb000` o verde P1 `#33ff66`
  sobre `#0a0a0a`, diferenciando elementos por **brillo/luminancia**, no por
  matiz. Es el skin de mayor riesgo de perder información: si el juego
  distingue piezas/bloques solo por color (las 7 piezas de Tetris, las filas
  de bloques de Arkanoid), `retro` debe diferenciarlas por tono de luminancia
  dentro de la misma familia de color, y esa decisión debe quedar
  documentada en la entrada de `references/game-with-themes.md`.

## Reglas de modo oscuro (verificables, no opinión)

La app es dark-only: no hay modo claro ni `prefers-color-scheme`. "Verse
bien en modo oscuro" significa cumplir estas 5 reglas contra el fondo real
(`--bg: #0a0a0f`, `--bg-2: #0f0f18`, `--bg-3: #15151f`):

1. Ningún skin pinta un fondo de juego más claro que `#1a1a1a`; el fondo
   siempre queda por debajo de `--bg-3` en luminancia, o usa `clearRect`
   (como Tetris) para dejar ver el fondo del DOM.
2. Texto de overlay (GAME OVER, pausa, "Score:") ≥ 7:1 de contraste contra
   su fondo inmediato.
3. Elementos jugables (nave, serpiente, piezas, bloques, bola) ≥ 4.5:1
   contra el fondo del juego.
4. El glow (`shadowBlur`) nunca sustituye el contraste: si se quita el glow
   mentalmente, el elemento debe seguir cumpliendo la regla 3.
5. Nada de blanco puro (`#fff`) como fondo o superficie grande — el ojo del
   jugador viene del fondo `#0a0a0f` del sitio, un fondo blanco deslumbra.

Calcula el contraste con la fórmula WCAG estándar (luminancia relativa de
cada color, `(L1+0.05)/(L2+0.05)`) y repórtalo como número en la Fase 4 de la
auditoría — no como "se ve bien".

## Los 5 puntos de cableado

Un juego tiene sus 3 skins completos cuando cumple los 5:

1. **`lib/games/<slug>/skins.ts`** — exporta `<X>SKINS: Record<SkinId, <X>Palette>`
   con roles semánticos propios del juego (ej. Tetris necesita 8 colores de
   pieza; Asteroides necesita nave/bala/propulsor/power-up). No existe una
   paleta única compartida entre juegos porque los roles no coinciden.
2. **`lib/games/<slug>/engine.ts`** — `create<X>Game(canvas, callbacks, options?: { skin?: SkinId })`
   devuelve `{ start, stop, setPaused, setSkin }`. `setSkin(skin)` reasigna
   la paleta activa dentro del closure y fuerza un repintado inmediato;
   **nunca reinicia la partida** ni dispara `onGameOver`, igual que
   `setPaused`. En Tetris, `options` va después de `nextCanvas` y
   `callbacks`.
3. **`components/<X>Canvas.tsx`** — recibe la prop `skin: SkinId`, la pasa
   como `options.skin` al crear el juego, y agrega un tercer `useEffect` con
   dep `[skin]` que llama `gameRef.current?.setSkin(skin)` — espejo exacto
   del `useEffect` de `[paused]`.
4. **`lib/games/registry.ts`** — la entrada del juego en `GAME_REGISTRY`
   declara `skins: SkinId[]` con los skins que de verdad implementa hoy (no
   des por hecho `["clasico","neon","retro"]` si `neon`/`retro` no están
   listos).
5. **`references/game-with-themes.md`** — entrada del juego actualizada
   (Fase 5 del agente).

## Sprites: la parte difícil

Arkanoid (`spritesheet-breakout.png`) y Serpentina (`fruits.png`) llevan el
color dentro de PNGs, no en fills de canvas. Técnica obligatoria:

- Al cargar el spritesheet, generar **una copia re-tintada por skin** en un
  canvas offscreen — el patrón ya existe en
  `lib/games/arkanoid/engine.ts:176-188` (dibuja el PNG a un canvas
  offscreen antes de usarlo). Aplica `ctx.filter` (`hue-rotate`, `saturate`,
  `brightness`) sobre ese offscreen para producir las variantes `neon` y
  `retro`.
- Cachea las 3 variantes (los 3 canvas offscreen) una sola vez al cargar el
  asset. `setSkin` solo cambia **qué** canvas offscreen usa `drawImage` en
  el siguiente frame — nunca re-tiñas por frame.
- `clasico` usa el PNG original sin ningún filtro aplicado.

## Fuera de alcance

- No hay modo claro. No agregues `prefers-color-scheme` ni `data-theme`
  claro/oscuro — solo `data-skin` con el valor del skin activo.
- El skin no es un dato de Supabase: la columna `color` de `games` tiene un
  CHECK (`cyan|magenta|yellow|green`) que un 5º valor rompería. El skin vive
  enteramente en el cliente (`localStorage`, clave `av_skin`).
- No cambies mecánica, balance ni scoring al agregar un skin.
