import { NextResponse } from "next/server";
import { STATUTS } from "@/lib/leads-admin";
import { supabaseAdmin } from "@/lib/supabase";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const statut = body?.statut;
  if (!(STATUTS as readonly string[]).includes(statut)) return NextResponse.json({ error: "Statut invalide" }, { status: 422 });

  const { error } = await supabaseAdmin().from("leads").update({ statut }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
