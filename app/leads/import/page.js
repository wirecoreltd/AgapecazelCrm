'use client'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import AppShell from '@/components/AppShell'
import ImportPanel from '@/components/ImportPanel'
import { missingFields } from '@/lib/importFields'

const PAGE = 50
const TXT = '#000'
const fmtDate = (v) => (v ? new Date(v).toLocaleDateString('fr-FR') : '—')
const HEADS = ["Date d'import", 'Contact', 'Téléphone', 'Ville', 'Fichier', 'Champs manquants', 'Actions']

export default function ListeImport() {
  const router = useRouter()
  const [role, setRole] = useState(null)
  const [rows, setRows] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [recherche, setRecherche] = useState('')
  const [fichier, setFichier] = useState('')
  const [fichiers, setFichiers] = useState([])
  const [err, setErr] = useState('')
  const [showImport, setShowImport] = useState(false)
  const isAdmin = role === 'admin'

  useEffect(() => {
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: p } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      setRole(p?.role ?? null)
    })()
  }, [])

  const chargerFichiers = async () => {
    const { data } = await supabase.rpc('leads_import_fichiers')
    setFichiers(data ?? [])
  }

  const charger = useCallback(async () => {
    let q = supabase.from('leads_import').select('*', { count: 'exact' })
      .order('created_at', { ascending: false }).order('id')
      .range(page * PAGE, page * PAGE + PAGE - 1)
    if (fichier) q = q.eq('fichier', fichier)
    const s = recherche.trim().replace(/[,()%*]/g, ' ').trim()
    if (s) q = q.or(['nom', 'prenom', 'mobile', 'telephone_1', 'ville'].map((c) => `${c}.ilike.%${s}%`).join(','))
    const { data, count, error } = await q
    if (error) return setErr(error.message)
    setErr('')
    setRows(data ?? [])
    setTotal(count ?? 0)
  }, [page, fichier, recherche])

  useEffect(() => { const t = setTimeout(charger, 250); return () => clearTimeout(t) }, [charger])
  useEffect(() => { chargerFichiers() }, [])

  const ajouter = (r) => {
    const fiche = {
      civilite: r.civilite, prenom: r.prenom, nom: r.nom, adresse: r.adresse, code_postal: r.code_postal,
      ville: r.ville, mobile: r.mobile, telephone_1: r.telephone_1, telephone_2: r.telephone_2, email: r.email,
      proprietaire: r.proprietaire === null ? null : r.proprietaire ? 'oui' : 'non',
      nb_personnes: r.nb_personnes, revenus: r.revenus, maison_plus_15_ans: r.maison_plus_15_ans,
      type_habitat: r.type_habitat, surface_habitable: r.surface_habitable, chauffage: r.chauffage,
    }
    sessionStorage.setItem('prefill_lead', JSON.stringify({ fiche, appels: [] }))
    sessionStorage.setItem('import_lead_id', r.id)
    router.push('/leads/new')
  }

  const supprimer = async (r) => {
    if (!confirm(`Retirer ${r.prenom ?? ''} ${r.nom ?? ''} de la liste ?`)) return
    const { data, error } = await supabase.from('leads_import').delete().eq('id', r.id).select()
    if (error || !data?.length) return setErr(error?.message ?? 'Suppression refusée.')
    charger(); chargerFichiers()
  }

  const supprimerFichier = async () => {
    if (!fichier || !confirm(`Supprimer tous les contacts restants du fichier « ${fichier} » ?`)) return
    const { error } = await supabase.from('leads_import').delete().eq('fichier', fichier)
    if (error) return setErr(error.message)
    setFichier(''); setPage(0); charger(); chargerFichiers()
  }

  const pages = Math.max(1, Math.ceil(total / PAGE))

  return (
    <AppShell
      wide
      title={`Liste temporaire (${total})`}
      subtitle="Contacts à compléter avant de les ajouter au CRM"
      actions={
        <>
          <Link href="/leads" className="btn-ghost" style={{ border: '1px solid var(--border-strong)' }}>Leads</Link>
          {isAdmin && <button type="button" onClick={() => setShowImport((s) => !s)} className="btn-accent">Importer un fichier</button>}
        </>
      }
    >
      {showImport && isAdmin && (
        <ImportPanel onClose={() => setShowImport(false)} onDone={() => { setPage(0); charger(); chargerFichiers() }} />
      )}

      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <input value={recherche} onChange={(e) => { setRecherche(e.target.value); setPage(0) }} placeholder="Rechercher un nom, un numéro, une ville…" className="inp sm:flex-1" />
        <select value={fichier} onChange={(e) => { setFichier(e.target.value); setPage(0) }} className="inp sm:w-72">
          <option value="">Tous les fichiers</option>
          {fichiers.map((f) => <option key={f.fichier ?? 'sans'} value={f.fichier ?? ''}>{f.fichier} ({f.n})</option>)}
        </select>
        {isAdmin && fichier && (
          <button type="button" onClick={supprimerFichier} className="btn-ghost shrink-0" style={{ border: '1px solid var(--border-strong)', color: 'var(--danger)' }}>
            Supprimer ce fichier
          </button>
        )}
      </div>

      {err && <p className="mb-4 rounded-lg px-3 py-2 text-sm" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>{err}</p>}

      <div className="card overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
              {HEADS.map((h) => <th key={h} className="p-3 text-[13px] font-semibold" style={{ color: 'var(--ink)' }}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const manque = missingFields(r)
              return (
                <tr key={r.id} className="transition-colors hover:bg-black/[0.03]" style={{ borderTop: '1px solid var(--border)', background: i % 2 ? 'rgba(0,0,0,0.012)' : 'transparent' }}>
                  <td className="whitespace-nowrap p-3" style={{ color: TXT }}>{fmtDate(r.created_at)}</td>
                  <td className="p-3 font-medium" style={{ color: TXT }}>{[r.civilite, r.prenom, r.nom].filter(Boolean).join(' ') || '—'}</td>
                  <td className="font-mono-data whitespace-nowrap p-3 text-[13px]" style={{ color: TXT }}>{r.mobile || r.telephone_1 || '—'}</td>
                  <td className="p-3" style={{ color: TXT }}>{r.ville || '—'}</td>
                  <td className="max-w-[160px] truncate p-3" style={{ color: TXT }} title={r.fichier ?? ''}>{r.fichier || '—'}</td>
                  <td className="p-3">
                    {manque.length === 0 ? <span style={{ color: TXT }}>Complet</span> : (
                      <div className="flex flex-wrap gap-1">
                        {manque.map((m) => (
                          <span key={m} className="rounded-md px-2 py-0.5 text-[11px] font-medium" style={{ background: 'var(--accent-soft)', color: 'var(--ink)' }}>{m}</span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-3 whitespace-nowrap">
                      <button type="button" onClick={() => ajouter(r)} className="btn-accent !px-3 !py-1.5 !text-[12px]">Ajouter au CRM</button>
                      {isAdmin && (
                        <button type="button" onClick={() => supprimer(r)} title="Retirer de la liste" className="opacity-75 hover:opacity-100" style={{ color: 'var(--danger)' }}>
                          <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M4 6h12M8 6V4h4v2m-7 0 .7 10a1 1 0 0 0 1 1h5.6a1 1 0 0 0 1-1L14 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
            {!rows.length && <tr><td colSpan={HEADS.length} className="p-8 text-center text-sm" style={{ color: 'var(--muted)' }}>Aucun contact dans la liste.</td></tr>}
          </tbody>
        </table>
      </div>

      {total > PAGE && (
        <div className="mt-4 flex items-center justify-center gap-4 text-sm">
          <button type="button" disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="btn-ghost" style={{ border: '1px solid var(--border-strong)' }}>Précédent</button>
          <span style={{ color: TXT }}>Page {page + 1} / {pages}</span>
          <button type="button" disabled={page + 1 >= pages} onClick={() => setPage((p) => p + 1)} className="btn-ghost" style={{ border: '1px solid var(--border-strong)' }}>Suivant</button>
        </div>
      )}
    </AppShell>
  )
}
