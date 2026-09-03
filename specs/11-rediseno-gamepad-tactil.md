# SPEC 11 — Rediseño visual del gamepad táctil (estética MK-II)

> **Estado:** Aprobado
> **Depende de:** SPEC 10
> **Fecha:** 2026-09-03
> **Objetivo:** Retematizar visualmente el `TouchControls` ya implementado en SPEC 10 (carcasa, d-pad en cruz con flechas SVG y hub central, botones A/B circulares con glow) siguiendo el mockup de referencia en `references/gamepad-assets/`, sin cambiar comportamiento, breakpoint, layout general ni el mapeo de teclas por juego.

## Alcance

**Incluye:**

- Retematizar el markup de `components/TouchControls.tsx`:
  - El d-pad pasa de 4 glifos de texto sueltos (`▲◀▶▼`) a 4 botones cuadrados con icono de flecha en SVG (triángulo, igual construcción que `references/gamepad-assets/gamepad.html`), dispuestos en cruz, más un elemento decorativo central ("hub") con una gema pulsante — puramente visual, sin `data-key`/handlers propios.
  - Los botones `A`/`B` pasan a círculos con letra en fuente `--pixel` (`"Press Start 2P"`, ya cargada por el sitio vía `next/font` o `<link>` existente — se reutiliza, no se agrega una fuente nueva) y anillo de glow, en vez de los rectángulos con esquinas cortadas (`clip-path`) actuales.
  - Se agrega un contenedor "carcasa" (`.touch-controls`) con borde, radio de esquina, sombra y textura sutil de puntos, envolviendo el d-pad y los botones A/B, replicando el marco `.gp` del mockup.
- Retematizar `app/globals.css` en la sección de controles táctiles (`.touch-controls`, `.touch-dpad`, `.touch-btn`, `.touch-action-btn`, `.touch-btn--off` y las reglas nuevas que se agreguen) para lograr el look del mockup: carcasa con `border-radius`, `box-shadow` con glow cian, textura de puntos de fondo; d-pad con botones cuadrados de esquinas redondeadas con "profundidad" (sombra dura inferior tipo botón físico) que se hunden al presionar (`transform: translateY(...)`); botones A/B circulares con gradiente radial, anillo punteado que aparece al presionar, y glow de color por botón.
- Color de `B`: cambia de `--yellow` a `--cyan` para calzar con el mockup (A se mantiene `--magenta`, D-pad se mantiene `--cyan`).
- El estado deshabilitado (slot sin binding, `touch-btn--off`) se mantiene funcionalmente igual (`disabled`, sin handlers, sin `KeyboardEvent`) pero se re-expresa visualmente sobre el nuevo estilo: opaco, sin glow, sin sombra de profundidad, color apagado (`--ink-faint`), consistente en el d-pad y en A/B.
- Ajustar tamaños/paddings/gaps del d-pad y los botones A/B para que la carcasa se vea proporcionada dentro de la franja `.touch-controls` existente (debajo del `.crt`), sin necesidad de agrandar esa franja más allá de lo que ya ocupa hoy.
- Verificación visual manual en los 4 juegos (`arkanoid`, `asteroides`, `serpentina`, `tetris`) en viewport móvil, confirmando que el nuevo estilo no rompe la interacción ya validada en SPEC 10.

**No incluye (para specs futuras):**

- Cambios al breakpoint (`@media (max-width: 768px)`, definido en SPEC 10) ni a la detección por `pointer: coarse`.
- Cambios al layout general del pad: sigue siendo d-pad a la izquierda, A/B a la derecha, franja fija fuera del `.crt`, debajo de la ventana del juego. No se reordena ni se centra.
- Cambios a `lib/games/registry.ts` (tipos `TouchSlot`/`TouchKeyBinding`/`TouchControlsConfig`, mapeo de teclas por juego) — el contrato de props de `TouchControlsProps` no cambia.
- Cambios a la lógica de despacho de `KeyboardEvent`s sintéticos, Pointer Events, `pointerId` tracking o `preventDefault` — se reutiliza tal cual de SPEC 10.
- Cambios a ningún `lib/games/<slug>/engine.ts`.
- Vibración háptica, remapeo de botones, joystick virtual, bloqueo de orientación — igual que en SPEC 10, siguen fuera de alcance.
- Animaciones adicionales no presentes en el mockup (ej. la gema del hub central puede pulsar con la misma animación CSS de `references/gamepad-assets/gamepad.html`, pero no se agregan efectos nuevos no vistos ahí).

