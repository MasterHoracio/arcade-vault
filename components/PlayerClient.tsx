"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Game } from "@/lib/games";
import { registerPlay, saveScore } from "@/app/actions/games";
import { GAME_REGISTRY, type HudFields } from "@/lib/games/registry";
import TouchControls from "@/components/TouchControls";
import {
  DEFAULT_SKIN,
  SKIN_LABELS,
  readSkin,
  writeSkin,
  type SkinId,
} from "@/lib/games/skins";

export default function PlayerClient({ game }: { game: Game }) {
  const router = useRouter();
  // page.tsx ya valida que game.id esté en GAME_REGISTRY antes de renderizar.
  const entry = GAME_REGISTRY[game.id]!;

  const [skin, setSkin] = useState<SkinId>(DEFAULT_SKIN);
  const [score, setScore] = useState(0);
  const [hud, setHud] = useState<HudFields>({
    score: 0,
    lives: 3,
    level: 1,
  });
  const [paused, setPaused] = useState(false);
  const [over, setOver] = useState(false);
  const [name, setName] = useState("INVITADO");
  const [saved, setSaved] = useState(false);
  const [round, setRound] = useState(0);

  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem("av_user") || "null");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (u?.name) setName(u.name);
    } catch {
      // no-op: keep default "INVITADO"
    }

    setSkin(readSkin());
  }, []);

  const handleSkinChange = (next: SkinId) => {
    setSkin(next);
    writeSkin(next);
  };

  const endGame = () => setOver(true);
  const restart = () => {
    registerPlay(game.id).catch(() => {
      // no-op: no bloquear el reinicio si falla el conteo de partidas
    });
    setScore(0);
    setPaused(false);
    setOver(false);
    setSaved(false);
    setRound((r) => r + 1);
  };

  const handleSaveScore = async () => {
    try {
      await saveScore({
        gameId: game.id,
        playerName: name,
        score,
      });
      setSaved(true);
    } catch {
      // no-op: se muestra de nuevo el input-row para reintentar
    }
  };

  return (
    <div className="av-player fade-in">
      <div className="player-hud">
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          <div className="hud-stat">
            <div className="l">Jugador</div>
            <div className="v" style={{ color: "var(--ink)" }}>
              {name}
            </div>
          </div>
          <div className="hud-stat">
            <div className="l">Puntuación</div>
            <div className="v">{hud.score.toLocaleString("es-ES")}</div>
          </div>
          <div className="hud-stat lives">
            <div className="l">Vidas</div>
            <div className="v">
              {hud.lives !== undefined
                ? "♥ ".repeat(hud.lives).trim() || "—"
                : "—"}
            </div>
          </div>
          <div className="hud-stat level">
            <div className="l">Nivel</div>
            <div className="v">{String(hud.level).padStart(2, "0")}</div>
          </div>
          {entry.skins.length > 1 && (
            <div className="hud-stat">
              <div className="l">Skin</div>
              <select
                className="skin-select"
                value={skin}
                onChange={(e) => handleSkinChange(e.target.value as SkinId)}
                aria-label="Skin del juego"
              >
                {entry.skins.map((s) => (
                  <option key={s} value={s}>
                    {SKIN_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        <div className="hud-actions">
          <button className="btn yellow" onClick={() => setPaused((p) => !p)}>
            {paused ? "REANUDAR" : "PAUSA"}
          </button>
          <button className="btn magenta" onClick={endGame}>
            FIN
          </button>
          <button
            className="btn ghost"
            onClick={() => router.push(`/juegos/${game.id}`)}
          >
            SALIR
          </button>
        </div>
      </div>

      <div className="crt" data-skin={skin}>
        <div className="crt-screen">
          <entry.Canvas
            key={round}
            paused={paused}
            skin={skin}
            onStateChange={setHud}
            onGameOver={(finalScore) => {
              setScore(finalScore);
              endGame();
            }}
          />
          {paused && (
            <div
              className="crt-content"
              style={{ background: "rgba(0,0,0,0.6)", zIndex: 5 }}
            >
              <div>
                <div className="pixel neon-yellow" style={{ fontSize: 22 }}>
                  EN PAUSA
                </div>
                <div
                  className="mono"
                  style={{
                    fontSize: 11,
                    color: "var(--ink-dim)",
                    marginTop: 10,
                    letterSpacing: "0.16em",
                  }}
                >
                  PULSA REANUDAR PARA CONTINUAR
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="crt-bottom">
          <span className="led">SEÑAL OK</span>
          <span>{game.title} · CRT-83 · 60 HZ</span>
          <span>CARGA · 1MB</span>
        </div>
      </div>
      <TouchControls config={entry.touchControls} />

      {over && (
        <div className="modal-bd">
          <div className="modal">
            <h2>FIN DEL JUEGO</h2>
            <div className="final-label">PUNTUACIÓN FINAL</div>
            <div className="final">{score.toLocaleString("es-ES")}</div>
            {!saved ? (
              <div className="input-row">
                <input
                  value={name}
                  onChange={(e) =>
                    setName(e.target.value.toUpperCase().slice(0, 10))
                  }
                  placeholder="TUS INICIALES"
                />
                <button className="btn yellow" onClick={handleSaveScore}>
                  GUARDAR PUNTUACIÓN
                </button>
              </div>
            ) : (
              <div className="toast-saved">▸ PUNTUACIÓN GUARDADA_</div>
            )}
            <div className="actions">
              <button className="btn" onClick={restart}>
                JUGAR DE NUEVO
              </button>
              <button
                className="btn magenta"
                onClick={() => router.push("/juegos")}
              >
                VOLVER AL VAULT
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
