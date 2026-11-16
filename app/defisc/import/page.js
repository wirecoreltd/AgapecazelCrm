'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import AppShell from '@/components/AppShell'
import { ligneVersFiche, reperer, cle9, STATUTS } from '@/lib/defisc'

const fmtDate = (d) => (d ? new Date(d + 'T00:00:00').toLocaleDateString('fr-FR') : '—')

export default function ImportDefisc() {
  const router = useRouter()
  const [allowed, setAllowed] = useState(null)
  const [fichier, setFichier] = useState('')
  const [fiches, setFiches] = useState([])
  const [manquantes, setManquantes] = useState([])
  const [inclureDoublons, setInclureDoublons] = useState(false)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => { (async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const { data: p } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    setAllowed(p?.role === 'admin')
  })() }, [])

  // Numéros déjà présents dans le CRM (par paquets de 1000)
  const numerosExistants = async () => {
    const set = new Set(); let from = 0
    for (;;) {
      const { data, error } = await supabase.from('defisc_leads').select('mobile, fixe').range(from, from + 999)
      if (error) throw error
      data.forEach((r) => { if (cle9(r.mobile).length === 9) set.add(cle9(r.mobile)); if (cle9(r.fixe).length === 9) set.add(cle9(r.fixe)) })
      if (data.length < 1000) break
      from += 1000
    }
    return set
  }

  const lire = async (e) => {
    const file = e.target.files?.[0]; if (!file) return
    setBusy(true); setMsg(''); setFiches([]); setManquantes([])
    try {
      const XLSX = await import('xlsx')
      const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' })
      // raw: true -> dates et heures arrivent en nombres Excel, convertis par ligneVersFiche
      const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: true, defval: '', blankrows: false })
      if (data.length < 2) throw new Error('Le fichier ne contient aucune ligne.')
      const cols = reperer(data[0])
      const attendues = ['nom', 'mobile', 'date_rdv']
      const absentes = attendues.filter((k) => cols[k] === undefined)
      if (absentes.length) throw new Error(`Colonnes introuvables : ${absentes.join(', ')}. Vérifiez la ligne d'en-tête.`)
      setManquantes(['civilite', 'prenom', 'type_rdv', 'nature', 'heure_rdv', 'lieu_rdv', 'fixe', 'email', 'commentaire', 'verif'].filter((k) => cols[k] === undefined))

      const existants = await numerosExistants()
      const vus = new Set()
      const out = data.slice(1).map((row, i) => {
        const f = ligneVersFiche(Object.fromEntries(row.map((v, j) => [j, v])), cols)
        const k = [cle9(f.mobile), cle9(f.fixe)].find((x) => x.length === 9)
        const doublon = k ? (existants.has(k) ? 'déjà dans le CRM' : vus.has(k) ? 'doublon dans le fichier' : null) : null
        if (k) vus.add(k)
        return { ...f, _ligne: i + 2, _doublon: doublon, _vide: !f.nom && !f.prenom && !f.mobile }
      }).filter((f) => !f._vide)
      setFichier(file.name); setFiches(out)
    } catch (err) { setMsg(`Erreur : ${err.message}`) }
    setBusy(false); e.target.value = ''
  }

  const aImporter = fiches.filter((f) => inclureDoublons || !f._doublon)
  const importer = async () => {
    setBusy(true); setMsg('')
    const { data: { user } } = await supabase.auth.getUser()
    const lignes = aImporter.map(({ _ligne, _doublon, _vide, ...f }) => ({ ...f, fichier, created_by: user.id, statut: 'a_confirmer' }))
    for (let i = 0; i < lignes.length; i += 200) {
      const { error } = await supabase.from('defisc_leads').insert(lignes.slice(i, i + 200))
      if (error) { setBusy(false); return setMsg(`Erreur après ${i} fiche(s) importée(s) : ${error.message}`) }
    }
    router.push('/defisc')
  }

  if (allowed === null) return <AppShell backHref="/defisc" title="Importer des fiches"><p style={{ color: 'var(--muted)' }}>Chargement…</p></AppShell>
  if (!allowed) return <AppShell backHref="/defisc" title="Importer des fiches"><div className="card p-6 text-sm" style={{ color: 'var(--muted)' }}>Accès réservé à l'admin.</div></AppShell>

  const nbDoublons = fiches.filter((f) => f._doublon).length
  return (
    <AppShell wide backHref="/defisc" title="Importer des fiches" subtitle="Fichier Excel : CIVILITE, NOM, PRENOM, TYPE RDV, NATURE, DATE RDV, HEURE RDV, LIEU RDV, MOBILE, FIXE, E-MAIL, COMMENTAIRE, VERIF">
      <div className="card mb-4 p-4">
        <label className="btn-accent inline-block cursor-pointer">
          {busy ? 'Lecture…' : 'Choisir un fichier Excel'}
          <input type="file" accept=".xlsx,.xls,.xlsm" className="hidden" onChange={lire} disabled={busy} />
        </label>
        {msg && <p className="mt-3 rounded-lg px-3 py-2 text-sm" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>{msg}</p>}
        {manquantes.length > 0 && <p className="mt-3 text-[12px]" style={{ color: 'var(--muted)' }}>Colonnes absentes du fichier (laissées vides) : {manquantes.join(', ')}.</p>}
      </div>

      {fiches.length > 0 && (
        <>
          <div className="mb-3 flex flex-wrap items-center gap-4 text-sm">
            <span><b>{fiches.length}</b> ligne(s) lue(s) dans {fichier}</span>
            {nbDoublons > 0 && (
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={inclureDoublons} onChange={(e) => setInclureDoublons(e.target.checked)} />
                Importer aussi les {nbDoublons} doublon(s) (même numéro de téléphone)
              </label>
            )}
            <button onClick={importer} disabled={busy || !aImporter.length} className="btn-accent ml-auto">Ajouter {aImporter.length} fiche(s) au CRM</button>
          </div>
          <div className="card overflow-x-auto">
            <table className="w-full text-left text-[12px]">
              <thead><tr className="border-b text-[11px] uppercase" style={{ color: 'var(--muted)', borderColor: 'var(--border)' }}>
                {['Ligne', 'Client', 'Mobile', 'RDV', 'Type / nature', 'Âge', 'Revenus', 'Impôts', 'Épargne', 'Capacité', 'Intérêt', 'Contrôle'].map((h) => <th key={h} className="px-2.5 py-2 font-medium">{h}</th>)}
              </tr></thead>
              <tbody>
                {fiches.map((f) => (
                  <tr key={f._ligne} className="border-b last:border-0" style={{ borderColor: 'var(--border)', opacity: f._doublon && !inclureDoublons ? 0.45 : 1 }}>
                    <td className="px-2.5 py-2">{f._ligne}</td>
                    <td className="px-2.5 py-2 font-medium">{[f.civilite, f.prenom, f.nom].filter(Boolean).join(' ')}</td>
                    <td className="px-2.5 py-2">{f.mobile ?? '—'}</td>
                    <td className="whitespace-nowrap px-2.5 py-2">{fmtDate(f.date_rdv)} {f.heure_rdv ?? ''}</td>
                    <td className="px-2.5 py-2">{[f.type_rdv, f.nature].filter(Boolean).join(' · ') || '—'}</td>
                    <td className="px-2.5 py-2">{f.age ?? '—'}</td>
                    <td className="px-2.5 py-2">{f.revenus_annuels?.toLocaleString('fr-FR') ?? '—'}</td>
                    <td className="px-2.5 py-2">{f.impots?.toLocaleString('fr-FR') ?? '—'}</td>
                    <td className="px-2.5 py-2">{f.epargne?.toLocaleString('fr-FR') ?? '—'}</td>
                    <td className="px-2.5 py-2">{f.capacite_epargne?.toLocaleString('fr-FR') ?? '—'}</td>
                    <td className="max-w-[220px] truncate px-2.5 py-2" title={f.interet}>{f.interet ?? '—'}</td>
                    <td className="px-2.5 py-2">
                      {f._doublon ? <span style={{ color: 'var(--danger)' }}>{f._doublon}</span>
                        : !f.date_rdv ? <span style={{ color: 'var(--danger)' }}>date illisible</span>
                        : f.commentaire && f.age == null && f.revenus_annuels == null ? <span style={{ color: '#a86614' }}>commentaire non découpé</span>
                        : <span style={{ color: 'var(--success)' }}>OK</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[12px]" style={{ color: 'var(--muted)' }}>Statut initial : « {STATUTS.a_confirmer.label} ». Le commentaire d'origine est conservé tel quel sur chaque fiche.</p>
        </>
      )}
    </AppShell>
  )
}
