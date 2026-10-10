import { redirect } from "next/navigation";
import { getSupabaseAuthClient } from "@/lib/supabase/auth-server";
import { AdminShell } from "@/components/admin/AdminShell";

/**
 * Guards every panel page: requires a session AND profiles.is_admin = true.
 * An authenticated non-admin is bounced back to /admin/login. (/admin/login
 * lives outside this group, so it is not guarded — no redirect loop.)
 */
export default async function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  const supabase = await getSupabaseAuthClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile?.is_admin) redirect("/admin/login");

  return <AdminShell>{children}</AdminShell>;
}
