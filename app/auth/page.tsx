"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const NICKNAME_PATTERN = /^[A-Z0-9_]{3,10}$/;

export default function AuthPage() {
  const router = useRouter();
  const supabase = createClient();
  const [tab, setTab] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const switchTab = (next: "in" | "up") => {
    setTab(next);
    setError(null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (tab === "up") {
      const nick = nickname.trim().toUpperCase();
      if (!NICKNAME_PATTERN.test(nick)) {
        setError("EL APODO DEBE TENER 3-10 CARACTERES: A-Z, 0-9 O _");
        return;
      }
      setLoading(true);
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { nickname: nick } },
      });
      setLoading(false);
      if (signUpError) {
        setError(signUpError.message);
        return;
      }
      if (!data.session) {
        setConfirming(true);
        return;
      }
      router.push("/");
      return;
    }

    setLoading(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);
    if (signInError) {
      setError(signInError.message);
      return;
    }
    router.push("/");
  };

  const oauth = async (provider: "google" | "github") => {
    setError(null);
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  };

  if (confirming) {
    return (
      <div className="av-auth-wrap fade-in">
        <div className="auth-card">
          <div className="auth-header">
            <div className="mark"></div>
            <h2 className="neon-cyan">ARCADE VAULT</h2>
          </div>
          <div style={{ textAlign: "center", padding: "12px 4px" }}>
            <p
              className="mono"
              style={{ color: "var(--ink-dim)", lineHeight: 1.6, fontSize: 13 }}
            >
              REVISA TU CORREO ({email}) Y CONFIRMA TU CUENTA PARA PODER INICIAR
              SESIÓN.
            </p>
            <button
              className="btn ghost"
              style={{ marginTop: 16 }}
              onClick={() => {
                setConfirming(false);
                setTab("in");
              }}
            >
              VOLVER
            </button>
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
            ACCESO AL SISTEMA · v2.6
          </div>
        </div>

        <div className="auth-tabs">
          <button
            className={tab === "in" ? "on" : ""}
            onClick={() => switchTab("in")}
          >
            INICIAR SESIÓN
          </button>
          <button
            className={tab === "up" ? "on" : ""}
            onClick={() => switchTab("up")}
          >
            CREAR CUENTA
          </button>
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
          {tab === "up" && (
            <div className="field slide-in">
              <label>Apodo</label>
              <input
                value={nickname}
                onChange={(e) => setNickname(e.target.value.toUpperCase())}
                placeholder="PX_KAI"
                maxLength={10}
                required
              />
            </div>
          )}
          <div className="field">
            <label>Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
            {loading
              ? "PROCESANDO..."
              : tab === "in"
                ? "ENTRAR AL VAULT"
                : "CREAR Y JUGAR"}
          </button>
        </form>

        {tab === "in" && (
          <div style={{ marginTop: 10, textAlign: "center" }}>
            <Link
              className="mono"
              style={{ fontSize: 11, color: "var(--ink-faint)" }}
              href="/auth/recuperar"
            >
              ¿OLVIDASTE TU CONTRASEÑA?
            </Link>
          </div>
        )}

        <div className="auth-divider">O CONTINÚA CON</div>
        <div className="social">
          <button
            className="btn ghost"
            type="button"
            onClick={() => oauth("google")}
          >
            ◆ GOOGLE
          </button>
          <button
            className="btn ghost"
            type="button"
            onClick={() => oauth("github")}
          >
            ▣ GITHUB
          </button>
        </div>

        <div
          style={{
            marginTop: 18,
            textAlign: "center",
            fontSize: 11,
            color: "var(--ink-faint)",
            letterSpacing: "0.1em",
          }}
        >
          AL ENTRAR ACEPTAS LOS TÉRMINOS DEL SALÓN ARCADE
        </div>
      </div>
    </div>
  );
}
