import "server-only";
import { getSupabaseAuthClient } from "@/lib/supabase/auth-server";

export interface RedirectRow {
  id: string;
  fromPath: string;
  toPath: string;
  statusCode: number;
  isActive: boolean;
  note: string;
}

interface Row {
  id: string;
  from_path: string;
  to_path: string;
  status_code: number;
  is_active: boolean;
  note: string | null;
}

function toRow(r: Row): RedirectRow {
  return {
    id: r.id,
    fromPath: r.from_path,
    toPath: r.to_path,
    statusCode: r.status_code,
    isActive: r.is_active,
    note: r.note ?? "",
  };
}

export async function listRedirects(): Promise<RedirectRow[]> {
  const db = await getSupabaseAuthClient();
  const { data, error } = await db
    .from("redirects")
    .select("id, from_path, to_path, status_code, is_active, note")
    .order("from_path");
  if (error) throw new Error(`listRedirects: ${error.message}`);
  return ((data as unknown as Row[]) ?? []).map(toRow);
}

export async function getRedirectEdit(id: string): Promise<RedirectRow | null> {
  const db = await getSupabaseAuthClient();
  const { data, error } = await db
    .from("redirects")
    .select("id, from_path, to_path, status_code, is_active, note")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`getRedirectEdit: ${error.message}`);
  return data ? toRow(data as unknown as Row) : null;
}
