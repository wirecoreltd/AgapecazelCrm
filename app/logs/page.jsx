'use client'
import { Fragment, useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import AppShell from '@/components/AppShell'

const TABLE_LABELS = { leads: 'Lead', lead_documents: 'Document', lead_appels: 'Appel' }
const ACTION_LABELS = { INSERT: 'Ajout', UPDATE: 'Modification', DELETE: 'Suppression' }
const ACTION_COLORS = { INSERT: 'var(--success)', UPDATE: 'var(--accent)', DELETE: 'var(--danger)' }
const FIELD_LABELS = {
  statut: 'Statut', nom: 'Nom', prenom: 'Prénom', civilite: 'Civilité', mobile: 'Mobile',
  telephone_1: 'Téléphone', ville: 'Ville', installateur: 'Installateur',
  date_installation: "Date d'installation", agent_id: 'Agent', resultat: 'Résultat',
  nom_fichier: 'Fichier',
}

const fmtDateTime = (v) =>
  new Date(v).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'medium' })
const fmtVal = (v) => (v === null || v === undefined || v === '' ? '—' : typeof v === 'object' ? JSON.stringify(v) : String(v))

// Nom lisible de l'élément concerné
function cible(log) {
  const d = log.new_data ?? log.old_data ?? {}
  if (log.table_name === 'leads') return `${d.prenom ?? ''} ${d.nom ?? ''}`.trim() || 'lead'
  if (log.table_name === 'lead_documents') return d.nom_fichier ?? 'document'
  if (log.table_name === 'lead_appels') return d.resultat ?? 'appel'
  return log.record_id ?? ''
}

function Resume({ log }) {
  if (log.action === 'UPDATE') {
    const entries = Object.entries(log.changes ?? {})
    return (
      <ul className="space-y-0.5">
        {entries.slice(0, 3).map(([k, v]) => (
          <li key={k} className="text-[12px]" style={{ color: 'var(--muted)' }}>
            <span className="font-medium" style={{ color: 'var(--ink)' }}>{FIELD_LABELS[k] ?? k}</span>
            {' : '}{fmtVal(v.old)} → {fmtVal(v.new)}
          </li>
        ))}
        {entries.length > 3 && (
          <li className="text-[12px]" style={{ color: 'var(--muted)' }}>+ {entries.length - 3} autre(s) champ(s)</li>
        )}
      </ul>
    )
  }
  return <span className="text-[12px]" style={{ color: 'var(--muted)' }}>{ACTION_LABELS[log.action]} de « {cible(log)} »</span>
}

function ActionPill({ action }) {
  return (
    <span
      className="inline-block rounded-full border px-2.5 py-0.5 text-[11px] font-medium"
      style={{ color: ACTION_COLORS[action], borderColor: ACTION_COLORS[action] }}
    >
      {ACTION_LABELS[action]}
    </span>
  )
}

export default function Logs() {
  const [allowed, setAllowed] = useState(null)
  const [logs, setLogs] = useState([])
  const [err, setErr] = useState('')
  const [fTable, setFTable] = useState('')
  const [fAction, setFAction] = useState('')
  const [recherche, setRecherche] = useState('')
  const [ouvert, setOuvert] = useState(null)

  useEffect(() => {
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: p } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      if (p?.role !== 'admin') return setAllowed(false)
      setAllowed(true)
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500)
      if (error) setErr(error.message)
      setLogs(data ?? [])
    })()
  }, [])

  const rows = logs
    .filter((l) => !fTable || l.table_name === fTable)
    .filter((l) => !fAction || l.action === fAction)
    .filter((l) => {
      if (!recherche.trim()) return true
      const q = recherche.trim().toLowerCase()
      return `${l.user_nom ?? ''} ${cible(l)}`.toLowerCase().includes(q)
    })

  if (allowed === false) {
    return (
      <AppShell title="Logs">
        <div className="card p-8 text-center text-sm" style={{ color: 'var(--muted)' }}>Accès réservé aux administrateurs.</div>
      </AppShell>
    )
  }

  return (
    <AppShell title={`Logs (${rows.length})`} subtitle="Historique des ajouts, modifications et suppressions">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          placeholder="Rechercher un utilisateur ou un lead…"
          className="inp flex-1"
        />
        <select className="inp sm:w-44" value={fTable} onChange={(e) => setFTable(e.target.value)}>
          <option value="">Tous les types</option>
          {Object.entries(TABLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select className="inp sm:w-44" value={fAction} onChange={(e) => setFAction(e.target.value)}>
          <option value="">Toutes les actions</option>
          {Object.entries(ACTION_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {err && (
        <p className="mb-4 rounded-lg px-3 py-2 text-sm" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>{err}</p>
      )}

      <div className="card overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
              {['Date', 'Utilisateur', 'Action', 'Type', 'Élément', 'Détails'].map((h) => (
                <th key={h} className="p-3 text-[13px] font-medium" style={{ color: 'var(--muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((l) => (
              <Fragment key={l.id}>
                <tr
                  onClick={() => setOuvert(ouvert === l.id ? null : l.id)}
                  className="cursor-pointer align-top transition-colors hover:bg-black/[0.03]"
                  style={{ borderTop: '1px solid var(--border)' }}
                >
                  <td className="whitespace-nowrap p-3 text-[13px]" style={{ color: 'var(--muted)' }}>{fmtDateTime(l.created_at)}</td>
                  <td className="p-3 font-medium">{l.user_nom ?? 'Système'}</td>
                  <td className="p-3"><ActionPill action={l.action} /></td>
                  <td className="p-3" style={{ color: 'var(--muted)' }}>{TABLE_LABELS[l.table_name] ?? l.table_name}</td>
                  <td className="p-3">
                    {l.lead_id && !(l.table_name === 'leads' && l.action === 'DELETE') ? (
                      <Link href={`/leads/${l.lead_id}`} onClick={(e) => e.stopPropagation()} className="underline-offset-2 hover:underline" style={{ color: 'var(--accent)' }}>
                        {cible(l)}
                      </Link>
                    ) : (
                      cible(l)
                    )}
                  </td>
                  <td className="p-3"><Resume log={l} /></td>
                </tr>
                {ouvert === l.id && (
                  <tr style={{ background: 'var(--surface)' }}>
                    <td colSpan={6} className="p-3">
                      <pre className="overflow-x-auto whitespace-pre-wrap text-[12px]" style={{ color: 'var(--ink)' }}>
                        {JSON.stringify(l.action === 'UPDATE' ? l.changes : (l.new_data ?? l.old_data), null, 2)}
                      </pre>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
            {!rows.length && (
              <tr><td colSpan={6} className="p-8 text-center text-sm" style={{ color: 'var(--muted)' }}>Aucun log pour le moment.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </AppShell>
  )
}
