import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { FAQAccordion } from "@/components/ui/FAQAccordion";
import { CasinoCard } from "@/components/casino/CasinoCard";
import { ProsCons } from "@/components/casino/ProsCons";
import { PaymentMethodCard } from "@/components/payments/PaymentMethodCard";
import { PaymentDetailHeader } from "@/components/payments/PaymentDetailHeader";
import { PaymentFacts } from "@/components/payments/PaymentFacts";
import { allPaymentMethods } from "@/data/payments";
import { allCasinos } from "@/data/casinos";
import { getCasinoDetail } from "@/data/casino-details";
import { getPaymentMethodDetail, getAllPaymentSlugs } from "@/data/payment-details";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return getAllPaymentSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const method = getPaymentMethodDetail(slug);
  if (!method) return {};
  return {
    title: `${method.name} la cazinouri online`,
    description: method.intro,
  };
}

export default async function PaymentDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const method = getPaymentMethodDetail(slug);
  if (!method) notFound();

  const casinos = allCasinos
    .filter((c) => getCasinoDetail(c.slug)?.paymentMethods?.includes(method.name))
    .slice(0, 4);

  const sameType = allPaymentMethods.filter(
    (m) => m.slug !== slug && m.typeSlug === method.typeSlug,
  );
  const alternatives = (
    sameType.length ? sameType : allPaymentMethods.filter((m) => m.slug !== slug)
  ).slice(0, 3);

  return (
    <div className="flex flex-col gap-8">
      <Breadcrumbs
        items={[
          { label: "Acasă", href: "/" },
          { label: "Metode de plată", href: "/metode-de-plata" },
          { label: method.name },
        ]}
      />

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
