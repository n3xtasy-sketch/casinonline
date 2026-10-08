/**
 * Renders a JSON-LD script tag. `data` is built from our own trusted data,
 * so stringifying it into the tag is safe.
 */
export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
