'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

// [name, label, required, type]
const FIELDS = [
  ['prenom', 'Prénom'], ['nom', 'Nom'],
  ['adresse', 'Adresse (rue et ville)', 1], ['code_postal', 'Code postal', 1],
  ['ville', 'Ville', 1], ['mobile', 'Mobile', 1],
  ['telephone_1', 'Téléphone 1', 1], ['telephone_2', 'Téléphone 2'],
  ['nb_personnes', 'Nb de personnes', 1, 'number'], ['revenus', 'Revenus'],
  ['surface_habitable', 'Surface habitable (m²)', 1, 'number'], ['chauffage', 'Chauffage', 1],
  ['produit_1', 'Produit 1'],
]
const OUI_NON = [['oui', 'Oui'], ['non', 'Non']]

function Select({ name, label, options, required }) {
  return (
    <label className="block text-sm font-medium">{label}{required && ' *'}
      <select name={name} required={required} className="inp mt-1 font-normal">
        {!required && <option value="">—</option>}
        {options.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
      </select>
    </label>
  )
}

export default function NewLead() {
  const [branches, setBranches] = useState([])
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    supabase.from('branches').select('id, nom').order('nom').then(({ data }) => setBranches(data ?? []))
  }, [])

  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setMsg('')
    const form = e.target
    const f = Object.fromEntries([...new FormData(form)].map(([k, v]) => [k, v === '' ? null : v]))
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('leads').insert({
      ...f,
      proprietaire: f.proprietaire === 'oui',
      maison_plus_15_ans: f.maison_plus_15_ans ? f.maison_plus_15_ans === 'oui' : null,
      statut: f.branch_id ? 'transmis' : 'nouveau',
      created_by: user.id,
    })
    setBusy(false)
    if (error) return setMsg(`Erreur : ${error.message}`)
    form.reset(); setMsg('Lead enregistré.')
  }

  return (
    <main className="mx-auto max-w-2xl p-6">
      <Link href="/leads" className="text-sm underline">Retour aux leads</Link>
      <h1 className="my-4 text-2xl font-bold">Nouveau lead</h1>
      <form onSubmit={submit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Select name="civilite" label="Civilité" required options={[['M', 'M'], ['Mme', 'Mme']]} />
        {FIELDS.slice(0, 2).map(([n, l]) => (
          <label key={n} className="block text-sm font-medium">{l}<input name={n} className="inp mt-1 font-normal" /></label>
        ))}
        {FIELDS.slice(2).map(([n, l, req, t]) => (
          <label key={n} className={`block text-sm font-medium ${n === 'adresse' ? 'sm:col-span-2' : ''}`}>
            {l}{req && ' *'}
            <input name={n} type={t || 'text'} step="any" min={t ? 1 : undefined} required={!!req} className="inp mt-1 font-normal" />
          </label>
        ))}
        <Select name="proprietaire" label="Propriétaire" required options={OUI_NON} />
        <Select name="maison_plus_15_ans" label="Maison +15 ans" options={OUI_NON} />
        <Select name="type_habitat" label="Type d'habitat" options={[['maison', 'Maison'], ['appartement', 'Appartement']]} />
        <Select name="branch_id" label="Transmettre à la branche" options={branches.map((b) => [b.id, b.nom])} />
        <button disabled={busy} className="btn sm:col-span-2">Enregistrer le lead</button>
        {msg && <p className="text-sm sm:col-span-2">{msg}</p>}
      </form>
    </main>
  )
}
