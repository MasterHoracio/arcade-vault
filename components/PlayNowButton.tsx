"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { registerPlay } from "@/app/actions/games";

export default function PlayNowButton({ gameId }: { gameId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);

  const handleClick = () => {
    if (busy) return;
    setBusy(true);
    startTransition(async () => {
      try {
        await registerPlay(gameId);
      } catch {
        // no-op: no bloquear la partida si falla el conteo
      } finally {
        router.push(`/juegos/${gameId}/jugar`);
      }
    });
  };

  return (
    <button
      className="btn xl pulse"
      onClick={handleClick}
      disabled={busy || isPending}
    >
      ▶ JUGAR AHORA
    </button>
  );
}
