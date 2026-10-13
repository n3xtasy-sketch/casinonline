/** Per-entity Import/Export descriptors (pure, client+server safe). */

export type IoEntity =
  | "casinos"
  | "bonuses"
  | "games"
  | "providers"
  | "payment_methods"
  | "guides"
  | "affiliate_links";

export const IO_IMPORT_ENTITIES: IoEntity[] = [
  "casinos",
  "bonuses",
  "games",
  "providers",
  "payment_methods",
  "guides",
];

export type FieldType = "string" | "int" | "float" | "url" | "list";

export interface FieldDef {
  col: string; // CSV column name
  db?: string; // DB column (defaults to col)
  type: FieldType;
  required?: boolean;
}
export interface FkDef {
  col: string; // CSV column (slug)
  db: string; // DB FK column
  lookup: LookupKey; // which slug→id map
  required?: boolean;
}
export interface M2mDef {
  col: string; // CSV column (pipe list of slugs)
  junction: string;
  selfCol: string;
  otherCol: string;
  lookup: LookupKey;
}

export type LookupKey =
  | "providers"
  | "game_categories"
  | "casinos"
  | "bonus_types"
  | "payment_types"
  | "guide_categories"
  | "tags"
  | "games"
  | "payment_methods";

export interface EntityDesc {
  key: IoEntity;
  table: string;
  activity: string; // activity-log entity prefix
  tags: string[]; // cache tags to updateTag after import
  label: string;
  fields: FieldDef[]; // scalar (excludes slug, which is always first/required)
  fks: FkDef[];
  m2m: M2mDef[];
  /** structured fields included only in JSON export (never CSV). */
  jsonExtra: string[];
}

const casinos: EntityDesc = {
  key: "casinos",
  table: "casinos",
  activity: "casino",
  tags: ["casinos", "bonuses"],
  label: "Cazinouri",
  fields: [
    { col: "name", type: "string", required: true },
    { col: "logo_url", type: "url" },
    { col: "rating", type: "float" },
    { col: "editor_score", type: "float" },
    { col: "license", type: "string" },
    { col: "payout_speed", type: "string" },
    { col: "withdrawal_time", type: "string" },
    { col: "verified_at", type: "string" },
    { col: "min_deposit", type: "string" },
    { col: "kyc", type: "string" },
    { col: "support", type: "string" },
    { col: "mobile", type: "string" },
    { col: "intro", type: "string" },
    { col: "editor_review", type: "string" },
    { col: "pros", type: "list" },
    { col: "cons", type: "list" },
  ],
  fks: [],
  m2m: [
    { col: "tag_slugs", junction: "casino_tags", selfCol: "casino_id", otherCol: "tag_id", lookup: "tags" },
    { col: "payment_method_slugs", junction: "casino_payment_methods", selfCol: "casino_id", otherCol: "payment_method_id", lookup: "payment_methods" },
    { col: "game_slugs", junction: "casino_games", selfCol: "casino_id", otherCol: "game_id", lookup: "games" },
  ],
  jsonExtra: ["faq", "status"],
};

const bonuses: EntityDesc = {
  key: "bonuses",
  table: "bonuses",
  activity: "bonus",
  tags: ["bonuses", "casinos"],
  label: "Bonusuri",
  fields: [
    { col: "offer", type: "string", required: true },
    { col: "free_spins", type: "int" },
    { col: "wagering", type: "string" },
    { col: "code", type: "string" },
    { col: "min_deposit", type: "string" },
    { col: "validity", type: "string" },
    { col: "intro", type: "string" },
    { col: "terms", type: "list" },
    { col: "pros", type: "list" },
    { col: "cons", type: "list" },
    { col: "how_to_claim", type: "list" },
  ],
  fks: [
    { col: "casino_slug", db: "casino_id", lookup: "casinos", required: true },
    { col: "bonus_type_slug", db: "bonus_type_id", lookup: "bonus_types" },
  ],
  m2m: [],
  jsonExtra: ["faq", "status"],
};

