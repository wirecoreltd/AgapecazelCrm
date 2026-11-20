'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import AppShell from '@/components/AppShell'
import { STATUTS_CC, STATUT_CC_KEYS, STATUTS_ADMIN, STATUT_ADMIN_KEYS, estVerrouillee, peutChangerStatutCC, estActif } from '@/lib/defisc'

const fmtDateCreation = (d) => (d ? new Date(d).toLocaleDateString('fr-FR') : '—')
// Lundi de la semaine en cours (AAAA-MM-JJ)
const lundi = () => { const d = new Date(); d.setDate(d.getDate() - ((d.getDay() || 7) - 1)); return iso(d) }

const fmtDate = (d) => (d ? new Date(d + 'T00:00:00').toLocaleDateString('fr-FR') : '—')
// Date locale AAAA-MM-JJ (toISOString donnerait la date UTC, décalée la nuit)
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const decaler = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return iso(d) }
// Moment du RDV (date + heure). Sans heure : fin de journée.
const momentRdv = (r) => (r.date_rdv ? new Date(`${r.date_rdv}T${r.heure_rdv ? r.heure_rdv.slice(0, 5) : '23:59'}:00`) : null)
// Alerte : 'demain' / 'aujourdhui' (rouge, RDV pas encore atteint) · 'atteint' (orange, heure du RDV dépassée)
const urgence = (r, now) => {
  if (!estActif(r) || !r.date_rdv) return null
  const m = momentRdv(r)
  if (m && now >= m) return 'atteint'
  return r.date_rdv === iso(now) ? 'aujourdhui' : r.date_rdv === decaler(1) ? 'demain' : null
}
const COULEUR_ALERTE = { demain: 'var(--danger)', aujourdhui: 'var(--danger)', atteint: '#d97706' }
const LIBELLE_ALERTE = { demain: '⚠️ RDV demain', aujourdhui: "⚠️ RDV aujourd'hui", atteint: '⏰ Date de RDV atteinte' }
const COLONNES = ['Date création', 'Civilité', 'Nom', 'Prénom', 'Nature', 'Date RDV', 'Heure RDV', 'Mobile', 'Fixe']
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
      {!estVerrouillee(r, role) && <Link href={`/defisc/${r.id}`} className="ico" title="Modifier" aria-label="Modifier">✏️</Link>}
      <Link href={`/defisc/${r.id}/details`} className="ico" title="Détails" aria-label="Détails">🔍</Link>
      {role === 'admin' && <button type="button" onClick={() => onDelete(r)} className="ico" title="Supprimer" aria-label="Supprimer">🗑️</button>}
    </div>
  )
}

// Tableau avec une 2e barre de défilement horizontale EN HAUT (collée sous l'en-tête du site), synchronisée avec celle du bas :
// on peut défiler vers la droite sans descendre tout en bas de la liste.
function TableauDefilant({ children }) {
  const haut = useRef(null), bas = useRef(null)
  const [largeur, setLargeur] = useState(0)
  useEffect(() => {
    const el = bas.current
    if (!el) return
    const maj = () => setLargeur(el.scrollWidth)
    maj()
    const ro = new ResizeObserver(maj)
    ro.observe(el)
    if (el.firstElementChild) ro.observe(el.firstElementChild)
    return () => ro.disconnect()
  }, [])
  const sync = (de, vers) => () => { if (vers.current && vers.current.scrollLeft !== de.current.scrollLeft) vers.current.scrollLeft = de.current.scrollLeft }
  return (
    <div className="hidden sm:block">
      <div ref={haut} onScroll={sync(haut, bas)} className="sticky z-20 overflow-x-auto overflow-y-hidden" style={{ top: 70, background: 'var(--surface)' }}>
        <div style={{ width: largeur, height: 1 }} />
      </div>
      <div ref={bas} onScroll={sync(bas, haut)} className="card sb-cache overflow-x-auto">{children}</div>
    </div>
  )
}

const SELECT_CLS = 'w-full rounded-lg border-0 px-2.5 py-1.5 text-[12px] font-medium text-white'
const PILL_CLS = 'inline-block rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-white'

// Statut call center : modifiable par le call center (tant que l'admin n'a pas décidé) et par l'admin
function StatutCC({ r, role, onChange }) {
  const def = STATUTS_CC[r.statut_cc]
  return peutChangerStatutCC(r, role) ? (
    <select value={r.statut_cc} onChange={(e) => onChange(r.id, 'statut_cc', e.target.value)} className={SELECT_CLS} style={{ background: def?.color, colorScheme: 'light' }}>
      {STATUT_CC_KEYS.map((k) => <option key={k} value={k} style={{ color: '#1e293b', background: '#fff' }}>{STATUTS_CC[k].label}</option>)}
    </select>
  ) : (
    <span className={PILL_CLS} style={{ background: def?.color ?? '#666' }}>{def?.label ?? r.statut_cc}</span>
  )
}

