import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbSchema, personSchema } from "@/lib/schema";
import { authorBySlug } from "@/lib/authors";

/**
 * Individual author profile page (static). Server component. The author's `ready`
 * flag is the publish gate: an unknown or not-ready slug 404s, so a route file that
 * exists before the profile is ready cannot be served. Renders Person + BreadcrumbList
 * JSON-LD. No ratings/reviews, no invented facts.
 */
function Facts({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-lg font-semibold text-ink">{title}</h2>
      <ul className="flex max-w-[72ch] flex-col gap-1.5">
        {items.map((it) => (
          <li key={it} className="flex gap-2 leading-relaxed text-ink-secondary">
            <span className="text-ink-muted">·</span>
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function AuthorProfile({ slug }: { slug: string }) {
  const author = authorBySlug(slug);
  if (!author || !author.ready) notFound();

  const crumbs = [
    { label: "Acasa", href: "/" },
    { label: "Autori", href: "/autori" },
    { label: author.name },
  ];
  const description = author.bio[0] ?? author.tagline;

  return (
    <article className="flex flex-col gap-8">
      <JsonLd data={breadcrumbSchema(crumbs)} />
      <JsonLd
        data={personSchema({
          name: author.name,
          jobTitle: author.role,
          description,
          path: `/autori/${author.slug}`,
          knowsAbout: author.specializations,
          alumniOf: author.education?.map((e) => e.split(",").slice(-1)[0]?.trim() ?? e),
        })}
      />
      <Breadcrumbs items={crumbs} />

      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-ink md:text-3xl">{author.name}</h1>
        <p className="text-sm font-medium text-ink-secondary">{author.role}</p>
      </header>

      <div className="flex max-w-[72ch] flex-col gap-3">
        {author.bio.map((p, i) => (
          <p key={i} className="leading-relaxed text-ink-secondary">
            {p}
          </p>
        ))}
      </div>

      <Facts title="Experienta profesionala" items={author.experience} />
      {author.education?.length ? <Facts title="Studii" items={author.education} /> : null}
      <Facts title="Specializari" items={author.specializations} />
      {author.languages?.length ? <Facts title="Limbi" items={author.languages} /> : null}

      <p className="text-sm text-ink-muted">
        Vezi{" "}
        <Link href="/politica-editoriala" className="text-link hover:text-link-hover">
          politica editoriala
        </Link>{" "}
        si{" "}
        <Link href="/cum-evaluam-cazinourile" className="text-link hover:text-link-hover">
          metodologia noastra de evaluare
        </Link>
        .
      </p>
    </article>
  );
}
