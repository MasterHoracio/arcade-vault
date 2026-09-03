"use client";

import { useRef } from "react";
import type { TouchControlsConfig } from "@/lib/games/registry";

export interface TouchControlsProps {
  config: TouchControlsConfig;
}

interface DpadKey {
  label: string;
  code: string;
  key: string;
}

const LEFT: DpadKey = { label: "◀", code: "ArrowLeft", key: "ArrowLeft" };
const RIGHT: DpadKey = { label: "▶", code: "ArrowRight", key: "ArrowRight" };
const UP: DpadKey = { label: "▲", code: "ArrowUp", key: "ArrowUp" };
const DOWN: DpadKey = { label: "▼", code: "ArrowDown", key: "ArrowDown" };

function dispatchKey(type: "keydown" | "keyup", code: string, key: string) {
  window.dispatchEvent(new KeyboardEvent(type, { code, key }));
}

function TouchKey({
  dpadKey,
  className,
}: {
  dpadKey: DpadKey;
  className?: string;
}) {
  const pointerId = useRef<number | null>(null);

  const press = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    pointerId.current = e.pointerId;
    dispatchKey("keydown", dpadKey.code, dpadKey.key);
  };

  const release = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (pointerId.current !== e.pointerId) return;
    e.preventDefault();
    pointerId.current = null;
    dispatchKey("keyup", dpadKey.code, dpadKey.key);
  };

  return (
    <button
      type="button"
      className={`touch-btn ${className ?? ""}`}
      style={{ touchAction: "none" }}
      aria-label={dpadKey.label}
      onPointerDown={press}
      onPointerUp={release}
      onPointerCancel={release}
      onPointerLeave={release}
    >
      {dpadKey.label}
    </button>
  );
}

export default function TouchControls({ config }: TouchControlsProps) {
  return (
    <div className="touch-controls">
      <div className="touch-dpad" data-dpad={config.dpad}>
        {config.dpad === "four-way" && (
          <TouchKey dpadKey={UP} className="touch-dpad-up" />
        )}
        <div className="touch-dpad-row">
          <TouchKey dpadKey={LEFT} className="touch-dpad-left" />
          <TouchKey dpadKey={RIGHT} className="touch-dpad-right" />
        </div>
        {config.dpad === "four-way" && (
          <TouchKey dpadKey={DOWN} className="touch-dpad-down" />
        )}
      </div>
      <div className="touch-actions">
        {config.buttons.map((b) => (
          <TouchKey key={b.code} dpadKey={b} className="touch-action-btn" />
        ))}
      </div>
    </div>
  );
}
