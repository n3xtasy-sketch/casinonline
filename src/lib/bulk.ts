/** Shared bulk-action result + CSV helper (client + server safe). */

export interface BulkResult {
  ok: number;
  failed: { id: string; reason: string }[];
}

/** RFC-4180-ish CSV: quote fields containing comma/quote/newline; double inner quotes. */
export function toCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const esc = (v: string | number | null | undefined) => {
    const s = v == null ? "" : String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers, ...rows].map((r) => r.map(esc).join(",")).join("\r\n");
}
