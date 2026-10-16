import { MOTIF_LABEL, STATUTS, STATUT_LABELS, fetchLeads, phoneNational, readFilters } from "@/lib/leads-admin";
import LeadsTable, { type Row } from "./LeadsTable";
import "./admin.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Leads", robots: { index: false } };

const TZ = "Europe/Paris";

export default async function Admin({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const filters = readFilters(await searchParams);
  const { data, error, count } = await fetchLeads(filters);
  const leads = data ?? [];

  const exportQs = new URLSearchParams(Object.entries(filters).filter(([, v]) => v) as [string, string][]).toString();
  const options = STATUTS.map((s) => ({ value: s, label: STATUT_LABELS[s] }));

  const rows: Row[] = leads.map((l) => {
    const s = (l.simulation ?? {}) as Record<string, string | number | undefined>;
    const str = (v: unknown) => (v == null ? "" : String(v));
    return {
      id: String(l.id),
      date: new Date(l.created_at).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short", timeZone: TZ }),
      rappel: !l.consent_at ? "⚠ Sans consentement : ne pas appeler" : s.rappel_date ? `${new Date(String(s.rappel_date) + "T12:00:00Z").toLocaleDateString("fr-FR", { timeZone: TZ })} ${s.rappel_heure ?? ""}`.trim() : "",
      prenom: str(l.prenom), nom: str(l.nom),
      telephone: phoneNational(l.telephone), telHref: `tel:${l.telephone ?? ""}`,
      email: str(l.email), codePostal: str(l.code_postal), ville: str(l.ville), motif: MOTIF_LABEL,
      proprietaire: str(s.proprietaire), surface: str(s.surface_habitable) || str(s.surface_tranche), personnes: str(s.personnes_foyer_fiscal),
      revenu: s.revenu_fiscal_reference != null ? Number(s.revenu_fiscal_reference).toLocaleString("fr-FR") + " €" : str(s.revenu_tranche),
      mpr5: str(s.maprimerenov_5_ans), zone: str(s.zone), profil: str(s.profil_maprimerenov), eligible: str(s.eligible_pac_1_euro),
      statut: l.statut ?? "nouveau",
    };
  });

  const n = (st: string) => leads.filter((l) => (l.statut ?? "nouveau") === st).length;
  const stats = [
    { label: "Leads (filtre actuel)", value: count ?? leads.length, c: "#10242C" },
    { label: "Nouveaux", value: n("nouveau"), c: "#1a56a0" },
    { label: "À rappeler", value: n("a_rappeler"), c: "#FFC800" },
    { label: "RDV pris", value: n("rdv"), c: "#087F5F" },
  ];

  const truncatedNote = count != null && count > leads.length
    ? `Seuls les ${leads.length} derniers leads sont affichés. Affinez les filtres ou utilisez « Tout exporter » (jusqu’à 10 000).`
    : undefined;

  return (
    <div className="adm">
      <header className="adm-top">
        <div className="adm-in">
          <img src="/logoEF.png" alt="EclaFoyer" />
          <h1>Leads · Pompe à chaleur</h1>
          <span className="adm-sub">Administration</span>
        </div>
      </header>

      <main className="adm-in adm-body">
        <section className="adm-stats">
          {stats.map((s) => (
            <div key={s.label} className="adm-stat" style={{ ["--c" as string]: s.c }}>
              <b>{s.value}</b><span>{s.label}</span>
            </div>
          ))}
        </section>

        <form method="get" className="adm-card adm-filters" style={{ borderRadius: "18px 18px 0 0" }}>
          <input name="q" defaultValue={filters.q} placeholder="🔎 Nom, téléphone, e-mail, ville, code postal…" />
          <select name="statut" defaultValue={filters.statut ?? ""}>
            <option value="">Tous les statuts</option>
            {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <label>Du <input type="date" name="du" defaultValue={filters.du} /></label>
          <label>au <input type="date" name="au" defaultValue={filters.au} /></label>
          <button type="submit" className="adm-btn">Filtrer</button>
          <a href="/admin" className="adm-btn ghost">Réinitialiser</a>
        </form>

        {error && <p className="err">Lecture impossible : {error.message}</p>}

        <LeadsTable rows={rows} options={options} exportAllHref={`/api/admin/leads/export${exportQs ? "?" + exportQs : ""}`} truncatedNote={truncatedNote} />
      </main>
    </div>
  );
}
