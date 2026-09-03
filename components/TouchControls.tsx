"use client";

import { useRef } from "react";
import type { TouchControlsConfig, TouchSlot } from "@/lib/games/registry";

export interface TouchControlsProps {
  config: TouchControlsConfig;
}

const DPAD_ARROW_PATHS: Record<"up" | "left" | "right" | "down", string> = {
  up: "M12 4 L20 16 L4 16 Z",
  right: "M8 4 L20 12 L8 20 Z",
  down: "M4 8 L20 8 L12 20 Z",
  left: "M16 4 L16 20 L4 12 Z",
};

const DPAD_SLOTS: {
  slot: TouchSlot;
  label: string;
  direction: keyof typeof DPAD_ARROW_PATHS;
}[] = [
  { slot: "up", label: "Arriba", direction: "up" },
  { slot: "left", label: "Izquierda", direction: "left" },
  { slot: "right", label: "Derecha", direction: "right" },
  { slot: "down", label: "Abajo", direction: "down" },
];

const ACTION_SLOTS: { slot: TouchSlot; label: string; glyph: string }[] = [
  { slot: "a", label: "Acción A", glyph: "A" },
  { slot: "b", label: "Acción B", glyph: "B" },
];

function DpadArrow({
  direction,
}: {
  direction: keyof typeof DPAD_ARROW_PATHS;
}) {
  return (
    <svg className="touch-dpad-arrow" viewBox="0 0 24 24" aria-hidden="true">
      <path d={DPAD_ARROW_PATHS[direction]} fill="currentColor" />
    </svg>
  );
}

function dispatchKey(type: "keydown" | "keyup", code: string, key: string) {
  // document, no window: tetris escucha en document; el resto en window, y
  // como KeyboardEvent hace bubble por defecto, les sigue llegando igual.
  document.dispatchEvent(new KeyboardEvent(type, { code, key, bubbles: true }));
}

function TouchKey({
  slot,
  label,
  content,
  config,
  className,
}: {
  slot: TouchSlot;
  label: string;
  content: React.ReactNode;
  config: TouchControlsConfig;
  className: string;
}) {
  const binding = config[slot];
  const pointerId = useRef<number | null>(null);

  if (!binding) {
    return (
      <button
        type="button"
        className={`touch-btn touch-btn--off ${className}`}
        aria-label={label}
        aria-disabled="true"
        disabled
      >
        {content}
      </button>
    );
  }

  const press = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    pointerId.current = e.pointerId;
    dispatchKey("keydown", binding.code, binding.key);
  };

  const release = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (pointerId.current !== e.pointerId) return;
    e.preventDefault();
    pointerId.current = null;
    dispatchKey("keyup", binding.code, binding.key);
  };

  return (
    <button
      type="button"
      className={`touch-btn ${className}`}
      style={{ touchAction: "none" }}
      aria-label={label}
      onPointerDown={press}
      onPointerUp={release}
      onPointerCancel={release}
      onPointerLeave={release}
    >
      {content}
    </button>
  );
}

export default function TouchControls({ config }: TouchControlsProps) {
  return (
    <div className="touch-controls">
      <div className="touch-dpad">
        {DPAD_SLOTS.map(({ slot, label, direction }) => (
          <TouchKey
            key={slot}
            slot={slot}
            label={label}
            content={<DpadArrow direction={direction} />}
            config={config}
            className={`touch-dpad-${slot}`}
          />
        ))}
        <div className="touch-dpad-hub" aria-hidden="true">
          <span className="touch-dpad-hub-gem" />
        </div>
      </div>
      <div className="touch-actions">
        {ACTION_SLOTS.map(({ slot, label, glyph }) => (
          <TouchKey
            key={slot}
            slot={slot}
            label={label}
            content={glyph}
            config={config}
            className={`touch-action-btn touch-action-${slot}`}
          />
        ))}
      </div>
    </div>
  );
}
