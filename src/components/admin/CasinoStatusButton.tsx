"use client";

import { Archive, RotateCcw } from "lucide-react";
import { setCasinoStatus } from "@/app/admin/(panel)/cazinouri/actions";

interface Props {
  id: string;
  name: string;
  status: "active" | "archived";
}

/** Archive / reactivate toggle with a confirm step. Posts to the server action. */
export function CasinoStatusButton({ id, name, status }: Props) {
  const archiving = status === "active";
  const next = archiving ? "archived" : "active";
  const label = archiving ? "Arhivează" : "Reactivează";
  const confirmMsg = archiving
    ? `Arhivezi „${name}"? Nu va mai fi vizibil public (listinguri, pagină, /go, bonusuri). Poți reactiva oricând.`
    : `Reactivezi „${name}"? Revine public cu toate relațiile.`;

  return (
    <form
      action={setCasinoStatus}
      onSubmit={(e) => {
        if (!window.confirm(confirmMsg)) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={next} />
      <button
        type="submit"
        className={
          archiving
            ? "inline-flex items-center gap-1.5 text-sm font-medium text-danger hover:underline"
            : "inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline"
        }
      >
        {archiving ? <Archive size={14} /> : <RotateCcw size={14} />}
        {label}
      </button>
    </form>
  );
}
