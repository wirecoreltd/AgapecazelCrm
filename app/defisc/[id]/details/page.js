'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import AppShell from '@/components/AppShell'
import { STATUTS } from '@/lib/defisc'

const eur = (v) => (v == null ? null : `${Number(v).toLocaleString('fr-FR')} €`)
const date = (d) => (d ? new Date(d + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : null)

function Bloc({ titre, lignes }) {
  return (
    <div className="card p-4 sm:p-6">
      <h2 className="section-heading mb-3">{titre}</h2>
      <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
        {lignes.map(([label, valeur]) => (
          <div key={label}>
            <dt className="text-[10px] font-medium uppercase tracking-wide" style={{ color: 'var(--muted)' }}>{label}</dt>
            <dd className="mt-0.5 whitespace-pre-wrap break-words text-[14px] font-medium">{valeur ?? '—'}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

export default function DetailsFiche() {
  const { id } = useParams()
  const [f, setF] = useState(null)
  const [msg, setMsg] = useState('Chargement…')

  useEffect(() => { (async () => {
    const { data, error } = await supabase.from('defisc_leads').select('*').eq('id', id).single()
    data ? setF(data) : setMsg(error?.message ?? 'Fiche introuvable.')
  })() }, [id])

  const nom = f ? [f.civilite, f.prenom, f.nom].filter(Boolean).join(' ') : ''
  return (
    <AppShell backHref="/defisc" title={nom || 'Détails'}
      actions={f && <Link href={`/defisc/${f.id}`} className="btn-accent">Modifier</Link>}
      subtitle={f ? STATUTS[f.statut]?.label : undefined}>
      {!f ? <p style={{ color: 'var(--muted)' }}>{msg}</p> : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Bloc titre="Contact" lignes={[['Mobile', f.mobile], ['Fixe', f.fixe], ['E-mail', f.email]]} />
          <Bloc titre="Rendez-vous" lignes={[
            ['Date', date(f.date_rdv)], ['Heure', f.heure_rdv?.slice(0, 5)], ['Type', f.type_rdv],
            ['Nature', f.nature], ['Lieu', f.lieu_rdv], ['Vérif', f.verif]]} />
          <Bloc titre="Profil financier" lignes={[
            ['Âge', f.age], ['Situation familiale', f.situation_familiale], ['Enfants', f.enfants], ['Profession', f.profession],
            ['Revenus annuels nets', eur(f.revenus_annuels)], ['Impôts sur le revenu', eur(f.impots)],
            ['Crédit / loyer / RP', eur(f.credit_loyer)], ['Endettement', f.endettement != null ? `${f.endettement} %` : null],
            ['Épargne', eur(f.epargne)], ['Capacité d\'épargne', eur(f.capacite_epargne)], ['Intérêt exprimé', f.interet]]} />
          <Bloc titre="Suivi" lignes={[['Commentaire d\'origine', f.commentaire], ['Notes', f.notes]]} />
        </div>
      )}
    </AppShell>
  )
}
