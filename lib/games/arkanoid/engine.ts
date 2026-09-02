// ===== lib/games/arkanoid/engine.ts — puerto TS de references/started-games/04-arkanoid/game.js =====

import type { SkinId } from "@/lib/games/skins";

export interface ArkanoidHudState {
  score: number;
  lives: number;
  level: number; // 1-5
}

export interface ArkanoidCallbacks {
  onStateChange: (state: ArkanoidHudState) => void;
  onGameOver: (finalScore: number) => void;
}

// ── assets/spritesheet.js ────────────────────────────────────────────────────
interface SpriteFrame {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
}

const EXPLOSION_FRAMES: Record<string, SpriteFrame[]> = {
  red: [
    { sx: 256, sy: 176, sw: 32, sh: 16 },
    { sx: 288, sy: 176, sw: 32, sh: 16 },
    { sx: 320, sy: 176, sw: 32, sh: 16 },
    { sx: 352, sy: 176, sw: 32, sh: 16 },
  ],
  cyan: [
    { sx: 256, sy: 192, sw: 32, sh: 16 },
    { sx: 288, sy: 192, sw: 32, sh: 16 },
    { sx: 320, sy: 192, sw: 32, sh: 16 },
    { sx: 352, sy: 192, sw: 32, sh: 16 },
  ],
  green: [
    { sx: 256, sy: 208, sw: 32, sh: 16 },
    { sx: 288, sy: 208, sw: 32, sh: 16 },
    { sx: 320, sy: 208, sw: 32, sh: 16 },
    { sx: 352, sy: 208, sw: 32, sh: 16 },
  ],
  magenta: [
    { sx: 256, sy: 224, sw: 32, sh: 16 },
    { sx: 288, sy: 224, sw: 32, sh: 16 },
    { sx: 320, sy: 224, sw: 32, sh: 16 },
    { sx: 352, sy: 224, sw: 32, sh: 16 },
  ],
  yellow: [
    { sx: 256, sy: 240, sw: 32, sh: 16 },
    { sx: 288, sy: 240, sw: 32, sh: 16 },
    { sx: 320, sy: 240, sw: 32, sh: 16 },
    { sx: 352, sy: 240, sw: 32, sh: 16 },
  ],
  hotpink: [
    { sx: 256, sy: 256, sw: 32, sh: 16 },
    { sx: 288, sy: 256, sw: 32, sh: 16 },
    { sx: 320, sy: 256, sw: 32, sh: 16 },
    { sx: 352, sy: 256, sw: 32, sh: 16 },
  ],
  gray: [
    { sx: 256, sy: 176, sw: 32, sh: 16 },
    { sx: 288, sy: 176, sw: 32, sh: 16 },
    { sx: 320, sy: 176, sw: 32, sh: 16 },
    { sx: 352, sy: 176, sw: 32, sh: 16 },
  ],
};

const EXPLOSION_DURATION = 150;

const SPRITES = {
  paddle: { sx: 32, sy: 112, sw: 162, sh: 14 },
  ball: { sx: 32, sy: 32, sw: 16, sh: 16 },
  blocks: {
    gray: { sx: 32, sy: 288, sw: 32, sh: 16 },
    red: { sx: 32, sy: 176, sw: 32, sh: 16 },
    yellow: { sx: 32, sy: 240, sw: 32, sh: 16 },
    cyan: { sx: 32, sy: 192, sw: 32, sh: 16 },
    magenta: { sx: 32, sy: 224, sw: 32, sh: 16 },
    hotpink: { sx: 32, sy: 256, sw: 32, sh: 16 },
    green: { sx: 32, sy: 208, sw: 32, sh: 16 },
  } as Record<string, SpriteFrame>,
};

// ── levels.js ─────────────────────────────────────────────────────────────
interface BlockDef {
  col: number;
  row: number;
  color: string;
}

interface LevelDef {
  speed: number;
  blocks: BlockDef[];
}

