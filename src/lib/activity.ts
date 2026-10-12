/** Activity-log vocabulary + humanizers (client + server safe). */

export const ACTIVITY_ENTITY_TYPES = [
  { value: "casino", label: "Cazino" },
  { value: "bonus", label: "Bonus" },
  { value: "game", label: "Joc" },
  { value: "provider", label: "Furnizor" },
  { value: "payment_method", label: "Metodă de plată" },
  { value: "guide", label: "Ghid" },
  { value: "affiliate_link", label: "Affiliate link" },
  { value: "redirect", label: "Redirect" },
  { value: "seo", label: "SEO" },
  { value: "media", label: "Media" },
] as const;

export const ACTIVITY_ACTIONS = [
  { value: "casino.create", label: "Cazino creat" },
  { value: "casino.update", label: "Cazino editat" },
  { value: "casino.archive", label: "Cazino arhivat" },
  { value: "casino.reactivate", label: "Cazino reactivat" },
  { value: "casino.bulk_archive", label: "Cazinouri arhivate (bulk)" },
  { value: "casino.bulk_activate", label: "Cazinouri activate (bulk)" },
  { value: "casino.bulk_add_tag", label: "Tag adăugat (bulk)" },
  { value: "casino.bulk_remove_tag", label: "Tag eliminat (bulk)" },
  { value: "bonus.create", label: "Bonus creat" },
  { value: "bonus.update", label: "Bonus editat" },
  { value: "game.create", label: "Joc creat" },
  { value: "game.update", label: "Joc editat" },
  { value: "provider.create", label: "Furnizor creat" },
  { value: "provider.update", label: "Furnizor editat" },
  { value: "payment.create", label: "Metodă creată" },
  { value: "payment.update", label: "Metodă editată" },
  { value: "guide.create", label: "Ghid creat" },
  { value: "guide.update", label: "Ghid editat" },
  { value: "affiliate_link.create", label: "Affiliate creat" },
  { value: "affiliate_link.update", label: "Affiliate editat" },
  { value: "affiliate_link.activate", label: "Affiliate activat" },
  { value: "affiliate_link.deactivate", label: "Affiliate dezactivat" },
  { value: "affiliate_link.bulk_activate", label: "Affiliate activate (bulk)" },
  { value: "affiliate_link.bulk_deactivate", label: "Affiliate dezactivate (bulk)" },
  { value: "redirect.create", label: "Redirect creat" },
  { value: "redirect.update", label: "Redirect editat" },
  { value: "redirect.toggle", label: "Redirect activat/dezactivat" },
  { value: "seo.save", label: "SEO salvat" },
  { value: "seo.reset", label: "SEO resetat" },
  { value: "media.upload", label: "Media încărcat" },
  { value: "media.delete", label: "Media șters" },
] as const;

const ACTION_LABELS = new Map<string, string>(ACTIVITY_ACTIONS.map((a) => [a.value, a.label]));
const ENTITY_LABELS = new Map<string, string>(ACTIVITY_ENTITY_TYPES.map((e) => [e.value, e.label]));

export function actionLabel(v: string): string {
  return ACTION_LABELS.get(v) ?? v;
}
export function entityTypeLabel(v: string | null): string {
  return v ? (ENTITY_LABELS.get(v) ?? v) : "—";
}
