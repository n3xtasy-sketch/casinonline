"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Power, PowerOff } from "lucide-react";
import { setRedirectActive } from "@/app/admin/(panel)/redirects/actions";

export function RedirectActiveButton({ id, isActive }: { id: string; isActive: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function toggle() {
    start(async () => {
      const res = await setRedirectActive(id, !isActive);
      if ("error" in res) window.alert(res.error);
      else router.refresh();
    });
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={toggle}
      className={
        isActive
          ? "inline-flex items-center gap-1.5 text-sm font-medium text-danger hover:underline disabled:opacity-50"
          : "inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline disabled:opacity-50"
      }
    >
      {isActive ? <PowerOff size={14} /> : <Power size={14} />}
      {isActive ? "Dezactivează" : "Activează"}
    </button>
  );
}
