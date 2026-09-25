'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import AppShell from '@/components/AppShell'
import StatusBadge from '@/components/StatusBadge'

const STATUTS = ['nouveau', 'rdv_pris', 'devis', 'signe', 'installe', 'perdu']
const STATUT_LABELS = { nouveau: 'Nouveau', rdv_pris: 'RDV pris', devis: 'Devis', signe: 'Signé', installe: 'Installé', perdu: 'Perdu' }
const STATUT_VARS = { nouveau: '--status-nouveau', rdv_pris: '--status-rdv_pris', devis: '--status-devis', signe: '--status-signe', installe: '--status-installe', perdu: '--status-perdu' }
const isAllowed = (file) => file.type === 'application/pdf' || file.type.startsWith('image/')
const fmtDate = (v) => (v ? new Date(v).toLocaleDateString('fr-FR') : '—')

function Badge({ count }) {
  if (!count) return null
  return (
    <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold leading-none text-white" style={{ background: 'var(--danger)' }}>
      {count}
    </span>
  )
}

function StatutSelect({ value, onChange }) {
  return (
    <select
      className="w-full rounded-lg border-0 px-2.5 py-1.5 text-[12px] font-medium text-white"
      style={{ background: `var(${STATUT_VARS[value] ?? '--status-nouveau'})`, colorScheme: 'light' }}
      value={value}
      onChange={onChange}
    >
      {STATUTS.map((s) => (
        <option key={s} value={s} style={{ color: '#1e293b', background: '#ffffff' }}>{STATUT_LABELS[s]}</option>
      ))}
    </select>
  )
}

function MetaItem({ label, value }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-medium uppercase tracking-wide" style={{ color: 'var(--muted)' }}>{label}</dt>
      <dd className="mt-0.5 truncate text-[13px] font-medium" style={{ color: 'var(--ink)' }} title={value}>{value}</dd>
    </div>
  )
}

function RowActions({ l, role, uploadingId, docCounts, onUpload, onDelete }) {
  return (
    <div className="flex items-center gap-3">
      <Link href={`/leads/${l.id}`} title="Voir" className="opacity-75 transition-opacity hover:opacity-100" style={{ color: 'var(--ink)' }}>
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M1 10s3-6 9-6 9 6 9 6-3 6-9 6-9-6-9-6Z" stroke="currentColor" strokeWidth="1.4" /><circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.4" /></svg>
      </Link>
      <Link href={`/leads/${l.id}/edit`} title="Modifier" className="opacity-80 transition-opacity hover:opacity-100" style={{ color: 'var(--accent)' }}>
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M13.5 3.5l3 3L6 17H3v-3L13.5 3.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" /></svg>
      </Link>
      <label className="relative cursor-pointer opacity-80 transition-opacity hover:opacity-100" style={{ color: 'var(--success)' }} title="Ajouter un document (PDF ou photo)">
        {uploadingId === l.id ? (
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" className="animate-spin"><path d="M10 3a7 7 0 1 1-7 7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M13 6l-6 6a2.5 2.5 0 0 0 3.5 3.5L17 9a4 4 0 1 0-5.5-5.5L5 10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
        )}
        <Badge count={docCounts[l.id]} />
        <input type="file" accept="application/pdf,image/*" className="hidden" disabled={uploadingId === l.id} onChange={(e) => onUpload(l.id, e)} />
      </label>
      {role === 'admin' && (
        <button onClick={() => onDelete(l)} title="Supprimer" className="opacity-75 transition-opacity hover:opacity-100" style={{ color: 'var(--danger)' }}>
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M4 6h12M8 6V4h4v2m-7 0 .7 10a1 1 0 0 0 1 1h5.6a1 1 0 0 0 1-1L14 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
      )}
    </div>
  )
}

