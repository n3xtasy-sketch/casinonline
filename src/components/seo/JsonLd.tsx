/**
 * Serialize JSON-LD safely for inlining into a <script> tag. JSON.stringify does
 * NOT escape `<`, `>`, `&` or the JS line separators U+2028/U+2029, so DB-sourced
 * strings could otherwise break out of the script (`</script>`) or the JSON.
 */
function safeJsonLd(data: object): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: safeJsonLd(data) }}
    />
  );
}
