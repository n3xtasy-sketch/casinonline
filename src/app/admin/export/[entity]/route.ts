import { NextResponse } from "next/server";
import { getSupabaseAuthClient } from "@/lib/supabase/auth-server";
import { exportEntity } from "@/lib/db/io";
import { logActivity } from "@/lib/db/activity";
import type { IoEntity } from "@/lib/io/entities";

const VALID: IoEntity[] = [
  "casinos",
  "bonuses",
  "games",
  "providers",
  "payment_methods",
  "guides",
  "affiliate_links",
];

export async function GET(req: Request, { params }: { params: Promise<{ entity: string }> }) {
  const { entity } = await params;
  if (!VALID.includes(entity as IoEntity)) return new NextResponse("Not found", { status: 404 });

  const db = await getSupabaseAuthClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });
  const { data: profile } = await db.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
  if (!(profile as { is_admin?: boolean } | null)?.is_admin) return new NextResponse("Forbidden", { status: 403 });

  const url = new URL(req.url);
  const format = url.searchParams.get("format") === "json" ? "json" : "csv";
  const status = url.searchParams.get("status") ?? undefined;

  const body = await exportEntity(entity as IoEntity, format, { status });
  await logActivity(db, {
    action: `export.${entity}`,
    entityType: entity,
    metadata: { format, filtered: Boolean(status) },
  });

  const ext = format === "json" ? "json" : "csv";
  const ct = format === "json" ? "application/json" : "text/csv";
  return new NextResponse(format === "csv" ? "﻿" + body : body, {
    headers: {
      "Content-Type": `${ct}; charset=utf-8`,
      "Content-Disposition": `attachment; filename="${entity}.${ext}"`,
    },
  });
}