const games: EntityDesc = {
  key: "games",
  table: "games",
  activity: "game",
  tags: ["games", "casinos", "providers"],
  label: "Jocuri",
  fields: [
    { col: "name", type: "string", required: true },
    { col: "thumbnail_url", type: "url" },
    { col: "rtp", type: "float" },
    { col: "volatility", type: "string" },
    { col: "max_win", type: "string" },
    { col: "release_year", type: "int" },
    { col: "reels", type: "string" },
    { col: "paylines", type: "string" },
    { col: "bet_range", type: "string" },
    { col: "intro", type: "string" },
    { col: "mechanics", type: "string" },
    { col: "bonus_features", type: "list" },
  ],
  fks: [
    { col: "provider_slug", db: "provider_id", lookup: "providers", required: true },
    { col: "category_slug", db: "category_id", lookup: "game_categories", required: true },
  ],
  m2m: [
    { col: "casino_slugs", junction: "casino_games", selfCol: "game_id", otherCol: "casino_id", lookup: "casinos" },
  ],
  jsonExtra: ["faq", "status"],
};

const providers: EntityDesc = {
  key: "providers",
  table: "providers",
  activity: "provider",
  tags: ["providers", "games"],
  label: "Furnizori",
  fields: [
    { col: "name", type: "string", required: true },
    { col: "logo_url", type: "url" },
    { col: "category", type: "string" },
    { col: "founded", type: "int" },
    { col: "country", type: "string" },
    { col: "specialty", type: "string" },
    { col: "rtp_range", type: "string" },
    { col: "intro", type: "string" },
  ],
  fks: [],
  m2m: [],
  jsonExtra: ["faq", "status"],
};

const payment_methods: EntityDesc = {
  key: "payment_methods",
  table: "payment_methods",
  activity: "payment",
  tags: ["payments", "casinos"],
  label: "Metode de plată",
  fields: [
    { col: "name", type: "string", required: true },
    { col: "logo_url", type: "url" },
    { col: "deposit_speed", type: "string" },
    { col: "withdrawal_speed", type: "string" },
    { col: "fees", type: "string" },
    { col: "min_limit", type: "string" },
    { col: "max_limit", type: "string" },
    { col: "intro", type: "string" },
    { col: "deposits", type: "string" },
    { col: "withdrawals", type: "string" },
    { col: "pros", type: "list" },
    { col: "cons", type: "list" },
  ],
  fks: [{ col: "payment_type_slug", db: "payment_type_id", lookup: "payment_types", required: true }],
  m2m: [
    { col: "casino_slugs", junction: "casino_payment_methods", selfCol: "payment_method_id", otherCol: "casino_id", lookup: "casinos" },
  ],
  jsonExtra: ["faq", "status"],
};

const guides: EntityDesc = {
  key: "guides",
  table: "guides",
  activity: "guide",
  tags: ["guides"],
  label: "Ghiduri",
  fields: [
    { col: "title", type: "string", required: true },
    { col: "excerpt", type: "string" },
    { col: "image_url", type: "url" },
    { col: "author", type: "string" },
    { col: "intro", type: "string" },
    { col: "reading_time", type: "string" },
  ],
  fks: [{ col: "category_slug", db: "category_id", lookup: "guide_categories", required: true }],
  m2m: [],
  jsonExtra: ["faq", "sections", "related_links", "status"],
};

export const ENTITY_DESCRIPTORS: Record<Exclude<IoEntity, "affiliate_links">, EntityDesc> = {
  casinos,
  bonuses,
  games,
  providers,
  payment_methods,
  guides,
};

/** Ordered CSV header for an entity (slug first, then fields, fks, m2m). */
export function csvColumns(d: EntityDesc): string[] {
  return [
    "slug",
    ...d.fields.map((f) => f.col),
    ...d.fks.map((f) => f.col),
    ...d.m2m.map((m) => m.col),
  ];
}

export const LIST_SEP = "|";
