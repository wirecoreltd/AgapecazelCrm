'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function Login() {
  const router = useRouter()
  const [err, setErr] = useState('')
  const submit = async (e) => {
    e.preventDefault()
    const f = Object.fromEntries(new FormData(e.target))
    const { error } = await supabase.auth.signInWithPassword(f)
    if (error) return setErr('Email ou mot de passe incorrect.')
    router.push('/leads'); router.refresh()
  }
  return (
    <main className="mx-auto mt-24 max-w-sm p-6">
      <h1 className="mb-6 text-2xl font-bold">Connexion</h1>
      <form onSubmit={submit} className="space-y-4">
        <input name="email" type="email" required placeholder="Email" className="inp" />
        <input name="password" type="password" required placeholder="Mot de passe" className="inp" />
        {err && <p className="text-sm text-red-600">{err}</p>}
        <button className="btn w-full">Se connecter</button>
      </form>
    </main>
  )
}
