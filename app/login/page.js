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
    <div className="flex min-h-screen items-center justify-center px-4" style={{ background: 'var(--ink)' }}>
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3">
          <span
            className="flex h-12 w-12 items-center justify-center rounded-xl text-base font-bold text-white"
            style={{ background: 'var(--accent)' }}
          >
            AC
          </span>
          <div className="text-center">
            <h1 className="text-lg font-semibold text-white">Agapecazel CRM</h1>
            <p className="mt-0.5 text-sm text-white/60">Suivi des leads pompes à chaleur</p>
          </div>
        </div>

        <div className="card p-6 sm:p-7">
          <h2 className="mb-5 text-base font-semibold" style={{ color: 'var(--ink)' }}>Connexion</h2>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="field-label" htmlFor="email">Email</label>
              <input id="email" name="email" type="email" required placeholder="vous@exemple.com" className="inp" autoComplete="username" />
            </div>
            <div>
              <label className="field-label" htmlFor="password">Mot de passe</label>
              <input id="password" name="password" type="password" required placeholder="••••••••" className="inp" autoComplete="current-password" />
            </div>
            {err && (
              <p className="rounded-lg px-3 py-2 text-sm" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>
                {err}
              </p>
            )}
            <button disabled={busy} className="btn-accent w-full">{busy ? 'Connexion…' : 'Se connecter'}</button>
          </form>
        </div>
      </div>
    </div>
  )
}
