"use client";
import { useMemo, useRef, useState } from "react";
import StatutSelect from "./StatutSelect";

export type Row = {
  id: string; date: string; rappel: string; prenom: string; nom: string; telephone: string; telHref: string; email: string;
  codePostal: string; ville: string; motif: string; proprietaire: string; surface: string; personnes: string; revenu: string;
  mpr5: string; zone: string; profil: string; eligible: string; statut: string;
};
type Opt = { value: string; label: string };

const yn = (v: string) => (v === "oui" || v === "non" ? <span className={`adm-pill ${v}`}>{v}</span> : <span className="adm-mut">{v}</span>);

export default function LeadsTable({ rows, options, exportAllHref, truncatedNote }: { rows: Row[]; options: Opt[]; exportAllHref: string; truncatedNote?: string }) {
  const [sel, setSel] = useState<Set<string>>(new Set());
  const formRef = useRef<HTMLFormElement>(null);
  const allChecked = rows.length > 0 && sel.size === rows.length;
  const ids = useMemo(() => Array.from(sel).join(","), [sel]);

  const toggle = (id: string) => setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () => setSel(allChecked ? new Set() : new Set(rows.map((r) => r.id)));

  return (
    <div className="adm-card" style={{ borderRadius: "0 0 18px 18px", borderTop: 0 }}>
      <form ref={formRef} method="post" action="/api/admin/leads/export">
        <input type="hidden" name="ids" value={ids} />
        <div className="adm-bar" style={{ borderRadius: 0 }}>
          <div className="adm-count"><b>{sel.size}</b> sélectionné{sel.size > 1 ? "s" : ""} sur {rows.length}</div>
          {sel.size > 0 && <button type="button" className="adm-btn ghost" onClick={() => setSel(new Set())}>Tout désélectionner</button>}
          <button type="submit" className="adm-btn green" disabled={sel.size === 0}>⬇ Exporter la sélection ({sel.size})</button>
          <a className="adm-btn" href={exportAllHref}>⬇ Tout exporter</a>
        </div>
      </form>
      {truncatedNote && <p className="adm-warn">{truncatedNote}</p>}

      <div className="adm-scroll">
        <table className="adm-tbl">
          <thead>
            <tr>
              <th className="chk"><input type="checkbox" checked={allChecked} onChange={toggleAll} aria-label="Tout sélectionner" /></th>
              <th>Date</th><th>Rappel souhaité</th><th>Nom</th><th>Téléphone</th><th>E-mail</th><th>Code postal</th><th>Ville</th><th>Motif</th>
              <th>Propriétaire</th><th>Surface (m²)</th><th>Pers. foyer</th><th>Revenu fiscal réf.</th><th>MaPrimeRénov&apos; 5 ans</th>
              <th>Zone</th><th>Profil</th><th>Éligible</th><th>Statut</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className={sel.has(r.id) ? "sel" : ""}>
                <td className="chk"><input type="checkbox" checked={sel.has(r.id)} onChange={() => toggle(r.id)} aria-label={`Sélectionner ${r.prenom} ${r.nom}`} /></td>
                <td className="adm-mut">{r.date}</td>
                <td className="adm-rappel">{r.rappel}</td>
                <td className="adm-name">{r.prenom} {r.nom}</td>
                <td><a href={r.telHref}>{r.telephone}</a></td>
                <td>{r.email ? <a href={`mailto:${r.email}`}>{r.email}</a> : ""}</td>
                <td>{r.codePostal}</td>
                <td>{r.ville}</td>
                <td><span className="adm-pill pac">{r.motif}</span></td>
                <td>{yn(r.proprietaire)}</td>
                <td>{r.surface}</td>
                <td>{r.personnes}</td>
                <td>{r.revenu}</td>
                <td>{yn(r.mpr5)}</td>
                <td>{r.zone && <span className="adm-pill neutral">{r.zone}</span>}</td>
                <td>{r.profil && <span className="adm-pill neutral">{r.profil}</span>}</td>
                <td>{yn(r.eligible)}</td>
                <td><StatutSelect id={r.id} value={r.statut} options={options} /></td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={18} className="adm-empty">Aucun lead pour ces filtres.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
