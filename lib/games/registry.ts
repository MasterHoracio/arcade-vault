import ArkanoidCanvas from "@/components/ArkanoidCanvas";
import AsteroidsCanvas from "@/components/AsteroidsCanvas";
import SerpentinaCanvas from "@/components/SerpentinaCanvas";
import TetrisCanvas from "@/components/TetrisCanvas";
import type { SkinId } from "@/lib/games/skins";

export interface HudFields {
  score: number;
  lives?: number; // undefined = el juego no tiene concepto de vidas
  level: number;
}

export interface GameRegistryEntry {
  Canvas: React.ComponentType<{
    paused: boolean;
    skin: SkinId;
    onStateChange: (state: HudFields) => void;
    onGameOver: (finalScore: number) => void;
  }>;
  // Skins que el engine implementa de verdad hoy — "clasico" siempre está
  // disponible porque es el look original del juego, sin cambios.
  skins: SkinId[];
}

export const GAME_REGISTRY: Record<string, GameRegistryEntry> = {
  arkanoid: { Canvas: ArkanoidCanvas, skins: ["clasico"] },
  asteroides: {
    Canvas: AsteroidsCanvas,
    skins: ["clasico", "neon", "retro"],
  },
  serpentina: { Canvas: SerpentinaCanvas, skins: ["clasico"] },
  tetris: { Canvas: TetrisCanvas, skins: ["clasico", "neon", "retro"] },
};
