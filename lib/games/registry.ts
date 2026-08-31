import AsteroidsCanvas from "@/components/AsteroidsCanvas";
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
  asteroides: { Canvas: AsteroidsCanvas },
  tetris: { Canvas: TetrisCanvas },
};
