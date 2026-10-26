# Schema master CSV — casinonline.ro (date reale)

Schema finală pentru cele 3 fișiere master + template-uri doar-antet
(`casinos.template.csv`, `bonuses.template.csv`, `affiliate-links.template.csv`).
**Documentație/țintă** — unele coloane necesită migrații + upsert înainte de a fi
importabile (vezi legenda). Nicio aplicație/DB/importer modificat.

> ⚠️ **Exemplele de valori de mai jos sunt ILUSTRATIVE** (inclusiv slug-uri ca `superbet`).
> Datele reale folosesc **slug-urile și ID-urile existente din Supabase** — vezi §Identificatori.

## Legendă stare coloană
- ✅ **există azi** în importer/DB (importabil imediat după upsert).
- 🆕 **nou** — necesită migrație aditivă (nullable) înainte de import.
- 🔑 **id** — identificator stabil; necesită suport în importer (match pe `id`, apoi slug).

## Reguli comune (toate cele 3 fișiere)
1. **`id` = identificator stabil** (uuid din DB). Update → match pe `id`; dacă `id` e gol → match pe cheia naturală (slug / cheie compozită afiliere); altfel → **create**. Exportul completează `id`.
2. **Celule goale la UPDATE = NU șterg** (coloana e ignorată din patch). Golire explicită = sentinela `__CLEAR__`. La CREATE, goală = valoare implicită (null / listă goală).
3. **Dry-run cu diferențe + confirmare**: fiecare rând clasificat CREATE / UPDATE(câmpuri schimbate) / NESCHIMBAT.
4. **Rândurile absente din CSV NU se șterg.**
5. **Înregistrările noi → `draft`**; la update statusul existent se **păstrează**; publicarea din Admin, cu gate.
6. **Modificări importante la `published`** (sumă, rulaj, cod, valabilitate, status) → **confirmare explicită** suplimentară.
7. **Export = Import**: aceleași coloane, aceeași ordine.
8. **Liste** = separate cu `|`. **Date** = `YYYY-MM-DD`. **Boolean** = `true`/`false`. **Slug** = `^[a-z0-9]+(-[a-z0-9]+)*$`. **JSON** = JSON valid într-o singură celulă (citată).

## §Identificatori — păstrăm ce există (nu redenumim)
- Slug-urile și ID-urile din Supabase sunt **canonice**. NU redenumi cazinouri/promoții și NU schimba URL-uri doar ca să semene cu exemplele din acest doc.
- La actualizări: exportă întâi din Admin (completează `id`+`slug` reale) → editezi → reimporți. Match-ul pe `id` permite chiar și corectarea unui slug fără a pierde relațiile.

---

## 1. casinos.csv — 27 coloane
| Coloană | Oblig. | Tip / valori | Stare | Descriere |
|---|---|---|---|---|
| `id` | la update | uuid | 🔑 | Identificator stabil. |
| `slug` | la create | slug | ✅ | Cheie naturală + țintă FK. |
| `name` | **da** | text | ✅ | Numele afișat. |
| `year_launched` | nu | int (1990–2100) | 🆕 | Anul lansării. |
| `license` | nu | text | ✅ | Licența ONJN. |
| `license_verified_at` | nu | date | 🆕 | Când a fost verificată licența. |
| `license_source` | nu | url | 🆕 | Sursă verificare licență. |
| `logo_url` | nu | url | ✅ | Logo. |
| `og_image` | nu | url | 🆕 | Imagine hero/OG. |
| `rating` | **nu — derivat** | 0–5 (1 zec.) | ✅ | **Export-only / derivat** din `editor_score` (÷2). NU completa manual (vezi §Rating). |
| `editor_score` | nu | 0–10 (1 zec.) | ✅ | **Sursa unică de adevăr** a evaluării editoriale. Gol = neevaluat. |
| `min_deposit` | nu | text | ✅ | Depunere minimă. |
| `payout_speed` | nu | text | ✅ | Viteză retragere (scurt). |
| `withdrawal_time` | nu | text | ✅ | Timp retragere (detaliat). |
| `payment_method_slugs` | nu | listă slug | ✅ (m2m) | `visa\|mastercard\|skrill\|okto` |
| `kyc` | nu | text | ✅ | Condiții KYC. |
| `support` | nu | text | ✅ | Canale suport. |
| `mobile` | nu | text | ✅ | Aplicații mobile. |
| `verified_at` | nu | date | ✅ | Ultima verificare a datelor. |
| `verification_source` | nu | url | 🆕 | Sursă generală de verificare. |
| `intro` | nu | text | ✅ | Overview/descriere. |
| `editor_review` | nu | text | ✅ | Verdict editorial (lung). |
| `pros` | nu | listă | ✅ | Avantaje. |
| `cons` | nu | listă | ✅ | Dezavantaje. |
| `tag_slugs` | nu | listă slug | ✅ (m2m) | `recomandat\|retrageri-rapide\|nou\|fara-depunere\|popular` |
| `game_slugs` | nu | listă slug | ✅ (m2m) | Jocuri asociate (opțional). |
| `status` | nu | draft\|published\|archived | ✅ | Create→draft forțat; update→păstrat. |

