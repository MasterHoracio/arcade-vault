// ===== lib/games/arkanoid/skins.ts — paletas de los 3 skins de Arkanoid =====
// Arkanoid es el primer juego con color dentro de un PNG
// (public/juegos/arkanoid/spritesheet-breakout.png), así que la paleta no se
// consume con fillStyle sino como color objetivo del re-tinte offscreen que
// hace el engine (ver references/skins-contract.md, sección "Sprites").
//
// Roles de sprite = las 7 familias de bloque del spritesheet (sus nombres son
// las claves del original: "green" es en realidad azul, "magenta" es violeta y
// "hotpink" es naranja — se conservan tal cual para no tocar levels.js) más
// paleta y bola.

import type { SkinId } from "@/lib/games/skins";

export type ArkanoidSpriteRole =
  | "gray"
  | "red"
  | "yellow"
  | "cyan"
  | "magenta"
  | "hotpink"
  | "green"
  | "paddle"
  | "ball";

export interface ArkanoidPalette {
  background: string; // fillRect de fondo del canvas
  hudText: string; // "Score:" y "Nivel:" durante la partida
  overlayScrim: string; // velo sobre el juego en GAME OVER / victoria
  overlayText: string; // texto del overlay
  // null = spritesheet original sin filtro (así se define "clasico").
  // Si no es null, el engine re-tiñe cada región del PNG a este color.
  sprites: Record<ArkanoidSpriteRole, string> | null;
  shadowBlur: number; // 0 = sin glow (clasico/retro); >0 activa el halo neón
}

export const ARKANOID_SKINS: Record<SkinId, ArkanoidPalette> = {
  // Look original del puerto: fondo negro, texto blanco, spritesheet intacto.
  // sprites: null es lo que garantiza que "clasico" sea pixel-idéntico —
  // el engine ni siquiera crea un canvas filtrado para este skin.
  clasico: {
    background: "#000",
    hudText: "#fff",
    overlayScrim: "rgba(0, 0, 0, 0.6)",
    overlayText: "#fff",
    sprites: null,
    shadowBlur: 0,
  },
  // Paleta del sitio sobre negro + shadowBlur. Arkanoid necesita 9 roles
  // distinguibles y los tokens dan 7 (cyan/magenta/yellow/green/gold/silver/
  // bronze), así que hay 2 literales fuera de la paleta base, documentados:
  //   · magenta -> #bb55ff (violeta eléctrico): el bloque violeta del original
  //     no tiene token equivalente; #ff006e ya lo usa el bloque rojo. 5.86:1.
  //   · ball    -> #eaf6ff (blanco frío): la bola debe ser el objeto más
  //     brillante y único de la pantalla. No es #fff puro (regla 5) y son
  //     16x16 px, nunca una superficie grande.
  neon: {
    background: "#000",
    hudText: "#00f5ff", // --cyan
    overlayScrim: "rgba(0, 0, 0, 0.6)",
    overlayText: "#00f5ff",
    sprites: {
      gray: "#c7d0e0", // --silver
      red: "#ff006e", // --magenta
      yellow: "#f5ff00", // --yellow
      cyan: "#00ff88", // --green
      magenta: "#bb55ff", // violeta eléctrico (fuera de tokens)
      hotpink: "#d97a3a", // --bronze
      green: "#00f5ff", // --cyan
      paddle: "#ffcf3a", // --gold
      ball: "#eaf6ff", // blanco frío (fuera de tokens)
    },
    shadowBlur: 8,
  },
  // Fósforo CRT ámbar sobre #0a0a0a. Las 6 filas de bloques del original se
  // distinguen solo por matiz, así que en retro se distinguen por luminancia
  // dentro de la misma familia ámbar: 7 escalones de ~3.7 L* entre ellos,
  // del más apagado (gray #a67200, 4.74:1 contra #0a0a0a — el escalón más
  // oscuro, por encima del 4.5:1 del contrato) al más brillante
  // (cyan #f2a700, 9.71:1). Paleta y bola quedan por encima de todos los
  // bloques para que el jugador siga siempre lo que controla.
  retro: {
    background: "#0a0a0a",
    hudText: "#ffb000",
    overlayScrim: "rgba(10, 10, 10, 0.7)",
    overlayText: "#ffde98",
    sprites: {
      gray: "#a67200", // 4.74:1  L* 52.0
      red: "#b37b00", // 5.42:1  L* 55.8
      magenta: "#bf8400", // 6.14:1  L* 59.5
      hotpink: "#cc8d00", // 6.96:1  L* 63.2
      yellow: "#d99600", // 7.84:1  L* 66.9
      green: "#e69e00", // 8.73:1  L* 70.4
      cyan: "#f2a700", // 9.71:1  L* 73.9
      paddle: "#ffc441", // 12.47:1 L* 82.4
      ball: "#ffde98", // 15.23:1 L* 89.8
    },
    shadowBlur: 0,
  },
};
