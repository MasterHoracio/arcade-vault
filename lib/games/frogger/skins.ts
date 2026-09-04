// ===== lib/games/frogger/skins.ts — paletas de los 3 skins de Frogger =====
// Frogger es 100% fills/arcos de canvas (sin sprites bitmap), así que la
// paleta son literales puros — no hay receta de re-tinte de spritesheet como
// en Serpentina/Arkanoid.

import type { SkinId } from "@/lib/games/skins";

export interface FroggerPalette {
  // Fondos de zona (fillRect por fila en draw()).
  roadBg: string;
  riverBg: string;
  safeBg: string;
  goalRowBg: string;
  // Carretera.
  carColors: [string, string, string]; // índice por Math.floor(col) % 3
  carWheel: string;
  truckBody: string;
  truckCab: string;
  // Río.
  logBody: string;
  logGrain: string;
  turtleVisible: string;
  turtleSubmerged: string; // contorno translúcido — señal de "sin soporte"
  // Metas.
  goalBorder: string;
  goalFilled: string; // silueta de rana dentro de una boca ocupada
  // Rana.
  frogBody: string;
  frogEye: string;
  frogPupil: string;
  // HUD interno del canvas.
  hudText: string;
  lifeIcon: string;
  timeHigh: string; // barra de tiempo, fracción > 0.5
  timeMid: string; // 0.2 < fracción <= 0.5
  timeLow: string; // fracción <= 0.2
  // Glow (solo neon).
  shadowColor: string;
  shadowBlur: number;
}

export const FROGGER_SKINS: Record<SkinId, FroggerPalette> = {
  // Look original literal por literal (los colores que tenía el port inicial
  // de la spec, antes de existir skins). Cualquier diferencia visible es bug.
  clasico: {
    roadBg: "#0a0a0a",
    riverBg: "#0a1a3a",
    safeBg: "#0a2a1a",
    goalRowBg: "#2a5a2a",
    carColors: ["#e33", "#ee2", "#38f"],
    carWheel: "#111",
    truckBody: "#888",
    truckCab: "#555",
    logBody: "#7a4a20",
    logGrain: "#5a3316",
    turtleVisible: "#2fbf4f",
    turtleSubmerged: "rgba(0,255,136,0.35)",
    goalBorder: "#c9a227",
    goalFilled: "#2fbf4f",
    frogBody: "#39ff5f",
    frogEye: "#fff",
    frogPupil: "#111",
    hudText: "#fff",
    lifeIcon: "#39ff5f",
    timeHigh: "#2fbf4f",
    timeMid: "#e3e320",
    timeLow: "#e33333",
    shadowColor: "transparent",
    shadowBlur: 0,
  },
  // Paleta del sitio sobre fondos oscurecidos. `goalRowBg` (#2a5a2a original,
  // ~0.078 de luminancia relativa) y `safeBg` violaban la regla 1 del
  // contrato ("ningún fondo más claro que #1a1a1a", ~0.0116) — se oscurecen
  // aquí sin cambiar el matiz. Magenta se reserva como glow (rol de "peligro"
  // ya cubierto por el propio color de los carriles de carretera en otros
  // juegos del catálogo) en vez de fill grande, porque contra un fondo tan
  // oscuro un fill magenta queda al filo del 4.5:1; como contorno/relleno de
  // río (más oscuro) sí lo despeja con margen (~4.7:1).
  neon: {
    roadBg: "#0a0a0a",
    riverBg: "#071530",
    safeBg: "#08170d",
    goalRowBg: "#0a1808",
    carColors: ["#00f5ff", "#f5ff00", "#00ff88"], // cyan/yellow/green
    carWheel: "#0a0a0a",
    truckBody: "#c9d6e3", // acento neutro fuera de tokens, igual que el "silver" de Asteroides
    truckCab: "#7d92ab",
    logBody: "#00ff88", // --green
    logGrain: "#00a85c",
    turtleVisible: "#ff006e", // --magenta, ~4.7:1 sobre riverBg
    turtleSubmerged: "rgba(255,0,110,0.35)",
    goalBorder: "#00f5ff", // --cyan
    goalFilled: "#00ff88", // --green, mismo matiz que la rana
    frogBody: "#00ff88", // --green
    frogEye: "#fff",
    frogPupil: "#0a0a0a",
    hudText: "#fff",
    lifeIcon: "#00ff88",
    timeHigh: "#00ff88",
    timeMid: "#f5ff00",
    timeLow: "#ff006e",
    shadowColor: "#ff006e", // --magenta
    shadowBlur: 8,
  },
  // Fósforo ámbar monocromo sobre casi-negro (todas las zonas < 0.0116 de
  // luminancia relativa). Reutiliza los mismos literales ya auditados en
  // `lib/games/serpentina/skins.ts` (retro) contra un fondo #0a0a0a — como
  // los 4 fondos de zona de acá son igual de oscuros o más oscuros, el
  // contraste real es igual o mejor que el documentado ahí:
  //   rana #ffe0a0 (~15:1) > tortuga/tronco #ffb000/#cc7a00 (~5.8–9:1) >
  //   vehículo #cc7a00/#b37b00 (~4.6–5.6:1) > barra de tiempo en reposo
  //   #b37b00 (~5.1:1 contra la fila de metas, la más clara de las 4).
  retro: {
    roadBg: "#0a0a0a",
    riverBg: "#0f0d08",
    safeBg: "#120f08",
    goalRowBg: "#170f08",
    carColors: ["#cc7a00", "#cc7a00", "#cc7a00"],
    carWheel: "#2a1a00",
    truckBody: "#b37b00",
    truckCab: "#7a4a00",
    logBody: "#cc7a00",
    logGrain: "#7a4a00",
    turtleVisible: "#ffb000",
    turtleSubmerged: "rgba(255,176,0,0.3)",
    goalBorder: "#ffb000",
    goalFilled: "#ffe0a0",
    frogBody: "#ffe0a0",
    frogEye: "#fff6e0",
    frogPupil: "#2a1a00",
    hudText: "#ffe0a0",
    lifeIcon: "#ffb000",
    timeHigh: "#b37b00",
    timeMid: "#cc7a00",
    timeLow: "#ffe0a0",
    shadowColor: "transparent",
    shadowBlur: 0,
  },
};
