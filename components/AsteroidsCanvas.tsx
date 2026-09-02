"use client";

import { useEffect, useRef } from "react";
import {
  createAsteroidsGame,
  type AsteroidsHudState,
} from "@/lib/games/asteroids/engine";
import type { SkinId } from "@/lib/games/skins";

interface AsteroidsCanvasProps {
  paused: boolean;
  skin: SkinId;
  onStateChange: (state: AsteroidsHudState) => void;
  onGameOver: (finalScore: number) => void;
}

export default function AsteroidsCanvas({
  paused,
  skin,
  onStateChange,
  onGameOver,
}: AsteroidsCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<ReturnType<typeof createAsteroidsGame> | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const game = createAsteroidsGame(
      canvas,
      { onStateChange, onGameOver },
      {
        skin,
      },
    );
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

  useEffect(() => {
    gameRef.current?.setSkin(skin);
  }, [skin]);

  return (
    <canvas
      ref={canvasRef}
      width={800}
      height={600}
      style={{ width: "100%", height: "100%", display: "block" }}
    />
  );
}
