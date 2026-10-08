import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { LogoWell } from "@/components/ui/LogoWell";
import type { PaymentMethodCardData } from "@/types/payment";

/** Compact payment method card for the listing and alternatives. */
export function PaymentMethodCard({ method }: { method: PaymentMethodCardData }) {
  const { name, logoUrl, type, href } = method;

  return (
    <Link href={href} className="block">
      <Card interactive padding="md" className="flex items-center gap-4">
        <LogoWell name={name} src={logoUrl} className="h-14 w-20" />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-ink">{name}</h3>
          <p className="truncate text-xs text-ink-muted">{type}</p>
        </div>
        <ChevronRight size={18} className="shrink-0 text-ink-muted" />
      </Card>
    </Link>
  );
}
