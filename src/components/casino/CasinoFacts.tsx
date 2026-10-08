import { ShieldCheck, Banknote, Clock, IdCard, Smartphone, Headphones } from "lucide-react";
import type { CasinoDetail } from "@/types/casino";

/** Key-facts grid for the casino review page. Renders only populated facts. */
export function CasinoFacts({ casino }: { casino: CasinoDetail }) {
  const facts = [
    { icon: ShieldCheck, label: "Licență", value: casino.license },
    { icon: Banknote, label: "Depunere minimă", value: casino.minDeposit },
    { icon: Clock, label: "Timp retragere", value: casino.withdrawalTime ?? casino.payoutSpeed },
    { icon: IdCard, label: "Verificare (KYC)", value: casino.kyc },
    { icon: Smartphone, label: "Mobil", value: casino.mobile },
    { icon: Headphones, label: "Suport", value: casino.support },
  ].filter((f): f is { icon: typeof ShieldCheck; label: string; value: string } => Boolean(f.value));

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {facts.map(({ icon: Icon, label, value }) => (
        <div key={label} className="flex items-center gap-3 rounded-md border border-border bg-surface p-4">
          <span className="grid size-9 shrink-0 place-items-center rounded-sm bg-elevated text-accent">
            <Icon size={17} />
          </span>
          <div className="min-w-0">
            <p className="text-xs text-ink-muted">{label}</p>
            <p className="truncate text-sm font-semibold text-ink">{value}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
