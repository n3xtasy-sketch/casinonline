import { GameForm } from "@/components/admin/GameForm";
import { listProviders, listGameCategories } from "@/lib/db/admin-games";
import { listCasinos } from "@/lib/db/admin-bonuses";
import { createGame } from "../actions";

export default async function NewGamePage() {
  const [providers, categories, casinos] = await Promise.all([
    listProviders(),
    listGameCategories(),
    listCasinos(),
  ]);
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Adaugă joc</h1>
        <p className="mt-1 text-sm text-ink-secondary">Devine accesibil public imediat după salvare.</p>
      </div>
      <GameForm mode="create" action={createGame} providers={providers} categories={categories} casinos={casinos} />
    </div>
  );
}
