// ===== lib/games/serpentina/skins.ts — paletas de los 3 skins de Serpentina =====
// Serpentina es mixto: la serpiente y el fondo son fills de canvas, pero las
// frutas viven dentro de un PNG (`public/juegos/serpentina/fruits.png`). Por eso
// la paleta tiene, además de los colores de fill, la receta de re-tinte del
// spritesheet (`fruitTint`) que el engine aplica una sola vez en un canvas
// offscreen cacheado por skin — nunca por frame.

import type { SkinId } from "@/lib/games/skins";

/**
 * Receta de re-tinte del spritesheet de frutas.
 * `null` = usar el PNG original sin ningún filtro (caso `clasico`).
 *
 * El engine la aplica en 3 pasos sobre un canvas offscreen:
 *   1. `drawImage` con `ctx.filter = filter`.
 *   2. `fillRect` del color `multiply` en modo `multiply` (si existe), que fija
 *      el matiz monocromo modulando por luminancia.
 *   3. `fillRect` del color `floor` en modo `lighten`, que garantiza un piso de
 *      contraste: ningún píxel de fruta puede quedar por debajo de ese color.
 * Al final un `destination-in` con el PNG original devuelve el canal alfa.
 */
export interface FruitTint {
  filter: string; // valor de ctx.filter para el drawImage inicial
  multiply: string | null; // matiz monocromo (composite "multiply")
  floor: string; // piso de luminancia (composite "lighten")
}

export interface SerpentinaPalette {
  background: string; // fillRect de fondo del canvas
  snakeBody: string; // celdas del cuerpo
  snakeHead: string; // celda de la cabeza (en clasico = snakeBody, look original)
  overlayScrim: string; // velo sobre el tablero en GAME OVER
  overlayTitle: string; // texto "GAME OVER"
  shadowColor: string; // color del halo (solo se usa si shadowBlur > 0)
  shadowBlur: number; // 0 = sin glow (clasico/retro); >0 activa el halo neón
  fruitTint: FruitTint | null; // null = PNG original sin filtro
}

export const SERPENTINA_SKINS: Record<SkinId, SerpentinaPalette> = {
  // Look original literal por literal: serpiente #2fbf4f sobre #000, frutas con
  // los colores propios del PNG, velo negro al 60% y "GAME OVER" en blanco.
  // La cabeza usa el mismo verde que el cuerpo, así que el render es idéntico.
  clasico: {
    background: "#000",
    snakeBody: "#2fbf4f",
    snakeHead: "#2fbf4f",
    overlayScrim: "rgba(0, 0, 0, 0.6)",
    overlayTitle: "#fff",
    shadowColor: "transparent",
    shadowBlur: 0,
    fruitTint: null,
  },
  // Paleta del sitio sobre negro. El cuerpo toma --green (heredero natural del
  // verde clásico) y la cabeza --yellow para que el jugador siga el punto que
  // controla. Las frutas NO se pasan a un solo matiz: perder la variedad de las
  // 22 frutas sería perder información, así que se saturan y se les pone un piso
  // de luminancia (#7a7a7a) que garantiza 4.89:1 contra el fondo negro incluso
  // en los píxeles más oscuros (uva, berenjena). El glow va en --magenta para
  // que el halo no se confunda con el cuerpo verde.
  neon: {
    background: "#000",
    snakeBody: "#00ff88", // --green
    snakeHead: "#f5ff00", // --yellow
    overlayScrim: "rgba(0, 0, 0, 0.65)",
    overlayTitle: "#00f5ff", // --cyan
    shadowColor: "#ff006e", // --magenta
    shadowBlur: 8,
    fruitTint: {
      filter: "saturate(2.2) brightness(1.1)",
      multiply: null, // se conserva el matiz propio de cada fruta
      floor: "#7a7a7a",
    },
  },
  // Fósforo CRT ámbar sobre #0a0a0a. Los 3 elementos comparten matiz y se
  // ordenan por luminancia: cabeza #ffe0a0 (15.48:1) > fruta, familia
  // #b37b00–#ffb000 (5.42:1 a 10.80:1) > cuerpo #cc7a00 (5.99:1). El cuerpo
  // queda por debajo de la fruta a propósito: es la superficie más grande del
  // tablero y la fruta es el objetivo que debe destacar.
  retro: {
    background: "#0a0a0a",
    snakeBody: "#cc7a00",
    snakeHead: "#ffe0a0",
    overlayScrim: "rgba(10, 10, 10, 0.7)",
    overlayTitle: "#ffe0a0",
    shadowColor: "transparent",
    shadowBlur: 0,
    fruitTint: {
      filter: "grayscale(1) brightness(1.15)",
      multiply: "#ffb000",
      floor: "#b37b00",
    },
  },
};
