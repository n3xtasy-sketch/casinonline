import { notFound } from "next/navigation";
import { GameForm } from "@/components/admin/GameForm";
import { getGameEdit, listProviders, listGameCategories } from "@/lib/db/admin-games";
import { listCasinos } from "@/lib/db/admin-bonuses";
import { updateGame } from "../../actions";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function EditGamePage({ params }: PageProps) {
  const { slug } = await params;
  const [game, providers, categories, casinos] = await Promise.all([
    getGameEdit(slug),
    listProviders(),
    listGameCategories(),
    listCasinos(),
  ]);
  if (!game) notFound();

  const action = updateGame.bind(null, game.id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Editează joc: {game.name}</h1>
        <p className="mt-1 text-sm text-ink-secondary">Modificările apar public imediat (updateTag).</p>
      </div>
      <GameForm mode="edit" action={action} initial={game} providers={providers} categories={categories} casinos={casinos} />
    </div>
  );
}
