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
  playerName: string;
  score: number;
}): Promise<void> {
  const supabase = await createClient();
  await insertScore(supabase, params);
  revalidateGamePaths(params.gameId);
  revalidatePath("/salon");
}
