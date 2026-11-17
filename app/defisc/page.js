'use client'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import AppShell from '@/components/AppShell'
import { STATUTS, STATUT_KEYS, estVerrouillee } from '@/lib/defisc'

const fmtDateCreation = (d) => (d ? new Date(d).toLocaleDateString('fr-FR') : '—')
// Lundi de la semaine en cours (AAAA-MM-JJ)
const lundi = () => { const d = new Date(); d.setDate(d.getDate() - ((d.getDay() || 7) - 1)); return iso(d) }

const fmtDate = (d) => (d ? new Date(d + 'T00:00:00').toLocaleDateString('fr-FR') : '—')
// Date locale AAAA-MM-JJ (toISOString donnerait la date UTC, décalée la nuit)
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const decaler = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return iso(d) }
// RDV à venir dans moins de 24 h ou aujourd'hui (et pas déjà traité) -> alerte rouge
const ACTIFS = ['a_confirmer', 'confirme', 'reporte']
const urgence = (r) => (ACTIFS.includes(r.statut) && r.date_rdv === decaler(1) ? 'demain' : ACTIFS.includes(r.statut) && r.date_rdv === decaler(0) ? 'aujourdhui' : null)
const COLONNES = ['Date création', 'Civilité', 'Nom', 'Prénom', 'Type RDV', 'Nature', 'Date RDV', 'Heure RDV', 'Lieu RDV', 'Mobile', 'Fixe', 'E-mail']
const EXPORT_PERIODES = [['tous', 'Toutes les dates'], ['aujourdhui', "Aujourd'hui"], ['semaine', 'Cette semaine (depuis lundi)'], ['perso', 'Plage personnalisée']]
const PERIODES = [['tous', 'Toutes les dates'], ['aujourdhui', "Aujourd'hui"], ['semaine', 'Cette semaine']]

const Meta = ({ label, children }) => (
  <div className="min-w-0">
    <dt className="text-[10px] font-medium uppercase tracking-wide" style={{ color: 'var(--muted)' }}>{label}</dt>
    <dd className="mt-0.5 break-words text-[13px] font-medium">{children ?? '—'}</dd>
  </div>
)

// Actions de ligne en emoji : ✏️ modifier · 🔍 détails · 🗑️ supprimer (admin)
function Actions({ r, role, onDelete }) {
  return (
    <div className="flex items-center gap-1">
      {!estVerrouillee(r.statut, role) && <Link href={`/defisc/${r.id}`} className="ico" title="Modifier" aria-label="Modifier">✏️</Link>}
      <Link href={`/defisc/${r.id}/details`} className="ico" title="Détails" aria-label="Détails">🔍</Link>
      {role === 'admin' && <button type="button" onClick={() => onDelete(r)} className="ico" title="Supprimer" aria-label="Supprimer">🗑️</button>}
    </div>
  )
}

function StatutCell({ r, role, onChange }) {
  return role === 'admin' ? (
    <select value={r.statut} onChange={(e) => onChange(r.id, e.target.value)} className="w-full rounded-lg border-0 px-2.5 py-1.5 text-[12px] font-medium text-white" style={{ background: STATUTS[r.statut]?.color, colorScheme: 'light' }}>
      {STATUT_KEYS.map((k) => <option key={k} value={k} style={{ color: '#1e293b', background: '#fff' }}>{STATUTS[k].label}</option>)}
    </select>
  ) : (
    <span className="inline-block rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-white" style={{ background: STATUTS[r.statut]?.color ?? '#666' }}>{STATUTS[r.statut]?.label ?? r.statut}</span>
  )
}

