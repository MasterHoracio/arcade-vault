# Contrato móvil

Documento de referencia para el agente `mobile-porter` y para cualquiera que
toque responsive a mano. Define los breakpoints canónicos, los puntos de
falla recurrentes de este repo y las reglas verificables de pantalla chica —
análogo a `references/skins-contract.md` pero para layout, no color. No lo
reinventes por zona: lo que cambia entre zonas son los archivos que se
tocan, nunca esta estructura.

## Breakpoints canónicos

`app/globals.css` tiene hoy 16 media queries `max-width` en 9 valores
distintos (520/600/720/768/820/840/900/980/1100), acumulados spec a spec sin
un set unificado. `mobile-porter` **congela tres** para todo trabajo nuevo:

- **`480px`** — teléfono chico (una sola columna, todo apilado).
- **`768px`** — teléfono/tablet. Es el breakpoint que ya usa SPEC 10 para
  `.touch-controls`; no se cambia.
- **`1024px`** — tablet/desktop, layout de dos o más columnas se colapsa acá
  si aún no lo hizo antes.

Convención `max-width`, igual que el resto de la hoja — no se introduce
`min-width` ni `prefers-*` ni `pointer: coarse`. El agente **no migra las 16
media queries existentes en una sola corrida**; normaliza únicamente las que
caen dentro de la zona que le tocó auditar, y dentro de esa zona sí unifica
valores redundantes (ej. dos reglas a 720px para el mismo componente).

## Los 4 puntos de falla recurrentes en este repo

1. **`style={{}}` inline con px fijos.** Es el fix más frecuente y el
   obstáculo principal: una media query no puede alcanzar un estilo inline.
   Fix: mover la regla a una clase en `app/globals.css` (o extender una ya
   existente) y dejar en el JSX solo lo verdaderamente dinámico (valores
   calculados en runtime, no constantes de diseño).
2. **Fila flex de varias columnas sin `flex-wrap`** (ej. `.hud-actions`,
   `.crt-bottom`). Fix: `flex-wrap: wrap` + `gap`, nunca `overflow: hidden`
   que recorta contenido.
3. **Padding/radius decorativo fijo en contenedores grandes** (ej. `.crt`:
   `padding: 24px`, `border-radius: 28px`, que a 360px comen ~48px de un
   viewport ya angosto). Fix: reducir esos valores bajo 768px, sin tocar el
   contenido interior.
4. **Grid de N columnas sin colapso.** Fix: `grid-template-columns: 1fr` (o
   2 columnas en el escalón intermedio) bajo el breakpoint que corresponda.

## Reglas duras verificables

No "se ve bien" — cada regla se confirma leyendo el código, igual que el
contraste WCAG en `skins-contract.md` se confirma con un número:

1. **Sin scroll horizontal a 360px de ancho.** Ningún elemento fuera de un
   contenedor con `overflow-x: auto` propio debe declarar un ancho fijo en
   px mayor a 360, ni un `min-width` en px que no ceda bajo ese ancho.
2. **Objetivos táctiles ≥ 44×44px** en cualquier elemento interactivo bajo
   768px — el piso que ya cumple `.touch-btn` de `components/TouchControls.tsx`.
3. **Texto ≥ 12px en móvil.** La fuente pixel del sitio es la primera en
   volverse ilegible al achicar; verificar cada `font-size` que quede bajo
   ese piso dentro de la zona auditada.
4. **Los canvases de juego mantienen su `aspect-ratio`.** Se ajusta el
   contenedor (`.crt-screen` y similares) para que el canvas quepa; **nunca**
   se cambia la geometría interna de un `lib/games/<slug>/engine.ts` para
   que "quepa" en pantalla chica — línea heredada de SPEC 10.
5. **Dark-only.** Se hereda de `references/skins-contract.md`: no se agrega
   `prefers-color-scheme` ni un modo claro. "Verse bien en móvil" no
   reabre la discusión de tema — solo layout.

## Fuera de alcance

Decisiones ya tomadas por el usuario o por SPEC 10 y que `mobile-porter` no
reabre por su cuenta:

- PWA: manifest, service worker, iconos instalables, `themeColor`.
- Detección por `pointer: coarse` (SPEC 10 usa solo ancho de viewport,
  decisión explícita).
- Bloqueo o sugerencia de orientación horizontal.
- Vibración háptica (`navigator.vibrate`).
- Remapeo de controles táctiles por el usuario.
- Ajustes de balance/dificultad de un juego para pantalla chica (tamaño de
  sprites, velocidad) — se porta el layout, no la mecánica.

Cada uno de estos, si algún día se necesita, es una spec o decisión aparte.