export default function Leads() {
  const [role, setRole] = useState(null)
  const [leads, setLeads] = useState([])
  const [agentsMap, setAgentsMap] = useState({})
  const [derniersAppels, setDerniersAppels] = useState({})
  const [docCounts, setDocCounts] = useState({})
  const [filtre, setFiltre] = useState('')
  const [recherche, setRecherche] = useState('')
  const [err, setErr] = useState('')
  const [uploadingId, setUploadingId] = useState(null)

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const { data: p } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    setRole(p?.role)
    const { data, error } = await supabase.from('leads').select('*').order('created_at', { ascending: false })
    if (error) setErr(error.message)
    setLeads(data ?? [])

    if (p?.role === 'admin') {
      const { data: agents } = await supabase.from('profiles').select('id, nom_complet').eq('role', 'agent')
      setAgentsMap(Object.fromEntries((agents ?? []).map((a) => [a.id, a.nom_complet])))
    }

    const { data: appels } = await supabase.from('lead_appels').select('lead_id, resultat, created_at').order('created_at', { ascending: false })
    const derniers = {}
    for (const a of appels ?? []) if (!derniers[a.lead_id]) derniers[a.lead_id] = a.resultat
    setDerniersAppels(derniers)

    const { data: docs } = await supabase.from('lead_documents').select('lead_id')
    const comptes = {}
    for (const d of docs ?? []) comptes[d.lead_id] = (comptes[d.lead_id] ?? 0) + 1
    setDocCounts(comptes)
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
    e.target.value = ''
    if (!file) return
    if (!isAllowed(file)) { setErr('Seuls les PDF et les photos sont acceptés.'); return }
    setUploadingId(leadId); setErr('')
    const path = `${leadId}/${Date.now()}_${file.name}`
    const { error: upErr } = await supabase.storage.from('documents').upload(path, file)
    if (upErr) { setUploadingId(null); return setErr(upErr.message) }
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('lead_documents').insert({
      lead_id: leadId, nom_fichier: file.name, storage_path: path, uploaded_by: user.id,
    })
    setUploadingId(null)
    if (error) return setErr(error.message)
    setDocCounts((d) => ({ ...d, [leadId]: (d[leadId] ?? 0) + 1 }))
  }

  const rows = leads
    .filter((l) => !filtre || l.statut === filtre)
    .filter((l) => {
      if (!recherche.trim()) return true
      const q = recherche.trim().toLowerCase()
      return `${l.prenom ?? ''} ${l.nom ?? ''} ${l.mobile ?? ''} ${l.ville ?? ''}`.toLowerCase().includes(q)
    })

  return (
    <AppShell
      title={`Leads (${rows.length})`}
      subtitle={role === 'admin' ? 'Vue admin' : undefined}
      actions={<Link href="/leads/new" className="btn-accent">Nouveau lead</Link>}
    >
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted)' }}>
            <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.4" /><path d="m14 14-3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
          <input
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Rechercher un nom, un mobile, une ville…"
            className="inp pl-9"
          />
        </div>
        <select className="inp sm:w-56" value={filtre} onChange={(e) => setFiltre(e.target.value)}>
          <option value="">Tous les statuts</option>
          {STATUTS.map((s) => <option key={s} value={s}>{STATUT_LABELS[s]}</option>)}
        </select>
      </div>

      {err && (
        <p className="mb-4 rounded-lg px-3 py-2 text-sm" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>{err}</p>
      )}

      {/* Mobile : cartes empilées */}
      <div className="flex flex-col gap-3 sm:hidden">
        {rows.map((l) => (
          <div
            key={l.id}
            className="card overflow-hidden rounded-xl p-4"
            style={{ borderLeft: `4px solid var(${STATUT_VARS[l.statut] ?? '--status-nouveau'})` }}
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-semibold" style={{ color: 'var(--ink)' }}>{l.civilite} {l.prenom} {l.nom}</p>
                <p className="font-mono-data mt-0.5 text-[13px]" style={{ color: 'var(--muted)' }}>{l.mobile || '—'}</p>
              </div>
              <div className="w-32 shrink-0">
                {role === 'admin' ? (
                  <StatutSelect value={l.statut} onChange={(e) => maj(l.id, { statut: e.target.value })} />
                ) : (
                  <StatusBadge statut={l.statut} />
                )}
              </div>
            </div>
            <dl className="mb-3 grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg p-2.5" style={{ background: 'var(--surface)' }}>
              <MetaItem label="Dernier appel" value={derniersAppels[l.id] ?? '—'} />
              {role === 'admin' && <MetaItem label="Agent" value={agentsMap[l.agent_id] ?? '—'} />}
              <MetaItem label="Installateur" value={l.installateur || '—'} />
              <MetaItem label="Installation" value={fmtDate(l.date_installation)} />
            </dl>
            <div className="flex items-center justify-between border-t pt-3" style={{ borderColor: 'var(--border)' }}>
              <RowActions l={l} role={role} uploadingId={uploadingId} docCounts={docCounts} onUpload={uploadRapide} onDelete={suppr} />
            </div>
          </div>
        ))}
        {!rows.length && (
          <div className="card p-8 text-center text-sm" style={{ color: 'var(--muted)' }}>Aucun lead pour le moment.</div>
        )}
      </div>

      {/* Desktop : tableau */}
      <div className="hidden overflow-x-auto sm:block card">
        <table className="w-full text-left text-sm">
          <thead>
            <tr style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
              {['Contact', 'Mobile', 'Dernier appel', 'Statut', 'Actions', ...(role === 'admin' ? ['Agent'] : []), 'Installateur', "Date d'installation"].map((h) => (
                <th key={h} className="p-3 text-[13px] font-medium" style={{ color: 'var(--muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((l, i) => (
              <tr
                key={l.id}
                className="transition-colors hover:bg-black/[0.03]"
                style={{ borderTop: '1px solid var(--border)', background: i % 2 ? 'rgba(0,0,0,0.012)' : 'transparent' }}
              >
                <td className="p-3 font-medium" style={{ borderLeft: `3px solid var(${STATUT_VARS[l.statut] ?? '--status-nouveau'})` }}>
                  {l.civilite} {l.prenom} {l.nom}
                </td>
                <td className="font-mono-data p-3 text-[13px]">{l.mobile}</td>
                <td className="p-3" style={{ color: 'var(--muted)' }}>{derniersAppels[l.id] ?? '—'}</td>
                <td className="p-3">
                  <div className="w-36">
                    {role === 'admin' ? (
                      <StatutSelect value={l.statut} onChange={(e) => maj(l.id, { statut: e.target.value })} />
                    ) : (
                      <StatusBadge statut={l.statut} />
                    )}
                  </div>
                </td>
                <td className="p-3">
                  <RowActions l={l} role={role} uploadingId={uploadingId} docCounts={docCounts} onUpload={uploadRapide} onDelete={suppr} />
                </td>
                {role === 'admin' && <td className="p-3" style={{ color: 'var(--muted)' }}>{agentsMap[l.agent_id] ?? '—'}</td>}
                <td className="p-3" style={{ color: 'var(--muted)' }}>{l.installateur || '—'}</td>
                <td className="p-3" style={{ color: 'var(--muted)' }}>{fmtDate(l.date_installation)}</td>
              </tr>
            ))}
            {!rows.length && (
              <tr><td colSpan={role === 'admin' ? 8 : 7} className="p-8 text-center text-sm" style={{ color: 'var(--muted)' }}>Aucun lead pour le moment.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </AppShell>
  )
}
