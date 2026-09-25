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
    <div>
      <h2 className="mb-2 text-lg font-bold">Historique des appels</h2>
      {err && <p className="mb-2 text-sm text-red-600">{err}</p>}
      <ul className="mb-3 divide-y rounded border bg-white">
        {appels.map((a) => (
          <li key={a.id} className="p-2 text-sm">
            <div className="flex justify-between">
              <span className="font-medium">{a.resultat}</span>
              <span className="text-slate-500">{new Date(a.created_at).toLocaleString('fr-FR')}</span>
            </div>
            {a.note && <p className="mt-1 whitespace-pre-wrap text-slate-600">{a.note}</p>}
          </li>
        ))}
        {!appels.length && <li className="p-2 text-sm text-slate-500">Aucun appel enregistré.</li>}
      </ul>
      <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row">
        <select name="resultat" required className="inp sm:w-56">
          <option value="">Résultat de l'appel…</option>
          {RESULTATS.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <input name="note" placeholder="Note (optionnel)" className="inp flex-1" />
        <button disabled={busy} className="btn whitespace-nowrap">Enregistrer l'appel</button>
      </form>
    </div>
  )
}
