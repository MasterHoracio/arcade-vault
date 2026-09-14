"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { insertScore } from "@/lib/supabase/queries";

function revalidateGamePaths(gameId: string) {
  revalidatePath("/");
  revalidatePath("/juegos");
  revalidatePath(`/juegos/${gameId}`);
}

export async function registerPlay(gameId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("increment_plays", {
    p_game_id: gameId,
  });
  if (error) throw error;
  revalidateGamePaths(gameId);
}

export async function saveScore(params: {
  gameId: string;
  score: number;
}): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Debes iniciar sesión para guardar tu puntuación.");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("nickname")
    .eq("id", user.id)
    .single();
  if (profileError || !profile) {
    throw new Error("No se encontró tu perfil.");
  }

  await insertScore(supabase, {
    gameId: params.gameId,
    userId: user.id,
    playerName: profile.nickname,
    score: params.score,
  });
  revalidateGamePaths(params.gameId);
  revalidatePath("/salon");
}
