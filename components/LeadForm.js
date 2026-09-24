'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

// [name, label, required, type]
const FIELDS = [
  ['prenom', 'Prénom'], ['nom', 'Nom'],
  ['adresse', 'Adresse (rue et ville)', 1], ['code_postal', 'Code postal', 1],
  ['ville', 'Ville', 1], ['mobile', 'Mobile', 1],
  ['telephone_1', 'Téléphone 1', 1], ['telephone_2', 'Téléphone 2'],
  ['nb_personnes', 'Nb de personnes', 1, 'number'], ['revenus', 'Revenus'],
  ['surface_habitable', 'Surface habitable (m²)', 1, 'number'], ['produit_1', 'Produit 1'],
]
const OUI_NON = [['oui', 'Oui'], ['non', 'Non']]
const CHAUFFAGES = ['gaz naturel', 'électrique', 'fioul', 'gaz condensation', 'bois', 'pas de chauffage'].map((c) => [c, c[0].toUpperCase() + c.slice(1)])
const yn = (v) => (v == null ? '' : v ? 'oui' : 'non')

function Select({ name, label, options, required, value }) {
  return (
    <label className="block text-sm font-medium">{label}{required && ' *'}
      <select name={name} required={required} defaultValue={value ?? ''} className="inp mt-1 font-normal">
        <option value="">{required ? 'Choisir…' : '—'}</option>
        {options.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
      </select>
    </label>
  )
}

export default function LeadForm({ lead }) {
  const router = useRouter()
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setMsg('')
    const form = e.target
    const f = Object.fromEntries([...new FormData(form)].map(([k, v]) => [k, v === '' ? null : v]))
    const data = {
      ...f,
      proprietaire: f.proprietaire === 'oui',
      maison_plus_15_ans: f.maison_plus_15_ans ? f.maison_plus_15_ans === 'oui' : null,
    }
    let error
    if (lead) {
      ;({ error } = await supabase.from('leads').update(data).eq('id', lead.id))
    } else {
      const { data: { user } } = await supabase.auth.getUser()
      ;({ error } = await supabase.from('leads').insert({ ...data, statut: 'nouveau', created_by: user.id }))
    }
    setBusy(false)
    if (error) return setMsg(`Erreur : ${error.message}`)
    if (lead) return router.push(`/leads/${lead.id}`)
    form.reset(); setMsg('Lead enregistré.')
  }

  return (
    <form onSubmit={submit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Select name="civilite" label="Civilité" required value={lead?.civilite ?? 'M'} options={[['M', 'M'], ['Mme', 'Mme']]} />
      {FIELDS.slice(0, 1).map(([n, l]) => (
        <label key={n} className="block text-sm font-medium">{l}<input name={n} defaultValue={lead?.[n] ?? ''} className="inp mt-1 font-normal" /></label>
      ))}
      {FIELDS.slice(1).map(([n, l, req, t]) => (
        <label key={n} className="block text-sm font-medium">{l}{req && ' *'}
          <input name={n} type={t || 'text'} step="any" min={t ? 1 : undefined} required={!!req}
            defaultValue={lead?.[n] ?? ''} className="inp mt-1 font-normal" />
        </label>
      ))}
      <Select name="proprietaire" label="Propriétaire" required value={yn(lead?.proprietaire)} options={OUI_NON} />
      <Select name="maison_plus_15_ans" label="Maison +15 ans" value={yn(lead?.maison_plus_15_ans)} options={OUI_NON} />
      <Select name="type_habitat" label="Type d'habitat" value={lead?.type_habitat} options={[['maison', 'Maison'], ['appartement', 'Appartement']]} />
      <Select name="chauffage" label="Type de chauffage" required value={lead?.chauffage} options={CHAUFFAGES} />
      <label className="block text-sm font-medium sm:col-span-2">Documents à récupérer
        <textarea name="documents_a_recuperer" rows={3} defaultValue={lead?.documents_a_recuperer ?? ''} className="inp mt-1 font-normal" />
      </label>
      <button disabled={busy} className="btn sm:col-span-2">{lead ? 'Enregistrer les modifications' : 'Enregistrer le lead'}</button>
      {msg && <p className="text-sm sm:col-span-2">{msg}</p>}
    </form>
  )
}
