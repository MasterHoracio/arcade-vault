import type { SupabaseClient } from "@supabase/supabase-js";
import type { Game, ScoreRow } from "@/lib/games";

export async function getGames(supabase: SupabaseClient): Promise<Game[]> {
  const { data, error } = await supabase.from("games").select("*");
  if (error) throw error;
  return data as Game[];
}

export async function getGame(
  supabase: SupabaseClient,
  id: string,
): Promise<Game | null> {
  const { data, error } = await supabase
    .from("games")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data as Game | null;
}

export async function getTopScores(
  supabase: SupabaseClient,
  gameId: string,
  limit: number,
): Promise<ScoreRow[]> {
  const { data, error } = await supabase
    .from("scores")
    .select("player_name, score, created_at")
    .eq("game_id", gameId)
    .order("score", { ascending: false })
    .limit(limit);
  if (error) throw error;

  return (data ?? []).map((row, i) => ({
    rank: i + 1,
    name: row.player_name,
    score: row.score,
    date: new Date(row.created_at).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }),
  }));
}

export async function insertScore(
  supabase: SupabaseClient,
  params: { gameId: string; playerName: string; score: number },
): Promise<void> {
  const { error } = await supabase.from("scores").insert({
    game_id: params.gameId,
    player_name: params.playerName,
    score: params.score,
  });
  if (error) throw error;
}
