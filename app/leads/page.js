'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const STATUTS = ['nouveau', 'transmis', 'rdv_pris', 'devis', 'signe', 'perdu']

export default function Leads() {
  const router = useRouter()
  const [role, setRole] = useState(null)
  const [leads, setLeads] = useState([])
  const [branches, setBranches] = useState([])
  const [filtre, setFiltre] = useState('')
  const [err, setErr] = useState('')

  useEffect(() => { (async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const { data: p } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    setRole(p?.role)
    const { data: b } = await supabase.from('branches').select('id, nom')
    setBranches(b ?? [])
    const { data, error } = await supabase.from('leads').select('*').order('created_at', { ascending: false })
    if (error) setErr(error.message)
    setLeads(data ?? [])
  })() }, [])

  const maj = async (id, patch) => {
    setErr('')
    const { error } = await supabase.from('leads').update(patch).eq('id', id)
    if (error) return setErr(error.message)
    setLeads((l) => l.map((x) => (x.id === id ? { ...x, ...patch } : x)))
  }
  const logout = async () => { await supabase.auth.signOut(); router.push('/login'); router.refresh() }
  const staff = role && role !== 'branch'
  const rows = leads.filter((l) => !filtre || l.statut === filtre)

  return (
    <main className="mx-auto max-w-6xl p-6">
      <header className="mb-6 flex flex-wrap items-center gap-3">
        <h1 className="mr-auto text-2xl font-bold">Leads ({rows.length})</h1>
        <select className="inp !w-auto" value={filtre} onChange={(e) => setFiltre(e.target.value)}>
          <option value="">Tous les statuts</option>
          {STATUTS.map((s) => <option key={s}>{s}</option>)}
        </select>
        {staff && <Link href="/leads/new" className="btn">Nouveau lead</Link>}
        <button onClick={logout} className="text-sm underline">Déconnexion</button>
      </header>
      {err && <p className="mb-4 text-sm text-red-600">{err}</p>}
      <div className="overflow-x-auto rounded border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-100">
            <tr>{['Contact', 'Ville', 'Mobile', 'Chauffage', 'Surface', 'Branche', 'Statut'].map((h) => <th key={h} className="p-3">{h}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((l) => (
              <tr key={l.id} className="border-t">
                <td className="p-3">{l.civilite} {l.prenom} {l.nom}</td>
                <td className="p-3">{l.code_postal} {l.ville}</td>
                <td className="p-3">{l.mobile}</td>
                <td className="p-3">{l.chauffage}</td>
                <td className="p-3">{l.surface_habitable} m²</td>
                <td className="p-3">
                  {staff ? (
                    <select className="inp" value={l.branch_id ?? ''}
                      onChange={(e) => maj(l.id, { branch_id: e.target.value || null, ...(e.target.value && l.statut === 'nouveau' ? { statut: 'transmis' } : {}) })}>
                      <option value="">—</option>
                      {branches.map((b) => <option key={b.id} value={b.id}>{b.nom}</option>)}
                    </select>
                  ) : branches.find((b) => b.id === l.branch_id)?.nom}
                </td>
                <td className="p-3">
                  <select className="inp" value={l.statut} onChange={(e) => maj(l.id, { statut: e.target.value })}>
                    {STATUTS.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={7} className="p-6 text-center text-slate-500">Aucun lead pour le moment.</td></tr>}
          </tbody>
        </table>
      </div>
    </main>
  )
}
