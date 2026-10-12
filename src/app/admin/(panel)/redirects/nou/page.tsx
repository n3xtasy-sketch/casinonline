import { RedirectForm } from "@/components/admin/RedirectForm";
import { createRedirect } from "../actions";

export default function NewRedirectPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Adaugă redirect</h1>
        <p className="mt-1 text-sm text-ink-secondary">Se aplică public în ≤ 60s (cache TTL proxy).</p>
      </div>
      <RedirectForm mode="create" action={createRedirect} />
    </div>
  );
}
