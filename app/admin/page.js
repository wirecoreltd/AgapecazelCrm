'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function Admin() {
  const [allowed, setAllowed] = useState(null)
  const [users, setUsers] = useState([])
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  const load = async () => {
    const { data } = await supabase.from('profiles').select('*').order('nom_complet')
    setUsers(data ?? [])
  }

  useEffect(() => { (async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const { data: p } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    setAllowed(p?.role === 'admin')
    if (p?.role === 'admin') load()
  })() }, [])

  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setMsg('')
    const f = Object.fromEntries(new FormData(e.target))
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/admin/create-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...f, accessToken: session.access_token }),
    })
    const json = await res.json()
    setBusy(false)
    if (!res.ok) return setMsg(`Erreur : ${json.error}`)
    setMsg('Utilisateur créé.')
    e.target.reset(); load()
  }

  if (allowed === null) return <main className="p-6">Chargement…</main>
  if (!allowed) return <main className="p-6">Accès réservé à l'admin.</main>

  return (
    <main className="mx-auto max-w-2xl p-6">
      <Link href="/leads" className="text-sm underline">Retour aux leads</Link>
      <h1 className="my-4 text-2xl font-bold">Espace admin</h1>

      <h2 className="mb-2 text-lg font-bold">Créer un utilisateur</h2>
      <form onSubmit={submit} className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium">Nom complet
          <input name="nom_complet" required className="inp mt-1 font-normal" />
        </label>
        <label className="block text-sm font-medium">Rôle
          <select name="role" required className="inp mt-1 font-normal">
            <option value="agent">Agent</option>
            <option value="admin">Admin</option>
          </select>
        </label>
        <label className="block text-sm font-medium">Email
          <input name="email" type="email" required className="inp mt-1 font-normal" />
        </label>
        <label className="block text-sm font-medium">Mot de passe
          <input name="password" type="password" required minLength={6} className="inp mt-1 font-normal" />
        </label>
        <button disabled={busy} className="btn sm:col-span-2">Créer l'utilisateur</button>
        {msg && <p className="text-sm sm:col-span-2">{msg}</p>}
      </form>

      <h2 className="mb-2 text-lg font-bold">Utilisateurs</h2>
      <ul className="divide-y rounded border bg-white">
        {users.map((u) => (
          <li key={u.id} className="flex justify-between p-3 text-sm">
            <span>{u.nom_complet} — {u.email}</span>
            <span className="text-slate-500">{u.role}</span>
          </li>
        ))}
        {!users.length && <li className="p-3 text-sm text-slate-500">Aucun utilisateur.</li>}
      </ul>
    </main>
  )
}
