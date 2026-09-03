// ===== lib/games/asteroids/skins.ts — paletas de los 3 skins de Asteroides =====
// Asteroides es 100% vectorial (strokes y fills de canvas, sin sprites PNG),
// así que la paleta cubre un rol por elemento dibujado.

import type { SkinId } from "@/lib/games/skins";

export interface AsteroidsPalette {
  background: string; // fillRect de fondo del canvas
  ship: string; // stroke de la silueta de la nave
  thruster: string; // stroke de la llama del propulsor
  bullet: string; // fill de las balas
  asteroid: string; // stroke del polígono de cada asteroide
  powerUp: string; // stroke del rombo y texto "3x" del power-up
  particleRgb: string; // "r,g,b" — las partículas modulan alpha por vida
  overlayTitle: string; // "GAME OVER"
  overlaySubtitle: string; // línea de puntaje/reinicio
  shadowBlur: number; // 0 = sin glow (clasico/retro); >0 activa el halo neón
}

export const ASTEROIDS_SKINS: Record<SkinId, AsteroidsPalette> = {
  // Idéntico al look original del puerto: vector blanco sobre negro,
  // power-up cian y llama naranja. Literal por literal, sin glow.
  clasico: {
    background: "#000",
    ship: "#fff",
    thruster: "rgba(255, 130, 0, 0.85)",
    bullet: "#fff",
    asteroid: "#fff",
    powerUp: "#0ff",
    particleRgb: "255,255,255",
    overlayTitle: "#fff",
    overlaySubtitle: "rgba(255,255,255,0.65)",
    shadowBlur: 0,
  },
  // Paleta del sitio sobre negro + shadowBlur. Asteroides necesita 5 roles
  // jugables distintos y los 4 tokens principales solo dan 4: el asteroide usa
  // --silver (#c7d0e0) porque una roca neutra lee mejor que un 5º matiz
  // saturado y deja los colores fuertes para nave/bala/power-up.
  neon: {
    background: "#000",
    ship: "#00f5ff", // --cyan
    thruster: "#ff006e", // --magenta
    bullet: "#f5ff00", // --yellow
    asteroid: "#c7d0e0", // --silver
    powerUp: "#00ff88", // --green
    particleRgb: "255,207,58", // --gold
    overlayTitle: "#00f5ff",
    overlaySubtitle: "rgba(199,208,224,0.75)",
    shadowBlur: 8,
  },
  // Fósforo CRT ámbar sobre #0a0a0a. Todos los elementos comparten matiz y se
  // distinguen por luminancia: nave (la más brillante, es lo que el jugador
  // sigue) > bala > power-up > propulsor > asteroide (el más oscuro, 5.99:1
  // contra #0a0a0a, por encima del mínimo 4.5:1 del contrato).
  retro: {
    background: "#0a0a0a",
    ship: "#ffe0a0",
    thruster: "#ff9900",
    bullet: "#ffcf66",
    asteroid: "#cc7a00",
    powerUp: "#ffb000",
    particleRgb: "255,176,0",
    overlayTitle: "#ffe0a0",
    overlaySubtitle: "rgba(255,224,160,0.7)",
    shadowBlur: 0,
  },
};
