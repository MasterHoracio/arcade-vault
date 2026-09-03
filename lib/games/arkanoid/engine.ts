// ===== lib/games/arkanoid/engine.ts — puerto TS de references/started-games/04-arkanoid/game.js =====

import { DEFAULT_SKIN, SKIN_IDS, type SkinId } from "@/lib/games/skins";
import {
  ARKANOID_SKINS,
  type ArkanoidSpriteRole,
} from "@/lib/games/arkanoid/skins";

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

// ── Re-tinte de sprites por skin ──────────────────────────────────────────
// El color de Arkanoid vive dentro del PNG, así que cada skin distinto de
// "clasico" necesita una copia re-tintada del spritesheet en un canvas
// offscreen (una sola vez al cargar el asset, nunca por frame).
//
// `norm` = 255 / luminancia del color de cuerpo original de esa región, medida
// sobre el PNG. Al dibujar la región con `grayscale(1) brightness(norm)` el
// cuerpo del sprite queda en blanco y el bisel/borde conservan su gradación
// relativa; el `multiply` posterior contra el color del skin deja el cuerpo
// exactamente en ese color (por eso el contraste WCAG se calcula sobre él).
interface TintRegion {
  role: ArkanoidSpriteRole;
  x: number;
  y: number;
  w: number;
  h: number;
  norm: number;
}

