'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export const RESULTATS = [
  'Ne répond pas (NRP)', 'Client réfléchit', "N'a pas décroché", 'Rappeler plus tard',
  'Répondeur', 'Numéro erroné', 'Pas intéressé', 'RDV fixé', 'Autre',
]

export default function CallLog({ leadId }) {
  const [appels, setAppels] = useState([])
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const load = async () => {
    if (!leadId) return
    const { data } = await supabase.from('lead_appels').select('*').eq('lead_id', leadId).order('created_at', { ascending: false })
    setAppels(data ?? [])
  }
  useEffect(() => { load() }, [leadId])

  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setErr('')
    const f = Object.fromEntries(new FormData(e.target))
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('lead_appels').insert({
      lead_id: leadId, resultat: f.resultat, note: f.note || null, user_id: user.id,
    })
    setBusy(false)
    if (error) return setErr(error.message)
    e.target.reset(); load()
  }

  return (
    <div className="card p-4 sm:p-5">
      <h2 className="section-heading mb-3">Historique des appels</h2>
      {err && <p className="mb-2 rounded-lg px-3 py-2 text-sm" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>{err}</p>}

      <ul className="mb-4 flex flex-col gap-2">
        {appels.map((a) => (
          <li key={a.id} className="rounded-lg p-3 text-sm" style={{ background: 'var(--surface)' }}>
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
              <span className="font-medium">{a.resultat}</span>
              <span className="font-mono-data text-[12px]" style={{ color: 'var(--muted)' }}>{new Date(a.created_at).toLocaleString('fr-FR')}</span>
            </div>
            {a.note && <p className="mt-1 whitespace-pre-wrap text-[13px]" style={{ color: 'var(--muted)' }}>{a.note}</p>}
          </li>
        ))}
        {!appels.length && <li className="text-sm" style={{ color: 'var(--muted)' }}>Aucun appel enregistré.</li>}
      </ul>

      <form onSubmit={submit} className="flex flex-col gap-2">
        <select name="resultat" required className="inp">
          <option value="">Résultat de l'appel…</option>
          {RESULTATS.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <input name="note" placeholder="Note (optionnel)" className="inp" />
        <button disabled={busy} className="btn">Enregistrer l'appel</button>
      </form>
    </div>
  )
}
