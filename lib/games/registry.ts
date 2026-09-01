import ArkanoidCanvas from "@/components/ArkanoidCanvas";
import AsteroidsCanvas from "@/components/AsteroidsCanvas";
import SerpentinaCanvas from "@/components/SerpentinaCanvas";
import TetrisCanvas from "@/components/TetrisCanvas";

export interface HudFields {
  score: number;
  lives?: number; // undefined = el juego no tiene concepto de vidas
  level: number;
}

export interface GameRegistryEntry {
  Canvas: React.ComponentType<{
    paused: boolean;
    onStateChange: (state: HudFields) => void;
    onGameOver: (finalScore: number) => void;
  }>;
}

export const GAME_REGISTRY: Record<string, GameRegistryEntry> = {
  arkanoid: { Canvas: ArkanoidCanvas },
  asteroides: { Canvas: AsteroidsCanvas },
  serpentina: { Canvas: SerpentinaCanvas },
  tetris: { Canvas: TetrisCanvas },
};