## Modelo de datos

Esta spec no introduce ni cambia estructuras de datos. Reutiliza `TouchControlsConfig`, `TouchSlot` y `TouchKeyBinding` de `lib/games/registry.ts` (SPEC 10) sin modificarlos, y la prop `TouchControlsProps` de `components/TouchControls.tsx` se mantiene idéntica (`{ config: TouchControlsConfig }`).

## Plan de implementación

1. **`components/TouchControls.tsx` — d-pad con SVG y hub.** Reemplazar los glifos de texto del d-pad (`▲◀▶▼`) por un `<svg>` de triángulo por dirección (mismo patrón que `dp-arrow` en `references/gamepad-assets/gamepad.html`, rotado/orientado según la dirección), y agregar un `<div>` decorativo de hub central con la gema (sin `data-key`, `aria-hidden`). El componente sigue recibiendo `config` y renderizando siempre los 6 slots; los slots deshabilitados siguen usando `disabled`/`aria-disabled`. Manual: renderizar en `/juegos/arkanoid/jugar` en modo responsive y confirmar que las flechas SVG se ven y los botones siguen respondiendo igual que antes.
2. **`components/TouchControls.tsx` — botones A/B circulares.** Envolver cada botón de acción con la estructura necesaria para el anillo de glow (`<span>` decorativo tipo `ab-ring` del mockup) alrededor de la letra, manteniendo el mismo `<button>` y los mismos handlers de Pointer Events. Manual: confirmar que A/B siguen despachando `keydown`/`keyup` al presionar (revisar en devtools) sin cambios de comportamiento.
3. **`components/TouchControls.tsx` — carcasa.** Envolver el `<div className="touch-controls">` existente con la estructura necesaria para el marco (o aplicar los estilos directamente sobre ese mismo div, lo que resulte más simple sin duplicar contenedores) para lograr el borde/radio/sombra de `.gp` del mockup.
4. **`app/globals.css` — restyle de `.touch-controls`, `.touch-dpad`, `.touch-btn`, `.touch-action-btn`, `.touch-btn--off`.** Ajustar/agregar reglas para: carcasa con `border-radius`, `box-shadow` de glow cian, textura de puntos de fondo (`radial-gradient` de puntos, como `.gp::after` del mockup); d-pad cuadrado con sombra de profundidad y hundimiento al presionar; hub central con gema pulsante (`@keyframes`); botones A/B circulares con gradiente radial y anillo de glow; estado `--off` re-expresado sobre el nuevo estilo (opaco, sin sombra, sin glow). Cambiar el color de `B` de `--yellow` a `--cyan` en `.touch-action-b`. Reutilizar `--cyan`, `--magenta`, `--pixel`, `--ink-faint` ya existentes — no se agregan variables de color nuevas. Manual: revisar visualmente en devtools responsive los 4 juegos por debajo de 768px.
5. **Verificación final.** `npm run lint` y `npm run build` sin errores. En devtools modo responsive (o dispositivo real) por debajo de 768px: confirmar que `/juegos/arkanoid/jugar`, `/juegos/asteroides/jugar`, `/juegos/serpentina/jugar` y `/juegos/tetris/jugar` muestran el nuevo gamepad con el look del mockup, que los slots deshabilitados de cada juego (los mismos que en SPEC 10) se ven apagados sin glow, que presionar cada botón habilitado sigue moviendo/disparando en el juego correspondiente, y que por encima de 768px el pad sigue sin ser visible.

## Criterios de aceptación

