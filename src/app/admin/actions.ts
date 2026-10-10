"use server";

import { redirect } from "next/navigation";
import { getSupabaseAuthClient } from "@/lib/supabase/auth-server";

export interface LoginState {
  error: string | null;
}

/** Server-side admin login (sets the session cookie). No Supabase client in the browser. */
export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Completează email și parolă." };

  const supabase = await getSupabaseAuthClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) return { error: "Email sau parolă incorecte." };

  // Only admins may proceed; otherwise sign back out.
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", data.user.id)
    .maybeSingle();
  if (!profile?.is_admin) {
    await supabase.auth.signOut();
    return { error: "Acest cont nu are acces de administrator." };
  }

  redirect("/admin");
}

/** Server-side logout. */
export async function logoutAction() {
  const supabase = await getSupabaseAuthClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}
