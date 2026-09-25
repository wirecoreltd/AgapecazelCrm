'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const STATUTS = ['nouveau', 'rdv_pris', 'devis', 'signe', 'installe', 'perdu']

export default function Leads() {
  const router = useRouter()
  const [role, setRole] = useState(null)
  const [leads, setLeads] = useState([])
  const [derniersAppels, setDerniersAppels] = useState({})
  const [filtre, setFiltre] = useState('')
  const [err, setErr] = useState('')
  const [uploadingId, setUploadingId] = useState(null)

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const { data: p } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    setRole(p?.role)
    const { data, error } = await supabase.from('leads').select('*').order('created_at', { ascending: false })
    if (error) setErr(error.message)
    setLeads(data ?? [])
    const { data: appels } = await supabase.from('lead_appels').select('lead_id, resultat, created_at').order('created_at', { ascending: false })
    const derniers = {}
    for (const a of appels ?? []) if (!derniers[a.lead_id]) derniers[a.lead_id] = a.resultat
    setDerniersAppels(derniers)
  }
  useEffect(() => { load() }, [])

  const maj = async (id, patch) => {
    setErr('')
    const { error } = await supabase.from('leads').update(patch).eq('id', id)
    if (error) return setErr(error.message)
    setLeads((l) => l.map((x) => (x.id === id ? { ...x, ...patch } : x)))
  }
  const suppr = async (l) => {
    if (!confirm(`Supprimer le lead ${l.prenom ?? ''} ${l.nom ?? ''} ?`)) return
    setErr('')
    const { data, error } = await supabase.from('leads').delete().eq('id', l.id).select()
    if (error || !data?.length) return setErr(error?.message ?? "Suppression refusée (réservée à l'admin).")
    setLeads((x) => x.filter((y) => y.id !== l.id))
  }
  const uploadRapide = async (leadId, e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingId(leadId); setErr('')
    const path = `${leadId}/${Date.now()}_${file.name}`
    const { error: upErr } = await supabase.storage.from('documents').upload(path, file)
    if (upErr) { setUploadingId(null); return setErr(upErr.message) }
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('lead_documents').insert({
      lead_id: leadId, nom_fichier: file.name, storage_path: path, uploaded_by: user.id,
    })
    setUploadingId(null); e.target.value = ''
    if (error) setErr(error.message)
  }
  const logout = async () => { await supabase.auth.signOut(); router.push('/login'); router.refresh() }
  const rows = leads.filter((l) => !filtre || l.statut === filtre)

  return (
    <main className="mx-auto max-w-6xl p-6">
      <header className="mb-6 flex flex-wrap items-center gap-3">
        <h1 className="mr-auto text-2xl font-bold">Leads ({rows.length})</h1>
        <select className="inp !w-auto" value={filtre} onChange={(e) => setFiltre(e.target.value)}>
          <option value="">Tous les statuts</option>
          {STATUTS.map((s) => <option key={s}>{s}</option>)}
        </select>
        <Link href="/leads/new" className="btn">Nouveau lead</Link>
        {role === 'admin' && <Link href="/admin" className="text-sm underline">Espace admin</Link>}
        <button onClick={logout} className="text-sm underline">Déconnexion</button>
      </header>
      {err && <p className="mb-4 text-sm text-red-600">{err}</p>}
      <div className="overflow-x-auto rounded border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-100">
            <tr>{['Contact', 'Ville', 'Mobile', 'Chauffage', 'Surface', 'Dernier appel', 'Statut', 'Actions'].map((h) => <th key={h} className="p-3">{h}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((l) => (
              <tr key={l.id} className="border-t">
                <td className="p-3">{l.civilite} {l.prenom} {l.nom}</td>
                <td className="p-3">{l.code_postal} {l.ville}</td>
                <td className="p-3">{l.mobile}</td>
                <td className="p-3">{l.chauffage}</td>
                <td className="p-3">{l.surface_habitable} m²</td>
                <td className="p-3">{derniersAppels[l.id] ?? '—'}</td>
                <td className="p-3">
                  <select className="inp" value={l.statut} onChange={(e) => maj(l.id, { statut: e.target.value })}>
                    {STATUTS.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </td>
                <td className="space-x-3 whitespace-nowrap p-3">
                  <Link href={`/leads/${l.id}`} className="underline">Voir</Link>
                  <Link href={`/leads/${l.id}/edit`} className="underline">Modifier</Link>
                  <label className="cursor-pointer underline">
                    {uploadingId === l.id ? 'Envoi…' : 'Document'}
                    <input type="file" className="hidden" disabled={uploadingId === l.id} onChange={(e) => uploadRapide(l.id, e)} />
                  </label>
                  {role === 'admin' && <button onClick={() => suppr(l)} className="text-red-700 underline">Supprimer</button>}
                </td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={8} className="p-6 text-center text-slate-500">Aucun lead pour le moment.</td></tr>}
          </tbody>
        </table>
      </div>
    </main>
  )
}
