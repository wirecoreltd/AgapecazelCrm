'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import AppShell from '@/components/AppShell'

const CARACTERES_MDP = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
const genererMotDePasse = () => {
  let mdp = ''
  for (let i = 0; i < 12; i++) mdp += CARACTERES_MDP[Math.floor(Math.random() * CARACTERES_MDP.length)]
  return mdp
}

function ResetPasswordModal({ user, onClose }) {
  const [mdp, setMdp] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [copie, setCopie] = useState(false)

  const copier = async () => {
    try { await navigator.clipboard.writeText(mdp); setCopie(true); setTimeout(() => setCopie(false), 1500) } catch {}
  }

  const confirmer = async () => {
    if (mdp.length < 6) { setMsg('Le mot de passe doit contenir au moins 6 caractères.'); return }
    setBusy(true); setMsg('')
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/admin/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, newPassword: mdp, accessToken: session.access_token }),
    })
    const json = await res.json()
    setBusy(false)
    if (!res.ok) return setMsg(`Erreur : ${json.error}`)
    setMsg('Mot de passe réinitialisé.')
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="card w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
        <h2 className="section-heading mb-1">Réinitialiser le mot de passe</h2>
        <p className="mb-4 text-[13px]" style={{ color: 'var(--muted)' }}>{user.nom_complet} — {user.email}</p>

        <label className="block">
          <span className="field-label">Nouveau mot de passe</span>
          <div className="flex gap-2">
            <input
              value={mdp}
              onChange={(e) => { setMdp(e.target.value); setMsg('') }}
              placeholder="Au moins 6 caractères"
              className="inp"
            />
            <button type="button" onClick={() => setMdp(genererMotDePasse())} className="btn-ghost shrink-0" style={{ border: '1px solid var(--border-strong)' }}>
              Générer
            </button>
          </div>
        </label>

        {mdp && (
          <button type="button" onClick={copier} className="mt-2 text-[13px] font-medium underline" style={{ color: 'var(--accent)' }}>
            {copie ? 'Copié !' : 'Copier le mot de passe'}
          </button>
        )}

        {msg && (
          <p className="mt-3 rounded-lg px-3 py-2 text-sm" style={{ background: msg.startsWith('Erreur') ? 'var(--danger-soft)' : 'var(--accent-soft)', color: msg.startsWith('Erreur') ? 'var(--danger)' : 'var(--ink)' }}>
            {msg}
          </p>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-ghost">Fermer</button>
          <button type="button" disabled={busy || !mdp} onClick={confirmer} className="btn-accent">Réinitialiser</button>
        </div>
      </div>
    </div>
  )
}

export default function Admin() {
  const [allowed, setAllowed] = useState(null)
  const [users, setUsers] = useState([])
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const [resetTarget, setResetTarget] = useState(null)

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

  if (allowed === null) {
    return (
      <AppShell backHref="/leads" title="Espace admin">
        <p style={{ color: 'var(--muted)' }}>Chargement…</p>
      </AppShell>
    )
  }
  if (!allowed) {
    return (
      <AppShell backHref="/leads" title="Espace admin">
        <div className="card p-6 text-sm" style={{ color: 'var(--muted)' }}>Accès réservé à l'admin.</div>
      </AppShell>
    )
  }

  return (
    <AppShell backHref="/leads" title="Espace admin">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card p-4 sm:p-6">
          <h2 className="section-heading mb-4">Créer un utilisateur</h2>
          <form onSubmit={submit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="field-label">Nom complet</span>
              <input name="nom_complet" required className="inp" />
            </label>
            <label className="block">
              <span className="field-label">Rôle</span>
              <select name="role" required className="inp">
                <option value="agent">Agent</option>
                <option value="admin">Admin</option>
              </select>
            </label>
            <label className="block">
              <span className="field-label">Email</span>
              <input name="email" type="email" required className="inp" />
            </label>
            <label className="block">
              <span className="field-label">Mot de passe</span>
              <input name="password" type="password" required minLength={6} className="inp" />
            </label>
            <button disabled={busy} className="btn-accent sm:col-span-2">Créer l'utilisateur</button>
            {msg && <p className="text-sm sm:col-span-2" style={{ color: 'var(--ink)' }}>{msg}</p>}
          </form>
        </div>

        <div className="card p-4 sm:p-6">
          <h2 className="section-heading mb-4">Utilisateurs</h2>
          <ul className="flex flex-col gap-1.5">
            {users.map((u) => (
              <li key={u.id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-lg p-2.5 text-sm" style={{ background: 'var(--surface)' }}>
                <span className="font-medium">{u.nom_complet}</span>
                <span className="text-[12px]" style={{ color: 'var(--muted)' }}>{u.email}</span>
                <span className="flex items-center gap-2">
                  <span className="rounded-full px-2 py-0.5 text-[11px] font-medium text-white" style={{ background: u.role === 'admin' ? 'var(--ink)' : 'var(--status-nouveau)' }}>{u.role}</span>
                  <button
                    type="button"
                    onClick={() => setResetTarget(u)}
                    className="text-[12px] font-medium underline"
                    style={{ color: 'var(--accent)' }}
                  >
                    Réinitialiser le mot de passe
                  </button>
                </span>
              </li>
            ))}
            {!users.length && <li className="text-sm" style={{ color: 'var(--muted)' }}>Aucun utilisateur.</li>}
          </ul>
        </div>
      </div>

      {resetTarget && <ResetPasswordModal user={resetTarget} onClose={() => setResetTarget(null)} />}
    </AppShell>
  )
}