const LEVELS: LevelDef[] = (() => {
  const rowColors1 = ["red", "yellow", "cyan", "magenta", "hotpink", "green"];
  const rowColors2 = ["gray", "cyan", "hotpink", "yellow", "magenta", "green"];
  const rowColors4 = ["cyan", "magenta", "green", "yellow", "hotpink", "red"];

  const l1: BlockDef[] = [];
  for (let row = 0; row < 6; row++)
    for (let col = 0; col < 10; col++)
      l1.push({ col, row, color: rowColors1[row] });

  const l2: BlockDef[] = [];
  const pyStart = [4, 3, 2, 1, 0, 0];
  const pyEnd = [5, 6, 7, 8, 9, 9];
  for (let row = 0; row < 6; row++)
    for (let col = pyStart[row]; col <= pyEnd[row]; col++)
      l2.push({ col, row, color: rowColors2[row] });

  const l3: BlockDef[] = [];
  for (let row = 0; row < 6; row++)
    for (let col = 0; col < 10; col++)
      if ((col + row) % 2 === 0)
        l3.push({ col, row, color: row < 3 ? "yellow" : "magenta" });

  const gaps4 = [
    [2, 5, 8],
    [0, 4, 7, 9],
    [1, 3, 6],
    [2, 5, 8, 9],
    [0, 4, 7],
    [1, 3, 6, 9],
  ];
  const l4: BlockDef[] = [];
  for (let row = 0; row < 6; row++)
    for (let col = 0; col < 10; col++)
      if (!gaps4[row].includes(col))
        l4.push({ col, row, color: rowColors4[row] });

  const l5: BlockDef[] = [];
  for (let row = 0; row < 6; row++)
    for (let col = 0; col < 10; col++) {
      const isFrame = col === 0 || col === 9 || row === 0 || row === 5;
      const isCross = col === 4 || row === 2;
      if (isFrame || isCross)
        l5.push({ col, row, color: isCross && !isFrame ? "hotpink" : "cyan" });
    }

  return [
    { speed: 1.0, blocks: l1 },
    { speed: 1.1, blocks: l2 },
    { speed: 1.21, blocks: l3 },
    { speed: 1.33, blocks: l4 },
    { speed: 1.46, blocks: l5 },
  ];
})();

