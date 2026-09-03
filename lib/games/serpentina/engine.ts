// ===== lib/games/serpentina/engine.ts — motor de Snake diseñado desde cero =====

import { SPRITE_ATLAS } from "./sprites";
import { SERPENTINA_SKINS, type FruitTint } from "./skins";
import { DEFAULT_SKIN, type SkinId } from "@/lib/games/skins";

export interface SerpentinaHudState {
  score: number;
  lives: number;
  level: number; // 1-10
}

export interface SerpentinaCallbacks {
  onStateChange: (state: SerpentinaHudState) => void;
  onGameOver: (finalScore: number) => void;
}

export function createSerpentinaGame(
  canvas: HTMLCanvasElement,
  callbacks: SerpentinaCallbacks,
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
  let palette = SERPENTINA_SKINS[activeSkin];

  // ── Constantes de tablero ────────────────────────────────────────────────
  const GRID_COLS = 40;
  const GRID_ROWS = 30;
  const CELL = 20;
  const START_LENGTH = 3;
  const START_X = 20;
  const START_Y = 15;
  const BASE_SPEED = 6; // celdas/seg
  const MAX_LEVEL = 10;
  const MAX_SPEED = 15; // celdas/seg
  const FRUITS_PER_LEVEL = 10;

  const FRUIT_NAMES = Object.keys(SPRITE_ATLAS.fruits);

  // ── Carga y re-tinte de sprites ──────────────────────────────────────────
  // Una copia offscreen por skin, generada una sola vez al cargar el PNG.
  // `setSkin` solo cambia cuál de esas copias usa `drawImage`.
  let fruitSheets: Partial<Record<SkinId, CanvasImageSource>> = {};
  let fruitsLoaded = false;

  /** Genera la variante re-tintada del spritesheet en un canvas offscreen. */
  function tintSheet(
    img: HTMLImageElement,
    tint: FruitTint,
  ): CanvasImageSource {
    const oc = document.createElement("canvas");
    oc.width = img.width;
    oc.height = img.height;
    const octx = oc.getContext("2d") as CanvasRenderingContext2D;

    // 1. Base filtrada (saturación / escala de grises).
    octx.filter = tint.filter;
    octx.drawImage(img, 0, 0);
    octx.filter = "none";

    // 2. Matiz monocromo modulado por luminancia (solo retro).
    if (tint.multiply) {
      octx.globalCompositeOperation = "multiply";
      octx.fillStyle = tint.multiply;
      octx.fillRect(0, 0, oc.width, oc.height);
    }

    // 3. Piso de luminancia: ningún píxel queda por debajo de este color.
    octx.globalCompositeOperation = "lighten";
    octx.fillStyle = tint.floor;
    octx.fillRect(0, 0, oc.width, oc.height);

    // 4. Los pasos 2 y 3 pintan el rectángulo completo: recuperar el alfa
    //    original del PNG para no dejar un bloque sólido de color.
    octx.globalCompositeOperation = "destination-in";
    octx.drawImage(img, 0, 0);
    octx.globalCompositeOperation = "source-over";

    return oc;
  }

  function loadFruitsImage(cb: () => void) {
    const img = new Image();
    img.onload = () => {
      const sheets: Partial<Record<SkinId, CanvasImageSource>> = {};
      for (const id of Object.keys(SERPENTINA_SKINS) as SkinId[]) {
        const tint = SERPENTINA_SKINS[id].fruitTint;
        // clasico: PNG original, sin ningún filtro.
        sheets[id] = tint ? tintSheet(img, tint) : img;
      }
      fruitSheets = sheets;
      fruitsLoaded = true;
      cb();
    };
    img.onerror = () => console.error("Failed to load fruits spritesheet");
    img.src = SPRITE_ATLAS.sources.fruits;
  }

  // ── Estado del juego ──────────────────────────────────────────────────────
  interface Cell {
    x: number;
    y: number;
  }
  interface Fruit extends Cell {
    sprite: string;
  }

  let snake: Cell[] = [];
  let direction: Cell = { x: 1, y: 0 };
  let pendingDirection: Cell = { x: 1, y: 0 };
  let fruit: Fruit | null = null;
  let score = 0;
  let lives = 3;
  let level = 1;
  let fruitsEaten = 0;
  let gameState: "playing" | "gameover" = "playing";
  let gameOverFired = false;

  function currentSpeed() {
    return Math.min(BASE_SPEED + (level - 1), MAX_SPEED);
  }

  function resetSnake() {
    snake = [];
    for (let i = 0; i < START_LENGTH; i++) {
      snake.push({ x: START_X - i, y: START_Y });
    }
    direction = { x: 1, y: 0 };
    pendingDirection = { x: 1, y: 0 };
  }

  function occupiedByBody(x: number, y: number) {
    return snake.some((s) => s.x === x && s.y === y);
  }

  function spawnFruit() {
    const empty: Cell[] = [];
    for (let y = 0; y < GRID_ROWS; y++) {
      for (let x = 0; x < GRID_COLS; x++) {
        if (!occupiedByBody(x, y)) empty.push({ x, y });
      }
    }
    const cell = empty[Math.floor(Math.random() * empty.length)];
    const sprite = FRUIT_NAMES[Math.floor(Math.random() * FRUIT_NAMES.length)];
    fruit = { ...cell, sprite };
  }

  function initGame() {
    resetSnake();
    score = 0;
    lives = 3;
    level = 1;
    fruitsEaten = 0;
    gameState = "playing";
    gameOverFired = false;
    spawnFruit();
  }

  const keys: Record<string, Cell> = {
    ArrowUp: { x: 0, y: -1 },
    ArrowDown: { x: 0, y: 1 },
    ArrowLeft: { x: -1, y: 0 },
    ArrowRight: { x: 1, y: 0 },
  };

  function onKeyDown(e: KeyboardEvent) {
    const dir = keys[e.key];
    if (!dir) return;
    e.preventDefault();
    // No se permite invertir 180° directamente sobre el propio cuello.
    if (dir.x === -direction.x && dir.y === -direction.y) return;
    pendingDirection = dir;
  }

  function tick() {
    if (gameState !== "playing") return;

    direction = pendingDirection;

    const head = snake[0];
    const newHead: Cell = { x: head.x + direction.x, y: head.y + direction.y };

    const hitsWall =
      newHead.x < 0 ||
      newHead.x >= GRID_COLS ||
      newHead.y < 0 ||
      newHead.y >= GRID_ROWS;
    const hitsSelf = occupiedByBody(newHead.x, newHead.y);

    if (hitsWall || hitsSelf) {
      lives--;
      if (lives <= 0) {
        lives = 0;
        gameState = "gameover";
      } else {
        resetSnake();
      }
    } else {
      const ateFruit =
        fruit !== null && newHead.x === fruit.x && newHead.y === fruit.y;
      snake.unshift(newHead);
      if (ateFruit) {
        score += 10;
        fruitsEaten++;
        level = Math.min(
          MAX_LEVEL,
          Math.floor(fruitsEaten / FRUITS_PER_LEVEL) + 1,
        );
        spawnFruit();
      } else {
        snake.pop();
      }
    }

    if (gameState === "gameover" && !gameOverFired) {
      gameOverFired = true;
      callbacks.onGameOver(score);
    }

    callbacks.onStateChange({ score, lives, level });
  }

  function drawFruit() {
    const sheet = fruitSheets[activeSkin];
    if (!fruit || !fruitsLoaded || !sheet) return;
    const rect = SPRITE_ATLAS.fruits[fruit.sprite];
    if (!rect) return;
    ctx.drawImage(
      sheet,
      rect.x,
      rect.y,
      rect.w,
      rect.h,
      fruit.x * CELL,
      fruit.y * CELL,
      CELL,
      CELL,
    );
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

  function draw() {
    ctx.fillStyle = palette.background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    glow();
    ctx.fillStyle = palette.snakeBody;
    for (const s of snake) {
      ctx.fillRect(s.x * CELL, s.y * CELL, CELL, CELL);
    }
    // La cabeza se repinta encima; en clasico usa el mismo verde que el cuerpo,
    // así que el resultado es idéntico al look original.
    const head = snake[0];
    if (head) {
      ctx.fillStyle = palette.snakeHead;
      ctx.fillRect(head.x * CELL, head.y * CELL, CELL, CELL);
    }

    drawFruit();
    clearGlow();

    if (gameState === "gameover") {
      ctx.fillStyle = palette.overlayScrim;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = palette.overlayTitle;
      ctx.font = "bold 64px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2);
    }
  }

  // ── Loop principal ──────────────────────────────────────────────────────
  let lastTime: number | null = null;
  let rafId: number | null = null;
  let tickAccumulator = 0;
  let paused = false;
  let stopped = true;

  function loop(ts: number) {
    const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, 0.05);
    lastTime = ts;

    tickAccumulator += dt;
    const tickInterval = 1 / currentSpeed();
    while (tickAccumulator >= tickInterval && gameState === "playing") {
      tickAccumulator -= tickInterval;
      tick();
    }

    draw();
    rafId = requestAnimationFrame(loop);
  }

  function start() {
    window.addEventListener("keydown", onKeyDown);
    initGame();
    lastTime = null;
    tickAccumulator = 0;
    paused = false;
    stopped = false;
    if (fruitsLoaded) {
      rafId = requestAnimationFrame(loop);
    } else {
      loadFruitsImage(() => {
        // La carga es asíncrona: si stop() ya se llamó (p. ej. por el
        // doble-montaje de React Strict Mode en desarrollo), esta instancia
        // "zombie" no debe arrancar su propio loop.
        if (!stopped && !paused) rafId = requestAnimationFrame(loop);
      });
    }
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
      if (fruitsLoaded) rafId = requestAnimationFrame(loop);
    }
  }

  /**
   * Cambia la paleta activa y repinta de inmediato. No toca el estado de la
   * partida (snake, score, lives, level, fruta) ni dispara onGameOver: el
   * jugador puede alternar skins a media partida o en pausa sin perder nada.
   */
  function setSkin(skin: SkinId) {
    activeSkin = skin;
    palette = SERPENTINA_SKINS[skin];
    // Repintado inmediato solo si la partida ya arrancó (snake inicializada);
    // en pausa el loop está detenido, así que este draw() es el único repintado.
    if (!stopped && snake.length > 0) draw();
  }

  return { start, stop, setPaused, setSkin };
}