// Statut administrateur : modifiable par l'admin uniquement, vide par défaut
function StatutAdmin({ r, role, onChange }) {
  const def = STATUTS_ADMIN[r.statut_admin]
  if (role === 'admin') {
    return (
      <select value={r.statut_admin ?? ''} onChange={(e) => onChange(r.id, 'statut_admin', e.target.value || null)} className={SELECT_CLS}
        style={r.statut_admin ? { background: def?.color, colorScheme: 'light' } : { background: 'var(--surface)', color: 'var(--muted)', border: '1px solid var(--border)', colorScheme: 'light' }}>
        <option value="" style={{ color: '#1e293b', background: '#fff' }}>—</option>
        {STATUT_ADMIN_KEYS.map((k) => <option key={k} value={k} style={{ color: '#1e293b', background: '#fff' }}>{STATUTS_ADMIN[k].label}</option>)}
      </select>
    )
  }
  return r.statut_admin
    ? <span className={PILL_CLS} style={{ background: def?.color ?? '#666' }}>{def?.label ?? r.statut_admin}</span>
    : <span style={{ color: 'var(--muted)' }}>—</span>
}

// Filtre unique : statuts call center (cc:) + statuts admin (ad:). « Reporté » existe des deux côtés, donc on le distingue.
const FILTRE_DEFS = {
  ...Object.fromEntries(STATUT_CC_KEYS.map((k) => [`cc:${k}`, { ...STATUTS_CC[k], label: k === 'reporte' ? 'Reporté call' : STATUTS_CC[k].label }])),
  ...Object.fromEntries(STATUT_ADMIN_KEYS.map((k) => [`ad:${k}`, { ...STATUTS_ADMIN[k], label: k === 'reporte' ? 'Reporté admin' : STATUTS_ADMIN[k].label }])),
}
const FILTRE_KEYS = Object.keys(FILTRE_DEFS)
const matchFiltre = (r, key) => (key.startsWith('cc:') ? r.statut_cc === key.slice(3) : r.statut_admin === key.slice(3))

