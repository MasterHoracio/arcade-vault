"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/components/SessionProvider";
import { createClient } from "@/lib/supabase/client";

const NICKNAME_PATTERN = /^[A-Z0-9_]{3,10}$/;

export default function NicknamePage() {
  const router = useRouter();
  const { user, loading, refreshNickname } = useSession();
  const supabase = createClient();
  const [nickname, setNickname] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/auth");
      return;
    }
    if (user.nickname) {
      router.replace("/");
    }
  }, [loading, user, router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const nick = nickname.trim().toUpperCase();
    if (!NICKNAME_PATTERN.test(nick)) {
      setError("EL APODO DEBE TENER 3-10 CARACTERES: A-Z, 0-9 O _");
      return;
    }
    if (!user) return;

    setSubmitting(true);
    const { error: insertError } = await supabase
      .from("profiles")
      .insert({ id: user.id, nickname: nick });
    setSubmitting(false);

    if (insertError) {
      setError(
        insertError.code === "23505"
          ? "ESE APODO YA ESTÁ EN USO. ELIGE OTRO."
          : "NO SE PUDO GUARDAR EL APODO. INTÉNTALO DE NUEVO.",
      );
      return;
    }

    await refreshNickname();
    router.push("/");
  };

  if (loading || !user || user.nickname) {
    return null;
  }

  return (
    <div className="av-auth-wrap fade-in">
      <div className="auth-card">
        <div className="auth-header">
          <div className="mark"></div>
          <h2 className="neon-cyan">ARCADE VAULT</h2>
          <div
            className="mono"
            style={{
              fontSize: 11,
              color: "var(--ink-faint)",
              letterSpacing: "0.16em",
              marginTop: 6,
            }}
          >
            ELIGE TU APODO
          </div>
        </div>

        <p
          className="mono"
          style={{
            color: "var(--ink-dim)",
            fontSize: 12,
            textAlign: "center",
            marginTop: 8,
          }}
        >
          Un último paso: elige el apodo con el que aparecerás en el Salón de la
          Fama.
        </p>

        <form onSubmit={submit}>
          <div className="field">
            <label>Apodo</label>
            <input
              value={nickname}
              onChange={(e) => setNickname(e.target.value.toUpperCase())}
              placeholder="PX_KAI"
              maxLength={10}
              required
            />
          </div>

          {error && (
            <div
              className="mono"
              style={{
                color: "var(--magenta)",
                fontSize: 11,
                letterSpacing: "0.06em",
                marginTop: 4,
              }}
            >
              {error}
            </div>
          )}

          <button
            className="btn lg"
            type="submit"
            style={{ width: "100%", marginTop: 8 }}
            disabled={submitting}
          >
            {submitting ? "GUARDANDO..." : "CONTINUAR"}
          </button>
        </form>
      </div>
    </div>
  );
}
