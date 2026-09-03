"use client";

import { useEffect, useRef } from "react";
import {
  createArkanoidGame,
  type ArkanoidHudState,
} from "@/lib/games/arkanoid/engine";
import type { SkinId } from "@/lib/games/skins";

interface ArkanoidCanvasProps {
  paused: boolean;
  skin: SkinId;
  onStateChange: (state: ArkanoidHudState) => void;
  onGameOver: (finalScore: number) => void;
}

export default function ArkanoidCanvas({
  paused,
  skin,
  onStateChange,
  onGameOver,
}: ArkanoidCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<ReturnType<typeof createArkanoidGame> | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const game = createArkanoidGame(
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
