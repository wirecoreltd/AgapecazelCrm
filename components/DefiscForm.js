'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { STATUTS, STATUT_KEYS, normFR, COMMENTAIRE_MODELE, estModeleVide } from '@/lib/defisc'

function Field({ name, label, value, type = 'text', required, step }) {
  return (
    <label className="block">
      <span className="field-label">{label}{required && ' *'}</span>
      <input name={name} type={type} step={step} required={!!required} defaultValue={value ?? ''} className="inp" />
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
// Seuls les champs affichés dans le formulaire sont envoyés : le profil financier (importé) n'est jamais écrasé
// Heures par tranche de 15 min, de 07:00 à 21:45
const CRENEAUX = Array.from({ length: 60 }, (_, i) => { const m = 7 * 60 + i * 15; return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}` })

function HeureSelect({ value }) {
  // Si la fiche porte une heure hors tranche (ex. importée à 14:10), on la garde visible pour ne pas la perdre
  const options = value && !CRENEAUX.includes(value) ? [value, ...CRENEAUX].sort() : CRENEAUX
  return (
    <label className="block">
      <span className="field-label">Heure</span>
      <select name="heure_rdv" defaultValue={value ?? ''} className="inp">
        <option value="">Choisir…</option>
        {options.map((h) => <option key={h} value={h}>{h.replace(':', 'h')}</option>)}
      </select>
    </label>
  )
}

const TEXTES = ['civilite', 'nom', 'prenom', 'email', 'type_rdv', 'nature', 'lieu_rdv', 'commentaire', 'verif', 'notes']

// fiche : fiche existante (modification) ou undefined (création)
export default function DefiscForm({ fiche }) {
  const router = useRouter()
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const [role, setRole] = useState(null)
  const [conseillers, setConseillers] = useState([])

  useEffect(() => { (async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: p } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    setRole(p?.role ?? null)
    if (p?.role === 'admin') {
      const { data } = await supabase.from('profiles').select('id, nom_complet').in('role', ['agent', 'call_center']).order('nom_complet')
      setConseillers(data ?? [])
    }
  })() }, [])

  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setMsg('')
    const f = Object.fromEntries(new FormData(e.target))
    const data = {}
    for (const k of TEXTES) data[k] = String(f[k] ?? '').trim() || null
    if (estModeleVide(f.commentaire)) data.commentaire = null // modèle laissé vide : rien à enregistrer
    data.mobile = normFR(f.mobile) || null
    data.fixe = normFR(f.fixe) || null
    data.date_rdv = f.date_rdv || null
    data.heure_rdv = f.heure_rdv || null
    if (role === 'admin') data.statut = f.statut || 'a_confirmer' // statut : admin seulement (nouvelle fiche = « À confirmer » par défaut)
    if (role === 'admin') data.assigned_to = f.assigned_to || null

    let error
    if (fiche) ({ error } = await supabase.from('defisc_leads').update(data).eq('id', fiche.id))
    else {
      const { data: { user } } = await supabase.auth.getUser()
      ;({ error } = await supabase.from('defisc_leads').insert({ ...data, created_by: user.id }))
    }
    setBusy(false)
    if (error) return setMsg(`Erreur : ${error.message}`)
    router.push('/defisc')
  }

  const v = (k) => fiche?.[k]
  return (
    <form onSubmit={submit} className="space-y-8">
      <Section title="Contact">
        <label className="block">
          <span className="field-label">Civilité</span>
          <select name="civilite" defaultValue={v('civilite') ?? ''} className="inp">
            <option value="">Choisir…</option><option>Monsieur</option><option>Madame</option>
          </select>
        </label>
        <span className="hidden sm:block" />
        <Field name="nom" label="Nom" value={v('nom')} required />
        <Field name="prenom" label="Prénom" value={v('prenom')} />
        <Field name="mobile" label="Mobile" value={v('mobile')} />
        <Field name="fixe" label="Fixe" value={v('fixe')} />
        <Field name="email" label="E-mail" type="email" value={v('email')} />
      </Section>

      <Section title="Rendez-vous">
        <Field name="date_rdv" label="Date" type="date" value={v('date_rdv')} />
        <HeureSelect value={v('heure_rdv')?.slice(0, 5)} />
        <Field name="type_rdv" label="Type de RDV (Visio, présentiel…)" value={v('type_rdv')} />
        <Field name="nature" label="Nature (IMMO…)" value={v('nature')} />
        <Field name="lieu_rdv" label="Lieu" value={v('lieu_rdv')} />
        {role === 'admin' && (
          <label className="block">
            <span className="field-label">Statut</span>
            <select name="statut" defaultValue={v('statut') ?? 'a_confirmer'} className="inp">
              {STATUT_KEYS.map((k) => <option key={k} value={k}>{STATUTS[k].label}</option>)}
            </select>
          </label>
        )}
        {role === 'admin' && (
          <label className="block">
            <span className="field-label">Conseiller</span>
            <select name="assigned_to" defaultValue={v('assigned_to') ?? ''} className="inp" key={`c-${conseillers.length}`}>
              <option value="">Non assigné</option>
              {conseillers.map((c) => <option key={c.id} value={c.id}>{c.nom_complet}</option>)}
            </select>
          </label>
        )}
      </Section>

      <Section title="Suivi">
        <label className="block sm:col-span-2">
          <span className="field-label">Commentaire</span>
          <textarea name="commentaire" rows={fiche ? 6 : 12} defaultValue={fiche ? (v('commentaire') ?? '') : COMMENTAIRE_MODELE} className="inp" />
        </label>
        <Field name="verif" label="Vérif" value={v('verif')} />
        <span className="hidden sm:block" />
        <label className="block sm:col-span-2">
          <span className="field-label">Notes</span>
          <textarea name="notes" rows={3} defaultValue={v('notes') ?? ''} className="inp" />
        </label>
      </Section>

      {msg && <p className="rounded-lg px-3 py-2 text-sm" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>{msg}</p>}
      <div className="flex justify-end gap-2">
        <Link href="/defisc" className="btn-ghost">Annuler</Link>
        <button disabled={busy} className="btn-accent">{busy ? 'Enregistrement…' : 'Enregistrer'}</button>
      </div>
    </form>
  )
}
