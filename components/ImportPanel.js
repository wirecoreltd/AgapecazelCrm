'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { IMPORT_FIELDS, autoMap, buildRow, parseCSV, phoneKey } from '@/lib/importFields'

async function fetchAll(table, cols) {
  let all = [], from = 0
  for (;;) {
    const { data, error } = await supabase.from(table).select(cols).order('id').range(from, from + 999)
    if (error) throw error
    all = all.concat(data ?? [])
    if (!data || data.length < 1000) break
    from += 1000
  }
  return all
}

export default function ImportPanel({ onDone, onClose }) {
  const [fichier, setFichier] = useState('')
  const [headers, setHeaders] = useState([])
  const [body, setBody] = useState([])
  const [mapping, setMapping] = useState([])
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [result, setResult] = useState(null)

  const lire = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setMsg(''); setResult(null); setBusy(true)
    try {
      const buf = await file.arrayBuffer()
      let data
      if (/\.(xlsx|xls|xlsm)$/i.test(file.name)) {
        const XLSX = await import('xlsx')
        const wb = XLSX.read(buf, { type: 'array' })
        data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: false, defval: '', blankrows: false })
      } else {
        let text
        try { text = new TextDecoder('utf-8', { fatal: true }).decode(buf) }
        catch { text = new TextDecoder('windows-1252').decode(buf) }
        data = parseCSV(text)
      }
      if (data.length < 2) throw new Error('Le fichier est vide ou ne contient pas de ligne de données.')
      const h = data[0].map((x) => String(x ?? '').trim())
      setFichier(file.name); setHeaders(h); setBody(data.slice(1)); setMapping(autoMap(h))
    } catch (ex) {
      setMsg(ex.message || 'Fichier illisible.')
    }
    setBusy(false)
  }

  const setChamp = (i, v) => setMapping((m) => m.map((x, j) => (j === i ? v : x)))

  const importer = async () => {
    setMsg(''); setResult(null)
    const fieldIdx = {}
    for (let i = 0; i < mapping.length; i++) {
      const f = mapping[i]
      if (!f) continue
      if (fieldIdx[f] !== undefined) return setMsg(`Le champ « ${IMPORT_FIELDS.find((x) => x.key === f).label} » est choisi pour deux colonnes.`)
      fieldIdx[f] = i
    }
    if (fieldIdx.mobile === undefined && fieldIdx.telephone_1 === undefined) {
      return setMsg('Associez au moins une colonne à « Mobile » ou « Téléphone ».')
    }
    setBusy(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const connus = new Set()
      for (const r of await fetchAll('leads', 'mobile, telephone_1, telephone_2')) {
        for (const n of [r.mobile, r.telephone_1, r.telephone_2]) { const k = phoneKey(n); if (k) connus.add(k) }
      }
      for (const r of await fetchAll('leads_import', 'mobile, telephone_1, telephone_2')) {
        for (const n of [r.mobile, r.telephone_1, r.telephone_2]) { const k = phoneKey(n); if (k) connus.add(k) }
      }
      let doublons = 0, sansTel = 0
      const aInserer = []
      for (const cells of body) {
        const r = buildRow(fieldIdx, cells)
        const keys = [r.mobile, r.telephone_1, r.telephone_2].map(phoneKey).filter(Boolean)
        if (!r.mobile && !r.telephone_1) { sansTel++; continue }
        if (keys.some((k) => connus.has(k))) { doublons++; continue }
        keys.forEach((k) => connus.add(k))
        aInserer.push({ ...r, fichier, imported_by: user.id })
      }
      for (let i = 0; i < aInserer.length; i += 500) {
        const { error } = await supabase.from('leads_import').insert(aInserer.slice(i, i + 500))
        if (error) throw error
      }
      setResult({ ajoutes: aInserer.length, doublons, sansTel })
      onDone?.()
    } catch (ex) {
      setMsg(ex.message || "Erreur pendant l'import.")
    }
    setBusy(false)
  }

  return (
    <div className="card mb-6 p-4 sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="section-heading">Importer un fichier</h2>
        <button type="button" onClick={onClose} className="btn-ghost" style={{ border: '1px solid var(--border-strong)' }}>Fermer</button>
      </div>

      <label className="block cursor-pointer rounded-lg border border-dashed p-5 text-center text-sm" style={{ borderColor: 'var(--border-strong)' }}>
        <input type="file" accept=".csv,.txt,.xlsx,.xls" className="hidden" onChange={lire} disabled={busy} />
        <span className="font-medium" style={{ color: '#000' }}>{fichier || 'Choisir un fichier CSV ou Excel'}</span>
        {fichier && <span className="mt-1 block text-[12px]" style={{ color: 'var(--muted)' }}>{body.length} lignes détectées · cliquer pour changer de fichier</span>}
      </label>

      {headers.length > 0 && (
        <>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th className="p-2 text-[13px] font-semibold" style={{ color: 'var(--ink)' }}>Colonne du fichier</th>
                  <th className="p-2 text-[13px] font-semibold" style={{ color: 'var(--ink)' }}>Exemple</th>
                  <th className="p-2 text-[13px] font-semibold" style={{ color: 'var(--ink)' }}>Champ du CRM</th>
                </tr>
              </thead>
              <tbody>
                {headers.map((h, i) => (
                  <tr key={i} style={{ borderTop: '1px solid var(--border)' }}>
                    <td className="p-2 font-medium" style={{ color: '#000' }}>{h || `Colonne ${i + 1}`}</td>
                    <td className="max-w-[200px] truncate p-2" style={{ color: '#000' }}>{String(body[0]?.[i] ?? '')}</td>
                    <td className="p-2">
                      <select className="inp" value={mapping[i] ?? ''} onChange={(e) => setChamp(i, e.target.value)}>
                        <option value="">— Ignorer —</option>
                        {IMPORT_FIELDS.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[12px]" style={{ color: 'var(--muted)' }}>
            Aucun champ n'est obligatoire, sauf un numéro (mobile ou téléphone). Les numéros déjà présents dans le CRM ou dans la liste sont ignorés.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button type="button" onClick={importer} disabled={busy} className="btn-accent">
              {busy ? 'Import en cours…' : 'Importer dans la liste temporaire'}
            </button>
            {msg && <p className="text-sm" style={{ color: 'var(--danger)' }}>{msg}</p>}
          </div>
        </>
      )}
      {headers.length === 0 && msg && <p className="mt-3 text-sm" style={{ color: 'var(--danger)' }}>{msg}</p>}

      {result && (
        <p className="mt-4 rounded-lg px-3 py-2.5 text-sm" style={{ background: 'var(--accent-soft)', color: '#000' }}>
          {result.ajoutes} contacts ajoutés à la liste · {result.doublons} doublons ignorés · {result.sansTel} sans numéro ignorés
        </p>
      )}
    </div>
  )
}
