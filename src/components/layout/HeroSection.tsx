import { ShieldCheck, BadgeCheck, RefreshCw, Scale } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface Cta {
  label: string;
  href: string;
}

interface Props {
  title: string;
  description: string;
  primaryCta: Cta;
  secondaryCta?: Cta;
}

const trustSignals = [
  { icon: ShieldCheck, label: "Licențiate ONJN" },
  { icon: BadgeCheck, label: "Oferte verificate" },
  { icon: RefreshCw, label: "Actualizate zilnic" },
  { icon: Scale, label: "Recenzii independente" },
];

/** Discovery-style hero (DESIGN.md "Hero section") with trust signals. Reusable across hubs. */
export function HeroSection({ title, description, primaryCta, secondaryCta }: Props) {
  return (
    <section className="relative overflow-hidden rounded-xl border border-border bg-panel px-6 py-10 shadow-card md:px-10 md:py-14">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 85% 15%, rgba(34,197,94,0.10), transparent 40%)",
        }}
      />
      <div className="relative max-w-[640px]">
        <h1 className="text-balance text-3xl font-bold leading-tight text-ink md:text-5xl">
          {title}
        </h1>
        <p className="mt-4 text-base text-ink-secondary md:text-lg">{description}</p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button href={primaryCta.href}>{primaryCta.label}</Button>
          {secondaryCta ? (
            <Button variant="secondary" href={secondaryCta.href}>
              {secondaryCta.label}
            </Button>
          ) : null}
        </div>

        <ul className="mt-7 flex flex-wrap gap-x-5 gap-y-2">
          {trustSignals.map(({ icon: Icon, label }) => (
            <li key={label} className="flex items-center gap-2 text-sm text-ink-secondary">
              <Icon size={16} strokeWidth={1.9} className="text-accent" />
              {label}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
