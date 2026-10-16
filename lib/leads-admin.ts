import { supabaseAdmin } from "@/lib/supabase";

export const STATUTS = ["nouveau", "a_rappeler", "contacte", "rdv", "perdu"] as const;
export type Statut = (typeof STATUTS)[number];
export const STATUT_LABELS: Record<Statut, string> = {
  nouveau: "Nouveau",
  a_rappeler: "À rappeler",
  contacte: "Contacté",
  rdv: "RDV pris",
  perdu: "Perdu",
};

// Pour l'instant tous les leads sont des pompes à chaleur.
export const MOTIF_LABEL = "PAC";

export type Filters = { q?: string; statut?: string; motif?: string; du?: string; au?: string };

// Lecture des filtres depuis l'URL (page admin et export utilisent exactement la même logique).
export function readFilters(sp: Record<string, string | string[] | undefined> | URLSearchParams): Filters {
  const get = (k: string) => {
    const v = sp instanceof URLSearchParams ? sp.get(k) : sp[k];
    return (Array.isArray(v) ? v[0] : v) || undefined;
  };
  return { q: get("q"), statut: get("statut"), motif: get("motif"), du: get("du"), au: get("au") };
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export async function fetchLeads(f: Filters, limit = 1000) {
  let query = supabaseAdmin().from("leads").select("*", { count: "exact" }).order("created_at", { ascending: false }).limit(limit);

  if (f.statut && (STATUTS as readonly string[]).includes(f.statut)) query = query.eq("statut", f.statut);
  if (f.motif === "energies" || f.motif === "defiscalisation") query = query.eq("motif", f.motif);
  if (f.du && DATE.test(f.du)) query = query.gte("created_at", f.du + "T00:00:00");
  if (f.au && DATE.test(f.au)) query = query.lte("created_at", f.au + "T23:59:59");

  // On retire les caractères qui casseraient la syntaxe du filtre .or()
  const q = (f.q ?? "").replace(/[,()%*\\]/g, " ").trim();
  if (q) {
    const cols = ["nom", "prenom", "telephone", "email", "ville", "code_postal"];
    query = query.or(cols.map((c) => `${c}.ilike.%${q}%`).join(","));
  }
  return query;
}

// Récupère des leads précis (sélection cochée). On découpe en paquets pour ne pas dépasser la taille d'URL de Supabase.
export async function fetchLeadsByIds(ids: string[]) {
  const all: Record<string, any>[] = [];
  for (let i = 0; i < ids.length; i += 150) {
    const { data, error } = await supabaseAdmin().from("leads").select("*").in("id", ids.slice(i, i + 150));
    if (error) return { data: null, error };
    all.push(...(data ?? []));
  }
  all.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  return { data: all, error: null };
}

// ---- CSV (séparateur ";" + BOM : s'ouvre directement dans Excel FR) ----
const FORMULA_START = /^[=+\-@\t\r]/;
export function csvCell(v: unknown): string {
  let s = v == null ? "" : String(v);
  if (FORMULA_START.test(s)) s = "'" + s; // empêche l'injection de formule Excel
  return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// "+33612345678" -> "0612345678" (format national, lisible et sans risque Excel)
export const phoneNational = (p?: string | null) => (p ? p.replace(/^\+33/, "0") : "");

type Lead = Record<string, any>;
export function leadsToCsv(leads: Lead[]): string {
  const head = ["Date", "Prénom", "Nom", "Téléphone", "E-mail", "Adresse", "Code postal", "Ville", "Motif", "Statut", "Rappel (date)", "Rappel (heure)", "Propriétaire", "Surface (m²)", "Personnes foyer", "Revenu fiscal réf.", "MaPrimeRénov' 5 ans", "Zone", "Profil MaPrimeRénov'", "Éligible PAC 1 €", "Consentement à être appelé"];
  const rows = leads.map((l) => {
    const s = (l.simulation ?? {}) as Record<string, unknown>;
    return [
      new Date(l.created_at).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Paris" }),
      l.prenom, l.nom, phoneNational(l.telephone), l.email, l.adresse, l.code_postal, l.ville,
      MOTIF_LABEL, l.statut, s.rappel_date, s.rappel_heure,
      s.proprietaire, s.surface_habitable ?? s.surface_tranche, s.personnes_foyer_fiscal, s.revenu_fiscal_reference ?? s.revenu_tranche,
      s.maprimerenov_5_ans, s.zone, s.profil_maprimerenov, s.eligible_pac_1_euro, l.consent_at ? "oui" : "non",
    ].map(csvCell).join(";");
  });
  return "\uFEFF" + [head.join(";"), ...rows].join("\r\n");
}
