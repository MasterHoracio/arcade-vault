// ===== lib/games/frogger/engine.ts — motor de Frogger diseñado desde cero =====
// Ver specs/game-jam/frogger/01-frogger-core.md para la mecánica original.
// Este engine sigue el patrón factory del resto del catálogo (ver
// lib/games/serpentina/engine.ts): todo el estado vive en el closure, nunca
// a nivel de módulo, para permitir varias instancias.

import { FROGGER_SKINS, type FroggerPalette } from "./skins";
import { DEFAULT_SKIN, type SkinId } from "@/lib/games/skins";

export interface FroggerHudState {
  score: number;
  lives: number;
  level: number;
}

export interface FroggerCallbacks {
  onStateChange: (state: FroggerHudState) => void;
  onGameOver: (finalScore: number) => void;
}

const COLS = 16;
const ROWS = 14;
const CELL = 40; // px
const CANVAS_W = COLS * CELL; // 640
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

const JUMP_MS = 120;
const ROUND_TIME_BASE_MS = 15000;
const ROUND_TIME_MIN_MS = 6000;
const ROUND_TIME_STEP_MS = 1000;
const POINTS_PER_ADVANCE = 10;
const POINTS_GOAL = 50;
const POINTS_ROUND = 200;
const TIME_BONUS_MULT = 10;
// Cota del dt (ms) para que un tab en background no teletransporte entidades.
const MAX_DT_MS = 50;

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

function roundTimeForLevel(level: number): number {
  return Math.max(
    ROUND_TIME_BASE_MS - (level - 1) * ROUND_TIME_STEP_MS,
    ROUND_TIME_MIN_MS,
  );
}

