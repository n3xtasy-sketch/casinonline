import { ImportWizard } from "@/components/admin/ImportWizard";

export default function AdminImportPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Import CSV</h1>
        <p className="mt-1 text-sm text-ink-secondary">
          Dry-run obligatoriu înainte de import. Mod <strong>CREATE</strong> (doar înregistrări noi —
          slug existent = eroare) sau <strong>UPSERT</strong> (creează + actualizează după id apoi slug;
          celulele goale păstrează valorile, <code>__CLEAR__</code> golește, statusul e read-only).
          Înregistrările noi intră ca <strong>draft</strong>; modificările la conținut publicat cer
          confirmare. FK-uri și relații M2M prin slug-uri. Max 1000 rânduri / 2 MB.
        </p>
      </div>
      <ImportWizard />
    </div>
  );
}
