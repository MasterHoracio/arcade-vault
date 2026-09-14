"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const PASSWORD_PATTERN =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~`]).{8,}$/;

export default function NuevaContrasenaPage() {
  const router = useRouter();
  const supabase = createClient();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!PASSWORD_PATTERN.test(password)) {
      setError(
        "LA CONTRASEÑA DEBE TENER MÍNIMO 8 CARACTERES, UNA MAYÚSCULA, UNA MINÚSCULA, UN DÍGITO Y UN SÍMBOLO.",
      );
      return;
    }
    if (password !== confirm) {
      setError("LAS CONTRASEÑAS NO COINCIDEN.");
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });
    if (updateError) {
      setLoading(false);
      setError(updateError.message);
      return;
    }

    await supabase.auth.signOut();
    setLoading(false);
    router.push("/auth");
  };

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
            NUEVA CONTRASEÑA
          </div>
        </div>

        <form onSubmit={submit}>
          <div className="field">
            <label>Nueva contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          <div className="field">
            <label>Confirmar contraseña</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="••••••••"
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
            {loading ? "GUARDANDO..." : "GUARDAR CONTRASEÑA"}
          </button>
        </form>
      </div>
    </div>
  );
}
