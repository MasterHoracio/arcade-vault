# 10 · Controles táctiles para dispositivos móviles

> **Estado:** Aprobado
> **Depende de:** SPEC 05, SPEC 07, SPEC 08, SPEC 09
> **Fecha:** 2026-09-03
> **Objetivo:** Agregar un d-pad y botones de acción táctiles al Reproductor, visibles por debajo de los 768px de ancho, que permitan jugar arkanoid, asteroides, serpentina y tetris por completo en pantalla táctil sin tocar el código interno de los 4 engines.

## Alcance

**Incluye:**

- Un componente nuevo `components/TouchControls.tsx` genérico, parametrizado por una configuración de controles (d-pad de 2 o 4 direcciones + lista de botones de acción), reutilizado por los 4 juegos con datos distintos.
- Los botones táctiles (d-pad y de acción) despachan `KeyboardEvent`s sintéticos (`document.dispatchEvent(new KeyboardEvent("keydown"/"keyup", { code, key, bubbles: true }))`) con el mismo `code`/`key` que ya escucha cada engine — **no se modifica ningún archivo `lib/games/<slug>/engine.ts`**. Se despacha sobre `document` y no sobre `window` porque `tetris` escucha `keydown` en `document` mientras los otros 3 engines lo hacen en `window`; como el evento hace bubble, despacharlo en `document` llega también a los listeners de `window`, cubriendo ambos casos sin tocar ningún engine. Se usan Pointer Events (`pointerdown`, `pointerup`, `pointercancel`, `pointerleave`) con `touch-action: none` en cada botón, cada uno rastreando su propio `pointerId`, de forma que mantener presionado un botón mientras se toca otro (ej. `←` + `DISPARAR` en asteroides) funciona correctamente. Se llama `event.preventDefault()` en los handlers para evitar scroll, zoom y el disparo fantasma de eventos de mouse/click sintéticos del navegador.
- Pad **fijo de 6 slots** (`up`/`down`/`left`/`right`/`a`/`b`), idéntico en layout para los 4 juegos — se lee como un control físico de consola. Configuración por juego agregada a `lib/games/registry.ts` como un nuevo campo `touchControls` en `GameRegistryEntry`, que solo declara qué slots están activos y a qué `code`/`key` mapean; un slot ausente en la config se renderiza igual (mismo layout) pero **deshabilitado**: opaco, con el atributo `disabled` y sin efecto sobre el juego.
  - `arkanoid`: `left`/`right` + `a` (`Space`, lanzar). `up`, `down`, `b` deshabilitados.
  - `asteroides`: `left`/`right` (rotar) + `up` (avanzar, `ArrowUp`) + `a` (disparar, `Space`). `down`, `b` deshabilitados.
  - `serpentina`: `up`/`down`/`left`/`right`. `a`, `b` deshabilitados (no tiene botones de acción).
  - `tetris`: `left`/`right` + `up` (rotar, `ArrowUp`) + `down` (soft drop, `ArrowDown`) + `a` (hard drop, `Space`). `b` deshabilitado.
  - Los botones de acción usan siempre las etiquetas genéricas `A` y `B` (no texto descriptivo por juego).
- `components/PlayerClient.tsx` renderiza `<TouchControls config={entry.touchControls} />` (solo cuando `entry` existe, es decir, para los 4 juegos reales) como bloque hermano **fuera** del `<div className="crt">`, inmediatamente después de él, sin modificar el layout del HUD superior ni del modal de fin de partida.
- Visibilidad: los controles táctiles están ocultos por defecto y se muestran vía `@media (max-width: 768px)` en `app/globals.css` (misma convención `max-width` ya usada en el resto de la hoja de estilos). Por encima de ese ancho, el layout se comporta exactamente igual que hoy.
- Estilo visual: botones con la estética pixel/arcade ya existente, coherente con los tokens del sitio (`--cyan` para el d-pad, `--magenta` para `A`, `--yellow` para `B`), bordes duros y sin bordes redondeados grandes.

**No incluye (para specs futuras):**

- Detección por tipo de puntero (`pointer: coarse`) — se usa únicamente ancho de viewport (breakpoint 768px), decisión tomada explícitamente.
- Joystick virtual analógico o control por gestos/swipe sobre el canvas — se descartó a favor de d-pad + botones.
- Vibración háptica (`navigator.vibrate`) al presionar botones.
- Reconfiguración de botones por el usuario (remapeo de controles).
- Modo horizontal forzado (`orientation: landscape`) ni bloqueo de orientación — los juegos se juegan en el layout que ya tienen, sea cual sea la orientación del dispositivo.
- Cambios a los 3 juegos simulados restantes de la biblioteca que no tienen engine real (los que no están en `GAME_REGISTRY`) — sin `entry`, no se renderizan controles táctiles, igual que hoy no tienen HUD real.
- Ajustes de balance/dificultad de los juegos para jugar en pantallas chicas (tamaño de sprites, velocidad). Se juega el mismo engine sin cambios.

