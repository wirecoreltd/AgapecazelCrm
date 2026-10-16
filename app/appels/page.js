'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import AppShell from '@/components/AppShell'

const fmtDate = (v) => new Date(v).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })
const fmtDuree = (s) => (s == null ? '—' : `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, '0')} s`)

function typeAppel(r) {
  const l = (r.note || '').split('\n')[0]
  if (l.includes('Message vocal')) return 'vocal'
  if (r.direction === 'INBOUND') return l.includes('manqué') ? 'manque' : 'recu'
  if (r.direction === 'OUTBOUND') return 'emis'
  return null
}
const TYPES = {
  emis:   { label: 'Émis',          color: 'var(--accent-hover)', bg: 'var(--accent-soft)' },
  recu:   { label: 'Reçu',          color: 'var(--success)',      bg: '#e6f4ee' },
  manque: { label: 'Manqué',        color: 'var(--danger)',       bg: 'var(--danger-soft)' },
  vocal:  { label: 'Message vocal', color: 'var(--danger)',       bg: 'var(--danger-soft)' },
}
function IconeAppel({ type }) {
  const t = TYPES[type]
  if (!t) return null
  const props = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: t.color, strokeWidth: 2.2, strokeLinecap: 'round', strokeLinejoin: 'round' }
  return (
    <span title={t.label} className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full" style={{ background: t.bg }}>
      {type === 'emis' && <svg {...props}><path d="M7 17L17 7" /><path d="M8 7h9v9" /></svg>}
      {(type === 'recu' || type === 'manque') && <svg {...props}><path d="M17 7L7 17" /><path d="M16 17H7V8" /></svg>}
      {type === 'vocal' && <svg {...props}><circle cx="6" cy="12" r="3" /><circle cx="18" cy="12" r="3" /><path d="M6 15h12" /></svg>}
    </span>
  )
}

