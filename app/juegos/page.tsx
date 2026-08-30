import GamesLibraryClient from "@/components/GamesLibraryClient";
import { createClient } from "@/lib/supabase/server";
import { getGames } from "@/lib/supabase/queries";

export default async function Home() {
  const supabase = await createClient();
  const games = await getGames(supabase);

  return <GamesLibraryClient games={games} />;
}
