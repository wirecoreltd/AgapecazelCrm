'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const IGNORES = ['updated_at']
// Liste des champs qui ont changé entre « avant » et « après »
const changements = (h) => {
  if (h.action === 'DELETE') return [['Fiche supprimée', '', '']]
  const a = h.anciennes ?? {}, n = h.nouvelles ?? {}
  return Object.keys(n).filter((k) => !IGNORES.includes(k) && JSON.stringify(a[k]) !== JSON.stringify(n[k]))
    .map((k) => [k, a[k] ?? '—', n[k] ?? '—'])
}
const txt = (v) => (typeof v === 'object' ? JSON.stringify(v) : String(v))

// Journal des modifications d'une fiche : visible par l'admin uniquement
export default function HistoriqueDefisc({ ficheId }) {
  const [rows, setRows] = useState([])
  const [err, setErr] = useState('')
  const load = async () => {
    const { data } = await supabase.from('defisc_historique').select('*').eq('fiche_id', ficheId).order('created_at', { ascending: false }).limit(50)
    setRows(data ?? [])
  }
  useEffect(() => { load() }, [ficheId])

  const restaurer = async (h) => {
    if (!confirm('Remettre la fiche dans l\'état où elle était AVANT cette modification ?')) return
    const { error } = await supabase.rpc('restaurer_fiche', { h_id: h.id })
    if (error) return setErr(`Erreur : ${error.message}`)
    window.location.reload()
  }

  return (
    <div className="card p-4 sm:p-6 lg:col-span-2">
      <h2 className="section-heading mb-3">Historique des modifications</h2>
      {err && <p className="mb-3 rounded-lg px-3 py-2 text-sm" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>{err}</p>}
      <ul className="flex flex-col gap-2">
        {rows.map((h) => (
          <li key={h.id} className="rounded-lg p-3 text-sm" style={{ background: 'var(--surface)' }}>
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
              <span className="font-medium">{h.user_nom ?? 'Système'}</span>
              <span className="font-mono-data text-[12px]" style={{ color: 'var(--muted)' }}>{new Date(h.created_at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}</span>
            </div>
            <ul className="mt-1 text-[13px]" style={{ color: 'var(--muted)' }}>
              {changements(h).map(([k, a, n]) => (
                <li key={k} className="break-words">{h.action === 'DELETE' ? k : <><b>{k}</b> : {txt(a)} → {txt(n)}</>}</li>
              ))}
            </ul>
            <button type="button" onClick={() => restaurer(h)} className="mt-2 text-[12px] underline">Restaurer l'état d'avant</button>
          </li>
        ))}
        {!rows.length && <li className="text-sm" style={{ color: 'var(--muted)' }}>Aucune modification enregistrée.</li>}
      </ul>
    </div>
  )
}