export function createArkanoidGame(
  canvas: HTMLCanvasElement,
  callbacks: ArkanoidCallbacks,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  options?: { skin?: SkinId },
): {
  start: () => void;
  stop: () => void;
  setPaused: (paused: boolean) => void;
  setSkin: (skin: SkinId) => void;
} {
  const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;

  // ── game.js constants ──────────────────────────────────────────────────
  const PADDLE_SPEED = 400;
  const BLOCK_COLS = 10;
  const BLOCK_ROWS = 6;
  const BLOCK_W = 64;
  const BLOCK_H = 24;
  const BLOCKS_ORIGIN_X = (canvas.width - BLOCK_COLS * BLOCK_W) / 2;
  const BLOCKS_ORIGIN_Y = 80;
  const BASE_BALL_VX = 170;
  const BASE_BALL_VY = -255;

  // ── Spritesheet loading ───────────────────────────────────────────────
  let ssImg: HTMLCanvasElement | null = null;
  let ssLoaded = false;

  function loadSpritesheet(cb: () => void) {
    const rawImg = new Image();
    rawImg.onload = () => {
      const oc = document.createElement("canvas");
      oc.width = rawImg.width;
      oc.height = rawImg.height;
      const octx = oc.getContext("2d") as CanvasRenderingContext2D;
      octx.drawImage(rawImg, 0, 0);
      ssImg = oc;
      ssLoaded = true;
      cb();
    };
    rawImg.onerror = () => console.error("Failed to load spritesheet");
    rawImg.src = "/juegos/arkanoid/spritesheet-breakout.png";
  }

  function drawFrame(
    context: CanvasRenderingContext2D,
    frame: SpriteFrame,
    x: number,
    y: number,
    w: number,
    h: number,
  ) {
    if (!ssLoaded || !ssImg) return;
    context.drawImage(
      ssImg,
      frame.sx,
      frame.sy,
      frame.sw,
      frame.sh,
      x,
      y,
      w,
      h,
    );
  }

  function drawSprite(
    context: CanvasRenderingContext2D,
    name: string,
    x: number,
    y: number,
    w: number,
    h: number,
  ) {
    if (!ssLoaded || !ssImg) return;
    let sp: SpriteFrame | undefined;
    if (name.startsWith("block_")) {
      sp = SPRITES.blocks[name.slice(6)];
    } else {
      sp = SPRITES[name as "paddle" | "ball"];
    }
    if (!sp) return;
    context.drawImage(ssImg, sp.sx, sp.sy, sp.sw, sp.sh, x, y, w, h);
  }

  // ── Estado del juego ──────────────────────────────────────────────────
  interface Paddle {
    x: number;
    y: number;
    w: number;
    h: number;
  }
  interface Ball {
    x: number;
    y: number;
    w: number;
    h: number;
    vx: number;
    vy: number;
  }
  interface Block {
    x: number;
    y: number;
    w: number;
    h: number;
    color: string;
    alive: boolean;
  }
  interface Explosion {
    x: number;
    y: number;
    w: number;
    h: number;
    color: string;
    elapsed: number;
  }

  const paddle: Paddle = { x: 0, y: 560, w: 81, h: 14 };
  const ball: Ball = { x: 0, y: 0, w: 16, h: 16, vx: 0, vy: 0 };

  let blocks: Block[] = [];
  let explosions: Explosion[] = [];
  let lives = 3;
  let score = 0;
  let gameState: "playing" | "gameover" | "win" = "playing";
  let currentLevel = 1;
  let gameOverFired = false;
  // La bola queda pegada a la paleta al iniciar y tras perder una vida;
  // se lanza al pulsar Espacio (no forma parte del game.js original).
  let ballAttached = true;

  const keys: Record<string, boolean> = {
    ArrowLeft: false,
    ArrowRight: false,
    " ": false,
  };

  function onKeyDown(e: KeyboardEvent) {
    if (e.key in keys) {
      keys[e.key] = true;
      e.preventDefault();
    }
  }
  function onKeyUp(e: KeyboardEvent) {
    if (e.key in keys) keys[e.key] = false;
  }

  function initPaddle() {
    paddle.x = (canvas.width - paddle.w) / 2;
  }

  function attachBallToPaddle() {
    ball.x = paddle.x + (paddle.w - ball.w) / 2;
    ball.y = paddle.y - ball.h;
    ball.vx = 0;
    ball.vy = 0;
    ballAttached = true;
  }

  function launchBall() {
    const speed = LEVELS[currentLevel - 1].speed;
    ball.vx = BASE_BALL_VX * speed;
    ball.vy = BASE_BALL_VY * speed;
    ballAttached = false;
  }

  function initBall() {
    attachBallToPaddle();
  }

  function loadLevel(n: number) {
    currentLevel = n;
    const level = LEVELS[n - 1];
    blocks = level.blocks.map((b) => ({
      x: BLOCKS_ORIGIN_X + b.col * BLOCK_W,
      y: BLOCKS_ORIGIN_Y + b.row * BLOCK_H,
      w: BLOCK_W,
      h: BLOCK_H,
      color: b.color,
      alive: true,
    }));
    explosions = [];
    attachBallToPaddle();
  }

  function collideAABB(block: Block) {
    return (
      ball.x < block.x + block.w &&
      ball.x + ball.w > block.x &&
      ball.y < block.y + block.h &&
      ball.y + ball.h > block.y
    );
  }

  function initGame() {
    blocks = [];
    explosions = [];
    lives = 3;
    score = 0;
    gameState = "playing";
    currentLevel = 1;
    gameOverFired = false;
    initPaddle();
    loadLevel(1);
  }

  function update(dt: number) {
    if (gameState !== "playing") return;

    // Paddle
    if (keys.ArrowLeft) paddle.x = Math.max(0, paddle.x - PADDLE_SPEED * dt);
    if (keys.ArrowRight)
      paddle.x = Math.min(
        canvas.width - paddle.w,
        paddle.x + PADDLE_SPEED * dt,
      );

    if (ballAttached) {
      // La bola sigue a la paleta hasta que se lanza con Espacio.
      ball.x = paddle.x + (paddle.w - ball.w) / 2;
      ball.y = paddle.y - ball.h;
      if (keys[" "]) launchBall();
    } else {
      // Ball movement
      ball.x += ball.vx * dt;
      ball.y += ball.vy * dt;

      // Wall bounces (left, right, top)
      if (ball.x <= 0) {
        ball.x = 0;
        ball.vx = Math.abs(ball.vx);
      }
      if (ball.x + ball.w >= canvas.width) {
        ball.x = canvas.width - ball.w;
        ball.vx = -Math.abs(ball.vx);
      }
      if (ball.y <= 0) {
        ball.y = 0;
        ball.vy = Math.abs(ball.vy);
      }

      // Paddle bounce
      if (
        ball.vy > 0 &&
        ball.x + ball.w > paddle.x &&
        ball.x < paddle.x + paddle.w &&
        ball.y + ball.h >= paddle.y &&
        ball.y + ball.h <= paddle.y + paddle.h + 8
      ) {
        ball.y = paddle.y - ball.h;
        ball.vy = -Math.abs(ball.vy);
      }

      // Block collisions
      for (const block of blocks) {
        if (!block.alive) continue;
        if (collideAABB(block)) {
          block.alive = false;
          explosions.push({
            x: block.x,
            y: block.y,
            w: block.w,
            h: block.h,
            color: block.color,
            elapsed: 0,
          });
          score += 10;
          ball.vy = -ball.vy;
          if (blocks.every((b) => !b.alive)) {
            if (currentLevel < 5) loadLevel(currentLevel + 1);
            else gameState = "win";
          }
          break; // one block per frame
        }
      }
    }

    // Explosions
    for (const exp of explosions) exp.elapsed += dt * 1000;
    explosions = explosions.filter((exp) => exp.elapsed < EXPLOSION_DURATION);

    // Ball lost
    if (!ballAttached && ball.y > canvas.height) {
      lives--;
      if (lives <= 0) {
        lives = 0;
        gameState = "gameover";
      } else {
        initBall();
      }
    }

    if ((gameState === "gameover" || gameState === "win") && !gameOverFired) {
      gameOverFired = true;
      callbacks.onGameOver(score);
    }

    callbacks.onStateChange({ score, lives, level: currentLevel });
  }

  function drawOverlay(message: string) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 64px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(message, canvas.width / 2, canvas.height / 2);
  }

  function draw() {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (const block of blocks) {
      if (block.alive)
        drawSprite(
          ctx,
          "block_" + block.color,
          block.x,
          block.y,
          block.w,
          block.h,
        );
    }

    for (const exp of explosions) {
      const frameIndex = Math.min(
        Math.floor((exp.elapsed / EXPLOSION_DURATION) * 4),
        3,
      );
      drawFrame(
        ctx,
        EXPLOSION_FRAMES[exp.color][frameIndex],
        exp.x,
        exp.y,
        exp.w,
        exp.h,
      );
    }

    drawSprite(ctx, "paddle", paddle.x, paddle.y, paddle.w, paddle.h);
    drawSprite(ctx, "ball", ball.x, ball.y, ball.w, ball.h);

    if (gameState === "playing") {
      ctx.fillStyle = "#fff";
      ctx.font = "bold 18px monospace";
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillText("Score: " + score, 10, 10);
      ctx.textAlign = "center";
      ctx.fillText("Nivel: " + currentLevel, canvas.width / 2, 10);
      const ballSize = 16;
      const ballSpacing = 4;
      for (let i = 0; i < lives; i++) {
        const bx = canvas.width - 10 - (lives - i) * (ballSize + ballSpacing);
        drawSprite(ctx, "ball", bx, 10, ballSize, ballSize);
      }
    }

    if (gameState === "gameover") drawOverlay("GAME OVER");
    if (gameState === "win") drawOverlay("¡Completaste el juego!");
  }

  // ── Loop principal ──────────────────────────────────────────────────────
  let lastTime: number | null = null;
  let rafId: number | null = null;
  let paused = false;
  let stopped = true;

  function loop(ts: number) {
    const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, 0.05);
    lastTime = ts;
    update(dt);
    draw();
    rafId = requestAnimationFrame(loop);
  }

  function start() {
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    initGame();
    lastTime = null;
    paused = false;
    stopped = false;
    if (ssLoaded) {
      rafId = requestAnimationFrame(loop);
    } else {
      loadSpritesheet(() => {
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
    window.removeEventListener("keyup", onKeyUp);
  }

  function setPaused(p: boolean) {
    if (p === paused || stopped) return;
    paused = p;
    if (paused) {
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = null;
    } else {
      lastTime = null;
      if (ssLoaded) rafId = requestAnimationFrame(loop);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function setSkin(_skin: SkinId) {
    // TODO(skin-designer): solo "clasico" implementado — el look actual del
    // juego es "clasico" por definición. "neon"/"retro" pendientes.
  }

  return { start, stop, setPaused, setSkin };
}
