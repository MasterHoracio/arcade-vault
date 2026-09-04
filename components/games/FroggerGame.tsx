"use client";

import { useEffect, useRef } from "react";

const COLS = 16;
const ROWS = 14;
const CELL = 40; // px
const CANVAS_W = COLS * CELL; // 640 — se escala con CSS al contenedor
const CANVAS_H = ROWS * CELL; // 560
// Zonas (índice de fila, 0 = arriba)
const ROW_GOALS = 0;
const ROW_RIVER_TOP = 1;
const ROW_RIVER_BOT = 6;
const ROW_SAFE_MID = 7;
const ROW_ROAD_TOP = 8;
const ROW_ROAD_BOT = 12;
const ROW_START = 13;

// Ciclo de inmersión de las tortugas: 3s visibles / 1.5s bajo el agua.
const TURTLE_VISIBLE_MS = 3000;
const TURTLE_SUBMERGED_MS = 1500;
const TURTLE_CYCLE_MS = TURTLE_VISIBLE_MS + TURTLE_SUBMERGED_MS;

type Direction = "up" | "down" | "left" | "right";

interface Lane {
  row: number;
  speed: number;
  dir: 1 | -1;
  entities: Entity[];
}

interface Entity {
  col: number;
  width: number;
  type: "car" | "truck" | "log" | "turtle";
  submerged?: boolean;
  // Tiempo transcurrido (ms) dentro del ciclo de inmersión; solo tortugas.
  submergeT?: number;
}

interface Frog {
  col: number;
  row: number;
  animating: boolean;
  animT: number;
  targetCol: number;
  targetRow: number;
}

interface FroggerGameProps {
  paused: boolean;
  onScoreChange: (score: number) => void;
  onLivesChange: (lives: number) => void;
  onLevelChange: (level: number) => void;
  onGameOver: (finalScore: number) => void;
}

/**
 * Construye los carriles de una ronda: 5 de carretera (filas 8–12) y 6 de
 * río (filas 1–6), con velocidades y sentidos alternos por carril. Cada
 * nivel incrementa todas las velocidades un 15%.
 */
function buildLanes(level: number): Lane[] {
  const levelMult = Math.pow(1.15, level - 1);
  const lanes: Lane[] = [];

  const roadRows = [8, 9, 10, 11, 12];
  const roadBaseSpeeds = [1.5, 2.2, 3, 3.6, 4];
  roadRows.forEach((row, i) => {
    const dir: 1 | -1 = i % 2 === 0 ? 1 : -1;
    const speed = roadBaseSpeeds[i] * levelMult;
    const entities: Entity[] = [];
    let col = Math.floor(Math.random() * 4);
    while (col < COLS) {
      const type: Entity["type"] = Math.random() < 0.6 ? "car" : "truck";
      const width =
        type === "truck"
          ? 2 + Math.floor(Math.random() * 2)
          : 1 + Math.floor(Math.random() * 2);
      entities.push({ col, width, type });
      // Hueco de al menos 2 celdas para que el carril sea atravesable.
      col += width + 2 + Math.floor(Math.random() * 3);
    }
    lanes.push({ row, speed, dir, entities });
  });

  const riverRows = [1, 2, 3, 4, 5, 6];
  const riverBaseSpeeds = [1, 1.5, 2, 2.5, 3, 1.2];
  const riverTypes: Array<"log" | "turtle"> = [
    "log",
    "turtle",
    "log",
    "turtle",
    "log",
    "turtle",
  ];
  riverRows.forEach((row, i) => {
    const dir: 1 | -1 = i % 2 === 0 ? 1 : -1;
    const speed = riverBaseSpeeds[i] * levelMult;
    const type = riverTypes[i];
    const entities: Entity[] = [];
    let col = Math.floor(Math.random() * 4);
    while (col < COLS) {
      const width =
        type === "log"
          ? 2 + Math.floor(Math.random() * 3)
          : 2 + Math.floor(Math.random() * 2);
      const entity: Entity = { col, width, type };
      if (type === "turtle") {
        entity.submerged = false;
        entity.submergeT = Math.random() * TURTLE_CYCLE_MS;
      }
      entities.push(entity);
      // Hueco de al menos 1 celda.
      col += width + 1 + Math.floor(Math.random() * 2);
    }
    lanes.push({ row, speed, dir, entities });
  });

  return lanes;
}

export default function FroggerGame({
  paused,
  onScoreChange,
  onLivesChange,
  onLevelChange,
  onGameOver,
}: FroggerGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_W}
      height={CANVAS_H}
      style={{ width: "100%", height: "auto", display: "block" }}
    />
  );
}
