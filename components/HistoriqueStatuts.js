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
      <h2 className="section-heading mb-3">Historique des statuts</h2>
      {err && <p className="mb-3 rounded-lg px-3 py-2 text-sm" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>{err}</p>}
      {rows === null ? (
        <p className="text-sm" style={{ color: 'var(--muted)' }}>Chargement…</p>
      ) : !rows.length ? (
        <p className="text-sm" style={{ color: 'var(--muted)' }}>Aucun changement de statut enregistré.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((h) => {
            const c = CHAMPS[h.champ]
            return (
              <li key={h.id} className="rounded-lg p-3 text-sm" style={{ background: 'var(--surface)' }}>
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                  <span className="font-medium">
                    {h.user_nom ?? 'Système'}{h.user_role && <span className="font-normal" style={{ color: 'var(--muted)' }}> · {roleLabel(h.user_role)}</span>}
                  </span>
                  <span className="font-mono-data text-[12px]" style={{ color: 'var(--muted)' }}>
                    {new Date(h.created_at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}
                  </span>
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[13px]">
                  <span className="text-[10px] font-medium uppercase tracking-wide" style={{ color: 'var(--muted)' }}>Statut {c?.titre ?? h.champ}</span>
                  <Pastille defs={c?.defs ?? {}} valeur={h.ancien} />
                  <span aria-hidden>→</span>
                  <Pastille defs={c?.defs ?? {}} valeur={h.nouveau} />
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
