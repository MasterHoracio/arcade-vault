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

export type TouchSlot = "up" | "down" | "left" | "right" | "a" | "b";

export interface TouchKeyBinding {
  code: string; // KeyboardEvent.code despachado, ej. "Space"
  key: string; // KeyboardEvent.key despachado, ej. " "
}

// Pad fijo de 6 slots, igual en los 4 juegos. Un slot ausente se renderiza
// igual (mismo layout siempre) pero deshabilitado: visible, opaco, sin
// handlers de puntero ni efecto sobre el juego.
export type TouchControlsConfig = Partial<Record<TouchSlot, TouchKeyBinding>>;

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

const LEFT: TouchKeyBinding = { code: "ArrowLeft", key: "ArrowLeft" };
const RIGHT: TouchKeyBinding = { code: "ArrowRight", key: "ArrowRight" };
const UP: TouchKeyBinding = { code: "ArrowUp", key: "ArrowUp" };
const DOWN: TouchKeyBinding = { code: "ArrowDown", key: "ArrowDown" };
const SPACE: TouchKeyBinding = { code: "Space", key: " " };

export const GAME_REGISTRY: Record<string, GameRegistryEntry> = {
  arkanoid: {
    Canvas: ArkanoidCanvas,
    skins: ["clasico", "neon", "retro"],
    touchControls: { left: LEFT, right: RIGHT, a: SPACE },
  },
  asteroides: {
    Canvas: AsteroidsCanvas,
    skins: ["clasico", "neon", "retro"],
    touchControls: { left: LEFT, right: RIGHT, up: UP, a: SPACE },
  },
  serpentina: {
    Canvas: SerpentinaCanvas,
    skins: ["clasico", "neon", "retro"],
    touchControls: { left: LEFT, right: RIGHT, up: UP, down: DOWN },
  },
  tetris: {
    Canvas: TetrisCanvas,
    skins: ["clasico", "neon", "retro"],
    touchControls: { left: LEFT, right: RIGHT, up: UP, down: DOWN, a: SPACE },
  },
};
