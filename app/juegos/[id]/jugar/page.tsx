import { notFound } from "next/navigation";
import PlayerClient from "@/components/PlayerClient";
import { createClient } from "@/lib/supabase/server";
import { getGame } from "@/lib/supabase/queries";

export default async function GamePlayerPage({
  params,
}: PageProps<"/juegos/[id]/jugar">) {
  const { id } = await params;
  const supabase = await createClient();
  const game = await getGame(supabase, id);
  if (!game) notFound();

  return <PlayerClient game={game} />;
}
