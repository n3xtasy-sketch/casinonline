import { test } from "node:test";
import assert from "node:assert/strict";
import {
  detectChainConflict,
  normalizePath,
  isInternalRedirectPath,
  isReservedPath,
  looksLikeAsset,
  type ActiveCheck,
} from "./redirects";

// Mock checker driven by a "column:value" → ActiveCheck map (default: no match).
const checker =
  (map: Record<string, ActiveCheck>) =>
  async (column: "from_path" | "to_path", value: string): Promise<ActiveCheck> =>
    map[`${column}:${value}`] ?? { exists: false, error: null };

test("detectChainConflict: fără conflict → null", async () => {
  assert.equal(await detectChainConflict(checker({}), "/a", "/b"), null);
});

test("detectChainConflict: destinația e deja sursa unui redirect activ → conflict (buclă/lanț)", async () => {
  // candidat /a→/b, dar /b e deja from_path activ (ar crea /a→/b→…; acoperă și bucla B→A)
  const r = await detectChainConflict(checker({ "from_path:/b": { exists: true, error: null } }), "/a", "/b");
  assert.match(r ?? "", /destinația este deja sursa/);
});

test("detectChainConflict: sursa e deja destinația (to_path ne-unic, >1 rânduri) → conflict", async () => {
  // /a e deja to_path al mai multor redirecturi active; cu .limit(1) check-ul întoarce exists=true
  // (vechiul .maybeSingle() ar fi dat eroare + data=null și ar fi RATAT conflictul)
  const r = await detectChainConflict(checker({ "to_path:/a": { exists: true, error: null } }), "/a", "/b");
  assert.match(r ?? "", /sursa este deja destinația/);
});

test("detectChainConflict: eroare la PRIMA interogare NU e tratată ca lipsă de conflict", async () => {
  const r = await detectChainConflict(checker({ "from_path:/b": { exists: false, error: "boom" } }), "/a", "/b");
  assert.match(r ?? "", /Eroare la verificarea conflictelor/);
});

test("detectChainConflict: eroare la A DOUA interogare e surfacată (blochează)", async () => {
  const r = await detectChainConflict(checker({ "to_path:/a": { exists: false, error: "db down" } }), "/a", "/b");
  assert.match(r ?? "", /Eroare la verificarea conflictelor/);
});

test("validări cale: normalize / internal / reserved / asset", () => {
  assert.equal(normalizePath("/cazinouri/?x=1#y"), "/cazinouri");
  assert.equal(normalizePath("/cazinouri/"), "/cazinouri");
  assert.equal(normalizePath(""), "/");
  assert.ok(isInternalRedirectPath("/promo"));
  assert.ok(!isInternalRedirectPath("https://extern.ro"));
  assert.ok(!isInternalRedirectPath("//evil"));
  assert.ok(isReservedPath("/admin"));
  assert.ok(isReservedPath("/go/superbet"));
  assert.ok(!isReservedPath("/cazinouri"));
  assert.ok(looksLikeAsset("/logo.png"));
  assert.ok(!looksLikeAsset("/cazinouri-online"));
});
