'use client'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import AppShell from '@/components/AppShell'
import { STATUTS, STATUT_KEYS } from '@/lib/defisc'

const fmtDate = (d) => (d ? new Date(d + 'T00:00:00').toLocaleDateString('fr-FR') : '—')
const iso = (d) => d.toISOString().slice(0, 10)
const PERIODES = [['tous', 'Toutes les dates'], ['aujourdhui', "Aujourd'hui"], ['semaine', 'Cette semaine'], ['avenir', 'À venir']]

export default function DefiscListe() {
  const [rows, setRows] = useState([])
  const [conseillers, setConseillers] = useState({})
  const [role, setRole] = useState(null)
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [statuts, setStatuts] = useState([])
  const [periode, setPeriode] = useState('tous')
  const [conseiller, setConseiller] = useState('')
  const [err, setErr] = useState('')

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
      const { data } = await supabase.from('profiles').select('id, nom_complet').in('role', ['agent', 'call_center'])
      setConseillers(Object.fromEntries((data ?? []).map((c) => [c.id, c.nom_complet])))
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
      if (conseiller && r.assigned_to !== conseiller) return false
      if (periode === 'aujourdhui' && r.date_rdv !== today) return false
      if (periode === 'semaine' && !(r.date_rdv >= today && r.date_rdv <= iso(fin))) return false
      if (periode === 'avenir' && !(r.date_rdv >= today)) return false
      if (needle) {
        const hay = [r.nom, r.prenom, r.mobile, r.fixe, r.email, r.nature].join(' ').toLowerCase().replace(/\s/g, '')
        if (!hay.includes(needle)) return false
      }
      return true
    })
  }, [rows, q, statuts, periode, conseiller])

  return (
    <AppShell wide title="Rendez-vous défiscalisation" subtitle={`${filtrees.length} fiche(s)`}
      actions={<><Link href="/defisc/new" className="btn-accent">+ Nouvelle fiche</Link>{role === 'admin' && <Link href="/defisc/import" className="btn-ghost" style={{ border: '1px solid var(--border-strong)' }}>Importer Excel</Link>}</>}>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher nom, téléphone, e-mail…" className="inp max-w-xs" />
        <select value={periode} onChange={(e) => setPeriode(e.target.value)} className="inp max-w-[200px]">
          {PERIODES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        {role === 'admin' && (
          <select value={conseiller} onChange={(e) => setConseiller(e.target.value)} className="inp max-w-[220px]">
            <option value="">Tous les conseillers</option>
            {Object.entries(conseillers).map(([id, n]) => <option key={id} value={id}>{n}</option>)}
          </select>
        )}
      </div>

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

      <div className="card overflow-x-auto">
        <table className="w-full text-left text-[13px]">
          <thead>
            <tr className="border-b text-[11px] uppercase tracking-wide" style={{ color: 'var(--muted)', borderColor: 'var(--border)' }}>
              {['Date', 'Heure', 'Client', 'Contact', 'Type', 'Nature', 'Revenus', 'Épargne', 'Statut', ''].map((h) => <th key={h} className="px-3 py-2.5 font-medium">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {filtrees.map((r) => (
              <tr key={r.id} className="border-b last:border-0" style={{ borderColor: 'var(--border)' }}>
                <td className="whitespace-nowrap px-3 py-2.5 font-medium">{fmtDate(r.date_rdv)}</td>
                <td className="px-3 py-2.5">{r.heure_rdv?.slice(0, 5) ?? '—'}</td>
                <td className="px-3 py-2.5"><Link href={`/defisc/${r.id}`} className="font-medium underline-offset-2 hover:underline">{[r.civilite, r.prenom, r.nom].filter(Boolean).join(' ') || '—'}</Link></td>
                <td className="px-3 py-2.5"><div>{r.mobile ?? r.fixe ?? '—'}</div><div className="text-[12px]" style={{ color: 'var(--muted)' }}>{r.email}</div></td>
                <td className="px-3 py-2.5">{r.type_rdv ?? '—'}</td>
                <td className="px-3 py-2.5">{r.nature ?? '—'}</td>
                <td className="whitespace-nowrap px-3 py-2.5">{r.revenus_annuels != null ? `${Number(r.revenus_annuels).toLocaleString('fr-FR')} €` : '—'}</td>
                <td className="whitespace-nowrap px-3 py-2.5">{r.epargne != null ? `${Number(r.epargne).toLocaleString('fr-FR')} €` : '—'}</td>
                <td className="px-3 py-2.5">
                  <select value={r.statut} onChange={(e) => changerStatut(r.id, e.target.value)} className="w-full rounded-lg border-0 px-2.5 py-1.5 text-[12px] font-medium text-white" style={{ background: STATUTS[r.statut]?.color, colorScheme: 'light' }}>
                    {STATUT_KEYS.map((s) => <option key={s} value={s} style={{ color: '#1e293b', background: '#fff' }}>{STATUTS[s].label}</option>)}
                  </select>
                </td>
                <td className="whitespace-nowrap px-3 py-2.5">
                  <Link href={`/defisc/${r.id}`} className="mr-3 text-[12px] font-medium underline" style={{ color: 'var(--accent)' }}>Modifier</Link>
                  {role === 'admin' && <button onClick={() => supprimer(r)} className="text-[12px] font-medium underline" style={{ color: 'var(--danger)' }}>Supprimer</button>}
                </td>
              </tr>
            ))}
            {!loading && !filtrees.length && <tr><td colSpan={10} className="px-3 py-8 text-center" style={{ color: 'var(--muted)' }}>Aucune fiche.</td></tr>}
            {loading && <tr><td colSpan={10} className="px-3 py-8 text-center" style={{ color: 'var(--muted)' }}>Chargement…</td></tr>}
          </tbody>
        </table>
      </div>
    </AppShell>
  )
}
