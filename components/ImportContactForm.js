'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const OUI_NON = [['oui', 'Oui'], ['non', 'Non']]
const CHAUFFAGES = ['gaz naturel', 'électrique', 'fioul', 'gaz condensation', 'bois', 'pas de chauffage', 'autre']
  .map((c) => [c, c[0].toUpperCase() + c.slice(1)])
const yn = (v) => (v === null || v === undefined ? '' : v ? 'oui' : 'non')

function Field({ name, label, value, type = 'text' }) {
  return (
    <label className="block">
      <span className="field-label">{label}</span>
      <input name={name} type={type} step="any" min={type === 'number' ? 0 : undefined} defaultValue={value ?? ''} className="inp" />
    </label>
  )
}
function Select({ name, label, options, value }) {
  return (
    <label className="block">
      <span className="field-label">{label}</span>
      <select name={name} defaultValue={value ?? ''} className="inp">
        <option value="">Choisir…</option>
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

// Contact de la liste temporaire : aucun champ obligatoire, sauf un numéro (mobile ou téléphone 1)
export default function ImportContactForm({ row }) {
  const router = useRouter()
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setMsg('')
    const raw = Object.fromEntries(new FormData(e.target))
    const f = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, typeof v === 'string' && v.trim() === '' ? null : v]))

    if (!f.mobile?.trim() && !f.telephone_1?.trim()) {
      setBusy(false)
      return setMsg('Renseignez au moins un numéro : mobile ou téléphone 1.')
    }
    const numeros = [f.mobile, f.telephone_1, f.telephone_2].filter((n) => n?.trim())
    const { data: dup, error: dupErr } = await supabase.rpc('find_phone_duplicate', { p_numbers: numeros, p_exclude: null })
    if (dupErr) { setBusy(false); return setMsg(`Erreur : ${dupErr.message}`) }
    if (dup?.length) { setBusy(false); return setMsg('Ce numéro existe déjà dans le CRM.') }

    const data = {
      ...f,
      proprietaire: f.proprietaire ? f.proprietaire === 'oui' : null,
      maison_plus_15_ans: f.maison_plus_15_ans ? f.maison_plus_15_ans === 'oui' : null,
      nb_personnes: f.nb_personnes ? Math.round(Number(f.nb_personnes)) : null,
      surface_habitable: f.surface_habitable ? Number(f.surface_habitable) : null,
    }
    const { data: maj, error } = await supabase.from('leads_import').update(data).eq('id', row.id).select()
    setBusy(false)
    if (error) return setMsg(`Erreur : ${error.message}`)
    if (!maj?.length) return setMsg("Modification refusée : lancez le SQL de mise à jour dans Supabase (policy « leads_import_update »).")
    router.push(`/leads/import/${row.id}`)
  }

  return (
    <form onSubmit={submit} className="space-y-8">
      <Section title="Identité">
        <Select name="civilite" label="Civilité" value={row.civilite} options={[['M', 'M'], ['Mme', 'Mme']]} />
        <Field name="prenom" label="Prénom" value={row.prenom} />
        <Field name="nom" label="Nom" value={row.nom} />
      </Section>
      <Section title="Coordonnées">
        <Field name="adresse" label="Adresse (rue et ville)" value={row.adresse} />
        <Field name="code_postal" label="Code postal" value={row.code_postal} />
        <Field name="ville" label="Ville" value={row.ville} />
        <Field name="mobile" label="Mobile" value={row.mobile} />
        <Field name="telephone_1" label="Téléphone 1" value={row.telephone_1} />
        <Field name="telephone_2" label="Téléphone 2" value={row.telephone_2} />
        <Field name="email" label="Email" type="email" value={row.email} />
        <p className="text-xs sm:col-span-2" style={{ color: 'var(--muted)' }}>Seul un numéro est obligatoire : mobile ou téléphone 1.</p>
      </Section>
      <Section title="Logement">
        <Select name="proprietaire" label="Propriétaire" value={yn(row.proprietaire)} options={OUI_NON} />
        <Field name="nb_personnes" label="Nb de personnes" type="number" value={row.nb_personnes} />
        <Field name="revenus" label="Revenus" value={row.revenus} />
        <Select name="maison_plus_15_ans" label="Maison +15 ans" value={yn(row.maison_plus_15_ans)} options={OUI_NON} />
        <Select name="type_habitat" label="Type d'habitat" value={row.type_habitat} options={[['maison', 'Maison'], ['appartement', 'Appartement']]} />
        <Field name="surface_habitable" label="Surface habitable (m²)" type="number" value={row.surface_habitable} />
        <Select name="chauffage" label="Type de chauffage" value={row.chauffage} options={CHAUFFAGES} />
      </Section>
      <div className="flex flex-col gap-3 border-t pt-6 sm:flex-row sm:items-center" style={{ borderColor: 'var(--border)' }}>
        <button disabled={busy} className="btn-accent">Enregistrer les modifications</button>
        {msg && <p className="text-sm" style={{ color: 'var(--danger)' }}>{msg}</p>}
      </div>
    </form>
  )
}
