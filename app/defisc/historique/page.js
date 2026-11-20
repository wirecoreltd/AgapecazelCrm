'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import AppShell from '@/components/AppShell'

// Journal global des modifications / suppressions de fiches Défisc (admin uniquement) + restauration
export default function HistoriqueGlobal() {
  const [rows, setRows] = useState([])
  const [suppr, setSuppr] = useState(false)
  const [msg, setMsg] = useState('Chargement…')
  const [err, setErr] = useState('')

  const load = async () => {
    let q = supabase.from('defisc_historique').select('*').order('created_at', { ascending: false }).limit(200)
    if (suppr) q = q.eq('action', 'DELETE')
    const { data, error } = await q
    setRows(data ?? [])
    setMsg(error ? error.message : data?.length ? '' : 'Aucune entrée.')
  }
  useEffect(() => { load() }, [suppr])

  const restaurer = async (h) => {
    const nom = [h.anciennes?.prenom, h.anciennes?.nom].filter(Boolean).join(' ') || 'cette fiche'
    if (!confirm(`Restaurer ${nom} dans l'état d'avant cette ${h.action === 'DELETE' ? 'suppression' : 'modification'} ?`)) return
    const { error } = await supabase.rpc('restaurer_fiche', { h_id: h.id })
    if (error) return setErr(`Erreur : ${error.message}`)
    setErr(''); load()
  }

  return (
    <AppShell backHref="/defisc" title="Historique des fiches" subtitle="Modifications et suppressions (200 dernières)">
      <label className="mb-4 flex items-center gap-2 text-sm">
        <input type="checkbox" checked={suppr} onChange={(e) => setSuppr(e.target.checked)} /> Suppressions seulement
      </label>
      {err && <p className="mb-3 rounded-lg px-3 py-2 text-sm" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>{err}</p>}
      {msg && <p style={{ color: 'var(--muted)' }}>{msg}</p>}
      <ul className="flex flex-col gap-2">
        {rows.map((h) => (
          <li key={h.id} className="card flex flex-wrap items-center justify-between gap-3 p-3 text-sm">
            <div>
              <p className="font-medium">
                {[h.anciennes?.prenom, h.anciennes?.nom].filter(Boolean).join(' ') || 'Fiche'}
                <span className="ml-2 rounded px-1.5 py-0.5 text-[11px]" style={{ background: h.action === 'DELETE' ? 'var(--danger-soft)' : 'var(--surface)', color: h.action === 'DELETE' ? 'var(--danger)' : 'var(--muted)' }}>
                  {h.action === 'DELETE' ? 'Supprimée' : 'Modifiée'}
                </span>
              </p>
              <p className="text-[12px]" style={{ color: 'var(--muted)' }}>
                {h.user_nom ?? 'Système'} · {new Date(h.created_at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}
                {h.action === 'UPDATE' && <> · <Link href={`/defisc/${h.fiche_id}/details`} className="underline">Voir la fiche</Link></>}
              </p>
            </div>
            <button type="button" onClick={() => restaurer(h)} className="btn-ghost" style={{ border: '1px solid var(--border-strong)' }}>Restaurer</button>
          </li>
        ))}
      </ul>
    </AppShell>
  )
}
