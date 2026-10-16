'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const isAllowed = (file) => file.type === 'application/pdf' || file.type.startsWith('image/')

export default function DocumentManager({ leadId }) {
  const [docs, setDocs] = useState([])
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [err, setErr] = useState('')

  const load = async () => {
    if (!leadId) return
    const { data } = await supabase.from('lead_documents').select('*').eq('lead_id', leadId).order('created_at', { ascending: false })
    setDocs(data ?? [])
  }
  useEffect(() => { load() }, [leadId])

  const handleFiles = async (fileList) => {
    const files = Array.from(fileList || [])
    if (!files.length || !leadId) return
    const valides = files.filter(isAllowed)
    const ignores = files.length - valides.length
    setErr(ignores ? `${ignores} fichier(s) ignoré(s) : seuls les PDF et les photos sont acceptés.` : '')
    if (!valides.length) return
    setUploading(true)
    const { data: { user } } = await supabase.auth.getUser()
    for (const file of valides) {
      const path = `${leadId}/${Date.now()}_${file.name}`
      const { error: upErr } = await supabase.storage.from('documents').upload(path, file)
      if (upErr) { setErr(upErr.message); continue }
      await supabase.from('lead_documents').insert({ lead_id: leadId, nom_fichier: file.name, storage_path: path, uploaded_by: user.id })
    }
    setUploading(false)
    load()
  }

  const onDrop = (e) => {
    e.preventDefault(); setDragOver(false)
    handleFiles(e.dataTransfer.files)
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
    <div className="card p-4 sm:p-5">
      <h2 className="section-heading mb-3">Documents</h2>
      {err && <p className="mb-2 rounded-lg px-3 py-2 text-sm" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>{err}</p>}

      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className="mb-4 rounded-lg border-2 border-dashed p-6 text-center text-sm transition-colors"
        style={{
          borderColor: dragOver ? 'var(--accent)' : 'var(--border-strong)',
          background: dragOver ? 'var(--accent-soft)' : 'var(--surface)',
        }}
      >
        {uploading ? 'Envoi…' : (
          <>
            <p style={{ color: 'var(--muted)' }}>Glissez vos fichiers ici (PDF ou photo)</p>
            <label className="mt-1 inline-block cursor-pointer text-sm font-medium underline" style={{ color: 'var(--accent)' }}>
              ou parcourir
              <input type="file" accept="application/pdf,image/*" multiple className="hidden"
                onChange={(e) => { handleFiles(e.target.files); e.target.value = '' }} disabled={uploading} />
            </label>
          </>
        )}
      </div>

      <ul className="flex flex-col gap-1.5">
        {docs.map((d) => (
          <li key={d.id} className="flex items-center justify-between gap-3 rounded-lg p-2.5 text-sm" style={{ background: 'var(--surface)' }}>
            <button type="button" onClick={() => ouvrir(d.storage_path)} className="truncate text-left font-medium hover:underline">{d.nom_fichier}</button>
            <button type="button" onClick={() => suppr(d)} className="shrink-0 text-[13px] font-medium" style={{ color: 'var(--danger)' }}>Supprimer</button>
          </li>
        ))}
        {!docs.length && <li className="text-sm" style={{ color: 'var(--muted)' }}>Aucun document.</li>}
      </ul>
    </div>
  )
}
