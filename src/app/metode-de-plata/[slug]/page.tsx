import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbSchema } from "@/lib/schema";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { FAQAccordion } from "@/components/ui/FAQAccordion";
import { CasinoCard } from "@/components/casino/CasinoCard";
import { ProsCons } from "@/components/casino/ProsCons";
import { PaymentMethodCard } from "@/components/payments/PaymentMethodCard";
import { PaymentDetailHeader } from "@/components/payments/PaymentDetailHeader";
import { PaymentFacts } from "@/components/payments/PaymentFacts";
import { getPaymentMethods, getPaymentMethodBySlug } from "@/lib/db/payments";
import { getCasinosForPaymentMethod } from "@/lib/db/casinos";

interface PageProps {
  params: Promise<{ slug: string }>;
}

// DB-backed detail: render per request (no build-time DB dependency).
export const instant = false;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const method = await getPaymentMethodBySlug(slug);
  if (!method) return {};
  return {
    title: `${method.name} la cazinouri online`,
    description: method.intro,
    alternates: { canonical: `/metode-de-plata/${slug}` },
  };
}

export default async function PaymentDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const method = await getPaymentMethodBySlug(slug);
  if (!method) notFound();

  const casinos = (await getCasinosForPaymentMethod(slug)).slice(0, 4);

  const allMethods = await getPaymentMethods();
  const sameType = allMethods.filter(
    (m) => m.slug !== slug && m.typeSlug === method.typeSlug,
  );
  const alternatives = (
    sameType.length ? sameType : allMethods.filter((m) => m.slug !== slug)
  ).slice(0, 3);

  const crumbs = [
    { label: "Acasă", href: "/" },
    { label: "Metode de plată", href: "/metode-de-plata" },
    { label: method.name },
  ];

  return (
    <div className="flex flex-col gap-8">
      <JsonLd data={breadcrumbSchema(crumbs)} />
      <Breadcrumbs items={crumbs} />

      <PaymentDetailHeader method={method} />

      <section>
        <SectionHeader title={`Despre ${method.name}`} />
        <p className="max-w-[72ch] leading-relaxed text-ink-secondary">{method.intro}</p>
      </section>

      <section>
        <SectionHeader title="Informații cheie" />
        <PaymentFacts method={method} />
      </section>

      <section>
        <SectionHeader title="Depuneri" />
        <p className="max-w-[72ch] leading-relaxed text-ink-secondary">{method.deposits}</p>
      </section>

      <section>
        <SectionHeader title="Retrageri" />
        <p className="max-w-[72ch] leading-relaxed text-ink-secondary">{method.withdrawals}</p>
      </section>

      <section>
        <SectionHeader title="Avantaje și dezavantaje" />
        <ProsCons pros={method.pros} cons={method.cons} />
      </section>

      {casinos.length ? (
        <section>
          <SectionHeader
            title={`Cazinouri care acceptă ${method.name}`}
            action={{ label: "Toate cazinourile", href: "/cazinouri-online" }}
          />
          <div className="flex flex-col gap-4">
            {casinos.map((casino) => (
              <CasinoCard key={casino.slug} casino={casino} />
            ))}
          </div>
        </section>
      ) : null}

      <section>
        <SectionHeader
          title="Alternative"
          action={{ label: "Toate metodele", href: "/metode-de-plata" }}
        />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {alternatives.map((m) => (
            <PaymentMethodCard key={m.slug} method={m} />
          ))}
        </div>
      </section>

      {method.faq?.length ? (
        <section>
          <SectionHeader title="Întrebări frecvente" />
          <FAQAccordion items={method.faq} />
        </section>
      ) : null}
    </div>
  );
}
