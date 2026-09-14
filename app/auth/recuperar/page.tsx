"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function RecuperarPage() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email,
      { redirectTo: `${window.location.origin}/auth/nueva-contrasena` },
    );
    setLoading(false);
    if (resetError) {
      setError(resetError.message);
      return;
    }
    setSent(true);
  };

  if (sent) {
    return (
      <div className="av-auth-wrap fade-in">
        <div className="auth-card">
          <div className="auth-header">
            <div className="mark"></div>
            <h2 className="neon-cyan">ARCADE VAULT</h2>
          </div>
          <p
            className="mono"
            style={{
              color: "var(--ink-dim)",
              fontSize: 13,
              textAlign: "center",
              lineHeight: 1.6,
            }}
          >
            SI {email} TIENE UNA CUENTA, TE ENVIAMOS UN ENLACE PARA RESTABLECER
            TU CONTRASEÑA.
          </p>
          <div style={{ textAlign: "center", marginTop: 16 }}>
            <Link className="btn ghost" href="/auth">
              VOLVER
            </Link>
          </div>
        </div>
      </div>
    );
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
            RECUPERAR CONTRASEÑA
          </div>
        </div>

        <form onSubmit={submit}>
          <div className="field">
            <label>Correo electrónico</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jugador@vault.gg"
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
            disabled={loading}
          >
            {loading ? "ENVIANDO..." : "ENVIAR ENLACE"}
          </button>
        </form>

        <div style={{ marginTop: 16, textAlign: "center" }}>
          <Link
            className="mono"
            style={{ fontSize: 11, color: "var(--ink-faint)" }}
            href="/auth"
          >
            VOLVER A INICIAR SESIÓN
          </Link>
        </div>
      </div>
    </div>
  );
}
