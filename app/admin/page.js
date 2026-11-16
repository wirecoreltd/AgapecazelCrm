'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import AppShell from '@/components/AppShell'
import { roleLabel, MODULES, MODULE_KEYS, modulesOf } from '@/lib/roles'

// Cases à cocher « CRM autorisés » (l'admin a toujours les deux, quel que soit ce qui est coché)
function ModulesChecks({ defaults }) {
  return (
    <fieldset className="block">
      <span className="field-label">CRM autorisés</span>
      <div className="flex flex-wrap gap-4 pt-1">
        {MODULE_KEYS.map((k) => (
          <label key={k} className="flex items-center gap-2 text-sm">
            <input type="checkbox" name={`mod_${k}`} defaultChecked={defaults.includes(k)} />
            {MODULES[k].label}
          </label>
        ))}
      </div>
    </fieldset>
  )
}
const lireModules = (f) => MODULE_KEYS.filter((k) => f[`mod_${k}`])

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
      <div className="card max-h-[90vh] w-full max-w-sm overflow-y-auto p-5" onClick={(e) => e.stopPropagation()}>
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

function EditUserModal({ user, onClose, onSaved }) {
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  const enregistrer = async (e) => {
    e.preventDefault(); setBusy(true); setMsg('')
    const f = Object.fromEntries(new FormData(e.target))
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/admin/update-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...f, modules: lireModules(f), userId: user.id, accessToken: session.access_token }),
    })
    const json = await res.json()
    setBusy(false)
    if (!res.ok) return setMsg(`Erreur : ${json.error}`)
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <form className="card max-h-[90vh] w-full max-w-sm overflow-y-auto p-5" onClick={(e) => e.stopPropagation()} onSubmit={enregistrer}>
        <h2 className="section-heading mb-4">Modifier l'utilisateur</h2>
        <div className="space-y-3">
          <label className="block">
            <span className="field-label">Nom complet</span>
            <input name="nom_complet" required defaultValue={user.nom_complet ?? ''} className="inp" />
          </label>
          <label className="block">
            <span className="field-label">Email</span>
            <input name="email" type="email" required defaultValue={user.email ?? ''} className="inp" />
          </label>
          <label className="block">
            <span className="field-label">Rôle</span>
            <select name="role" required defaultValue={user.role} className="inp">
              <option value="agent">Agent</option>
              <option value="call_center">Call Center</option>
              <option value="admin">Admin</option>
            </select>
          </label>
          <ModulesChecks defaults={modulesOf(user.role, user.modules)} />
          <p className="text-[12px]" style={{ color: 'var(--muted)' }}>L'admin a toujours accès aux deux CRM.</p>
        </div>
        {msg && (
          <p className="mt-3 rounded-lg px-3 py-2 text-sm" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>{msg}</p>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-ghost">Annuler</button>
          <button disabled={busy} className="btn-accent">{busy ? 'Enregistrement…' : 'Enregistrer'}</button>
        </div>
      </form>
    </div>
  )
}

const initiales = (nom) => (nom ?? '?').split(/\s+/).filter(Boolean).slice(0, 2).map((m) => m[0]).join('').toUpperCase() || '?'

function Pastille({ children, fond, couleur = '#fff' }) {
  return <span className="inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-medium" style={{ background: fond, color: couleur }}>{children}</span>
}

function BoutonAction({ icone, label, onClick, danger }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[13px] font-medium transition-colors hover:bg-black/5"
      style={{ borderColor: danger ? 'var(--danger)' : 'var(--border-strong)', color: danger ? 'var(--danger)' : 'var(--ink)' }}
    >
      <span aria-hidden>{icone}</span>{label}
    </button>
  )
}

function LigneUtilisateur({ u, moi, onEdit, onReset, onBlock, onDelete }) {
  const modulesTxt = modulesOf(u.role, u.modules).map((k) => MODULES[k].label)
  return (
    <li className="card overflow-hidden p-4" style={{ borderLeft: `4px solid ${u.bloque ? 'var(--danger)' : 'var(--border)'}`, opacity: u.bloque ? 0.8 : 1 }}>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <div className="flex min-w-0 flex-1 basis-64 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold" style={{ background: 'var(--accent-soft)', color: 'var(--ink)' }}>{initiales(u.nom_complet)}</span>
          <div className="min-w-0">
            <p className="truncate font-semibold">{u.nom_complet}{u.id === moi && <span className="ml-2 text-[12px] font-normal" style={{ color: 'var(--muted)' }}>(vous)</span>}</p>
            <p className="truncate text-[13px]" style={{ color: 'var(--muted)' }}>{u.email}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Pastille fond={u.role === 'admin' ? 'var(--ink)' : 'var(--status-nouveau)'}>{roleLabel(u.role)}</Pastille>
          {modulesTxt.map((m) => <Pastille key={m} fond="var(--accent-soft)" couleur="var(--ink)">{m}</Pastille>)}
          <Pastille fond={u.bloque ? 'var(--danger)' : 'var(--success)'}>{u.bloque ? 'Bloqué' : 'Actif'}</Pastille>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 border-t pt-3" style={{ borderColor: 'var(--border)' }}>
        <BoutonAction icone="✏️" label="Modifier" onClick={() => onEdit(u)} />
        <BoutonAction icone="🔑" label="Mot de passe" onClick={() => onReset(u)} />
        {u.id !== moi && <BoutonAction icone={u.bloque ? '✅' : '🚫'} label={u.bloque ? 'Débloquer' : 'Bloquer'} onClick={() => onBlock(u)} danger={!u.bloque} />}
        {u.id !== moi && <BoutonAction icone="🗑️" label="Supprimer" onClick={() => onDelete(u)} danger />}
      </div>
    </li>
  )
}