const TINT_REGIONS: TintRegion[] = [
  // Bloques (32x16). El nombre es la clave del original, no el matiz real.
  { role: "red", x: 32, y: 176, w: 32, h: 16, norm: 3.385 }, // cuerpo #c02a3e
  { role: "cyan", x: 32, y: 192, w: 32, h: 16, norm: 1.484 }, // cuerpo #4fc99c
  { role: "green", x: 32, y: 208, w: 32, h: 16, norm: 1.66 }, // cuerpo #44aaf3
  { role: "magenta", x: 32, y: 224, w: 32, h: 16, norm: 3.528 }, // cuerpo #632ff4
  { role: "yellow", x: 32, y: 240, w: 32, h: 16, norm: 1.365 }, // cuerpo #d9bd4c
  { role: "hotpink", x: 32, y: 256, w: 32, h: 16, norm: 1.759 }, // cuerpo #fc7d1c
  { role: "gray", x: 32, y: 288, w: 32, h: 16, norm: 2.541 }, // cuerpo #646373
  // Filas de explosión (4 frames de 32x16 contiguos = 128x16), mismo matiz de
  // origen que su bloque, así que comparten `norm` y color objetivo.
  { role: "red", x: 256, y: 176, w: 128, h: 16, norm: 3.385 },
  { role: "cyan", x: 256, y: 192, w: 128, h: 16, norm: 1.484 },
  { role: "green", x: 256, y: 208, w: 128, h: 16, norm: 1.66 },
  { role: "magenta", x: 256, y: 224, w: 128, h: 16, norm: 3.528 },
  { role: "yellow", x: 256, y: 240, w: 128, h: 16, norm: 1.365 },
  { role: "hotpink", x: 256, y: 256, w: 128, h: 16, norm: 1.759 },
  // Paleta y bola comparten el mismo gris metálico de cuerpo (#babac5).
  { role: "paddle", x: 32, y: 112, w: 162, h: 14, norm: 1.365 },
  { role: "ball", x: 32, y: 32, w: 16, h: 16, norm: 1.365 },
];

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

  // ── Skin activo ───────────────────────────────────────────────────────
  let activeSkin: SkinId = options?.skin ?? DEFAULT_SKIN;
  const palette = () => ARKANOID_SKINS[activeSkin];

  function glow(role: ArkanoidSpriteRole) {
    const p = palette();
    if (p.shadowBlur > 0 && p.sprites) {
      ctx.shadowColor = p.sprites[role];
      ctx.shadowBlur = p.shadowBlur;
    }
  }
  function clearGlow() {
    ctx.shadowBlur = 0;
    ctx.shadowColor = "transparent";
  }

  // ── Spritesheet loading ───────────────────────────────────────────────
  // Una hoja offscreen por skin, cacheada al cargar el PNG. setSkin solo
  // cambia cuál de estas hojas usa drawImage — nunca re-tiñe por frame.
  const sheets: Partial<Record<SkinId, HTMLCanvasElement>> = {};
  let ssLoaded = false;

  /** Re-tiñe una región del spritesheet al color del skin, conservando bisel y alfa. */
  function tintRegion(
    target: CanvasRenderingContext2D,
    raw: CanvasImageSource,
    r: TintRegion,
    color: string,
  ) {
    const tile = document.createElement("canvas");
    tile.width = r.w;
    tile.height = r.h;
    const tctx = tile.getContext("2d") as CanvasRenderingContext2D;
    // 1. gris normalizado: el cuerpo del sprite sube a blanco.
    tctx.filter = `grayscale(1) brightness(${r.norm})`;
    tctx.drawImage(raw, r.x, r.y, r.w, r.h, 0, 0, r.w, r.h);
    tctx.filter = "none";
    // 2. multiply: cuerpo -> color exacto del skin, bisel -> sombras del mismo matiz.
    tctx.globalCompositeOperation = "multiply";
    tctx.fillStyle = color;
    tctx.fillRect(0, 0, r.w, r.h);
    // 3. multiply también pinta donde el PNG era transparente: recorta con la máscara alfa original.
    tctx.globalCompositeOperation = "destination-in";
    tctx.drawImage(raw, r.x, r.y, r.w, r.h, 0, 0, r.w, r.h);
    tctx.globalCompositeOperation = "source-over";

    target.clearRect(r.x, r.y, r.w, r.h);
    target.drawImage(tile, r.x, r.y);
  }

  function buildSheets(raw: HTMLImageElement) {
    for (const skin of SKIN_IDS) {
      const oc = document.createElement("canvas");
      oc.width = raw.width;
      oc.height = raw.height;
      const octx = oc.getContext("2d") as CanvasRenderingContext2D;
      octx.drawImage(raw, 0, 0);
      const sprites = ARKANOID_SKINS[skin].sprites;
      // sprites === null (clasico): el PNG queda intacto, sin ningún filtro.
      if (sprites) {
        for (const region of TINT_REGIONS)
          tintRegion(octx, raw, region, sprites[region.role]);
      }
      sheets[skin] = oc;
    }
  }

  function loadSpritesheet(cb: () => void) {
    const rawImg = new Image();
    rawImg.onload = () => {
      buildSheets(rawImg);
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
    const sheet = sheets[activeSkin];
    if (!ssLoaded || !sheet) return;
    context.drawImage(
      sheet,
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
    const sheet = sheets[activeSkin];
    if (!ssLoaded || !sheet) return;
    let sp: SpriteFrame | undefined;
    if (name.startsWith("block_")) {
      sp = SPRITES.blocks[name.slice(6)];
    } else {
      sp = SPRITES[name as "paddle" | "ball"];
    }
    if (!sp) return;
    context.drawImage(sheet, sp.sx, sp.sy, sp.sw, sp.sh, x, y, w, h);
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
    ctx.fillStyle = palette().overlayScrim;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = palette().overlayText;
    ctx.font = "bold 64px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(message, canvas.width / 2, canvas.height / 2);
  }

  function draw() {
    ctx.fillStyle = palette().background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (const block of blocks) {
      if (block.alive) {
        glow(block.color as ArkanoidSpriteRole);
        drawSprite(
          ctx,
          "block_" + block.color,
          block.x,
          block.y,
          block.w,
          block.h,
        );
        clearGlow();
      }
    }

    for (const exp of explosions) {
      const frameIndex = Math.min(
        Math.floor((exp.elapsed / EXPLOSION_DURATION) * 4),
        3,
      );
      glow(exp.color as ArkanoidSpriteRole);
      drawFrame(
        ctx,
        EXPLOSION_FRAMES[exp.color][frameIndex],
        exp.x,
        exp.y,
        exp.w,
        exp.h,
      );
      clearGlow();
    }

    glow("paddle");
    drawSprite(ctx, "paddle", paddle.x, paddle.y, paddle.w, paddle.h);
    clearGlow();
    glow("ball");
    drawSprite(ctx, "ball", ball.x, ball.y, ball.w, ball.h);
    clearGlow();

    if (gameState === "playing") {
      ctx.fillStyle = palette().hudText;
      ctx.font = "bold 18px monospace";
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillText("Score: " + score, 10, 10);
      ctx.textAlign = "center";
      ctx.fillText("Nivel: " + currentLevel, canvas.width / 2, 10);
      const ballSize = 16;
      const ballSpacing = 4;
      glow("ball");
      for (let i = 0; i < lives; i++) {
        const bx = canvas.width - 10 - (lives - i) * (ballSize + ballSpacing);
        drawSprite(ctx, "ball", bx, 10, ballSize, ballSize);
      }
      clearGlow();
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

  function setSkin(skin: SkinId) {
    if (skin === activeSkin) return;
    activeSkin = skin;
    // Repintado inmediato con la hoja del nuevo skin: no toca board, score,
    // vidas ni la posición de bola/paleta, y nunca dispara onGameOver — igual
    // que setPaused, cambiar de skin no interrumpe la partida.
    if (!stopped && ssLoaded) draw();
  }

  return { start, stop, setPaused, setSkin };
}