- [ ] El d-pad de `TouchControls` renderiza 4 botones cuadrados con icono de flecha SVG (no glifos de texto) y un hub central decorativo con gema, dispuestos en cruz.
- [ ] Los botones `A` y `B` son circulares, con la letra en fuente `--pixel` y un anillo de glow visible al presionar.
- [ ] `B` usa `--cyan` (ya no `--yellow`) como color de acento; `A` sigue en `--magenta`; el d-pad sigue en `--cyan`.
- [ ] El bloque `.touch-controls` tiene una carcasa visual (borde, radio de esquina, sombra) que envuelve el d-pad y los botones A/B, replicando el marco del mockup de `references/gamepad-assets/`.
- [ ] Un slot sin binding (deshabilitado) se sigue renderizando `disabled`/`aria-disabled`, sin `KeyboardEvent` al tocarlo, y se ve visualmente apagado (sin glow, sin sombra de profundidad, color atenuado) sobre el nuevo estilo.
- [ ] El layout general no cambia: d-pad a la izquierda, A/B a la derecha, franja fija debajo del `.crt`, visible solo por debajo de 768px de ancho (`@media (max-width: 768px)` sin modificar).
- [ ] `lib/games/registry.ts` no fue modificado por esta spec (mismo `TouchControlsConfig`, mismo mapeo de teclas por juego).
- [ ] Ningún archivo `lib/games/<slug>/engine.ts` fue modificado por esta spec.
- [ ] En los 4 juegos con controles táctiles (arkanoid, asteroides, serpentina, tetris), cada botón habilitado sigue produciendo exactamente el mismo efecto en el juego que antes de esta spec (mismo `code`/`key` despachado).
- [ ] `npm run lint` y `npm run build` terminan sin errores.

## Decisiones tomadas y descartadas

- **Retematizar el `TouchControls` existente de SPEC 10, en vez de crear un componente de gamepad nuevo desde cero.** Motivo: la lógica de despacho de eventos, Pointer Events multi-touch y el mapeo por juego ya están implementados y probados; esta spec es un restyle, no una reimplementación.
- **Fiel al mockup de `references/gamepad-assets/`: SVG de flechas, hub decorativo y carcasa, en vez de solo ajustar colores/sombras sobre los glifos de texto actuales.** Motivo (decisión del usuario): se quiere el look completo del gamepad de referencia, no una aproximación parcial.
- **`B` cambia de `--yellow` a `--cyan` para calzar exacto con el mockup.** Motivo (decisión del usuario): prioridad a la fidelidad visual con la referencia sobre la paleta A/B/hub previa del pad táctil.
- **Fuente `--pixel` ("Press Start 2P") para las letras A/B, reutilizando la que el sitio ya carga, en vez de mantener la fuente mono actual del pad.** Motivo (decisión del usuario): coincide con el mockup y con el uso ya establecido de `--pixel` en otros textos destacados del sitio.
- **Slot deshabilitado se mantiene funcionalmente igual (mismo `disabled`, sin handlers) y solo se re-expresa visualmente sobre el nuevo estilo, en vez de ocultarse.** Motivo (decisión del usuario): se conserva el layout fijo de 6 slots de SPEC 10 — un juego con menos botones sigue mostrando el pad completo, ahora con la nueva estética.
- **Sin cambios al breakpoint (768px, por ancho de viewport) ni al layout general (d-pad izquierda / A-B derecha, franja fuera del `.crt`).** Motivo (decisión del usuario): esta spec es un restyle acotado; reabrir esas decisiones de SPEC 10 no aporta al objetivo de esta spec.
- **Sin cambios a `lib/games/registry.ts` ni a ningún `engine.ts`.** Motivo: el contrato de datos y la integración por juego de SPEC 10 ya están validados; tocarlos no es necesario para un cambio puramente visual y aumentaría el riesgo de regresión en los 4 juegos.

## Riesgos identificados

- **El nuevo tamaño/forma de los botones (carcasa + hub + anillo de glow) podría reducir el área táctil efectiva por debajo de lo cómodo en pantallas muy chicas.** Se mitiga manteniendo los `min-width`/`min-height` ya usados en SPEC 10 como piso, ajustando solo el estilo visual alrededor; se verifica a ojo en el paso 5 del plan, sin criterio automatizado.
- **Agregar elementos puramente decorativos (hub, anillo de glow, textura de puntos) al DOM dentro de botones interactivos podría interferir con los Pointer Events si no se marcan `aria-hidden`/`pointer-events: none` correctamente.** Se mitiga marcando explícitamente esos elementos decorativos como no interactivos y verificando en el paso 5 que presionar cada botón sigue despachando el evento correcto.

## Lo que **no** está en esta spec

- Cambios al breakpoint o a la detección por tipo de puntero.
- Cambios al layout general del pad (posición, orden, franja fuera del `.crt`).
- Cambios a `lib/games/registry.ts`, al mapeo de teclas por juego, o a la lógica de despacho de eventos.
- Cambios a cualquier `engine.ts`.
- Vibración háptica, remapeo de controles, joystick virtual, bloqueo de orientación.

Cada uno de estos, si se necesita, va en su propia spec futura.
