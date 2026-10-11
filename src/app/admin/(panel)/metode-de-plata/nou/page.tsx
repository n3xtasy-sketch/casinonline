import { PaymentMethodForm } from "@/components/admin/PaymentMethodForm";
import { listPaymentTypes } from "@/lib/db/admin-payments";
import { listCasinos } from "@/lib/db/admin-bonuses";
import { createPaymentMethod } from "../actions";

export default async function NewPaymentMethodPage() {
  const [paymentTypes, casinos] = await Promise.all([listPaymentTypes(), listCasinos()]);
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Adaugă metodă de plată</h1>
        <p className="mt-1 text-sm text-ink-secondary">Devine accesibilă public imediat după salvare.</p>
      </div>
      <PaymentMethodForm mode="create" action={createPaymentMethod} paymentTypes={paymentTypes} casinos={casinos} />
    </div>
  );
}
