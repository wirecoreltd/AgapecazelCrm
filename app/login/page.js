'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function Login() {
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setErr('')
    const f = Object.fromEntries(new FormData(e.target))
    const { error } = await supabase.auth.signInWithPassword(f)
    if (error) { setBusy(false); return setErr('Email ou mot de passe incorrect.') }
    // Redirection en rechargement complet : garantit que le cookie de session
    // est bien pris en compte avant que le middleware ne vérifie la page /leads.
    window.location.href = '/leads'
  }
  return (
    <main className="mx-auto mt-24 max-w-sm p-6">
      <h1 className="mb-6 text-2xl font-bold">Connexion</h1>
      <form onSubmit={submit} className="space-y-4">
        <input name="email" type="email" required placeholder="Email" className="inp" />
        <input name="password" type="password" required placeholder="Mot de passe" className="inp" />
        {err && <p className="text-sm text-red-600">{err}</p>}
        <button disabled={busy} className="btn w-full">{busy ? 'Connexion…' : 'Se connecter'}</button>
      </form>
    </main>
  )
}
