'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import AppShell from '@/components/AppShell'

const fmtDate = (v) => new Date(v).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })
const fmtDuree = (s) => (s == null ? '—' : `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, '0')} s`)

export default function Appels() {
  const [rows, setRows] = useState([])
  const [agents, setAgents] = useState({})
  const [leads, setLeads] = useState({})
  const [onglet, setOnglet] = useState('leads') // 'leads' | 'inconnus'
  const [inconnus, setInconnus] = useState([])
  const [recherche, setRecherche] = useState('')
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

  const q = recherche.trim().toLowerCase()
  const nomLead = (id) => { const l = leads[id]; return l ? `${l.prenom ?? ''} ${l.nom ?? ''}`.trim() || 'Lead' : 'Lead' }
  const liste = onglet === 'leads'
    ? rows.filter((r) => !q || `${nomLead(r.lead_id)} ${agents[r.user_id] ?? ''} ${r.resultat} ${r.numero_externe ?? ''}`.toLowerCase().includes(q))
    : inconnus.filter((r) => !q || `${agents[r.user_id] ?? ''} ${r.numero_externe ?? ''} ${r.resultat}`.toLowerCase().includes(q))

  return (
    <AppShell title={`Appels (${liste.length})`} subtitle="Appels passés et reçus avec OnOff">
      {err && <p className="mb-3 text-sm" style={{ color: 'var(--danger)' }}>{err}</p>}
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="flex gap-2">
          <button className={onglet === 'leads' ? 'btn-accent' : 'btn'} onClick={() => setOnglet('leads')}>Leads ({rows.length})</button>
          <button className={onglet === 'inconnus' ? 'btn-accent' : 'btn'} onClick={() => setOnglet('inconnus')}>Numéros hors CRM ({inconnus.length})</button>
        </div>
        <input value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder="Rechercher (lead, agent, numéro, résultat)…" className="inp flex-1" />
      </div>

      <div className="space-y-2">
        {liste.map((r) => (
          <div key={r.id} className="card p-3 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
              <span className="font-medium">
                {onglet === 'leads'
                  ? <Link href={`/leads/${r.lead_id}`} className="underline">{nomLead(r.lead_id)}</Link>
                  : <span className="font-mono-data">{r.numero_externe ?? 'Numéro inconnu'}</span>}
                {' · '}{r.resultat}
              </span>
              <span className="font-mono-data text-[12px]" style={{ color: 'var(--muted)' }}>{fmtDate(r.created_at)}</span>
            </div>
            <div className="mt-1 text-[12px]" style={{ color: 'var(--muted)' }}>
              {agents[r.user_id] ?? 'Agent inconnu'} · {r.direction === 'INBOUND' ? 'Entrant' : r.direction === 'OUTBOUND' ? 'Sortant' : '—'} · {fmtDuree(r.duree_secondes)}
              {r.numero_externe && onglet === 'leads' ? ` · ${r.numero_externe}` : ''}
            </div>
            {r.note && <p className="mt-1 whitespace-pre-wrap text-[13px]" style={{ color: 'var(--muted)' }}>{r.note}</p>}
            {r.enregistrement_url && <a href={r.enregistrement_url} target="_blank" rel="noreferrer" className="mt-1 inline-block text-[12px] underline">▶ Écouter l'enregistrement</a>}
          </div>
        ))}
        {!liste.length && <p className="text-sm" style={{ color: 'var(--muted)' }}>Aucun appel pour le moment.</p>}
      </div>
    </AppShell>
  )
}
