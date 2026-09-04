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

/** ¿La rana choca con un vehículo en su carril actual? */
function checkRoadCollision(frog: Frog, lanes: Lane[]): boolean {
  const lane = lanes.find((l) => l.row === frog.row);
  if (!lane) return false;
  return lane.entities.some(
    (e) => frog.col >= e.col && frog.col < e.col + e.width,
  );
}

/**
 * Entidad de río que sostiene a la rana en su carril actual, o `null` si no
 * hay ninguna (incluye tortugas sumergidas).
 */
function getSupport(frog: Frog, lanes: Lane[]): Entity | null {
  const lane = lanes.find((l) => l.row === frog.row);
  if (!lane) return null;
  const entity = lane.entities.find(
    (e) => frog.col >= e.col && frog.col < e.col + e.width,
  );
  if (!entity) return null;
  if (entity.type === "turtle" && entity.submerged) return null;
  return entity;
}

// Cada boca ocupa 2 de las 16 columnas, separadas por 1 columna de hueco
// (hueco · boca · hueco · boca · hueco · boca · hueco · boca · hueco · boca · hueco).
const GOAL_SPANS = [0, 1, 2, 3, 4].map((i) => ({ start: 1 + i * 3, width: 2 }));

/**
 * Resuelve el aterrizaje de la rana en la fila de metas: marca la boca
 * correspondiente si estaba libre (`true`) o señala muerte si ya estaba
 * ocupada / la columna no cae en ninguna boca (`false`).
 */
function checkGoal(frog: Frog, goals: boolean[]): boolean {
  const index = GOAL_SPANS.findIndex(
    (g) => frog.col >= g.start && frog.col < g.start + g.width,
  );
  if (index === -1) return false;
  if (goals[index]) return false;
  goals[index] = true;
  return true;
}

const JUMP_MS = 120;
const ROUND_TIME_BASE_MS = 15000;
const ROUND_TIME_MIN_MS = 6000;
const ROUND_TIME_STEP_MS = 1000;
const POINTS_PER_ADVANCE = 10;
const POINTS_GOAL = 50;
const POINTS_ROUND = 200;
const TIME_BONUS_MULT = 10;

function roundTimeForLevel(level: number): number {
  return Math.max(
    ROUND_TIME_BASE_MS - (level - 1) * ROUND_TIME_STEP_MS,
    ROUND_TIME_MIN_MS,
  );
}

interface GameState {
  frog: Frog;
  lanes: Lane[];
  goals: boolean[];
  score: number;
  lives: number;
  level: number;
  bestRowThisRound: number;
  roundTimeLeftMs: number;
  pendingDir: Direction | null;
  over: boolean;
}

function createInitialState(): GameState {
  return {
    frog: {
      col: Math.floor(COLS / 2),
      row: ROW_START,
      animating: false,
      animT: 0,
      targetCol: Math.floor(COLS / 2),
      targetRow: ROW_START,
    },
    lanes: buildLanes(1),
    goals: [false, false, false, false, false],
    score: 0,
    lives: 3,
    level: 1,
    bestRowThisRound: ROW_START,
    roundTimeLeftMs: roundTimeForLevel(1),
    pendingDir: null,
    over: false,
  };
}