export default function Admin() {
  const [allowed, setAllowed] = useState(null)
  const [users, setUsers] = useState([])
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const [resetTarget, setResetTarget] = useState(null)
  const [editTarget, setEditTarget] = useState(null)
  const [moi, setMoi] = useState(null)
  const [listMsg, setListMsg] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [recherche, setRecherche] = useState('')

  const load = async () => {
    const { data } = await supabase.from('profiles').select('*').order('nom_complet')
    setUsers(data ?? [])
  }

  useEffect(() => { (async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const { data: p } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    setMoi(user.id)
    setAllowed(p?.role === 'admin')
    if (p?.role === 'admin') load()
  })() }, [])

  const appeler = async (route, body) => {
    setListMsg('')
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch(`/api/admin/${route}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...body, accessToken: session.access_token }),
    })
    const json = await res.json()
    if (!res.ok) { setListMsg(`Erreur : ${json.error}`); return false }
    await load()
    return true
  }
  const basculerBlocage = async (u) => {
    const bloquer = !u.bloque
    if (bloquer && !confirm(`Bloquer ${u.nom_complet} ? Il ne pourra plus se connecter.`)) return
    if (await appeler('block-user', { userId: u.id, blocked: bloquer })) setListMsg(bloquer ? `${u.nom_complet} est bloqué.` : `${u.nom_complet} est débloqué.`)
  }
  const supprimerUtilisateur = async (u) => {
    if (!confirm(`Supprimer définitivement ${u.nom_complet} (${u.email}) ? Cette action est irréversible.`)) return
    if (await appeler('delete-user', { userId: u.id })) setListMsg(`${u.nom_complet} a été supprimé.`)
  }

  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setMsg('')
    const f = Object.fromEntries(new FormData(e.target))
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/admin/create-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...f, modules: lireModules(f), accessToken: session.access_token }),
    })
    const json = await res.json()
    setBusy(false)
    if (!res.ok) return setMsg(`Erreur : ${json.error}`)
    setMsg('Utilisateur créé.')
    e.target.reset(); load()
    setShowCreate(false); setListMsg('Utilisateur créé.')
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

  const q = recherche.trim().toLowerCase()
  const visibles = users.filter((u) => !q || `${u.nom_complet ?? ''} ${u.email ?? ''} ${roleLabel(u.role)}`.toLowerCase().includes(q))

  return (
    <AppShell
      backHref="/leads"
      title="Espace admin"
      subtitle="Gestion des utilisateurs"
      actions={<button type="button" onClick={() => setShowCreate((o) => !o)} className="btn-accent">{showCreate ? 'Fermer' : '+ Nouvel utilisateur'}</button>}
    >
      {showCreate && (
        <div className="card mb-6 p-4 sm:p-6">
          <h2 className="section-heading mb-4">Nouvel utilisateur</h2>
          <form onSubmit={submit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="field-label">Nom complet</span>
              <input name="nom_complet" required className="inp" />
            </label>
            <label className="block">
              <span className="field-label">Rôle</span>
              <select name="role" required className="inp">
                <option value="agent">Agent</option>
                <option value="call_center">Call Center</option>
                <option value="admin">Admin</option>
              </select>
            </label>
            <label className="block">
              <span className="field-label">Email</span>
              <input name="email" type="email" required className="inp" />
            </label>
            <label className="block">
              <span className="field-label">Mot de passe temporaire</span>
              <input name="password" type="password" required minLength={6} className="inp" />
            </label>
            <div className="sm:col-span-2"><ModulesChecks defaults={['pac']} /></div>
            <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
              <button disabled={busy} className="btn-accent">Créer l'utilisateur</button>
              {msg && <p className="text-sm" style={{ color: msg.startsWith('Erreur') ? 'var(--danger)' : 'var(--ink)' }}>{msg}</p>}
            </div>
          </form>
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h2 className="section-heading mr-auto">Utilisateurs ({visibles.length})</h2>
        <input value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder="Rechercher un nom, un email, un rôle…" className="inp w-full sm:max-w-xs" />
      </div>

      {listMsg && <p className="mb-4 rounded-lg px-3 py-2 text-sm" style={{ background: listMsg.startsWith('Erreur') ? 'var(--danger-soft)' : 'var(--accent-soft)', color: listMsg.startsWith('Erreur') ? 'var(--danger)' : 'var(--ink)' }}>{listMsg}</p>}

      <ul className="flex flex-col gap-3">
        {visibles.map((u) => (
          <LigneUtilisateur key={u.id} u={u} moi={moi} onEdit={setEditTarget} onReset={setResetTarget} onBlock={basculerBlocage} onDelete={supprimerUtilisateur} />
        ))}
        {!visibles.length && <li className="card p-8 text-center text-sm" style={{ color: 'var(--muted)' }}>Aucun utilisateur.</li>}
      </ul>

      {editTarget && <EditUserModal user={editTarget} onClose={() => setEditTarget(null)} onSaved={() => { setEditTarget(null); load() }} />}
      {resetTarget && <ResetPasswordModal user={resetTarget} onClose={() => setResetTarget(null)} />}
    </AppShell>
  )
}
