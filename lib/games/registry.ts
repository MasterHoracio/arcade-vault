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

export type TouchDirection = "left-right" | "four-way";

export interface TouchButtonConfig {
  label: string; // texto del botón, ej. "DISPARAR"
  code: string; // KeyboardEvent.code despachado, ej. "Space"
  key: string; // KeyboardEvent.key despachado, ej. " "
}

export interface TouchControlsConfig {
  dpad: TouchDirection;
  buttons: TouchButtonConfig[]; // vacío para serpentina
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
  touchControls: TouchControlsConfig;
}

export const GAME_REGISTRY: Record<string, GameRegistryEntry> = {
  arkanoid: {
    Canvas: ArkanoidCanvas,
    skins: ["clasico", "neon", "retro"],
    touchControls: {
      dpad: "left-right",
      buttons: [{ label: "LANZAR", code: "Space", key: " " }],
    },
  },
  asteroides: {
    Canvas: AsteroidsCanvas,
    skins: ["clasico", "neon", "retro"],
    touchControls: {
      dpad: "left-right",
      buttons: [
        { label: "AVANZAR", code: "ArrowUp", key: "ArrowUp" },
        { label: "DISPARAR", code: "Space", key: " " },
      ],
    },
  },
  serpentina: {
    Canvas: SerpentinaCanvas,
    skins: ["clasico", "neon", "retro"],
    touchControls: {
      dpad: "four-way",
      buttons: [],
    },
  },
  tetris: {
    Canvas: TetrisCanvas,
    skins: ["clasico", "neon", "retro"],
    touchControls: {
      dpad: "left-right",
      buttons: [
        { label: "ROTAR", code: "ArrowUp", key: "ArrowUp" },
        { label: "BAJAR", code: "ArrowDown", key: "ArrowDown" },
        { label: "CAER", code: "Space", key: " " },
      ],
    },
  },
};
