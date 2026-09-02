// ===== lib/games/skins.ts — contrato compartido de skins =====
// Única fuente de verdad de qué skins existen y cómo se persiste la elección
// del jugador. Cada juego define su propia paleta en lib/games/<slug>/skins.ts.

export type SkinId = "clasico" | "neon" | "retro";

export const SKIN_IDS: readonly SkinId[] = ["clasico", "neon", "retro"];

export const SKIN_LABELS: Record<SkinId, string> = {
  clasico: "CLÁSICO",
  neon: "NEÓN",
  retro: "RETRO",
};

export const DEFAULT_SKIN: SkinId = "clasico";

const SKIN_STORAGE_KEY = "av_skin";

function isSkinId(value: unknown): value is SkinId {
  return typeof value === "string" && (SKIN_IDS as string[]).includes(value);
}

/** Lee la preferencia de skin guardada; cae a DEFAULT_SKIN si no hay nada o es inválida. */
export function readSkin(): SkinId {
  try {
    const raw = localStorage.getItem(SKIN_STORAGE_KEY);
    return isSkinId(raw) ? raw : DEFAULT_SKIN;
  } catch {
    return DEFAULT_SKIN;
  }
}

/** Persiste la preferencia de skin del jugador para toda la plataforma. */
export function writeSkin(skin: SkinId): void {
  try {
    localStorage.setItem(SKIN_STORAGE_KEY, skin);
  } catch {
    // no-op: si localStorage no está disponible, el skin no persiste entre sesiones
  }
}
