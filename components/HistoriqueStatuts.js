'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { roleLabel } from '@/lib/roles'
import { STATUTS_CC, STATUTS_ADMIN } from '@/lib/defisc'

const CHAMPS = {
  statut_cc: { titre: 'Call center', defs: STATUTS_CC },
  statut_admin: { titre: 'Admin', defs: STATUTS_ADMIN },
}
const PILL = 'inline-block rounded-md px-2 py-0.5 text-[12px] font-medium text-white'

function Pastille({ defs, valeur }) {
  if (!valeur) return <span style={{ color: 'var(--muted)' }}>—</span>
  const d = defs[valeur]
  return <span className={PILL} style={{ background: d?.color ?? '#666' }}>{d?.label ?? valeur}</span>
}

// Historique des statuts d'une fiche Défisc (call center + admin), du plus récent au plus ancien.
// Visible par tous ceux qui ont accès à la fiche. inForm : sans cadre, à l'intérieur du formulaire.
export default function HistoriqueStatuts({ ficheId, inForm = false }) {
  const [rows, setRows] = useState(null)
  const [err, setErr] = useState('')

  useEffect(() => { if (!ficheId) return; (async () => {
    const { data, error } = await supabase.from('defisc_statut_historique').select('*').eq('fiche_id', ficheId)
      .order('created_at', { ascending: false }).order('id', { ascending: false })
    if (error) setErr(error.message)
    setRows(data ?? [])
  })() }, [ficheId])

  return (
    <div className={inForm ? '' : 'card p-4 sm:p-6 lg:col-span-2'}>
      <h2 className="section-heading mb-2">Historique des statuts</h2>
      {err && <p className="mb-3 rounded-lg px-3 py-2 text-sm" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>{err}</p>}
      {rows === null ? (
        <p className="text-sm" style={{ color: 'var(--muted)' }}>Chargement…</p>
      ) : !rows.length ? (
        <p className="text-sm" style={{ color: 'var(--muted)' }}>Aucun changement de statut enregistré.</p>
      ) : (
        <ul className="max-h-48 divide-y overflow-y-auto rounded-lg border" style={{ borderColor: 'var(--border)' }}>
          {rows.map((h) => {
            const c = CHAMPS[h.champ]
            return (
              <li key={h.id} className="flex flex-wrap items-center gap-x-2 gap-y-1 px-3 py-1.5 text-[12px]" style={{ borderColor: 'var(--border)' }}>
                <span className="font-mono-data" style={{ color: 'var(--muted)' }}>
                  {new Date(h.created_at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}
                </span>
                <span className="font-semibold">{c?.titre === 'Admin' ? 'Admin' : 'CC'}</span>
                <Pastille defs={c?.defs ?? {}} valeur={h.ancien} />
                <span aria-hidden>→</span>
                <Pastille defs={c?.defs ?? {}} valeur={h.nouveau} />
                <span className="ml-auto truncate" style={{ color: 'var(--muted)' }}>
                  {h.user_nom ?? 'Système'}{h.user_role && ` · ${roleLabel(h.user_role)}`}
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
