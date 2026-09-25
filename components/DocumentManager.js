'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function DocumentManager({ leadId }) {
  const [docs, setDocs] = useState([])
  const [uploading, setUploading] = useState(false)
  const [err, setErr] = useState('')

  const load = async () => {
    if (!leadId) return
    const { data } = await supabase.from('lead_documents').select('*').eq('lead_id', leadId).order('created_at', { ascending: false })
    setDocs(data ?? [])
  }
  useEffect(() => { load() }, [leadId])

  const upload = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !leadId) return
    setUploading(true); setErr('')
    const path = `${leadId}/${Date.now()}_${file.name}`
    const { error: upErr } = await supabase.storage.from('documents').upload(path, file)
    if (upErr) { setUploading(false); return setErr(upErr.message) }
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('lead_documents').insert({
      lead_id: leadId, nom_fichier: file.name, storage_path: path, uploaded_by: user.id,
    })
    setUploading(false); e.target.value = ''
    if (error) return setErr(error.message)
    load()
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
    <div>
      <h2 className="mb-2 text-lg font-bold">Documents</h2>
      {err && <p className="mb-2 text-sm text-red-600">{err}</p>}
      <ul className="mb-3 divide-y rounded border bg-white">
        {docs.map((d) => (
          <li key={d.id} className="flex items-center justify-between p-2 text-sm">
            <button type="button" onClick={() => ouvrir(d.storage_path)} className="text-left underline">{d.nom_fichier}</button>
            <button type="button" onClick={() => suppr(d)} className="text-red-700 underline">Supprimer</button>
          </li>
        ))}
        {!docs.length && <li className="p-2 text-sm text-slate-500">Aucun document.</li>}
      </ul>
      <label className="btn inline-block cursor-pointer text-sm">
        {uploading ? 'Envoi…' : 'Ajouter un document'}
        <input type="file" className="hidden" onChange={upload} disabled={uploading} />
      </label>
    </div>
  )
}
