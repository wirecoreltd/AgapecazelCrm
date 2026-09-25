'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const ROWS = [
  ['civilite', 'Civilité'], ['prenom', 'Prénom'], ['nom', 'Nom'], ['adresse', 'Adresse'],
  ['code_postal', 'Code postal'], ['ville', 'Ville'], ['mobile', 'Mobile'],
  ['telephone_1', 'Téléphone 1'], ['telephone_2', 'Téléphone 2'], ['proprietaire', 'Propriétaire'],
  ['nb_personnes', 'Nb de personnes'], ['revenus', 'Revenus'], ['maison_plus_15_ans', 'Maison +15 ans'],
  ['type_habitat', "Type d'habitat"], ['surface_habitable', 'Surface habitable (m²)'],
  ['chauffage', 'Type de chauffage'], ['produit_1', 'Produit 1'],
  ['documents_requis', 'Documents à récupérer'], ['installateur', 'Installateur'],
  ['statut', 'Statut'], ['commentaire', 'Commentaire'],
]
const fmt = (v) => (v == null || v === '' ? '—' : v === true ? 'Oui' : v === false ? 'Non' : v)

export default function ViewLead() {
  const { id } = useParams()
  const [lead, setLead] = useState(null)
  const [docs, setDocs] = useState([])
  const [uploading, setUploading] = useState(false)
  const [err, setErr] = useState('')
  const [msg, setMsg] = useState('Chargement…')

  const loadDocs = async () => {
    const { data } = await supabase.from('lead_documents').select('*').eq('lead_id', id).order('created_at', { ascending: false })
    setDocs(data ?? [])
  }

  useEffect(() => { (async () => {
    const { data } = await supabase.from('leads').select('*').eq('id', id).single()
    data ? setLead(data) : setMsg('Lead introuvable.')
    loadDocs()
  })() }, [id])

  const upload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true); setErr('')
    const path = `${id}/${Date.now()}_${file.name}`
    const { error: upErr } = await supabase.storage.from('documents').upload(path, file)
    if (upErr) { setUploading(false); return setErr(upErr.message) }
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('lead_documents').insert({
      lead_id: id, nom_fichier: file.name, storage_path: path, uploaded_by: user.id,
    })
    setUploading(false); e.target.value = ''
    if (error) return setErr(error.message)
    loadDocs()
  }

  const ouvrir = async (path) => {
    const { data, error } = await supabase.storage.from('documents').createSignedUrl(path, 60)
    if (error) return setErr(error.message)
    window.open(data.signedUrl, '_blank')
  }

  const suppr = async (doc) => {
    if (!confirm(`Supprimer "${doc.nom_fichier}" ?`)) return
    await supabase.storage.from('documents').remove([doc.storage_path])
    await supabase.from('lead_documents').delete().eq('id', doc.id)
    setDocs((d) => d.filter((x) => x.id !== doc.id))
  }

  return (
    <main className="mx-auto max-w-2xl p-6">
      <Link href="/leads" className="text-sm underline">Retour aux leads</Link>
      <div className="my-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{lead ? `${lead.prenom ?? ''} ${lead.nom ?? ''}` : 'Lead'}</h1>
        {lead && <Link href={`/leads/${id}/edit`} className="btn">Modifier</Link>}
      </div>
      {lead ? (
        <>
          <dl className="divide-y rounded border bg-white">
            {ROWS.map(([k, l]) => (
              <div key={k} className="grid grid-cols-3 gap-2 p-3 text-sm">
                <dt className="font-medium">{l}</dt>
                <dd className="col-span-2 whitespace-pre-wrap">{fmt(lead[k])}</dd>
              </div>
            ))}
          </dl>

          <h2 className="mb-3 mt-8 text-lg font-bold">Documents</h2>
          {err && <p className="mb-2 text-sm text-red-600">{err}</p>}
          <ul className="mb-3 divide-y rounded border bg-white">
            {docs.map((d) => (
              <li key={d.id} className="flex items-center justify-between p-3 text-sm">
                <button onClick={() => ouvrir(d.storage_path)} className="text-left underline">{d.nom_fichier}</button>
                <button onClick={() => suppr(d)} className="text-red-700 underline">Supprimer</button>
              </li>
            ))}
            {!docs.length && <li className="p-3 text-sm text-slate-500">Aucun document.</li>}
          </ul>
          <label className="btn inline-block cursor-pointer">
            {uploading ? 'Envoi…' : 'Ajouter un document'}
            <input type="file" className="hidden" onChange={upload} disabled={uploading} />
          </label>
        </>
      ) : <p>{msg}</p>}
    </main>
  )
}
