import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { leadSchema, normalizePhone } from "@/lib/schema";
import { RESULTAT_GENERIQUE, SURFACES, evaluerPac } from "@/lib/profil";
import { revenuDeTranche, tranchesRevenu, zoneFromCodePostal } from "@/lib/plafonds";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: Request) {
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Requête invalide." }, { status: 400 }); }

  const parsed = leadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Certains champs sont invalides.", fields: parsed.error.flatten().fieldErrors }, { status: 422 });
  }
  const { website, consent: _c, preview, telephone, answers, rappel_date, rappel_heure, ...d } = parsed.data;
  if (website) return NextResponse.json({ ok: true, resultat: RESULTAT_GENERIQUE }); // champ piège : on ignore les robots

  // Le profil est calculé côté serveur : les barèmes ne sont jamais envoyés au navigateur.
  // Le menu propose les 4 tranches du barème (bleu, jaune, violet, rose) selon la zone et la taille du foyer.
  const zone = zoneFromCodePostal(d.code_postal);
  const trancheLabel = answers.revenu_tranche !== undefined ? tranchesRevenu(zone, answers.personnes_foyer_fiscal)[answers.revenu_tranche] : undefined;
  const ev = evaluerPac({
    rfr: answers.revenu_fiscal_reference ?? revenuDeTranche(zone, answers.personnes_foyer_fiscal, answers.revenu_tranche!),
    personnes: answers.personnes_foyer_fiscal,
    codePostal: d.code_postal,
    proprietaire: answers.proprietaire,
  });

  // Aperçu (non utilisé par le formulaire actuel) : on calcule sans enregistrer.
  if (preview) return NextResponse.json({ ok: true, resultat: ev.resultat });

  // « Voir mon résultat » : toutes les données sont enregistrées ici, SANS consentement à être appelé (consent_at vide).
  // Le consentement et le créneau sont ajoutés ensuite par /api/leads/rappel, grâce au jeton renvoyé ci-dessous.
  const token = randomUUID();
  const simulation: Record<string, unknown> = {
    interet: "pompe_a_chaleur",
    ...answers,
    ...(trancheLabel ? { revenu_tranche: trancheLabel } : {}),
    ...(answers.surface_tranche !== undefined ? { surface_tranche: SURFACES[answers.surface_tranche] } : {}),
    zone: ev.zone,
    profil_maprimerenov: ev.profil,
    eligible_pac_1_euro: ev.resultat.eligible ? "oui" : "non",
    rappel_date,
    rappel_heure,
    rappel_token: token,
  };

  const { data, error } = await supabaseAdmin().from("leads").insert({
    ...d,
    motif: "energies",
    email: d.email || null,
    telephone: normalizePhone(telephone),
    simulation,
    consent_at: null,
    consent_version: null,
  }).select("id").single();
  if (error || !data) {
    console.error("insert lead:", error?.message);
    return NextResponse.json({ error: "Enregistrement impossible. Réessayez dans un instant." }, { status: 500 });
  }
  return NextResponse.json({ ok: true, resultat: ev.resultat, id: data.id, token });
}
