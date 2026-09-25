'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const OUI_NON = [['oui', 'Oui'], ['non', 'Non']]
const CHAUFFAGES = ['gaz naturel', 'électrique', 'fioul', 'gaz condensation', 'bois', 'pas de chauffage']
  .map((c) => [c, c[0].toUpperCase() + c.slice(1)])
const yn = (v) => (v == null ? '' : v ? 'oui' : 'non')

function Field({ name, label, required, value, type = 'text' }) {
  return (
    <label className="block">
      <span className="field-label">{label}{required && ' *'}</span>
      <input name={name} type={type} step="any" min={type === 'number' ? 1 : undefined} required={!!required}
        defaultValue={value ?? ''} className="inp" />
    </label>
  )
}

function Select({ name, label, options, required, value }) {
  return (
    <label className="block">
      <span className="field-label">{label}{required && ' *'}</span>
      <select name={name} required={required} defaultValue={value ?? ''} className="inp">
        <option value="" disabled={!!required}>Choisir…</option>
        {options.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
      </select>
    </label>
  )
}

function Section({ title, children }) {
  return (
    <div>
      <h2 className="section-heading mb-3">{title}</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
    </div>
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
    <form onSubmit={submit} className="space-y-8">
      <Section title="Identité">
        <Select name="civilite" label="Civilité" required value={lead?.civilite} options={[['M', 'M'], ['Mme', 'Mme']]} />
        <Field name="prenom" label="Prénom" value={lead?.prenom} />
        <Field name="nom" label="Nom" value={lead?.nom} />
      </Section>

      <Section title="Coordonnées">
        <Field name="adresse" label="Adresse (rue et ville)" required value={lead?.adresse} />
        <Field name="code_postal" label="Code postal" required value={lead?.code_postal} />
        <Field name="ville" label="Ville" required value={lead?.ville} />
        <Field name="mobile" label="Mobile" required value={lead?.mobile} />
        <Field name="telephone_1" label="Téléphone 1" required value={lead?.telephone_1} />
        <Field name="telephone_2" label="Téléphone 2" value={lead?.telephone_2} />
      </Section>

      <Section title="Logement">
        <Select name="proprietaire" label="Propriétaire" required value={yn(lead?.proprietaire)} options={OUI_NON} />
        <Field name="nb_personnes" label="Nb de personnes" required type="number" value={lead?.nb_personnes} />
        <Field name="revenus" label="Revenus" value={lead?.revenus} />
        <Select name="maison_plus_15_ans" label="Maison +15 ans" required value={yn(lead?.maison_plus_15_ans)} options={OUI_NON} />
        <Select name="type_habitat" label="Type d'habitat" required value={lead?.type_habitat} options={[['maison', 'Maison'], ['appartement', 'Appartement']]} />
        <Field name="surface_habitable" label="Surface habitable (m²)" required type="number" value={lead?.surface_habitable} />
        <Select name="chauffage" label="Type de chauffage" required value={lead?.chauffage} options={CHAUFFAGES} />
      </Section>

      <Section title="Projet">
        <Field name="produit_1" label="Produit 1" value={lead?.produit_1} />
        <Select name="documents_requis" label="Documents à récupérer" required value={yn(lead?.documents_requis)} options={OUI_NON} />

        <div className="sm:col-span-2">
          <span className="field-label">Installateur</span>
          <input name="installateur" list="installateurs-list" defaultValue={lead?.installateur ?? ''} className="inp" placeholder="Saisir ou choisir dans la liste" />
          <datalist id="installateurs-list">
            {installateurs.map((i) => <option key={i.nom} value={i.nom} />)}
          </datalist>
          <label className="mt-2 flex items-center gap-2 text-sm" style={{ color: 'var(--muted)' }}>
            <input type="checkbox" name="memoriser_installateur" defaultChecked />
            Se souvenir de cet installateur pour la prochaine fois
          </label>
        </div>

        <label className="block">
          <span className="field-label">Date d'installation</span>
          <input name="date_installation" type="date" defaultValue={lead?.date_installation ?? ''} className="inp" />
        </label>
      </Section>

      <Section title="Suivi">
        <label className="block sm:col-span-2">
          <span className="field-label">Commentaire</span>
          <textarea name="commentaire" rows={3} defaultValue={lead?.commentaire ?? ''} className="inp" />
        </label>
      </Section>

      <div className="flex flex-col gap-3 border-t pt-6 sm:flex-row sm:items-center" style={{ borderColor: 'var(--border)' }}>
        <button disabled={busy} className="btn-accent">{lead ? 'Enregistrer les modifications' : 'Enregistrer le lead'}</button>
        {msg && <p className="text-sm" style={{ color: 'var(--danger)' }}>{msg}</p>}
      </div>
    </form>
  )
}