**Core (completare rapidă):** `slug, name, license, license_verified_at, license_source, min_deposit, payout_speed, payment_method_slugs, support, kyc, intro, editor_score, tag_slugs`.

## §Rating — o singură sursă de adevăr
- **`editor_score` (0–10, 1 zecimală) = sursa unică.** Completezi DOAR `editor_score`.
- **`rating` (0–5) = derivat automat** = `round(editor_score / 2, 1)` (ex. `9.1 → 4.6`). La import e **ignorat/recalculat** (nu suprascrie); la export e completat pentru round-trip. Astfel: fără scoruri contradictorii, fără rating inventat (editor_score gol → ambele rămân goale → „Încă neevaluat").
- Conversia se face o singură dată, la scriere (upsert + formularul Admin). `rating numeric(5,2)` rămâne compatibil (stochează 1 zecimală fără probleme).

---

## 2. bonuses.csv — 33 coloane
**Structurat** (pentru comparații/carduri) **+** JSON flexibil (`reward_stages`) **+** text liber (`terms_full`). Nu presupune condiții identice între promoții.

| Coloană | Oblig. | Tip / valori | Stare | Descriere |
|---|---|---|---|---|
| `id` | la update | uuid | 🔑 | Identificator stabil. |
| `slug` | la create | slug | ✅ | Cheie naturală. |
| `casino_slug` | **da** | slug (FK) | ✅ | Cazinoul asociat. |
| `bonus_type_slug` | nu | `bonus-de-bun-venit\|fara-depunere\|rotiri-gratuite\|cashback\|fara-rulaj` | ✅ | Tipul bonusului. |
| `offer` | **da** | text | ✅ | Titlu afișat. |
| `amount` | nu | text — **TOTAL/principal** | 🆕 | Suma/procentul total (ex. „1.000 RON"). Vezi §Simple-vs-stages. |
| `free_spins` | nu | int — **TOTAL** | ✅ | Număr total de rotiri (suma etapelor). |
| `spin_value` | nu | text | 🆕 | Valoare/rotire (principală). |
| `eligible_slots` | nu | text / listă | 🆕 | Sloturi eligibile (principale). |
| `min_deposit` | nu | text | ✅ | Depunere minimă (`0 RON` / „fără depunere" la no-deposit). |
| `code` | nu | text | ✅ | Cod promoțional. |
| `wagering` | nu | text | ✅ | Rulaj afișat (ex. „35x bonus"). |
| `wagering_multiplier` | nu | int — **principal** | 🆕 | Rulaj numeric dominant. Dacă variază pe etape → lasă gol + detaliu în `reward_stages`. |
| `wagering_basis` | nu | `bonus\|bonus+depunere\|depunere\|castiguri\|fara-rulaj` | 🆕 | Baza de calcul principală. |
| `max_win` | nu | text | 🆕 | Câștig maxim. |
| `validity` | nu | text | ✅ | Valabilitate generală. |
| `activation_window` | nu | text | 🆕 | Termen de activare (principal). |
| `usage_window` | nu | text | 🆕 | Termen de utilizare/rulare (principal). |
| `kyc_required` | nu | text | 🆕 | Condiții KYC specifice. |
| `eligibility` | nu | text | 🆕 | Eligibilitate. |
| `restrictions` | nu | text | 🆕 | Restricții. |
| `reward_stages` | nu | **JSON (array)** | 🆕 | Defalcare pe etape/recompense multiple (vezi §reward_stages). Gol pentru promoții simple. |
| `terms` | nu | listă | ✅ | Termeni-cheie (bullets). |
| `terms_full` | nu | text | 🆕 | T&C complete documentate în CMS (text liber). |
| `terms_url` | nu | url | 🆕 | Link direct la pagina de T&C (separat de pagina ofertei). |
| `intro` | nu | text | ✅ | Descriere bonus. |
| `how_to_claim` | nu | listă | ✅ | Pași revendicare. |
| `pros` | nu | listă | ✅ | Avantaje. |
| `cons` | nu | listă | ✅ | Dezavantaje. |
| `source_url` | **la publicare** | url | 🆕 | Pagina oficială a promoției. |
| `verified_at` | **la publicare** | date | 🆕 | Data verificării. |
| `expires_at` | nu | date | 🆕 | Data de expirare (hard). |
| `status` | nu | draft\|published\|archived | ✅ | Create→draft; update→păstrat; publicare gated (necesită `source_url`+`verified_at`). |

**Core (completare rapidă):** `slug, casino_slug, bonus_type_slug, offer, amount, free_spins, min_deposit, code, wagering_multiplier, wagering_basis, max_win, validity, source_url, verified_at`.

### §Simple-vs-stages (anti-contradicție)
- Câmpurile simple (`amount`, `free_spins`, `spin_value`, `wagering_multiplier`, `wagering_basis`, `activation_window`, `usage_window`) = **valori de afișare: TOTALUL sau valoarea PRINCIPALĂ** — pentru carduri și tabele comparative.
- `reward_stages` = **sursa autoritară pe etape** când promoția are mai multe tranșe/recompense.
- Regula de coerență (validată de import ca **warning**, nu eroare): dacă `reward_stages` e completat, `free_spins` ar trebui să fie **suma** rotirilor din etape; `amount` = totalul în bani; `wagering_multiplier` = rulajul dominant (sau gol dacă variază). Nu există contradicție: simplu = rezumat, `reward_stages` = detaliu.

### §reward_stages — formă JSON (array de obiecte; toate cheile opționale)
```
[{"label":"…","kind":"cash|spins","amount":"…","free_spins":0,"spin_value":"…",
  "wagering_multiplier":0,"wagering_basis":"…","min_deposit":"…","eligible_slots":"…",
  "activation_window":"…","usage_window":"…","note":"…"}]
```
Importabil via mecanismul `jsonFields` existent (ca `sections`/`faq` la ghiduri); validare strictă a tipurilor (free_spins/wagering_multiplier = int).

---

## 3. affiliate-links.csv — 9 coloane
| Coloană | Oblig. | Tip / valori | Stare | Descriere |
|---|---|---|---|---|
| `id` | la update | uuid | 🔑 | Identificator stabil (fără slug). |
| `casino_slug` | **da** | slug (FK) | ✅ | Cazinoul asociat. |
| `bonus_slug` | nu | slug (FK bonuses) | 🆕 | Promoția asociată (opțional). |
| `placement` | **da** | `review_cta\|bonus_claim\|listing_card` | ✅ | Locul de plasare (constraint 0013). |
| `program` | nu | text | 🆕 | Programul de afiliere. |
| `url` | **da** | url `https://` | ✅ | Destinația (https obligatoriu). |
| `campaign` | nu | text | ✅ | Campanie (parte din cheia unică; gol = „default"). |
| `is_active` | nu | true\|false | ✅ | Activ/inactiv (fără delete fizic). |
| `verified_at` | nu | date | 🆕 | Data verificării linkului. |

**Core (completare rapidă):** `casino_slug, placement, url` (+ `campaign` dacă rulezi mai multe).
**Cheie naturală (fără `id`):** `(casino_slug, placement, campaign)`.

---

## §Completare manuală simplificată
- Un **singur set master** per entitate (fără fișiere paralele care ar diverge). Secțiunile „Core" de mai sus = coloanele esențiale de completat primele; restul sunt opționale (goale = ignorate la import).
- Recomandare flux: exportă din Admin → completezi Core → reimporți (dry-run cu diff) → completezi restul ulterior.

## §Testarea modelului (exemple FICTIVE, marcate explicit)
> Toate valorile de mai jos sunt **[EXEMPLU FICTIV]**, nu oferte reale.

1. **100 rotiri în 5 tranșe de 20** — `free_spins=100` (total); `reward_stages`:
   `[{"label":"[EXEMPLU] Ziua 1","kind":"spins","free_spins":20},{"label":"Ziua 2","kind":"spins","free_spins":20}, …×5]` → ✅ reprezentabil.
2. **Rulaj diferit per tranșă** — `wagering_multiplier` gol (variază); fiecare etapă are `wagering_multiplier`/`wagering_basis` proprii:
   `[{"label":"Z1","free_spins":20,"wagering_multiplier":30,"wagering_basis":"castiguri"},{"label":"Z2","free_spins":20,"wagering_multiplier":40}]` → ✅.
3. **Bonus bun venit: bani + rotiri** — `bonus_type_slug=bonus-de-bun-venit`, `amount="1.000 RON"` (total), `free_spins=100` (total); `reward_stages`:
   `[{"kind":"cash","amount":"[EXEMPLU] 1.000 RON","wagering_multiplier":35,"wagering_basis":"bonus+depunere","min_deposit":"50 RON"},{"kind":"spins","free_spins":100,"spin_value":"0,50 RON","eligible_slots":"[EXEMPLU] Slot X"}]` → ✅.
4. **Fără depunere cu KYC** — `bonus_type_slug=fara-depunere`, `min_deposit="0 RON"`, `kyc_required="[EXEMPLU] verificare act înainte de retragere"`, `reward_stages` opțional → ✅.
5. **Termen separat activare vs utilizare** — `activation_window="[EXEMPLU] 7 zile de la înregistrare"`, `usage_window="[EXEMPLU] rulaj în 30 de zile"` (+ per-etapă în `reward_stages` dacă diferă) → ✅.

**Concluzie test:** toate cele 5 cazuri sunt reprezentabile — cele simple prin câmpuri plate, cele complexe prin `reward_stages`, cu `terms_full`/`terms_url`/`source_url` pentru verificare și prozăul integral.

---

## Istoric & restaurare (mecanism real propus)
Tabel nou `data_revisions` (fază ulterioară): `id, batch_id, entity, entity_id, slug, operation(create|update), before jsonb, after jsonb, actor_email, created_at`. Import + editarea din Admin scriu before/after per rând; Admin „Revert batch/row" → restaurare din DB (nu doar din CSV). PITR Supabase = plasă de siguranță. `activity_log` rămâne jurnalul de acțiuni.

## Ordinea de import (dependențe FK)
taxonomii → furnizori/jocuri/metode de plată → **casinos** → **bonuses** → **affiliate-links**.

## Consumatori
CasinoCard & tabele comparative · CasinoReview (overview, facts, bonus detaliat + `reward_stages`, surse) · pagini categorie (`tag_slugs`) · Knowledge Engine & AI Writer (`source_url`/`terms_url`/`verified_at`/`wagering_*`/`eligibility`/`restrictions`/`reward_stages` = fapte verificabile).

## Editare duală (CSV + Admin)
Aceleași tabele, aceleași reguli (draft implicit, gate publicare, conversie rating, jurnalizare). CSV = bulk; `BonusForm`/formularele Admin = editare rapidă a unui singur rând. Câmpurile noi se adaugă în **ambele** (descriptor import + formular Admin), ideal cu validare comună.