export default function FroggerGame({
  paused,
  onScoreChange,
  onLivesChange,
  onLevelChange,
  onGameOver,
}: FroggerGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pausedRef = useRef(paused);
  const callbacksRef = useRef({
    onScoreChange,
    onLivesChange,
    onLevelChange,
    onGameOver,
  });

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    callbacksRef.current = {
      onScoreChange,
      onLivesChange,
      onLevelChange,
      onGameOver,
    };
  }, [onScoreChange, onLivesChange, onLevelChange, onGameOver]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx2d = canvas.getContext("2d");
    if (!ctx2d) return;
    const ctx = ctx2d;

    const state = createInitialState();
    let prevScore = state.score;
    let prevLives = state.lives;
    let prevLevel = state.level;
    let raf = 0;

    function killFrog() {
      state.lives -= 1;
      callbacksRef.current.onLivesChange(state.lives);
      if (state.lives <= 0) {
        callbacksRef.current.onGameOver(state.score);
        state.over = true;
        cancelAnimationFrame(raf);
        return;
      }
      state.frog.col = Math.floor(COLS / 2);
      state.frog.row = ROW_START;
      state.frog.animating = false;
      state.frog.targetCol = state.frog.col;
      state.frog.targetRow = state.frog.row;
      state.bestRowThisRound = ROW_START;
      state.roundTimeLeftMs = roundTimeForLevel(state.level);
    }

    function completeRound() {
      state.frog.col = Math.floor(COLS / 2);
      state.frog.row = ROW_START;
      state.frog.animating = false;
      state.frog.targetCol = state.frog.col;
      state.frog.targetRow = state.frog.row;
      state.bestRowThisRound = ROW_START;
      state.goals = [false, false, false, false, false];
      state.level += 1;
      state.lanes = buildLanes(state.level);
      state.roundTimeLeftMs = roundTimeForLevel(state.level);
      state.score += POINTS_ROUND;
    }

    function handleKeyDown(e: KeyboardEvent) {
      const map: Record<string, Direction> = {
        ArrowUp: "up",
        ArrowDown: "down",
        ArrowLeft: "left",
        ArrowRight: "right",
      };
      const dir = map[e.key];
      if (dir) {
        e.preventDefault();
        state.pendingDir = dir;
      }
    }
    document.addEventListener("keydown", handleKeyDown);

    function update(dt: number) {
      if (pausedRef.current || state.over) return;

      for (const lane of state.lanes) {
        for (const entity of lane.entities) {
          entity.col += (lane.speed * lane.dir * dt) / 16;
          if (lane.dir === 1 && entity.col > COLS) {
            entity.col = -entity.width;
          } else if (lane.dir === -1 && entity.col < -entity.width) {
            entity.col = COLS;
          }
          if (entity.type === "turtle") {
            entity.submergeT = ((entity.submergeT ?? 0) + dt) % TURTLE_CYCLE_MS;
            entity.submerged = entity.submergeT >= TURTLE_VISIBLE_MS;
          }
        }
      }

      const frog = state.frog;

      if (!frog.animating && state.pendingDir) {
        let targetCol = frog.col;
        let targetRow = frog.row;
        if (state.pendingDir === "up") targetRow -= 1;
        else if (state.pendingDir === "down") targetRow += 1;
        else if (state.pendingDir === "left") targetCol -= 1;
        else if (state.pendingDir === "right") targetCol += 1;
        targetCol = Math.max(0, Math.min(COLS - 1, targetCol));
        targetRow = Math.max(ROW_GOALS, Math.min(ROW_START, targetRow));
        state.pendingDir = null;
        if (targetCol !== frog.col || targetRow !== frog.row) {
          frog.animating = true;
          frog.animT = 0;
          frog.targetCol = targetCol;
          frog.targetRow = targetRow;
        }
      } else if (frog.animating) {
        frog.animT += dt;
        if (frog.animT >= JUMP_MS) {
          frog.animating = false;
          frog.col = frog.targetCol;
          frog.row = frog.targetRow;

          if (frog.row < state.bestRowThisRound) {
            state.bestRowThisRound = frog.row;
            state.score += POINTS_PER_ADVANCE;
          }

          if (frog.row >= ROW_ROAD_TOP && frog.row <= ROW_ROAD_BOT) {
            if (checkRoadCollision(frog, state.lanes)) killFrog();
          } else if (frog.row >= ROW_RIVER_TOP && frog.row <= ROW_RIVER_BOT) {
            if (!getSupport(frog, state.lanes)) killFrog();
          } else if (frog.row === ROW_GOALS) {
            if (checkGoal(frog, state.goals)) {
              state.score +=
                POINTS_GOAL +
                Math.round((state.roundTimeLeftMs / 1000) * TIME_BONUS_MULT);
              if (state.goals.every(Boolean)) completeRound();
            } else {
              killFrog();
            }
          }
        }
      }

      if (
        !frog.animating &&
        !state.over &&
        frog.row >= ROW_RIVER_TOP &&
        frog.row <= ROW_RIVER_BOT
      ) {
        const support = getSupport(frog, state.lanes);
        if (!support) {
          killFrog();
        } else {
          const lane = state.lanes.find((l) => l.row === frog.row);
          if (lane) {
            frog.col += (lane.speed * lane.dir * dt) / 16;
            if (frog.col < 0 || frog.col > COLS - 1) killFrog();
          }
        }
      }

      if (!state.over) {
        state.roundTimeLeftMs -= dt;
        if (state.roundTimeLeftMs <= 0) killFrog();
      }

      if (state.score !== prevScore) {
        prevScore = state.score;
        callbacksRef.current.onScoreChange(state.score);
      }
      if (state.lives !== prevLives) {
        prevLives = state.lives;
      }
      if (state.level !== prevLevel) {
        prevLevel = state.level;
        callbacksRef.current.onLevelChange(state.level);
      }
    }

    function drawEntity(entity: Entity, row: number) {
      const x = entity.col * CELL;
      const y = row * CELL;
      const w = entity.width * CELL;
      if (entity.type === "car") {
        ctx.fillStyle = ["#e33", "#ee2", "#38f"][Math.floor(entity.col) % 3];
        ctx.fillRect(x + 2, y + 8, w - 4, CELL - 16);
        ctx.fillStyle = "#111";
        ctx.beginPath();
        ctx.arc(x + 8, y + CELL - 8, 4, 0, Math.PI * 2);
        ctx.arc(x + w - 8, y + CELL - 8, 4, 0, Math.PI * 2);
        ctx.fill();
      } else if (entity.type === "truck") {
        ctx.fillStyle = "#888";
        ctx.fillRect(x + 2, y + 6, w - 4, CELL - 12);
        ctx.fillStyle = "#555";
        ctx.fillRect(x + 2, y + 6, 14, CELL - 12);
      } else if (entity.type === "log") {
        ctx.fillStyle = "#7a4a20";
        ctx.fillRect(x, y + 8, w, CELL - 16);
        ctx.strokeStyle = "#5a3316";
        ctx.beginPath();
        ctx.moveTo(x + 4, y + 12);
        ctx.lineTo(x + w - 4, y + 12);
        ctx.moveTo(x + 4, y + CELL - 12);
        ctx.lineTo(x + w - 4, y + CELL - 12);
        ctx.stroke();
      } else if (entity.type === "turtle") {
        if (entity.submerged) {
          ctx.strokeStyle = "rgba(0,255,136,0.35)";
          ctx.lineWidth = 1;
          for (let i = 0; i < entity.width; i++) {
            ctx.beginPath();
            ctx.arc(x + i * CELL + CELL / 2, y + CELL / 2, 12, 0, Math.PI * 2);
            ctx.stroke();
          }
        } else {
          ctx.fillStyle = "#2fbf4f";
          for (let i = 0; i < entity.width; i++) {
            ctx.beginPath();
            ctx.arc(x + i * CELL + CELL / 2, y + CELL / 2, 14, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    }

    function draw() {
      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

      for (let row = 0; row < ROWS; row++) {
        if (row === ROW_GOALS) ctx.fillStyle = "#2a5a2a";
        else if (row >= ROW_RIVER_TOP && row <= ROW_RIVER_BOT)
          ctx.fillStyle = "#0a1a3a";
        else if (row === ROW_SAFE_MID || row === ROW_START)
          ctx.fillStyle = "#0a2a1a";
        else ctx.fillStyle = "#0a0a0a";
        ctx.fillRect(0, row * CELL, CANVAS_W, CELL);
      }

      for (const lane of state.lanes) {
        for (const entity of lane.entities) {
          drawEntity(entity, lane.row);
        }
      }

      GOAL_SPANS.forEach((g, i) => {
        const x = g.start * CELL;
        const w = g.width * CELL;
        ctx.strokeStyle = "#c9a227";
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 2, 4, w - 4, CELL - 8);
        if (state.goals[i]) {
          ctx.fillStyle = "#2fbf4f";
          ctx.beginPath();
          ctx.ellipse(x + w / 2, 4 + (CELL - 8) / 2, 12, 10, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      const frog = state.frog;
      const t = frog.animating ? frog.animT / JUMP_MS : 1;
      const drawCol = frog.animating
        ? frog.col + (frog.targetCol - frog.col) * t
        : frog.col;
      const drawRow = frog.animating
        ? frog.row + (frog.targetRow - frog.row) * t
        : frog.row;
      const fx = drawCol * CELL + CELL / 2;
      const fy = drawRow * CELL + CELL / 2;
      ctx.fillStyle = "#39ff5f";
      ctx.beginPath();
      ctx.ellipse(fx, fy, 14, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(fx - 5, fy - 6, 3, 0, Math.PI * 2);
      ctx.arc(fx + 5, fy - 6, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#111";
      ctx.beginPath();
      ctx.arc(fx - 5, fy - 6, 1.4, 0, Math.PI * 2);
      ctx.arc(fx + 5, fy - 6, 1.4, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#fff";
      ctx.font = "16px monospace";
      ctx.textAlign = "left";
      ctx.fillText(`${state.score}`, 8, CELL / 2 + 6);
      ctx.textAlign = "center";
      ctx.fillText(`NIVEL ${state.level}`, CANVAS_W / 2, CELL / 2 + 6);
      ctx.textAlign = "right";
      for (let i = 0; i < state.lives; i++) {
        ctx.beginPath();
        ctx.fillStyle = "#39ff5f";
        ctx.arc(CANVAS_W - 12 - i * 18, CELL / 2, 6, 0, Math.PI * 2);
        ctx.fill();
      }

      const total = roundTimeForLevel(state.level);
      const frac = Math.max(0, state.roundTimeLeftMs / total);
      ctx.fillStyle =
        frac > 0.5 ? "#2fbf4f" : frac > 0.2 ? "#e3e320" : "#e33333";
      ctx.fillRect(0, 0, CANVAS_W * frac, 4);
    }

    let last = performance.now();
    function loop(now: number) {
      const dt = now - last;
      last = now;
      update(dt);
      draw();
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("keydown", handleKeyDown);
    };
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
