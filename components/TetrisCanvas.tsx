"use client";

import { useEffect, useRef } from "react";
import {
  createTetrisGame,
  type TetrisHudState,
} from "@/lib/games/tetris/engine";

interface TetrisCanvasProps {
  paused: boolean;
  onStateChange: (state: TetrisHudState) => void;
  onGameOver: (finalScore: number) => void;
}

export default function TetrisCanvas({
  paused,
  onStateChange,
  onGameOver,
}: TetrisCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nextCanvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<ReturnType<typeof createTetrisGame> | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const nextCanvas = nextCanvasRef.current;
    if (!canvas || !nextCanvas) return;

    const game = createTetrisGame(canvas, nextCanvas, {
      onStateChange,
      onGameOver,
    });
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
    <div
      style={{ position: "relative", inset: 0, width: "100%", height: "100%" }}
    >
      <canvas
        ref={canvasRef}
        width={300}
        height={600}
        style={{
          height: "100%",
          width: "auto",
          margin: "0 auto",
          display: "block",
        }}
      />
      <canvas
        ref={nextCanvasRef}
        width={120}
        height={120}
        style={{
          position: "absolute",
          top: 8,
          right: 8,
          border: "1px solid var(--line)",
          background: "rgba(0,0,0,0.6)",
        }}
      />
    </div>
  );
}
