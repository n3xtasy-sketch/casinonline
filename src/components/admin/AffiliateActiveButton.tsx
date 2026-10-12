"use client";

import { Power, PowerOff } from "lucide-react";
import { setAffiliateActive } from "@/app/admin/(panel)/affiliate-links/actions";

interface Props {
  id: string;
  isActive: boolean;
  label: string;
}

/** Toggle is_active (soft-delete / reactivate) with a confirm step. */
export function AffiliateActiveButton({ id, isActive, label }: Props) {
  const next = !isActive;
  const confirmMsg = isActive
    ? `Dezactivezi linkul „${label}"? Nu va mai fi folosit public (ex. /go). Poți reactiva oricând.`
    : `Reactivezi linkul „${label}"?`;

  return (
    <form
      action={setAffiliateActive}
      onSubmit={(e) => {
        if (!window.confirm(confirmMsg)) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="active" value={String(next)} />
      <button
        type="submit"
        className={
          isActive
            ? "inline-flex items-center gap-1.5 text-sm font-medium text-danger hover:underline"
            : "inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline"
        }
      >
        {isActive ? <PowerOff size={14} /> : <Power size={14} />}
        {isActive ? "Dezactivează" : "Reactivează"}
      </button>
    </form>
  );
}
