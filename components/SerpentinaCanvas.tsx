"use client";

import { useEffect, useRef } from "react";
import {
  createSerpentinaGame,
  type SerpentinaHudState,
} from "@/lib/games/serpentina/engine";

interface SerpentinaCanvasProps {
  paused: boolean;
  onStateChange: (state: SerpentinaHudState) => void;
  onGameOver: (finalScore: number) => void;
}

export default function SerpentinaCanvas({
  paused,
  onStateChange,
  onGameOver,
}: SerpentinaCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<ReturnType<typeof createSerpentinaGame> | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const game = createSerpentinaGame(canvas, { onStateChange, onGameOver });
    gameRef.current = game;
    game.start();

    return () => {
      game.stop();
      gameRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    gameRef.current?.setPaused(paused);
  }, [paused]);

  return (
    <canvas
      ref={canvasRef}
      width={800}
      height={600}
      style={{ width: "100%", height: "100%", display: "block" }}
    />
  );
}
