'use client'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import AppShell from '@/components/AppShell'

const PERIODES = [
  ['today', "Aujourd'hui"], ['7j', '7 jours'], ['30j', '30 jours'], ['mois', 'Ce mois'], ['tout', 'Tout'],
]
const NON_DECROCHE = ['Ne répond pas (NRP)', "N'a pas décroché", 'Répondeur', 'Numéro erroné']

function debut(periode) {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  if (periode === 'today') return d
  if (periode === '7j') { d.setDate(d.getDate() - 6); return d }
  if (periode === '30j') { d.setDate(d.getDate() - 29); return d }
  if (periode === 'mois') { d.setDate(1); return d }
  return null
}

// Charge toutes les lignes (Supabase limite à 1000 par requête)
async function toutCharger(table, depuis) {
  let out = [], from = 0
  for (;;) {
    let q = supabase.from(table).select('*').order('created_at', { ascending: false }).range(from, from + 999)
    if (depuis) q = q.gte('created_at', depuis.toISOString())
    const { data, error } = await q
    if (error) throw error
    out = out.concat(data ?? [])
    if (!data || data.length < 1000 || out.length >= 30000) break
    from += 1000
  }
  return out
}

function typeAppel(r) {
  const l = (r.note || '').split('\n')[0]
  if (l.includes('Message vocal')) return 'vocal'
  if (r.direction === 'INBOUND') return l.includes('manqué') ? 'manque' : 'recu'
  return 'emis' // sortant OnOff ou appel saisi à la main
}
function decroche(r) {
  const l = (r.note || '').split('\n')[0]
  if (r.direction) return l.includes('· décroché')
  return !NON_DECROCHE.includes(r.resultat) // saisie manuelle
}
const fmtDuree = (s) => {
  if (!s) return '0 min'
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60)
  return h ? `${h} h ${String(m).padStart(2, '0')}` : `${m} min`
}
const pct = (a, b) => (b ? `${Math.round((a / b) * 100)} %` : '—')

function vide() {
  return { total: 0, emis: 0, recus: 0, manques: 0, decroches: 0, emisDecroches: 0, duree: 0, dureeN: 0, rdv: 0 }
}

export default function Stats() {
  const [periode, setPeriode] = useState('7j')
  const [lignes, setLignes] = useState([])
  const [agents, setAgents] = useState({})
  const [chargement, setChargement] = useState(true)
  const [err, setErr] = useState('')

  useEffect(() => { (async () => {
    setChargement(true); setErr('')
    try {
      const d = debut(periode)
      const [a, b] = await Promise.all([toutCharger('lead_appels', d), toutCharger('appels_non_rattaches', d)])
      setLignes([...a, ...b])
      const { data: profs } = await supabase.from('profiles').select('id, nom_complet')
      setAgents(Object.fromEntries((profs ?? []).map((p) => [p.id, p.nom_complet])))
    } catch (e) { setErr(e.message) }
    setChargement(false)
  })() }, [periode])

  const { parAgent, total } = useMemo(() => {
    const m = {}, t = vide()
    for (const r of lignes) {
      const k = r.user_id ?? 'inconnu'
      const s = (m[k] ??= vide())
      const type = typeAppel(r), ok = decroche(r)
      for (const x of [s, t]) {
        x.total++
        if (type === 'emis') { x.emis++; if (ok) x.emisDecroches++ }
        if (type === 'recu') x.recus++
        if (type === 'manque') x.manques++
        if (ok) x.decroches++
        if (r.duree_secondes) { x.duree += r.duree_secondes; x.dureeN++ }
        if (r.resultat === 'RDV fixé') x.rdv++
      }
    }
    const liste = Object.entries(m).map(([id, s]) => ({ id, nom: agents[id] ?? 'Agent inconnu', ...s })).sort((a, b) => b.total - a.total)
    return { parAgent: liste, total: t }
  }, [lignes, agents])

  const Kpi = ({ label, valeur, sous }) => (
    <div className="card p-3">
      <p className="text-[12px]" style={{ color: 'var(--muted)' }}>{label}</p>
      <p className="font-mono-data text-xl font-semibold">{valeur}</p>
      {sous && <p className="text-[11px]" style={{ color: 'var(--muted)' }}>{sous}</p>}
    </div>
  )

  return (
    <AppShell title="Statistiques" subtitle="Activité téléphonique par agent">
      <div className="mb-4 flex flex-wrap gap-2">
        {PERIODES.map(([k, l]) => (
          <button key={k} onClick={() => setPeriode(k)} className={periode === k ? 'btn-accent' : 'btn'}>{l}</button>
        ))}
      </div>
      {err && <p className="mb-3 text-sm" style={{ color: 'var(--danger)' }}>{err}</p>}
      {chargement ? <p className="text-sm" style={{ color: 'var(--muted)' }}>Chargement…</p> : (
        <>
          <div className="mb-5 grid grid-cols-2 gap-2 md:grid-cols-4">
            <Kpi label="Appels" valeur={total.total} sous={`${total.emis} émis · ${total.recus} reçus`} />
            <Kpi label="Taux de décroché" valeur={pct(total.emisDecroches, total.emis)} sous="sur les appels émis" />
            <Kpi label="Durée totale" valeur={fmtDuree(total.duree)} sous={`moy. ${fmtDuree(total.dureeN ? Math.round(total.duree / total.dureeN) : 0)} / appel`} />
            <Kpi label="RDV fixés" valeur={total.rdv} sous={`${pct(total.rdv, total.decroches)} des décrochés`} />
          </div>

          <div className="space-y-2">
            {parAgent.map((a) => (
              <div key={a.id} className="card p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-medium">{a.nom}</span>
                  <span className="font-mono-data text-sm">{a.total} appels</span>
                </div>
                <div className="grid grid-cols-3 gap-x-3 gap-y-2 text-[13px] sm:grid-cols-6">
                  {[
                    ['Émis', a.emis], ['Reçus', a.recus], ['Manqués', a.manques],
                    ['Décroché', pct(a.emisDecroches, a.emis)], ['Durée', fmtDuree(a.duree)], ['RDV', a.rdv],
                  ].map(([l, v]) => (
                    <div key={l}>
                      <p className="text-[11px]" style={{ color: 'var(--muted)' }}>{l}</p>
                      <p className="font-mono-data font-semibold">{v}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {!parAgent.length && <p className="text-sm" style={{ color: 'var(--muted)' }}>Aucun appel sur cette période.</p>}
          </div>
        </>
      )}
    </AppShell>
  )
}