## Modelo de datos

```ts
// lib/games/registry.ts
export type TouchSlot = "up" | "down" | "left" | "right" | "a" | "b";

export interface TouchKeyBinding {
  code: string; // KeyboardEvent.code despachado, ej. "Space"
  key: string; // KeyboardEvent.key despachado, ej. " "
}

// Slot ausente = botón renderizado (mismo layout siempre) pero deshabilitado.
export type TouchControlsConfig = Partial<Record<TouchSlot, TouchKeyBinding>>;

export interface GameRegistryEntry {
  Canvas: React.ComponentType<{/* sin cambios */}>;
  skins: SkinId[];
  touchControls: TouchControlsConfig; // nuevo campo, obligatorio para los 4 juegos ya registrados
}
```

```ts
// components/TouchControls.tsx
export interface TouchControlsProps {
  config: TouchControlsConfig;
}
```

No se introduce persistencia nueva ni cambios a `games`/`scores` en Supabase.

## Plan de implementación

1. **`lib/games/registry.ts`** — Agregar los tipos `TouchSlot`, `TouchKeyBinding`, `TouchControlsConfig` (slots fijos, parcial), el campo `touchControls` a `GameRegistryEntry`, y la configuración concreta de cada uno de los 4 juegos descrita en Alcance. El build sigue pasando (el campo no se usa todavía).
2. **`components/TouchControls.tsx`** — Client component que recibe `config: TouchControlsConfig` y renderiza **siempre** los 6 slots (d-pad en cruz + `A`/`B`), sin condicionales por juego. Un slot con binding usa `onPointerDown`/`onPointerUp`/`onPointerCancel`/`onPointerLeave` para despachar `keydown`/`keyup` sintéticos con el `code`/`key` configurados, `style={{ touchAction: "none" }}` y `preventDefault()` en cada handler; un slot sin binding se renderiza `disabled` (opaco, sin handlers). Componente puro, sin conocer nada de ningún engine específico. Manual: renderizarlo suelto en cualquier página y confirmar en devtools que aparecen los eventos de teclado solo al tocar los botones habilitados.
3. **Estilos en `app/globals.css`** — Clases para `.touch-controls` (bloque fuera del CRT, oculto por defecto, `display: none`), `.touch-dpad` (grid en cruz), `.touch-btn`, `.touch-btn--off` (estado deshabilitado: opacidad reducida, sin color de acento), y la regla `@media (max-width: 768px) { .touch-controls { display: flex; } }`. Reutiliza los tokens de color y bordes ya existentes (`--cyan`, `--magenta`, `--yellow`, `--ink-faint`).
4. **`components/PlayerClient.tsx`** — Renderizar `<TouchControls config={entry.touchControls} />` como hermano inmediatamente después del bloque `.crt` (fuera de la ventana del juego), solo cuando `entry` existe. Sin cambios al resto del componente.
5. **Verificación final** — `npm run lint` y `npm run build` sin errores. Con las devtools en modo responsive (o un dispositivo real) por debajo de 768px de ancho: jugar `/juegos/arkanoid/jugar` moviendo la paleta y lanzando la bola solo con controles táctiles; jugar `/juegos/asteroides/jugar` rotando, avanzando y disparando solo con táctil, incluyendo mantener rotación y disparo a la vez; jugar `/juegos/serpentina/jugar` cambiando de dirección con el d-pad de 4 vías sin invertir 180°; jugar `/juegos/tetris/jugar` moviendo, rotando, soft-drop y hard-drop solo con táctil. Confirmar que por encima de 768px los controles táctiles no aparecen y el teclado sigue funcionando igual que antes en los 4 juegos.

## Criterios de aceptación

- [ ] `lib/games/registry.ts` exporta `TouchControlsConfig` (slots fijos `up`/`down`/`left`/`right`/`a`/`b`) y cada entrada de `GAME_REGISTRY` (arkanoid, asteroides, serpentina, tetris) tiene un campo `touchControls` con el mapeo descrito en Alcance.
- [ ] `components/TouchControls.tsx` existe, no importa ni conoce ningún `engine.ts`, renderiza siempre los 6 slots (mismo layout en los 4 juegos) y despacha `KeyboardEvent`s sintéticos vía Pointer Events solo desde los slots con binding.
- [ ] Ningún archivo `lib/games/<slug>/engine.ts` fue modificado por esta spec.
- [ ] El pad táctil se renderiza fuera del bloque `.crt` (debajo de la ventana del juego), no dentro de `.crt-screen`/`.crt-bottom`.
- [ ] Por debajo de 768px de ancho de viewport, `/juegos/arkanoid/jugar` muestra el pad completo con `left`/`right`/`a` habilitados y `up`/`down`/`b` deshabilitados (opacos, sin efecto); el juego responde a `left`/`right`/`a`.
- [ ] Por debajo de 768px, `/juegos/asteroides/jugar` muestra `left`/`right`/`up`/`a` habilitados y `down`/`b` deshabilitados; mantener presionado rotar y disparar a la vez funciona sin que soltar uno cancele el otro.
- [ ] Por debajo de 768px, `/juegos/serpentina/jugar` muestra `up`/`down`/`left`/`right` habilitados y `a`/`b` deshabilitados; la serpiente responde a las 4 direcciones sin poder invertir 180° sobre su propio cuello.
- [ ] Por debajo de 768px, `/juegos/tetris/jugar` muestra `left`/`right`/`up`/`down`/`a` habilitados y `b` deshabilitado, y cada botón habilitado produce el movimiento correspondiente.
- [ ] Un botón deshabilitado no dispara ningún `KeyboardEvent` al tocarlo.
- [ ] Por encima de 768px de ancho, los controles táctiles no son visibles en ninguno de los 4 juegos y el control por teclado sigue funcionando exactamente igual que antes de esta spec.
- [ ] Tocar un botón táctil no dispara scroll, zoom, selección de texto ni un evento de click fantasma duplicado.
- [ ] `npm run lint` y `npm run build` terminan sin errores.