export default function DefiscListe() {
  const [rows, setRows] = useState([])
  const [createurs, setCreateurs] = useState({}) // id -> nom, pour « Créée par »
  const [createur, setCreateur] = useState('')
  const [role, setRole] = useState(null)
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [statuts, setStatuts] = useState([])
  const [periode, setPeriode] = useState('tous')
  const [err, setErr] = useState('')
  const [sel, setSel] = useState(new Set()) // fiches cochées
  const [ouverts, setOuverts] = useState(new Set()) // cartes mobiles dépliées
  const deplier = (id) => setOuverts((o) => { const n = new Set(o); n.has(id) ? n.delete(id) : n.add(id); return n })
  const [exportOpen, setExportOpen] = useState(false)
  const [expPeriode, setExpPeriode] = useState('tous')
  const [expDu, setExpDu] = useState('')
  const [expAu, setExpAu] = useState('')

  const load = async () => {
    const { data, error } = await supabase.from('defisc_leads').select('*').order('date_rdv', { ascending: true, nullsFirst: false }).order('heure_rdv', { ascending: true }).limit(2000)
    if (error) setErr(error.message)
    setRows(data ?? []); setLoading(false)
  }
  useEffect(() => { (async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const { data: p } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    setRole(p?.role ?? null)
    if (p?.role === 'admin') {
      const { data } = await supabase.from('profiles').select('id, nom_complet, role')
      setCreateurs(Object.fromEntries((data ?? []).map((c) => [c.id, c.nom_complet])))
    }
    load()
  })() }, [])

  const changerStatut = async (id, statut) => {
    setRows((r) => r.map((x) => (x.id === id ? { ...x, statut } : x)))
    const { error } = await supabase.from('defisc_leads').update({ statut }).eq('id', id)
    if (error) { setErr(error.message); load() }
  }
  const supprimer = async (r) => {
    if (!confirm(`Supprimer la fiche de ${r.prenom ?? ''} ${r.nom ?? ''} ?`)) return
    const { error } = await supabase.from('defisc_leads').delete().eq('id', r.id)
    error ? setErr(error.message) : setRows((x) => x.filter((y) => y.id !== r.id))
  }

  const counts = useMemo(() => rows.reduce((a, r) => ({ ...a, [r.statut]: (a[r.statut] ?? 0) + 1 }), {}), [rows])
  const filtrees = useMemo(() => {
    const today = iso(new Date())
    const fin = new Date(); fin.setDate(fin.getDate() + (7 - (fin.getDay() || 7))) // dimanche
    const needle = q.trim().toLowerCase().replace(/\s/g, '')
    return rows.filter((r) => {
      if (statuts.length && !statuts.includes(r.statut)) return false
      if (createur && r.created_by !== createur) return false
      if (periode === 'aujourdhui' && r.date_rdv !== today) return false
      if (periode === 'semaine' && !(r.date_rdv >= today && r.date_rdv <= iso(fin))) return false
      if (needle) {
        const hay = [r.nom, r.prenom, r.mobile, r.fixe, r.email, r.nature].join(' ').toLowerCase().replace(/\s/g, '')
        if (!hay.includes(needle)) return false
      }
      return true
    })
  }, [rows, q, statuts, periode, createur])

  const toggle = (id) => setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  const toutCoche = filtrees.length > 0 && filtrees.every((r) => sel.has(r.id))
  const toggleTout = () => setSel(toutCoche ? new Set() : new Set(filtrees.map((r) => r.id)))

  // Export : fiches cochées (sinon toutes celles affichées), filtrées sur la DATE DE CRÉATION
  const aExporter = useMemo(() => {
    const base = sel.size ? filtrees.filter((r) => sel.has(r.id)) : filtrees
    const today = iso(new Date())
    return base.filter((r) => {
      const c = r.created_at ? iso(new Date(r.created_at)) : ''
      if (expPeriode === 'aujourdhui') return c === today
      if (expPeriode === 'semaine') return c >= lundi() && c <= today
      if (expPeriode === 'perso') return (!expDu || c >= expDu) && (!expAu || c <= expAu)
      return true
    })
  }, [filtrees, sel, expPeriode, expDu, expAu])

  const exporter = async () => {
    if (!aExporter.length) return setErr('Aucune fiche à exporter pour cette sélection.')
    setErr('')
    const XLSX = await import('xlsx')
    const entetes = ['CIVILITE', 'NOM', 'PRENOM', 'TYPE RDV', 'NATURE', 'DATE RDV', 'HEURE RDV', 'LIEU RDV', 'MOBILE', 'FIXE', 'E-MAIL', 'COMMENTAIRE', 'VERIF']
    const lignes = aExporter.map((r) => [
      r.civilite ?? '', r.nom ?? '', r.prenom ?? '', r.type_rdv ?? '', r.nature ?? '',
      r.date_rdv ? fmtDate(r.date_rdv) : '', r.heure_rdv?.slice(0, 5) ?? '', r.lieu_rdv ?? '',
      r.mobile ?? '', r.fixe ?? '', r.email ?? '', [r.commentaire, r.notes].map((t) => String(t ?? '').trim()).filter(Boolean).join('\n'), r.verif ?? '', // notes ajoutées sous le commentaire
    ])
    const ws = XLSX.utils.aoa_to_sheet([entetes, ...lignes]) // tout en texte : le 0 des numéros est conservé
    ws['!cols'] = [10, 18, 18, 10, 10, 12, 10, 18, 14, 14, 28, 60, 12].map((wch) => ({ wch }))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Contacts')
    XLSX.writeFile(wb, `contacts-defisc-${iso(new Date())}.xlsx`)
  }

  return (
    <AppShell wide title="Leads défiscalisation" subtitle={`${filtrees.length} fiche(s)`}
      actions={<><Link href="/defisc/new" className="btn-accent">+ Nouvelle fiche</Link>{role === 'admin' && <Link href="/defisc/import" className="btn-ghost" style={{ border: '1px solid var(--border-strong)' }}>Importer Excel</Link>}</>}>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher nom, téléphone, e-mail…" className="inp sm:max-w-xs" />
        <select value={periode} onChange={(e) => setPeriode(e.target.value)} className="inp sm:max-w-[200px]">
          {PERIODES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        {role === 'admin' && (
          <select value={createur} onChange={(e) => setCreateur(e.target.value)} className="inp sm:max-w-[220px]" aria-label="Créée par">
            <option value="">Créée par : tous</option>
            {Object.entries(createurs).map(([id, n]) => <option key={id} value={id}>{n}</option>)}
          </select>
        )}
        {role === 'admin' && (
          <button type="button" onClick={() => setExportOpen((o) => !o)} className="btn-ghost max-sm:w-full" style={{ border: '1px solid var(--border-strong)' }}>
            Exporter vers Google Sheets{sel.size ? ` (${sel.size} cochée${sel.size > 1 ? 's' : ''})` : ''}
          </button>
        )}
      </div>

      {role === 'admin' && exportOpen && (
        <div className="card mb-4 flex flex-wrap items-end gap-3 p-3 sm:p-4">
          <label className="block max-sm:w-full">
            <span className="field-label">Date de création</span>
            <select value={expPeriode} onChange={(e) => setExpPeriode(e.target.value)} className="inp sm:max-w-[240px]">
              {EXPORT_PERIODES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </label>
          {expPeriode === 'perso' && (
            <>
              <label className="block max-sm:w-full"><span className="field-label">Du</span><input type="date" value={expDu} onChange={(e) => setExpDu(e.target.value)} className="inp" /></label>
              <label className="block max-sm:w-full"><span className="field-label">Au</span><input type="date" value={expAu} onChange={(e) => setExpAu(e.target.value)} className="inp" /></label>
            </>
          )}
          <button type="button" onClick={exporter} className="btn-accent max-sm:w-full">Télécharger ({aExporter.length} fiche{aExporter.length > 1 ? 's' : ''})</button>
          <p className="basis-full text-[12px]" style={{ color: 'var(--muted)' }}>
            {sel.size ? 'Seules les fiches cochées sont exportées.' : 'Aucune fiche cochée : toutes les fiches affichées sont exportées.'} Fichier Excel à ouvrir dans Google Sheets (Fichier › Importer).
          </p>
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-2">
        <button type="button" onClick={() => setStatuts([])} className="rounded-full border px-3 py-1 text-[12px] font-medium"
          style={statuts.length === 0 ? { background: 'var(--ink)', color: '#fff', borderColor: 'var(--ink)' } : { color: 'var(--muted)', borderColor: 'var(--border)' }}>Tous</button>
        {STATUT_KEYS.map((s) => {
          const on = statuts.includes(s)
          return (
            <button key={s} type="button" onClick={() => setStatuts((x) => (on ? x.filter((y) => y !== s) : [...x, s]))}
              className="rounded-full border px-3 py-1 text-[12px] font-medium"
              style={on ? { background: STATUTS[s].color, color: '#fff', borderColor: STATUTS[s].color } : { color: 'var(--ink)', borderColor: 'var(--border)' }}>
              {STATUTS[s].label} <span className="opacity-70">{counts[s] ?? 0}</span>
            </button>
          )
        })}
      </div>

      {err && <p className="mb-3 rounded-lg px-3 py-2 text-sm" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>{err}</p>}

      {/* Mobile : cartes repliables (résumé -> détails au clic) */}
      <div className="flex flex-col gap-3 sm:hidden">
        {filtrees.map((r) => {
          const urg = urgence(r)
          const ouvert = ouverts.has(r.id)
          const nom = [r.civilite, r.prenom, r.nom].filter(Boolean).join(' ') || '—'
          const rdv = r.date_rdv ? `${fmtDate(r.date_rdv)}${r.heure_rdv ? ' · ' + r.heure_rdv.slice(0, 5) : ''}` : '—'
          const par = role === 'admin' ? (createurs[r.created_by] ?? (r.fichier ? 'Import Excel' : '—')) : null
          return (
            <div key={r.id} className="card overflow-hidden" style={{ borderLeft: `4px solid ${urg ? 'var(--danger)' : (STATUTS[r.statut]?.color ?? '#666')}`, background: sel.has(r.id) ? 'var(--accent-soft)' : undefined }}>
              <div className="flex items-start gap-3 p-4">
                {role === 'admin' && <input type="checkbox" className="mt-1 h-5 w-5 shrink-0" checked={sel.has(r.id)} onChange={() => toggle(r.id)} aria-label="Cocher la fiche" />}
                <button type="button" onClick={() => deplier(r.id)} aria-expanded={ouvert} className="min-w-0 flex-1 text-left">
                  <div className="flex items-start justify-between gap-2">
                    <span className="break-words font-semibold">{nom}</span>
                    <span aria-hidden className="mt-0.5 shrink-0 text-[12px]" style={{ color: 'var(--muted)' }}>{ouvert ? '▲' : '▼'}</span>
                  </div>
                  {urg && <p className="mt-0.5 text-[12px] font-semibold" style={{ color: 'var(--danger)' }}>⚠️ RDV {urg === 'demain' ? 'demain' : "aujourd'hui"}</p>}
                  <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2">
                    <Meta label="Création">{fmtDateCreation(r.created_at)}</Meta>
                    <Meta label="RDV">{rdv}</Meta>
                    {par !== null && <Meta label="Créée par">{par}</Meta>}
                  </dl>
                </button>
              </div>
              {ouvert && (
                <div className="border-t px-4 pb-3 pt-3" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                  <dl className="mb-3 grid grid-cols-2 gap-x-4 gap-y-2">
                    <Meta label="Type RDV">{r.type_rdv}</Meta>
                    <Meta label="Nature">{r.nature}</Meta>
                    <Meta label="Lieu">{r.lieu_rdv}</Meta>
                    <Meta label="Mobile">{r.mobile && <a href={`tel:${r.mobile}`} className="underline">{r.mobile}</a>}</Meta>
                    <Meta label="Fixe">{r.fixe && <a href={`tel:${r.fixe}`} className="underline">{r.fixe}</a>}</Meta>
                    <div className="col-span-2"><Meta label="E-mail">{r.email && <a href={`mailto:${r.email}`} className="underline">{r.email}</a>}</Meta></div>
                  </dl>
                  <div className="flex items-center justify-between gap-3">
                    <div className="w-36"><StatutCell r={r} role={role} onChange={changerStatut} /></div>
                    <Actions r={r} role={role} onDelete={supprimer} />
                  </div>
                </div>
              )}
            </div>
          )
        })}
        {loading && <div className="card p-8 text-center text-sm" style={{ color: 'var(--muted)' }}>Chargement…</div>}
        {!loading && !filtrees.length && <div className="card p-8 text-center text-sm" style={{ color: 'var(--muted)' }}>Aucune fiche.</div>}
      </div>

      {/* Tablette / ordinateur : tableau */}
      <div className="card hidden overflow-x-auto sm:block">
        <table className="w-full text-left text-[13px]">
          <thead>
            <tr className="border-b text-[11px] uppercase tracking-wide" style={{ color: 'var(--muted)', borderColor: 'var(--border)' }}>
              {role === 'admin' && <th className="px-3 py-2.5"><input type="checkbox" checked={toutCoche} onChange={toggleTout} aria-label="Tout cocher" /></th>}
              {COLONNES.map((h) => <th key={h} className="whitespace-nowrap px-3 py-2.5 font-medium">{h}</th>)}
              {role === 'admin' && <th className="whitespace-nowrap px-3 py-2.5 font-medium">Créée par</th>}
              <th className="px-3 py-2.5 font-medium">Statut</th>
              <th className="px-3 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {filtrees.map((r) => {
              const urg = urgence(r)
              const marque = urg ? { boxShadow: 'inset 5px 0 0 var(--danger)' } : undefined
              return (
                <tr key={r.id} className="border-b last:border-0" style={{ borderColor: 'var(--border)', background: sel.has(r.id) ? 'var(--accent-soft)' : undefined }}>
                  {role === 'admin' && (
                    <td className="px-3 py-2.5" style={marque}>
                      <input type="checkbox" checked={sel.has(r.id)} onChange={() => toggle(r.id)} aria-label="Cocher la fiche" />
                    </td>
                  )}
                  <td className="whitespace-nowrap px-3 py-2.5" style={role !== 'admin' ? marque : undefined}>{fmtDateCreation(r.created_at)}</td>
                  <td className="px-3 py-2.5">{r.civilite ?? '—'}</td>
                  <td className="px-3 py-2.5"><Link href={estVerrouillee(r.statut, role) ? `/defisc/${r.id}/details` : `/defisc/${r.id}`} className="font-medium underline-offset-2 hover:underline">{r.nom ?? '—'}</Link></td>
                  <td className="px-3 py-2.5">{r.prenom ?? '—'}</td>
                  <td className="px-3 py-2.5">{r.type_rdv ?? '—'}</td>
                  <td className="px-3 py-2.5">{r.nature ?? '—'}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 font-medium">{fmtDate(r.date_rdv)}</td>
                  <td className="px-3 py-2.5">{r.heure_rdv?.slice(0, 5) ?? '—'}</td>
                  <td className="px-3 py-2.5">{r.lieu_rdv ?? '—'}</td>
                  <td className="whitespace-nowrap px-3 py-2.5">{r.mobile ?? '—'}</td>
                  <td className="whitespace-nowrap px-3 py-2.5">{r.fixe ?? '—'}</td>
                  <td className="px-3 py-2.5">{r.email ?? '—'}</td>
                  {role === 'admin' && <td className="whitespace-nowrap px-3 py-2.5 font-medium">{createurs[r.created_by] ?? (r.fichier ? 'Import Excel' : '—')}</td>}
                  <td className="min-w-[130px] px-3 py-2.5"><StatutCell r={r} role={role} onChange={changerStatut} /></td>
                  <td className="whitespace-nowrap px-3 py-1.5"><Actions r={r} role={role} onDelete={supprimer} /></td>
                </tr>
              )
            })}
            {!loading && !filtrees.length && <tr><td colSpan={COLONNES.length + 4} className="px-3 py-8 text-center" style={{ color: 'var(--muted)' }}>Aucune fiche.</td></tr>}
            {loading && <tr><td colSpan={COLONNES.length + 4} className="px-3 py-8 text-center" style={{ color: 'var(--muted)' }}>Chargement…</td></tr>}
          </tbody>
        </table>
      </div>
    </AppShell>
  )
}
