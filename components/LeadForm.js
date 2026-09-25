'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const FIELDS = [
  ['prenom', 'Prénom'], ['nom', 'Nom'],
  ['adresse', 'Adresse (rue et ville)', 1], ['code_postal', 'Code postal', 1],
  ['ville', 'Ville', 1], ['mobile', 'Mobile', 1],
  ['telephone_1', 'Téléphone 1', 1], ['telephone_2', 'Téléphone 2'],
  ['nb_personnes', 'Nb de personnes', 1, 'number'], ['revenus', 'Revenus'],
  ['surface_habitable', 'Surface habitable (m²)', 1, 'number'], ['produit_1', 'Produit 1'],
]
const OUI_NON = [['oui', 'Oui'], ['non', 'Non']]
const CHAUFFAGES = ['gaz naturel', 'électrique', 'fioul', 'gaz condensation', 'bois', 'pas de chauffage']
  .map((c) => [c, c[0].toUpperCase() + c.slice(1)])
const yn = (v) => (v == null ? '' : v ? 'oui' : 'non')

function Select({ name, label, options, required, value }) {
  return (
    <label className="block text-sm font-medium">{label}{required && ' *'}
      <select name={name} required={required} defaultValue={value ?? ''} className="inp mt-1 font-normal">
        <option value="" disabled={!!required}>Choisir…</option>
        {options.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
      </select>
    </label>
  )
}

// lead : lead existant (mode édition) ou undefined (mode création)
export default function LeadForm({ lead }) {
  const router = useRouter()
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const [installateurs, setInstallateurs] = useState([])

  useEffect(() => {
    supabase.from('installateurs').select('nom').order('nom').then(({ data }) => setInstallateurs(data ?? []))
  }, [])

  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setMsg('')
    const form = e.target
    const raw = Object.fromEntries(new FormData(form))
    const memoriser = raw.memoriser_installateur === 'on'
    const f = Object.fromEntries(Object.entries(raw).filter(([k]) => k !== 'memoriser_installateur').map(([k, v]) => [k, v === '' ? null : v]))
    const data = {
      ...f,
      proprietaire: f.proprietaire === 'oui',
      maison_plus_15_ans: f.maison_plus_15_ans ? f.maison_plus_15_ans === 'oui' : null,
      documents_requis: f.documents_requis ? f.documents_requis === 'oui' : null,
    }

    if (memoriser && f.installateur) {
      await supabase.from('installateurs').insert({ nom: f.installateur })
      // l'erreur (nom déjà existant) est volontairement ignorée
    }

    if (lead) {
      const { error } = await supabase.from('leads').update(data).eq('id', lead.id)
      setBusy(false)
      if (error) return setMsg(`Erreur : ${error.message}`)
      return router.push(`/leads/${lead.id}`)
    }

    const { data: { user } } = await supabase.auth.getUser()
    const newId = crypto.randomUUID()
    const { error } = await supabase.from('leads').insert({ id: newId, ...data, statut: 'nouveau', created_by: user.id })
    setBusy(false)
    if (error) return setMsg(`Erreur : ${error.message}`)
    // On enchaîne directement sur la fiche du lead pour permettre l'ajout de documents / appels
    router.push(`/leads/${newId}/edit?cree=1`)
  }

  return (
    <form onSubmit={submit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Select name="civilite" label="Civilité" required value={lead?.civilite} options={[['M', 'M'], ['Mme', 'Mme']]} />
      <label className="block text-sm font-medium">Prénom<input name="prenom" defaultValue={lead?.prenom ?? ''} className="inp mt-1 font-normal" /></label>
      {FIELDS.slice(1).map(([n, l, req, t]) => (
        <label key={n} className="block text-sm font-medium">{l}{req && ' *'}
          <input name={n} type={t || 'text'} step="any" min={t ? 1 : undefined} required={!!req}
            defaultValue={lead?.[n] ?? ''} className="inp mt-1 font-normal" />
        </label>
      ))}
      <Select name="proprietaire" label="Propriétaire" required value={yn(lead?.proprietaire)} options={OUI_NON} />
      <Select name="maison_plus_15_ans" label="Maison +15 ans" required value={yn(lead?.maison_plus_15_ans)} options={OUI_NON} />
      <Select name="type_habitat" label="Type d'habitat" required value={lead?.type_habitat} options={[['maison', 'Maison'], ['appartement', 'Appartement']]} />
      <Select name="chauffage" label="Type de chauffage" required value={lead?.chauffage} options={CHAUFFAGES} />
      <Select name="documents_requis" label="Documents à récupérer" required value={yn(lead?.documents_requis)} options={OUI_NON} />

      <div className="block text-sm font-medium sm:col-span-2">
        Installateur
        <input name="installateur" list="installateurs-list" defaultValue={lead?.installateur ?? ''} className="inp mt-1 font-normal" placeholder="Saisir ou choisir dans la liste" />
        <datalist id="installateurs-list">
          {installateurs.map((i) => <option key={i.nom} value={i.nom} />)}
        </datalist>
        <label className="mt-2 flex items-center gap-2 text-sm font-normal">
          <input type="checkbox" name="memoriser_installateur" defaultChecked />
          Se souvenir de cet installateur pour la prochaine fois
        </label>
      </div>

      <label className="block text-sm font-medium">Date d'installation
        <input name="date_installation" type="date" defaultValue={lead?.date_installation ?? ''} className="inp mt-1 font-normal" />
      </label>

      <label className="block text-sm font-medium sm:col-span-2">Commentaire
        <textarea name="commentaire" rows={3} defaultValue={lead?.commentaire ?? ''} className="inp mt-1 font-normal" />
      </label>

      <button disabled={busy} className="btn sm:col-span-2">{lead ? 'Enregistrer les modifications' : 'Enregistrer le lead'}</button>
      {msg && <p className="text-sm sm:col-span-2">{msg}</p>}
    </form>
  )
}