// Menu déroulant de filtre par statut (sélection multiple, « Tous » = aucun filtre)
function Chips({ titre, cles, defs, sel, setSel, counts }) {
  const [open, setOpen] = useState(false)
  const toggleK = (k) => setSel(sel.includes(k) ? sel.filter((y) => y !== k) : [...sel, k])
  const resume = sel.length === 0 ? `${titre} : tous` : sel.length === 1 ? defs[sel[0]].label : `${sel.length} statuts`
  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-haspopup="listbox" aria-expanded={open}
        className="inp flex w-full items-center justify-between gap-3 text-left sm:w-auto sm:min-w-[190px]">
        <span>{resume}</span><span className="text-[10px] opacity-60">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="card absolute left-0 top-full z-20 mt-1 w-64 max-w-[90vw] p-1.5 shadow-lg" style={{ background: 'var(--surface, #fff)' }}>
            <button type="button" onClick={() => setSel([])} className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-[13px] font-medium hover:bg-black/5"
              style={sel.length === 0 ? { color: 'var(--ink)' } : { color: 'var(--muted)' }}>
              <input type="checkbox" readOnly checked={sel.length === 0} /> Tous
            </button>
            {cles.map((k) => (
              <button key={k} type="button" onClick={() => toggleK(k)} className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-[13px] hover:bg-black/5">
                <input type="checkbox" readOnly checked={sel.includes(k)} />
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: defs[k].color }} />
                <span className="flex-1">{defs[k].label}</span>
                <span className="opacity-60">{counts[k] ?? 0}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default function DefiscListe() {
  const [rows, setRows] = useState([])
  const [now, setNow] = useState(() => new Date()) // rafraîchi chaque minute : la couleur change dès que l'heure du RDV est atteinte
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 60000); return () => clearInterval(t) }, [])
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

  // champ : 'statut_cc' ou 'statut_admin'
  const changerStatut = async (id, champ, valeur) => {
    setRows((r) => r.map((x) => (x.id === id ? { ...x, [champ]: valeur } : x)))
    const { error } = await supabase.from('defisc_leads').update({ [champ]: valeur }).eq('id', id)
    if (error) { setErr(error.message); load() }
  }
  const supprimer = async (r) => {
    if (!confirm(`Supprimer la fiche de ${r.prenom ?? ''} ${r.nom ?? ''} ?`)) return
    const { error } = await supabase.from('defisc_leads').delete().eq('id', r.id)
    error ? setErr(error.message) : setRows((x) => x.filter((y) => y.id !== r.id))
  }

  const counts = useMemo(() => {
    const c = {}
    for (const r of rows) {
      if (r.statut_cc) c[`cc:${r.statut_cc}`] = (c[`cc:${r.statut_cc}`] ?? 0) + 1
      if (r.statut_admin) c[`ad:${r.statut_admin}`] = (c[`ad:${r.statut_admin}`] ?? 0) + 1
    }
    return c
  }, [rows])
  const filtrees = useMemo(() => {
    const today = iso(new Date())
    const fin = new Date(); fin.setDate(fin.getDate() + (7 - (fin.getDay() || 7))) // dimanche
    const needle = q.trim().toLowerCase().replace(/\s/g, '')
    // Tri : RDV à venir du plus proche au plus lointain, puis RDV passés (le plus récent d'abord), puis sans date
    const rang = (r) => { const m = momentRdv(r); return !m ? [2, 0] : m >= now ? [0, m.getTime()] : [1, -m.getTime()] }
    return rows.filter((r) => {
      if (statuts.length && !statuts.some((k) => matchFiltre(r, k))) return false
      if (createur && r.created_by !== createur) return false
      if (periode === 'aujourdhui' && r.date_rdv !== today) return false
      if (periode === 'semaine' && !(r.date_rdv >= today && r.date_rdv <= iso(fin))) return false
      if (needle) {
        const hay = [r.nom, r.prenom, r.mobile, r.fixe, r.email, r.nature].join(' ').toLowerCase().replace(/\s/g, '')
        if (!hay.includes(needle)) return false
      }
      return true
    }).sort((a, b) => { const [ga, va] = rang(a); const [gb, vb] = rang(b); return ga - gb || va - vb })
  }, [rows, q, statuts, periode, createur, now])

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
      actions={<><Link href="/defisc/new" className="btn-accent">+ Nouvelle fiche</Link></>}>
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
        <Chips titre="Statut" cles={FILTRE_KEYS} defs={FILTRE_DEFS} sel={statuts} setSel={setStatuts} counts={counts} />
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

      {err && <p className="mb-3 rounded-lg px-3 py-2 text-sm" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>{err}</p>}

      {/* Mobile : cartes repliables (résumé -> détails au clic) */}
      <div className="flex flex-col gap-3 sm:hidden">
        {filtrees.map((r) => {
          const urg = urgence(r, now)
          const ouvert = ouverts.has(r.id)
          const nom = [r.civilite, r.prenom, r.nom].filter(Boolean).join(' ') || '—'
          const rdv = r.date_rdv ? `${fmtDate(r.date_rdv)}${r.heure_rdv ? ' · ' + r.heure_rdv.slice(0, 5) : ''}` : '—'
          const par = role === 'admin' ? (createurs[r.created_by] ?? (r.fichier ? 'Import Excel' : '—')) : null
          return (
            <div key={r.id} className="card overflow-hidden" style={{ borderLeft: `4px solid ${urg ? COULEUR_ALERTE[urg] : (STATUTS_ADMIN[r.statut_admin]?.color ?? STATUTS_CC[r.statut_cc]?.color ?? '#666')}`, background: sel.has(r.id) ? 'var(--accent-soft)' : undefined }}>
              <div className="flex items-start gap-3 p-4">
                {role === 'admin' && <input type="checkbox" className="mt-1 h-5 w-5 shrink-0" checked={sel.has(r.id)} onChange={() => toggle(r.id)} aria-label="Cocher la fiche" />}
                <button type="button" onClick={() => deplier(r.id)} aria-expanded={ouvert} className="min-w-0 flex-1 text-left">
                  <div className="flex items-start justify-between gap-2">
                    <span className="break-words font-semibold">{nom}</span>
                    <span aria-hidden className="mt-0.5 shrink-0 text-[12px]" style={{ color: 'var(--muted)' }}>{ouvert ? '▲' : '▼'}</span>
                  </div>
                  {urg && <p className="mt-0.5 text-[12px] font-semibold" style={{ color: COULEUR_ALERTE[urg] }}>{LIBELLE_ALERTE[urg]}</p>}
                  <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2">
                    <Meta label="Création">{fmtDateCreation(r.created_at)}</Meta>
                    <Meta label="RDV">{rdv}</Meta>
                    {par !== null && <Meta label="Créée par">{par}</Meta>}
                    <Meta label="Statut">
                      <span className="flex flex-wrap gap-1">
                        <span className={PILL_CLS} style={{ background: STATUTS_CC[r.statut_cc]?.color ?? '#666' }}>{STATUTS_CC[r.statut_cc]?.label ?? r.statut_cc ?? '—'}</span>
                        {r.statut_admin && <span className={PILL_CLS} style={{ background: STATUTS_ADMIN[r.statut_admin]?.color ?? '#666' }}>{STATUTS_ADMIN[r.statut_admin]?.label ?? r.statut_admin}</span>}
                      </span>
                    </Meta>
                  </dl>
                </button>
              </div>
              {ouvert && (
                <div className="border-t px-4 pb-3 pt-3" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                  <dl className="mb-3 grid grid-cols-2 gap-x-4 gap-y-2">
                    <Meta label="Nature">{r.nature}</Meta>
                    <Meta label="Mobile">{r.mobile && <a href={`tel:${r.mobile}`} className="underline">{r.mobile}</a>}</Meta>
                    <Meta label="Fixe">{r.fixe && <a href={`tel:${r.fixe}`} className="underline">{r.fixe}</a>}</Meta>
                  </dl>
                  <div className="flex items-center justify-end gap-3">
                    <Actions r={r} role={role} onDelete={supprimer} />
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <div><p className="mb-1 text-[10px] font-medium uppercase tracking-wide" style={{ color: 'var(--muted)' }}>Statut call center</p><StatutCC r={r} role={role} onChange={changerStatut} /></div>
                    <div><p className="mb-1 text-[10px] font-medium uppercase tracking-wide" style={{ color: 'var(--muted)' }}>Statut admin</p><StatutAdmin r={r} role={role} onChange={changerStatut} /></div>
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
      <TableauDefilant>
        <table className="w-full text-left text-[13px]">
          <thead>
            <tr className="border-b text-[11px] uppercase tracking-wide" style={{ color: 'var(--muted)', borderColor: 'var(--border)' }}>
              {role === 'admin' && <th className="px-3 py-2.5"><input type="checkbox" checked={toutCoche} onChange={toggleTout} aria-label="Tout cocher" /></th>}
              {COLONNES.map((h) => <th key={h} className="whitespace-nowrap px-3 py-2.5 font-medium">{h}</th>)}
              {role === 'admin' && <th className="whitespace-nowrap px-3 py-2.5 font-medium">Créée par</th>}
              <th className="whitespace-nowrap px-3 py-2.5 font-medium">Statut call center</th>
              <th className="whitespace-nowrap px-3 py-2.5 font-medium">Statut admin</th>
              <th className="px-3 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {filtrees.map((r) => {
              const urg = urgence(r, now)
              const marque = urg ? { boxShadow: `inset 5px 0 0 ${COULEUR_ALERTE[urg]}` } : undefined
              return (
                <tr key={r.id} className="border-b last:border-0" style={{ borderColor: 'var(--border)', background: sel.has(r.id) ? 'var(--accent-soft)' : undefined }}>
                  {role === 'admin' && (
                    <td className="px-3 py-2.5" style={marque}>
                      <input type="checkbox" checked={sel.has(r.id)} onChange={() => toggle(r.id)} aria-label="Cocher la fiche" />
                    </td>
                  )}
                  <td className="whitespace-nowrap px-3 py-2.5" style={role !== 'admin' ? marque : undefined}>{fmtDateCreation(r.created_at)}</td>
                  <td className="px-3 py-2.5">{r.civilite ?? '—'}</td>
                  <td className="px-3 py-2.5"><Link href={estVerrouillee(r, role) ? `/defisc/${r.id}/details` : `/defisc/${r.id}`} className="font-medium underline-offset-2 hover:underline">{r.nom ?? '—'}</Link></td>
                  <td className="px-3 py-2.5">{r.prenom ?? '—'}</td>
                  <td className="px-3 py-2.5">{r.nature ?? '—'}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 font-medium">{fmtDate(r.date_rdv)}</td>
                  <td className="px-3 py-2.5">{r.heure_rdv?.slice(0, 5) ?? '—'}</td>
                  <td className="whitespace-nowrap px-3 py-2.5">{r.mobile ?? '—'}</td>
                  <td className="whitespace-nowrap px-3 py-2.5">{r.fixe ?? '—'}</td>
                  {role === 'admin' && <td className="whitespace-nowrap px-3 py-2.5 font-medium">{createurs[r.created_by] ?? (r.fichier ? 'Import Excel' : '—')}</td>}
                  <td className="min-w-[130px] px-3 py-2.5"><StatutCC r={r} role={role} onChange={changerStatut} /></td>
                  <td className="min-w-[130px] px-3 py-2.5"><StatutAdmin r={r} role={role} onChange={changerStatut} /></td>
                  <td className="whitespace-nowrap px-3 py-1.5"><Actions r={r} role={role} onDelete={supprimer} /></td>
                </tr>
              )
            })}
            {!loading && !filtrees.length && <tr><td colSpan={COLONNES.length + 5} className="px-3 py-8 text-center" style={{ color: 'var(--muted)' }}>Aucune fiche.</td></tr>}
            {loading && <tr><td colSpan={COLONNES.length + 5} className="px-3 py-8 text-center" style={{ color: 'var(--muted)' }}>Chargement…</td></tr>}
          </tbody>
        </table>
      </TableauDefilant>
    </AppShell>
  )
}
