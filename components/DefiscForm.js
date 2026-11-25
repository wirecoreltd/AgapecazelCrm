'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import RetourDefisc from '@/components/RetourDefisc'
import HistoriqueStatuts from '@/components/HistoriqueStatuts'
import { STATUTS_CC, STATUT_CC_KEYS, STATUTS_ADMIN, STATUT_ADMIN_KEYS, normFR, COMMENTAIRE_MODELE, estModeleVide } from '@/lib/defisc'

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
      {title && <h2 className="section-heading mb-3">{title}</h2>}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
    </div>
  )
}
// Bloc de statut mis en évidence (couleur du statut choisi) pour le distinguer des autres champs
function BlocStatut({ titre, couleur, children }) {
  return (
    <div className="rounded-xl px-3 py-2" style={{ background: `${couleur}14`, borderLeft: `5px solid ${couleur}` }}>
      <span className="field-label">{titre}</span>
      {children}
    </div>
  )
}
const SELECT_COULEUR = 'w-full rounded-lg border-0 px-2.5 py-1.5 text-[13px] font-semibold text-white'
const OPT = { color: '#1e293b', background: '#fff' }

// Seuls les champs affichés dans le formulaire sont envoyés : le profil financier (importé) n'est jamais écrasé
// Heures par tranche de 15 min, jusqu'à 21:00 : à partir de 08:00, sauf le MARDI où l'on commence à 12:00
const hhmm = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
const creneauxPour = (date) => {
  const mardi = !!date && new Date(`${date}T00:00:00`).getDay() === 2
  const debut = (mardi ? 12 : 8) * 60
  return Array.from({ length: (21 * 60 - debut) / 15 + 1 }, (_, i) => hhmm(debut + i * 15))
}

function HeureSelect({ date, value, onChange }) {
  const creneaux = creneauxPour(date)
  // Si la fiche porte une heure hors tranche (ex. importée à 14:10), on la garde visible pour ne pas la perdre
  const options = value && !creneaux.includes(value) ? [value, ...creneaux].sort() : creneaux
  return (
    <label className="block">
      <span className="field-label">Heure</span>
      <select name="heure_rdv" value={value} onChange={(e) => onChange(e.target.value)} className="inp">
        <option value="">Choisir…</option>
        {options.map((h) => <option key={h} value={h}>{h.replace(':', 'h')}</option>)}
      </select>
      {date && new Date(`${date}T00:00:00`).getDay() === 2 && <span className="mt-1 block text-[12px]" style={{ color: 'var(--muted)' }}>Mardi : RDV à partir de 12h</span>}
    </label>
  )
}
const TEXTES = ['civilite', 'nom', 'prenom', 'email', 'type_rdv', 'nature', 'lieu_rdv', 'commentaire', 'notes']

