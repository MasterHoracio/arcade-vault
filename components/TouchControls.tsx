"use client";

import { useRef } from "react";
import type { TouchControlsConfig, TouchSlot } from "@/lib/games/registry";

export interface TouchControlsProps {
  config: TouchControlsConfig;
}

const DPAD_SLOTS: { slot: TouchSlot; label: string; glyph: string }[] = [
  { slot: "up", label: "Arriba", glyph: "▲" },
  { slot: "left", label: "Izquierda", glyph: "◀" },
  { slot: "right", label: "Derecha", glyph: "▶" },
  { slot: "down", label: "Abajo", glyph: "▼" },
];

const ACTION_SLOTS: { slot: TouchSlot; label: string; glyph: string }[] = [
  { slot: "a", label: "Acción A", glyph: "A" },
  { slot: "b", label: "Acción B", glyph: "B" },
];

function dispatchKey(type: "keydown" | "keyup", code: string, key: string) {
  // document, no window: tetris escucha en document; el resto en window, y
  // como KeyboardEvent hace bubble por defecto, les sigue llegando igual.
  document.dispatchEvent(new KeyboardEvent(type, { code, key, bubbles: true }));
}

function TouchKey({
  slot,
  label,
  glyph,
  config,
  className,
}: {
  slot: TouchSlot;
  label: string;
  glyph: string;
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
        {glyph}
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
      {glyph}
    </button>
  );
}

export default function TouchControls({ config }: TouchControlsProps) {
  return (
    <div className="touch-controls">
      <div className="touch-dpad">
        {DPAD_SLOTS.map(({ slot, label, glyph }) => (
          <TouchKey
            key={slot}
            slot={slot}
            label={label}
            glyph={glyph}
            config={config}
            className={`touch-dpad-${slot}`}
          />
        ))}
      </div>
      <div className="touch-actions">
        {ACTION_SLOTS.map(({ slot, label, glyph }) => (
          <TouchKey
            key={slot}
            slot={slot}
            label={label}
            glyph={glyph}
            config={config}
            className={`touch-action-btn touch-action-${slot}`}
          />
        ))}
      </div>
    </div>
  );
}
