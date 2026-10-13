import { ImportWizard } from "@/components/admin/ImportWizard";

export default function AdminImportPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Import CSV</h1>
        <p className="mt-1 text-sm text-ink-secondary">
          Dry-run obligatoriu înainte de import. Create-only (slug existent = eroare), totul intră
          ca <strong>draft</strong>. FK-uri și relații M2M prin slug-uri. Max 1000 rânduri / 2 MB.
        </p>
      </div>
      <ImportWizard />
    </div>
  );
}
