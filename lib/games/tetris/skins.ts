// ===== lib/games/tetris/skins.ts — paletas de los 3 skins de Tetris =====
// Índice 0 sin usar (Tetris indexa sus piezas 1-8, ver PIECES en engine.ts).

import type { SkinId } from "@/lib/games/skins";

export interface TetrisPalette {
  pieces: (string | null)[]; // 8 colores de pieza + null en el índice 0
  highlight: string; // franja superior de cada bloque
  grid: string; // líneas del tablero (clasico ignora esto, ver nota abajo)
}

export const TETRIS_SKINS: Record<SkinId, TetrisPalette> = {
  // Idéntico al look original del puerto — Material Design, sin glow.
  clasico: {
    pieces: [
      null,
      "#4dd0e1", // I - cyan
      "#ffd54f", // O - yellow
      "#ba68c8", // T - purple
      "#81c784", // S - green
      "#e57373", // Z - red
      "#90caf9", // J - pale blue
      "#ffb74d", // L - orange
      "#9e9e9e", // N - tuerca (gris metálico)
    ],
    highlight: "rgba(255,255,255,0.12)",
    grid: "rgba(255,255,255,0.08)",
  },
  // Paleta del sitio (--cyan/--magenta/--yellow/--green + --gold/--silver/--bronze)
  // más shadowBlur en cada bloque. Solo 7 tokens de tema existen y Tetris
  // necesita 8 colores de pieza distintos: el 8vo (N) es un violeta eléctrico
  // fuera de la paleta base, elegido por ser el más distinguible del resto.
  neon: {
    pieces: [
      null,
      "#00f5ff", // I - cyan (--cyan)
      "#f5ff00", // O - yellow (--yellow)
      "#ff006e", // T - magenta (--magenta)
      "#00ff88", // S - green (--green)
      "#ffcf3a", // Z - gold (--gold)
      "#c7d0e0", // J - silver (--silver)
      "#d97a3a", // L - bronze (--bronze)
      "#8000ff", // N - violeta eléctrico (fuera de tokens, decisión documentada)
    ],
    highlight: "rgba(255,255,255,0.22)",
    grid: "rgba(0,245,255,0.25)",
  },
  // Fósforo CRT ámbar monocromo. Las 8 piezas ya se distinguen por forma;
  // el color solo aporta jerarquía visual, así que se diferencian por
  // luminancia (más brillante = pieza más frecuente/larga) en vez de por
  // matiz. Contraste WCAG verificado contra fondo ~#0a0a0a: el escalón más
  // oscuro (N, #b36b00) da 4.7:1 — por encima del mínimo de 4.5:1 de
  // references/skins-contract.md; los demás son más brillantes.
  retro: {
    pieces: [
      null,
      "#ffe0a0", // I - más brillante
      "#ffcf66", // O
      "#ffb833", // T
      "#ffa500", // S
      "#ff9900", // Z
      "#e68a00", // J
      "#cc7a00", // L
      "#b36b00", // N - más oscuro (4.7:1 contra #0a0a0a)
    ],
    highlight: "rgba(255,224,160,0.15)",
    grid: "rgba(255,176,0,0.15)",
  },
};