// fiche : fiche existante (modification) ou undefined (création)
export default function DefiscForm({ fiche }) {
  const router = useRouter()
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const [role, setRole] = useState(null)
  const [conseillers, setConseillers] = useState([])
  const [statutCC, setStatutCC] = useState(fiche?.statut_cc ?? 'a_confirmer')
  const [statutAdmin, setStatutAdmin] = useState(fiche?.statut_admin ?? '')
  const [dateRdv, setDateRdv] = useState(fiche?.date_rdv ?? '')
  const [heure, setHeure] = useState(fiche?.heure_rdv?.slice(0, 5) ?? '')
  // Changement de date : si l'heure choisie n'existe pas ce jour-là (ex. matin un mardi), on la vide
  const changerDate = (d) => { setDateRdv(d); if (heure && !creneauxPour(d).includes(heure)) setHeure('') }

  useEffect(() => { (async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: p } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    setRole(p?.role ?? null)
    if (p?.role === 'admin') {
      // Les utilisateurs bloqués ne sont pas proposés
      const { data } = await supabase.from('profiles').select('id, nom_complet').in('role', ['agent', 'call_center']).or('bloque.is.null,bloque.eq.false').order('nom_complet')
      const liste = data ?? []
      // Fiche déjà assignée à quelqu'un de bloqué : on le garde (marqué « bloqué ») pour ne pas perdre l'assignation à l'enregistrement
      const actuel = fiche?.assigned_to
      if (actuel && !liste.some((c) => c.id === actuel)) {
        const { data: b } = await supabase.from('profiles').select('id, nom_complet').eq('id', actuel).single()
        if (b) liste.push({ id: b.id, nom_complet: `${b.nom_complet} (bloqué)` })
      }
      setConseillers(liste)
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
    data.statut_cc = f.statut_cc || 'a_confirmer' // nouvelle fiche = « À confirmer » par défaut
    if (role === 'admin') data.statut_admin = f.statut_admin || null // statut admin : admin seulement
    if (role === 'admin') data.assigned_to = f.assigned_to || null

    const { data: { user } } = await supabase.auth.getUser()
    let error, ficheId = fiche?.id
    if (fiche) ({ error } = await supabase.from('defisc_leads').update(data).eq('id', fiche.id))
    else {
      const res = await supabase.from('defisc_leads').insert({ ...data, created_by: user.id }).select('id').single()
      error = res.error; ficheId = res.data?.id
    }
    if (error) { setBusy(false); return setMsg(`Erreur : ${error.message}`) }

    // Commentaire retour : une nouvelle ligne d'historique (call center + admin)
    const retour = String(f.retour ?? '').trim()
    if (retour && ficheId && ['admin', 'call_center'].includes(role)) {
      const { data: p } = await supabase.from('profiles').select('nom_complet').eq('id', user.id).single()
      const { error: e2 } = await supabase.from('defisc_retours').insert({ fiche_id: ficheId, user_id: user.id, auteur_nom: p?.nom_complet ?? user.email, auteur_role: role, commentaire: retour })
      if (e2) { setBusy(false); return setMsg(`Fiche enregistrée, mais le commentaire retour a échoué : ${e2.message}`) }
    }
    setBusy(false)
    router.push('/defisc')
  }

  const v = (k) => fiche?.[k]
  return (
    <>
    <form onSubmit={submit} className="space-y-5">
      {(role === 'admin' || fiche) && (
        <BlocStatut titre="Statut administrateur" couleur={STATUTS_ADMIN[statutAdmin]?.color ?? '#94a3b8'}>
          {role === 'admin' ? (
            <select name="statut_admin" value={statutAdmin} onChange={(e) => setStatutAdmin(e.target.value)} className={SELECT_COULEUR}
              style={{ background: STATUTS_ADMIN[statutAdmin]?.color ?? '#64748b', colorScheme: 'light' }}>
              <option value="" style={OPT}>—</option>
              {STATUT_ADMIN_KEYS.map((k) => <option key={k} value={k} style={OPT}>{STATUTS_ADMIN[k].label}</option>)}
            </select>
          ) : (
            // Agent / call center : visible mais jamais modifiable (aussi bloqué côté base de données)
            <div>
              {fiche?.statut_admin
                ? <span className="inline-block rounded-lg px-2.5 py-1.5 text-[13px] font-semibold text-white" style={{ background: STATUTS_ADMIN[fiche.statut_admin]?.color ?? '#666' }}>{STATUTS_ADMIN[fiche.statut_admin]?.label ?? fiche.statut_admin}</span>
                : <span style={{ color: 'var(--muted)' }}>—</span>}
            </div>
          )}
        </BlocStatut>
      )}

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
        <label className="block">
          <span className="field-label">Date</span>
          <input name="date_rdv" type="date" value={dateRdv} onChange={(e) => changerDate(e.target.value)} className="inp" />
        </label>
        <HeureSelect date={dateRdv} value={heure} onChange={setHeure} />
        <Field name="type_rdv" label="Type de RDV (Visio, présentiel…)" value={v('type_rdv')} />
        <Field name="nature" label="Nature (IMMO…)" value={v('nature')} />
        <Field name="lieu_rdv" label="Lieu" value={v('lieu_rdv')} />
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

      <BlocStatut titre="Statut call center" couleur={STATUTS_CC[statutCC]?.color ?? '#64748b'}>
        <select name="statut_cc" value={statutCC} onChange={(e) => setStatutCC(e.target.value)} className={SELECT_COULEUR}
          style={{ background: STATUTS_CC[statutCC]?.color ?? '#64748b', colorScheme: 'light' }}>
          {STATUT_CC_KEYS.map((k) => <option key={k} value={k} style={OPT}>{STATUTS_CC[k].label}</option>)}
        </select>
      </BlocStatut>

      {fiche && <HistoriqueStatuts ficheId={fiche.id} inForm />}

      <Section>
        <label className="block sm:col-span-2">
          <span className="field-label">Commentaire</span>
          <textarea name="commentaire" rows={fiche ? 6 : 12} defaultValue={fiche ? (v('commentaire') ?? '') : COMMENTAIRE_MODELE} className="inp" />
        </label>
        <label className="block sm:col-span-2">
          <span className="field-label">Notes</span>
          <textarea name="notes" rows={3} defaultValue={v('notes') ?? ''} className="inp" />
        </label>
        {['admin', 'call_center'].includes(role) && <RetourDefisc ficheId={fiche?.id} role={role} inForm />}
      </Section>

      {msg && <p className="rounded-lg px-3 py-2 text-sm" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>{msg}</p>}
      <div className="flex justify-end gap-2">
        <Link href="/defisc" className="btn-ghost">Annuler</Link>
        <button disabled={busy} className="btn-accent">{busy ? 'Enregistrement…' : 'Enregistrer'}</button>
      </div>
    </form>
    </>
  )
}
