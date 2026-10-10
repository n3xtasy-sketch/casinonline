import { getSupabaseAuthClient } from "@/lib/supabase/auth-server";

type DB = Awaited<ReturnType<typeof getSupabaseAuthClient>>;

async function tableCount(db: DB, table: string): Promise<number> {
  const { count } = await db.from(table).select("*", { count: "exact", head: true });
  return count ?? 0;
}

export default async function AdminDashboard() {
  const db = await getSupabaseAuthClient();

  const [casinos, bonuses, games, providers, payments, guides] = await Promise.all([
    tableCount(db, "casinos"),
    tableCount(db, "bonuses"),
    tableCount(db, "games"),
    tableCount(db, "providers"),
    tableCount(db, "payment_methods"),
    tableCount(db, "guides"),
  ]);
  const { data: affiliate } = await db.rpc("admin_affiliate_links_count");

  const cards = [
    { label: "Cazinouri", value: casinos },
    { label: "Bonusuri", value: bonuses },
    { label: "Jocuri", value: games },
    { label: "Furnizori", value: providers },
    { label: "Metode de plată", value: payments },
    { label: "Ghiduri", value: guides },
    { label: "Affiliate links", value: Number(affiliate ?? 0) },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Dashboard</h1>
        <p className="mt-1 text-sm text-ink-secondary">Sumar conținut din baza de date.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-md border border-border bg-surface p-5 shadow-card">
            <p className="text-sm text-ink-secondary">{c.label}</p>
            <p className="mt-1 text-3xl font-bold tabular-nums text-ink">{c.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