## Decisiones tomadas y descartadas

- **Los 4 juegos con engine real (arkanoid, asteroides, serpentina, tetris) se cubren en una sola spec, en vez de dividir por juego.** Motivo (decisión del usuario): el patrón de solución (d-pad + botones que despachan eventos de teclado sintéticos) es el mismo componente reutilizado para los 4, así que separarlo en 4 specs sería repetir la misma decisión de arquitectura cuatro veces.
- **Eventos de teclado sintéticos despachados por un componente táctil genérico, en vez de una API nueva por engine (`pressLeft()`, `shoot()`, etc.).** Motivo (decisión del usuario): cero cambios en los 4 `engine.ts` ya probados y aprobados en sus specs respectivas; el riesgo aceptado es que el técnica depende de que los engines sigan escuchando por `key`/`code` tal como hoy (documentado en Riesgos).
- **D-pad + botones de acción fijos, en vez de joystick virtual o gestos/swipe.** Motivo (decisión del usuario): más simple de implementar y de usar con precisión en juegos de reacción rápida (arkanoid, tetris) donde un joystick analógico no aporta nada sobre un d-pad digital.
- **Detección por ancho de viewport (`@media (max-width: 768px)`), no por tipo de puntero (`pointer: coarse`).** Motivo (decisión del usuario): consistente con la convención `max-width` ya usada en toda la hoja de estilos del proyecto; un breakpoint de 768px es el estándar de tablet/mobile.
- **Franja fija de controles debajo de `.crt-screen`, no superpuestos sobre el canvas.** Motivo (decisión del usuario): evita que el dedo tape el juego mientras se juega, a costa de algo de espacio vertical extra en la pantalla.
- **Pointer Events con `touch-action: none` y `preventDefault`, con rastreo de `pointerId` por botón para soportar multi-touch real.** Motivo: necesario para juegos donde se combinan dos acciones a la vez (rotar + disparar en asteroides); Touch Events o Mouse Events por separado duplicarían lógica y no cubren bien el caso de mantener presionado.
- **Sin remapeo de botones, sin joystick, sin vibración háptica, sin bloqueo de orientación.** Motivo (decisión del usuario): fuera de alcance para esta primera versión de controles táctiles; se evalúan en specs futuras si hacen falta.

## Riesgos identificados

- **Los engines dejan de escuchar `keydown`/`keyup` global tal como hoy (ej. si una spec futura los refactoriza a usar solo `KeyboardEvent.key` en vez de `.code`, o a leer estado por otro medio).** El componente táctil quedaría desincronizado silenciosamente. Se mitiga verificando manualmente cada uno de los 4 juegos en el paso 5 del plan; cualquier cambio futuro a un engine debe repasar esta spec.
- **Eventos de teclado sintéticos y reales simultáneos (ej. tablet con teclado bluetooth conectado) podrían pisarse si el usuario suelta la tecla física mientras el botón táctil sigue "presionado" lógicamente, o viceversa.** Caso de borde poco común; no se mitiga en esta spec — cada fuente de input maneja su propio estado `keydown`/`keyup` de forma independiente dentro del engine, así que el peor caso es una dirección que se queda "pegada" hasta soltar ambas fuentes.
- **Multi-touch con más de dos dedos en pantallas chicas puede generar botones vecinos presionados por error.** Se mitiga con suficiente padding entre botones en el CSS; se verifica a ojo en el paso 5, no hay criterio automatizado para esto.

## Lo que **no** está en esta spec

- Detección por `pointer: coarse` (se usa solo ancho de viewport).
- Joystick virtual o controles por gestos/swipe.
- Vibración háptica.
- Remapeo de controles por el usuario.
- Bloqueo o sugerencia de orientación horizontal.
- Cambios a los juegos simulados sin engine real.
- Ajustes de balance/dificultad para pantallas chicas.

Cada uno de estos, si se necesita, va en su propia spec futura.
