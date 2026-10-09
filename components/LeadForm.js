'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const OUI_NON = [['oui', 'Oui'], ['non', 'Non']]
const CHAUFFAGES = ['gaz naturel', 'électrique', 'fioul', 'gaz condensation', 'bois', 'pas de chauffage', 'autre']
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
  const [role, setRole] = useState(null)
  const [agents, setAgents] = useState([])
  const [installateurs, setInstallateurs] = useState([])
  const [installateurChoisi, setInstallateurChoisi] = useState(lead?.installateur ?? '')
  const [nouvelInstallateur, setNouvelInstallateur] = useState('')
  const [prefill, setPrefill] = useState(null)
  const src = lead ?? prefill // valeurs affichées : lead existant, sinon pré-remplissage depuis un appel

  // Création depuis la page Appels : infos de l'annuaire + historique des appels
  useEffect(() => {
    if (lead) return
    try {
      const brut = sessionStorage.getItem('prefill_lead')
      if (!brut) return
      const p = JSON.parse(brut)
      const f = p.fiche ?? {}
      f.proprietaire = f.proprietaire === 'oui' ? true : f.proprietaire === 'non' ? false : null
      setPrefill({ ...f, appels: p.appels ?? [] })
    } catch {}
  }, [lead])

  useEffect(() => {
    supabase.from('installateurs').select('nom').order('nom').then(({ data }) => setInstallateurs(data ?? []))
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: p } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      setRole(p?.role ?? null)
      if (p?.role === 'admin') {
        const { data: ag } = await supabase.from('profiles').select('id, nom_complet').in('role', ['agent', 'call_center']).order('nom_complet')
        setAgents(ag ?? [])
      }
    })()
  }, [])

  const ajouterInstallateur = async () => {
    const nom = nouvelInstallateur.trim()
    if (!nom) return
    await supabase.from('installateurs').insert({ nom })
    // l'erreur (nom déjà existant) est volontairement ignorée
    setInstallateurs((liste) => (
      liste.some((i) => i.nom === nom) ? liste : [...liste, { nom }].sort((a, b) => a.nom.localeCompare(b.nom))
    ))
    setInstallateurChoisi(nom)
    setNouvelInstallateur('')
  }

  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setMsg('')
    const form = e.target
    const raw = Object.fromEntries(new FormData(form))
    const f = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, v === '' ? null : v]))

    // Règle : au moins un des deux (mobile OU téléphone 1) doit être rempli
    if (!f.mobile?.trim() && !f.telephone_1?.trim()) {
      setBusy(false)
      return setMsg('Renseignez au moins un numéro : mobile ou téléphone 1.')
    }

    // Vérification des doublons par téléphone (mobile, tél 1 et tél 2)
    const numeros = [f.mobile, f.telephone_1, f.telephone_2].filter((n) => n?.trim())
    const { data: dup, error: dupErr } = await supabase.rpc('find_phone_duplicate', {
      p_numbers: numeros,
      p_exclude: lead?.id ? String(lead.id) : null,
    })
    if (dupErr) {
      setBusy(false)
      return setMsg(`Erreur : ${dupErr.message}`)
    }
    
    if (dup?.length) {
  setBusy(false)
  return setMsg('Ce numéro existe déjà dans notre base de données.')
}

    const { data: { user } } = await supabase.auth.getUser()

    const data = {
      ...f,
      proprietaire: f.proprietaire === 'oui',
      maison_plus_15_ans: f.maison_plus_15_ans ? f.maison_plus_15_ans === 'oui' : null,
      documents_requis: f.documents_requis ? f.documents_requis === 'oui' : null,
    }

    if (role === 'admin') {
      // L'admin choisit explicitement l'agent à qui associer le lead
      data.agent_id = f.agent_id ?? null
    } else if (!lead) {
      // Un agent qui crée un lead se l'associe automatiquement
      data.agent_id = user.id
    }
    // Sinon (agent qui modifie un lead existant) : on ne touche pas à l'agent déjà assigné

    if (lead) {
      const { error } = await supabase.from('leads').update(data).eq('id', lead.id)
      setBusy(false)
      if (error) return setMsg(`Erreur : ${error.message}`)
      return router.push(`/leads/${lead.id}`)
    }

    const newId = crypto.randomUUID()
    const { error } = await supabase.from('leads').insert({ id: newId, ...data, statut: 'nouveau', created_by: user.id })
    setBusy(false)
    if (error) return setMsg(`Erreur : ${error.message}`)
    sessionStorage.removeItem('prefill_lead')
    // On enchaîne directement sur la fiche du lead pour permettre l'ajout de documents / appels
    router.push(`/leads/${newId}/edit?cree=1`)
  }

  return (
    <form key={prefill ? 'prefill' : 'vide'} onSubmit={submit} className="space-y-8">
      {!lead && prefill?.appels?.length > 0 && (
        <div className="card p-3 text-sm" style={{ background: 'var(--accent-soft)' }}>
          <p className="font-medium">Historique des appels ({prefill.appels.length})</p>
          <p className="mb-2 text-[12px]" style={{ color: 'var(--muted)' }}>Il sera rattaché automatiquement à la fiche à l'enregistrement.</p>
          <ul className="space-y-1 text-[13px]">
            {prefill.appels.map((a, i) => (
              <li key={i}>
                {new Date(a.created_at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}
                {' · '}{a.direction === 'INBOUND' ? 'Reçu' : 'Émis'}{' · '}{a.resultat}
                {a.duree_secondes ? ` · ${Math.floor(a.duree_secondes / 60)} min ${String(a.duree_secondes % 60).padStart(2, '0')} s` : ''}
              </li>
            ))}
          </ul>
        </div>
      )}
      <Section title="Identité">
        <Select name="civilite" label="Civilité" required value={src?.civilite} options={[['M', 'M'], ['Mme', 'Mme']]} />
        <Field name="prenom" label="Prénom" value={src?.prenom} />
        <Field name="nom" label="Nom" value={src?.nom} />
      </Section>

      {role === 'admin' && (
        <Section title="Attribution">
          <Select
            name="agent_id"
            label="Agent associé"
            value={src?.agent_id}
            options={agents.map((a) => [a.id, a.nom_complet])}
          />
        </Section>
      )}

      <Section title="Coordonnées">
        <Field name="adresse" label="Adresse (rue et ville)" required value={src?.adresse} />
        <Field name="code_postal" label="Code postal" required value={src?.code_postal} />
        <Field name="ville" label="Ville" required value={src?.ville} />
        <Field name="mobile" label="Mobile" value={src?.mobile} />
        <Field name="telephone_1" label="Téléphone 1" value={src?.telephone_1} />
        <Field name="telephone_2" label="Téléphone 2" value={src?.telephone_2} />
        <Field name="email" label="Email" type="email" value={src?.email} />
        <p className="text-xs sm:col-span-2" style={{ color: 'var(--muted)' }}>
          * Renseignez au moins un numéro : mobile ou téléphone 1.
        </p>
      </Section>

      <Section title="Logement">
        <Select name="proprietaire" label="Propriétaire" required value={yn(src?.proprietaire)} options={OUI_NON} />
        <Field name="nb_personnes" label="Nb de personnes" required type="number" value={src?.nb_personnes} />
        <Field name="revenus" label="Revenus" value={src?.revenus} />
        <Select name="maison_plus_15_ans" label="Maison +15 ans" value={yn(src?.maison_plus_15_ans)} options={OUI_NON} />
        <Select name="type_habitat" label="Type d'habitat" required value={src?.type_habitat} options={[['maison', 'Maison'], ['appartement', 'Appartement']]} />
        <Field name="surface_habitable" label="Surface habitable (m²)" required type="number" value={src?.surface_habitable} />
        <Select name="chauffage" label="Type de chauffage" required value={src?.chauffage} options={CHAUFFAGES} />
      </Section>

      <Section title="Projet">
        <Field name="produit_1" label="Produit 1" value={src?.produit_1} />
        <Select name="documents_requis" label="Documents récupérer" value={yn(src?.documents_requis)} options={OUI_NON} />

        {role === 'admin' && (
  <div className="sm:col-span-2">
    <span className="field-label">Installateur</span>
    <select
      name="installateur"
      value={installateurChoisi}
      onChange={(e) => setInstallateurChoisi(e.target.value)}
      className="inp"
    >
      <option value="">Aucun</option>
      {installateurs.map((i) => <option key={i.nom} value={i.nom}>{i.nom}</option>)}
    </select>

    <div className="mt-2 flex flex-col gap-2 sm:flex-row">
      <input
        value={nouvelInstallateur}
        onChange={(e) => setNouvelInstallateur(e.target.value)}
        placeholder="Nom d'un nouvel installateur"
        className="inp"
      />
      <button
        type="button"
        onClick={ajouterInstallateur}
        disabled={!nouvelInstallateur.trim()}
        className="btn-ghost shrink-0"
        style={{ border: '1px solid var(--border-strong)' }}
      >
        Ajouter à la liste
      </button>
    </div>
  </div>
)}

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
