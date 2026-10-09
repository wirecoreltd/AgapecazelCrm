'use client'
import { useState } from 'react'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'

export default function ChangePassword() {
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault(); setErr('')
    const { password, confirm } = Object.fromEntries(new FormData(e.target))
    if (password.length < 8) return setErr('Le mot de passe doit contenir au moins 8 caractères.')
    if (password !== confirm) return setErr('Les deux mots de passe ne correspondent pas.')
    setBusy(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { window.location.href = '/login'; return }
    const res = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newPassword: password, accessToken: session.access_token }),
    })
    const json = await res.json()
    if (!res.ok) { setBusy(false); return setErr(json.error || 'Erreur lors du changement.') }
    // Reconnexion avec le nouveau mot de passe pour obtenir une session à jour
    const { error } = await supabase.auth.signInWithPassword({ email: json.email, password })
    window.location.href = error ? '/login' : '/leads'
  }

  const logout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4" style={{ background: 'var(--ink)' }}>
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3">
          <Image src="/logo.png" alt="Agapecazel" width={80} height={80} priority className="h-20 w-20 rounded-full object-cover" />
          <div className="text-center">
            <h1 className="text-lg font-semibold text-white">Agapecazel CRM</h1>
            <p className="mt-0.5 text-sm text-white/60">Première connexion</p>
          </div>
        </div>

        <div className="card p-6 sm:p-7">
          <h2 className="mb-1 text-base font-semibold" style={{ color: 'var(--ink)' }}>Choisissez votre mot de passe</h2>
          <p className="mb-5 text-[13px]" style={{ color: 'var(--muted)' }}>
            Pour des raisons de sécurité, vous devez remplacer le mot de passe temporaire avant de continuer.
          </p>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="field-label" htmlFor="password">Nouveau mot de passe</label>
              <input id="password" name="password" type="password" required minLength={8} placeholder="Au moins 8 caractères" className="inp" autoComplete="new-password" />
            </div>
            <div>
              <label className="field-label" htmlFor="confirm">Confirmer le mot de passe</label>
              <input id="confirm" name="confirm" type="password" required minLength={8} placeholder="••••••••" className="inp" autoComplete="new-password" />
            </div>
            {err && (
              <p className="rounded-lg px-3 py-2 text-sm" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>{err}</p>
            )}
            <button disabled={busy} className="btn-accent w-full">{busy ? 'Enregistrement…' : 'Enregistrer et continuer'}</button>
            <button type="button" onClick={logout} className="w-full text-center text-[13px] underline" style={{ color: 'var(--muted)' }}>Se déconnecter</button>
          </form>
        </div>
      </div>
    </div>
  )
}