export function createFroggerGame(
  canvas: HTMLCanvasElement,
  callbacks: FroggerCallbacks,
  options?: { skin?: SkinId },
): {
  start: () => void;
  stop: () => void;
  setPaused: (paused: boolean) => void;
  setSkin: (skin: SkinId) => void;
} {
  const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;

  // ── Skin activo ──────────────────────────────────────────────────────────
  let activeSkin: SkinId = options?.skin ?? DEFAULT_SKIN;
  let palette: FroggerPalette = FROGGER_SKINS[activeSkin];

  // ── Estado de la partida ─────────────────────────────────────────────────
  let frog: Frog;
  let lanes: Lane[];
  let goals: boolean[];
  let score: number;
  let lives: number;
  let level: number;
  let bestRowThisRound: number;
  let roundTimeLeftMs: number;
  let pendingDir: Direction | null;
  let gameState: "playing" | "gameover";
  let gameOverFired: boolean;

  function initGame() {
    frog = {
      col: Math.floor(COLS / 2),
      row: ROW_START,
      animating: false,
      animT: 0,
      targetCol: Math.floor(COLS / 2),
      targetRow: ROW_START,
    };
    lanes = buildLanes(1);
    goals = [false, false, false, false, false];
    score = 0;
    lives = 3;
    level = 1;
    bestRowThisRound = ROW_START;
    roundTimeLeftMs = roundTimeForLevel(1);
    pendingDir = null;
    gameState = "playing";
    gameOverFired = false;
  }

  function killFrog() {
    lives -= 1;
    if (lives <= 0) {
      gameState = "gameover";
      if (!gameOverFired) {
        gameOverFired = true;
        callbacks.onGameOver(score);
      }
      return;
    }
    frog.col = Math.floor(COLS / 2);
    frog.row = ROW_START;
    frog.animating = false;
    frog.targetCol = frog.col;
    frog.targetRow = frog.row;
    bestRowThisRound = ROW_START;
    roundTimeLeftMs = roundTimeForLevel(level);
  }

  function completeRound() {
    frog.col = Math.floor(COLS / 2);
    frog.row = ROW_START;
    frog.animating = false;
    frog.targetCol = frog.col;
    frog.targetRow = frog.row;
    bestRowThisRound = ROW_START;
    goals = [false, false, false, false, false];
    level += 1;
    lanes = buildLanes(level);
    roundTimeLeftMs = roundTimeForLevel(level);
    score += POINTS_ROUND;
  }

  // ── Input ────────────────────────────────────────────────────────────────
  const keyMap: Record<string, Direction> = {
    ArrowUp: "up",
    ArrowDown: "down",
    ArrowLeft: "left",
    ArrowRight: "right",
  };
  function onKeyDown(e: KeyboardEvent) {
    const dir = keyMap[e.key];
    if (!dir) return;
    e.preventDefault();
    pendingDir = dir;
  }

  // ── update/draw ──────────────────────────────────────────────────────────
  function update(dt: number) {
    if (gameState !== "playing") return;

    for (const lane of lanes) {
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

    if (!frog.animating && pendingDir) {
      let targetCol = frog.col;
      let targetRow = frog.row;
      if (pendingDir === "up") targetRow -= 1;
      else if (pendingDir === "down") targetRow += 1;
      else if (pendingDir === "left") targetCol -= 1;
      else if (pendingDir === "right") targetCol += 1;
      targetCol = Math.max(0, Math.min(COLS - 1, targetCol));
      targetRow = Math.max(ROW_GOALS, Math.min(ROW_START, targetRow));
      pendingDir = null;
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

        if (frog.row < bestRowThisRound) {
          bestRowThisRound = frog.row;
          score += POINTS_PER_ADVANCE;
        }

        if (frog.row >= ROW_ROAD_TOP && frog.row <= ROW_ROAD_BOT) {
          if (checkRoadCollision(frog, lanes)) killFrog();
        } else if (frog.row >= ROW_RIVER_TOP && frog.row <= ROW_RIVER_BOT) {
          if (!getSupport(frog, lanes)) killFrog();
        } else if (frog.row === ROW_GOALS) {
          if (checkGoal(frog, goals)) {
            score +=
              POINTS_GOAL +
              Math.round((roundTimeLeftMs / 1000) * TIME_BONUS_MULT);
            if (goals.every(Boolean)) completeRound();
          } else {
            killFrog();
          }
        }
      }
    }

    if (
      gameState === "playing" &&
      !frog.animating &&
      frog.row >= ROW_RIVER_TOP &&
      frog.row <= ROW_RIVER_BOT
    ) {
      const support = getSupport(frog, lanes);
      if (!support) {
        killFrog();
      } else {
        const lane = lanes.find((l) => l.row === frog.row);
        if (lane) {
          frog.col += (lane.speed * lane.dir * dt) / 16;
          if (frog.col < 0 || frog.col > COLS - 1) killFrog();
        }
      }
    }

    if (gameState === "playing") {
      roundTimeLeftMs -= dt;
      if (roundTimeLeftMs <= 0) killFrog();
    }

    callbacks.onStateChange({ score, lives, level });
  }

  /** Activa el halo del skin; no-op cuando shadowBlur es 0 (clasico/retro). */
  function glow() {
    if (palette.shadowBlur <= 0) return;
    ctx.shadowColor = palette.shadowColor;
    ctx.shadowBlur = palette.shadowBlur;
  }

  function clearGlow() {
    ctx.shadowBlur = 0;
    ctx.shadowColor = "transparent";
  }

  function drawEntity(entity: Entity, row: number) {
    const x = entity.col * CELL;
    const y = row * CELL;
    const w = entity.width * CELL;
    if (entity.type === "car") {
      glow();
      ctx.fillStyle = palette.carColors[Math.floor(entity.col) % 3];
      ctx.fillRect(x + 2, y + 8, w - 4, CELL - 16);
      clearGlow();
      ctx.fillStyle = palette.carWheel;
      ctx.beginPath();
      ctx.arc(x + 8, y + CELL - 8, 4, 0, Math.PI * 2);
      ctx.arc(x + w - 8, y + CELL - 8, 4, 0, Math.PI * 2);
      ctx.fill();
    } else if (entity.type === "truck") {
      glow();
      ctx.fillStyle = palette.truckBody;
      ctx.fillRect(x + 2, y + 6, w - 4, CELL - 12);
      clearGlow();
      ctx.fillStyle = palette.truckCab;
      ctx.fillRect(x + 2, y + 6, 14, CELL - 12);
    } else if (entity.type === "log") {
      ctx.fillStyle = palette.logBody;
      ctx.fillRect(x, y + 8, w, CELL - 16);
      ctx.strokeStyle = palette.logGrain;
      ctx.beginPath();
      ctx.moveTo(x + 4, y + 12);
      ctx.lineTo(x + w - 4, y + 12);
      ctx.moveTo(x + 4, y + CELL - 12);
      ctx.lineTo(x + w - 4, y + CELL - 12);
      ctx.stroke();
    } else if (entity.type === "turtle") {
      if (entity.submerged) {
        ctx.strokeStyle = palette.turtleSubmerged;
        ctx.lineWidth = 1;
        for (let i = 0; i < entity.width; i++) {
          ctx.beginPath();
          ctx.arc(x + i * CELL + CELL / 2, y + CELL / 2, 12, 0, Math.PI * 2);
          ctx.stroke();
        }
      } else {
        glow();
        ctx.fillStyle = palette.turtleVisible;
        for (let i = 0; i < entity.width; i++) {
          ctx.beginPath();
          ctx.arc(x + i * CELL + CELL / 2, y + CELL / 2, 14, 0, Math.PI * 2);
          ctx.fill();
        }
        clearGlow();
      }
    }
  }

  function draw() {
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

    for (let row = 0; row < ROWS; row++) {
      if (row === ROW_GOALS) ctx.fillStyle = palette.goalRowBg;
      else if (row >= ROW_RIVER_TOP && row <= ROW_RIVER_BOT)
        ctx.fillStyle = palette.riverBg;
      else if (row === ROW_SAFE_MID || row === ROW_START)
        ctx.fillStyle = palette.safeBg;
      else ctx.fillStyle = palette.roadBg;
      ctx.fillRect(0, row * CELL, CANVAS_W, CELL);
    }

    for (const lane of lanes) {
      for (const entity of lane.entities) {
        drawEntity(entity, lane.row);
      }
    }

    GOAL_SPANS.forEach((g, i) => {
      const x = g.start * CELL;
      const w = g.width * CELL;
      ctx.strokeStyle = palette.goalBorder;
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 2, 4, w - 4, CELL - 8);
      if (goals[i]) {
        ctx.fillStyle = palette.goalFilled;
        ctx.beginPath();
        ctx.ellipse(x + w / 2, 4 + (CELL - 8) / 2, 12, 10, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    const t = frog.animating ? frog.animT / JUMP_MS : 1;
    const drawCol = frog.animating
      ? frog.col + (frog.targetCol - frog.col) * t
      : frog.col;
    const drawRow = frog.animating
      ? frog.row + (frog.targetRow - frog.row) * t
      : frog.row;
    const fx = drawCol * CELL + CELL / 2;
    const fy = drawRow * CELL + CELL / 2;
    glow();
    ctx.fillStyle = palette.frogBody;
    ctx.beginPath();
    ctx.ellipse(fx, fy, 14, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    clearGlow();
    ctx.fillStyle = palette.frogEye;
    ctx.beginPath();
    ctx.arc(fx - 5, fy - 6, 3, 0, Math.PI * 2);
    ctx.arc(fx + 5, fy - 6, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = palette.frogPupil;
    ctx.beginPath();
    ctx.arc(fx - 5, fy - 6, 1.4, 0, Math.PI * 2);
    ctx.arc(fx + 5, fy - 6, 1.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = palette.hudText;
    ctx.font = "16px monospace";
    ctx.textAlign = "left";
    ctx.fillText(`${score}`, 8, CELL / 2 + 6);
    ctx.textAlign = "center";
    ctx.fillText(`NIVEL ${level}`, CANVAS_W / 2, CELL / 2 + 6);
    ctx.textAlign = "right";
    for (let i = 0; i < lives; i++) {
      ctx.beginPath();
      ctx.fillStyle = palette.lifeIcon;
      ctx.arc(CANVAS_W - 12 - i * 18, CELL / 2, 6, 0, Math.PI * 2);
      ctx.fill();
    }

    const total = roundTimeForLevel(level);
    const frac = Math.max(0, roundTimeLeftMs / total);
    ctx.fillStyle =
      frac > 0.5
        ? palette.timeHigh
        : frac > 0.2
          ? palette.timeMid
          : palette.timeLow;
    ctx.fillRect(0, 0, CANVAS_W * frac, 4);
  }

  // ── Loop principal ──────────────────────────────────────────────────────
  let lastTime: number | null = null;
  let rafId: number | null = null;
  let paused = false;
  let stopped = true;

  function loop(ts: number) {
    const dt = lastTime === null ? 0 : Math.min(ts - lastTime, MAX_DT_MS);
    lastTime = ts;
    update(dt);
    draw();
    rafId = requestAnimationFrame(loop);
  }

  function start() {
    window.addEventListener("keydown", onKeyDown);
    initGame();
    lastTime = null;
    paused = false;
    stopped = false;
    rafId = requestAnimationFrame(loop);
  }

  function stop() {
    stopped = true;
    if (rafId !== null) cancelAnimationFrame(rafId);
    rafId = null;
    window.removeEventListener("keydown", onKeyDown);
  }

  function setPaused(p: boolean) {
    if (p === paused || stopped) return;
    paused = p;
    if (paused) {
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = null;
    } else {
      lastTime = null;
      rafId = requestAnimationFrame(loop);
    }
  }

  /**
   * Cambia la paleta activa y repinta de inmediato. No toca el estado de la
   * partida ni dispara onGameOver: el jugador puede alternar skins a media
   * partida o en pausa sin perder nada.
   */
  function setSkin(skin: SkinId) {
    activeSkin = skin;
    palette = FROGGER_SKINS[skin];
    if (!stopped && frog) draw();
  }

  return { start, stop, setPaused, setSkin };
}
