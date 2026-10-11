import { notFound } from "next/navigation";
import { PaymentMethodForm } from "@/components/admin/PaymentMethodForm";
import { getPaymentMethodEdit, listPaymentTypes } from "@/lib/db/admin-payments";
import { listCasinos } from "@/lib/db/admin-bonuses";
import { updatePaymentMethod } from "../../actions";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function EditPaymentMethodPage({ params }: PageProps) {
  const { slug } = await params;
  const [method, paymentTypes, casinos] = await Promise.all([
    getPaymentMethodEdit(slug),
    listPaymentTypes(),
    listCasinos(),
  ]);
  if (!method) notFound();

  const action = updatePaymentMethod.bind(null, method.id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Editează metodă: {method.name}</h1>
        <p className="mt-1 text-sm text-ink-secondary">Modificările apar public imediat (updateTag).</p>
      </div>
      <PaymentMethodForm mode="edit" action={action} initial={method} paymentTypes={paymentTypes} casinos={casinos} />
    </div>
  );
}
