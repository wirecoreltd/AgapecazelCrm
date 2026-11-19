'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { roleLabel } from '@/lib/roles'

// Historique des commentaires retour d'une fiche Défisc (call center + admin uniquement)
export default function RetourDefisc({ ficheId, role }) {
  const [retours, setRetours] = useState([])
  const [texte, setTexte] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [moi, setMoi] = useState(null)

  const load = async () => {
    const { data, error } = await supabase.from('defisc_retours').select('*').eq('fiche_id', ficheId).order('created_at', { ascending: false })
    if (error) setErr(error.message)
    setRetours(data ?? [])
  }
  useEffect(() => { (async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setMoi(user?.id ?? null)
    load()
  })() }, [ficheId])

  const ajouter = async (e) => {
    e.preventDefault()
    const commentaire = texte.trim()
    if (!commentaire) return
    setBusy(true); setErr('')
    const { data: { user } } = await supabase.auth.getUser()
    const { data: p } = await supabase.from('profiles').select('nom_complet, role').eq('id', user.id).single()
    const { error } = await supabase.from('defisc_retours').insert({
      fiche_id: ficheId, user_id: user.id, auteur_nom: p?.nom_complet ?? user.email, auteur_role: p?.role ?? role, commentaire,
    })
    setBusy(false)
    if (error) return setErr(`Erreur : ${error.message}`)
    setTexte(''); load()
  }

  const supprimer = async (id) => {
    if (!confirm('Supprimer ce commentaire ?')) return
    const { error } = await supabase.from('defisc_retours').delete().eq('id', id)
    if (error) return setErr(`Erreur : ${error.message}`)
    load()
  }

  return (
    <div className="card p-4 sm:p-6 lg:col-span-2">
      <h2 className="section-heading mb-3">Commentaire retour</h2>
      {err && <p className="mb-3 rounded-lg px-3 py-2 text-sm" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>{err}</p>}

      <form onSubmit={ajouter} className="mb-4 flex flex-col gap-2">
        <textarea value={texte} onChange={(e) => setTexte(e.target.value)} rows={3} placeholder="Écrire un commentaire retour…" className="inp" />
        <div className="flex justify-end">
          <button disabled={busy || !texte.trim()} className="btn-accent">{busy ? 'Envoi…' : 'Ajouter le commentaire'}</button>
        </div>
      </form>

      <ul className="flex flex-col gap-2">
        {retours.map((r) => (
          <li key={r.id} className="rounded-lg p-3 text-sm" style={{ background: 'var(--surface)' }}>
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
              <span className="font-medium">
                {r.auteur_nom ?? '—'}
                {r.auteur_role && <span className="ml-2 text-[12px] font-normal" style={{ color: 'var(--muted)' }}>{roleLabel(r.auteur_role)}</span>}
              </span>
              <span className="flex items-center gap-3">
                <span className="font-mono-data text-[12px]" style={{ color: 'var(--muted)' }}>
                  {new Date(r.created_at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}
                </span>
                {role === 'admin' && <button type="button" onClick={() => supprimer(r.id)} className="text-[12px] underline" style={{ color: 'var(--danger)' }}>Supprimer</button>}
              </span>
            </div>
            <p className="mt-1 whitespace-pre-wrap break-words text-[14px]">{r.commentaire}</p>
          </li>
        ))}
        {!retours.length && <li className="text-sm" style={{ color: 'var(--muted)' }}>Aucun commentaire retour.</li>}
      </ul>
    </div>
  )
}