export default function Appels() {
  const router = useRouter()
  const [enCours, setEnCours] = useState(null)
  const [rows, setRows] = useState([])
  const [agents, setAgents] = useState({})
  const [leads, setLeads] = useState({})
  const [inconnus, setInconnus] = useState([])
  const [recherche, setRecherche] = useState('')
  const [filtreTypes, setFiltreTypes] = useState([])      // choix multiple ; vide = tous les types
  const [typeOuvert, setTypeOuvert] = useState(false)
  const [filtreJour, setFiltreJour] = useState('tous')     // tous | aujourdhui | hier | perso
  const [dateDebut, setDateDebut] = useState('')           // AAAA-MM-JJ (période personnalisée)
  const [dateFin, setDateFin] = useState('')
  const [filtrePersonne, setFiltrePersonne] = useState('tous') // 'tous' ou id de l'agent
  const [filtreDuree, setFiltreDuree] = useState('toutes') // toutes | moins1 | moins5 | plus5
  const [err, setErr] = useState('')

  useEffect(() => { (async () => {
    // RLS : l'admin voit tout, un agent voit ses propres appels
    const { data: a, error } = await supabase.from('lead_appels').select('*').order('created_at', { ascending: false }).limit(500)
    if (error) setErr(error.message)
    setRows(a ?? [])
    const { data: u } = await supabase.from('appels_non_rattaches').select('*').order('created_at', { ascending: false }).limit(500)
    setInconnus(u ?? [])
    const { data: profs } = await supabase.from('profiles').select('id, nom_complet')
    setAgents(Object.fromEntries((profs ?? []).map((p) => [p.id, p.nom_complet])))
    const ids = [...new Set((a ?? []).map((r) => r.lead_id))]
    if (ids.length) {
      const { data: l } = await supabase.from('leads').select('id, nom, prenom, mobile, telephone_1').in('id', ids)
      setLeads(Object.fromEntries((l ?? []).map((x) => [x.id, x])))
    }
  })() }, [])

  // Prépare la fiche : infos de l'annuaire + historique des appels, puis ouvre le formulaire de création
  const inserer = async (r) => {
    setEnCours(r.cle); setErr('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`/api/appels/prefill?numero=${encodeURIComponent(r.numero_externe || '')}`, {
        headers: { Authorization: `Bearer ${session?.access_token ?? ''}` },
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Erreur')
      sessionStorage.setItem('prefill_lead', JSON.stringify(json))
      router.push('/leads/new')
    } catch (e) { setErr(e.message); setEnCours(null) }
  }

  const q = recherche.trim().toLowerCase()
  const nomLead = (id) => { const l = leads[id]; return l ? `${l.prenom ?? ''} ${l.nom ?? ''}`.trim() || 'Lead' : 'Lead' }
  // Les deux sources fusionnées, du plus récent au plus ancien
  const tous = [
    ...rows.map((r) => ({ ...r, cle: `l${r.id}`, horsCrm: false, nom: nomLead(r.lead_id) })),
    ...inconnus.map((r) => ({ ...r, cle: `u${r.id}`, horsCrm: true, nom: r.nom_contact ?? null })),
  ].sort((x, y) => new Date(y.created_at) - new Date(x.created_at))
  const liste = tous.filter((r) => !q || `${r.nom ?? ''} ${agents[r.user_id] ?? ''} ${r.numero_externe ?? ''} ${r.resultat}`.toLowerCase().includes(q))

  // Début de journée (heure locale) pour « aujourd'hui », « hier » et la période personnalisée
  const debutJour = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const JOUR = 24 * 3600 * 1000
  const auj = debutJour(new Date())
  const jourOk = (r) => {
    const t = new Date(r.created_at).getTime()
    if (filtreJour === 'aujourdhui') return t >= auj
    if (filtreJour === 'hier') return t >= auj - JOUR && t < auj
    if (filtreJour === 'perso') {
      if (dateDebut && t < new Date(`${dateDebut}T00:00:00`).getTime()) return false
      if (dateFin && t >= new Date(`${dateFin}T00:00:00`).getTime() + JOUR) return false // fin incluse
    }
    return true
  }
  const dureeOk = (r) => {
    if (filtreDuree === 'toutes') return true
    const d = r.duree_secondes ?? 0 // appel sans durée (manqué…) = 0 s
    if (filtreDuree === 'moins1') return d < 60
    if (filtreDuree === 'moins5') return d < 300
    return d > 300 // plus5
  }

  // Personnes présentes dans les appels (pour le menu déroulant)
  const personnes = [...new Set(tous.map((r) => r.user_id).filter(Boolean))]
    .map((id) => ({ id, nom: agents[id] ?? 'Agent inconnu' }))
    .sort((a, b) => a.nom.localeCompare(b.nom))

  const listeFiltree = liste
    .filter((r) => !filtreTypes.length || filtreTypes.includes(typeAppel(r)))
    .filter(jourOk)
    .filter((r) => filtrePersonne === 'tous' || r.user_id === filtrePersonne)
    .filter(dureeOk)

  const basculerType = (k) => setFiltreTypes((cur) => (cur.includes(k) ? cur.filter((x) => x !== k) : [...cur, k]))
  const libelleTypes = !filtreTypes.length ? 'Tous les types'
    : filtreTypes.length <= 2 ? filtreTypes.map((k) => TYPES[k].label).join(', ')
    : `${filtreTypes.length} types`
  const filtresActifs = filtreJour !== 'tous' || filtrePersonne !== 'tous' || filtreDuree !== 'toutes' || filtreTypes.length > 0
  const reinitialiser = () => {
    setFiltreJour('tous'); setDateDebut(''); setDateFin('')
    setFiltrePersonne('tous'); setFiltreDuree('toutes'); setFiltreTypes([])
  }

  return (
    <AppShell title={`Appels (${listeFiltree.length})`} subtitle="Appels passés et reçus avec OnOff">
      {err && <p className="mb-3 text-sm" style={{ color: 'var(--danger)' }}>{err}</p>}
      <div className="mb-4">
        <input value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder="Rechercher (nom, agent, numéro, résultat)…" className="inp w-full" />
      </div>

      <div className="card mb-4 p-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="field-label">Période</label>
            <select value={filtreJour} onChange={(e) => setFiltreJour(e.target.value)} className="inp">
              <option value="tous">Toutes les dates</option>
              <option value="aujourdhui">Aujourd'hui</option>
              <option value="hier">Hier</option>
              <option value="perso">Personnalisée…</option>
            </select>
          </div>
          <div>
            <label className="field-label">Personne</label>
            <select value={filtrePersonne} onChange={(e) => setFiltrePersonne(e.target.value)} className="inp">
              <option value="tous">Toutes les personnes</option>
              {personnes.map((p) => <option key={p.id} value={p.id}>{p.nom}</option>)}
            </select>
          </div>
          <div>
            <label className="field-label">Durée</label>
            <select value={filtreDuree} onChange={(e) => setFiltreDuree(e.target.value)} className="inp">
              <option value="toutes">Toutes les durées</option>
              <option value="moins1">Moins de 1 minute</option>
              <option value="moins5">Moins de 5 minutes</option>
              <option value="plus5">Plus de 5 minutes</option>
            </select>
          </div>
          <div className="relative">
            <label className="field-label">Type d'appel</label>
            <button type="button" onClick={() => setTypeOuvert((o) => !o)} className="inp flex items-center justify-between text-left">
              <span className="truncate">{libelleTypes}</span>
              <span aria-hidden className="ml-2 text-[11px]" style={{ color: 'var(--muted)' }}>▾</span>
            </button>
            {typeOuvert && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setTypeOuvert(false)} />
                <div className="card absolute left-0 right-0 z-20 mt-1 p-1 shadow-lg">
                  {Object.entries(TYPES).map(([k, t]) => (
                    <label key={k} className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm hover:bg-black/5">
                      <input type="checkbox" checked={filtreTypes.includes(k)} onChange={() => basculerType(k)} className="h-4 w-4" style={{ accentColor: 'var(--ink)' }} />
                      <IconeAppel type={k} />
                      {t.label}
                    </label>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {filtreJour === 'perso' && (
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="field-label">Du</label>
              <input type="date" value={dateDebut} max={dateFin || undefined} onChange={(e) => setDateDebut(e.target.value)} className="inp" />
            </div>
            <div>
              <label className="field-label">Au</label>
              <input type="date" value={dateFin} min={dateDebut || undefined} onChange={(e) => setDateFin(e.target.value)} className="inp" />
            </div>
          </div>
        )}

        {filtresActifs && (
          <div className="mt-3 flex justify-end">
            <button type="button" onClick={reinitialiser} className="btn-ghost">Réinitialiser les filtres</button>
          </div>
        )}
      </div>

      <div className="space-y-2">
        {listeFiltree.map((r) => (
          <div key={r.cle} className="card p-3 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
              <span className="flex items-center gap-2 font-medium">
                <IconeAppel type={typeAppel(r)} />
                <span>{r.nom ?? <span className="font-mono-data">{r.numero_externe ?? 'Numéro inconnu'}</span>}</span>
                {' · '}{r.resultat}
              </span>
              <span className="font-mono-data text-[12px]" style={{ color: 'var(--muted)' }}>{fmtDate(r.created_at)}</span>
            </div>
            <div className="mt-1 text-[12px]" style={{ color: 'var(--muted)' }}>
              {agents[r.user_id] ?? 'Agent inconnu'} · {TYPES[typeAppel(r)]?.label ?? '—'} · {fmtDuree(r.duree_secondes)}
              {r.numero_externe && (!r.horsCrm || r.nom) ? ` · ${r.numero_externe}` : ''}
            </div>
            {r.note && <p className="mt-1 whitespace-pre-wrap text-[13px]" style={{ color: 'var(--muted)' }}>{r.note}</p>}
            {r.enregistrement_url && <a href={r.enregistrement_url} target="_blank" rel="noreferrer" className="mt-1 inline-block text-[12px] underline">▶ Écouter l'enregistrement</a>}
            <div className="mt-2">
              {r.horsCrm ? (
                <button onClick={() => inserer(r)} disabled={enCours === r.cle || !r.numero_externe} className="btn-accent">
                  {enCours === r.cle ? 'Préparation…' : 'Insérer dans le CRM'}
                </button>
              ) : (
                <Link href={`/leads/${r.lead_id}`} className="btn inline-block">Accéder à la fiche</Link>
              )}
            </div>
          </div>
        ))}
        {!listeFiltree.length && <p className="text-sm" style={{ color: 'var(--muted)' }}>Aucun appel pour le moment.</p>}
      </div>
    </AppShell>
  )
}
