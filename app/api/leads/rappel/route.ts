import { NextResponse } from "next/server";
import { CONSENT_VERSION, rappelSchema } from "@/lib/schema";
import { supabaseAdmin } from "@/lib/supabase";

const FENETRE_MS = 3 * 60 * 60 * 1000; // le créneau doit être choisi dans les 3 h suivant l'enregistrement

// Ajoute le consentement et la date/heure de rappel à une demande déjà enregistrée.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = rappelSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Choisissez la date et l'heure de votre rappel et cochez la case." }, { status: 422 });
  const { id, token, rappel_date, rappel_heure, website } = parsed.data;
  if (website) return NextResponse.json({ ok: true }); // champ piège

  const t = Date.parse(rappel_date + "T00:00:00Z");
  if (!Number.isFinite(t) || t < Date.now() - 2 * 86400000 || t > Date.now() + 120 * 86400000)
    return NextResponse.json({ error: "Date invalide." }, { status: 422 });

  const db = supabaseAdmin();
  const { data: lead, error } = await db.from("leads").select("simulation, created_at").eq("id", id).maybeSingle();
  const sim = (lead?.simulation ?? {}) as Record<string, unknown>;
  const recent = lead && Date.now() - Date.parse(String(lead.created_at)) < FENETRE_MS;
  if (error || !lead || !recent || sim.rappel_token !== token || sim.rappel_date)
    return NextResponse.json({ error: "Demande introuvable ou déjà complétée." }, { status: 409 });

  const { rappel_token: _t, ...reste } = sim;
  const { error: upErr } = await db.from("leads").update({ simulation: { ...reste, rappel_date, rappel_heure }, consent_at: new Date().toISOString(), consent_version: CONSENT_VERSION }).eq("id", id);
  if (upErr) {
    console.error("update rappel:", upErr.message);
    return NextResponse.json({ error: "Enregistrement impossible. Réessayez dans un instant." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
