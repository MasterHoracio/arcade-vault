"use client";

import { useEffect, useRef } from "react";
import {
  createFroggerGame,
  type FroggerHudState,
} from "@/lib/games/frogger/engine";
import type { SkinId } from "@/lib/games/skins";

interface FroggerCanvasProps {
  paused: boolean;
  skin: SkinId;
  onStateChange: (state: FroggerHudState) => void;
  onGameOver: (finalScore: number) => void;
}

export default function FroggerCanvas({
  paused,
  skin,
  onStateChange,
  onGameOver,
}: FroggerCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<ReturnType<typeof createFroggerGame> | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const game = createFroggerGame(
      canvas,
      { onStateChange, onGameOver },
      { skin },
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
      width={640}
      height={560}
      style={{
        height: "100%",
        width: "auto",
        margin: "0 auto",
        display: "block",
      }}
    />
  );
}
