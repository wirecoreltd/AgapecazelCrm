'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import AppShell from '@/components/AppShell'
import StatusBadge from '@/components/StatusBadge'
import DocumentManager from '@/components/DocumentManager'
import CallLog from '@/components/CallLog'

const GROUPS = [
  {
    titre: 'Contact',
    champs: [
      ['civilite', 'Civilité'], ['adresse', 'Adresse'], ['code_postal', 'Code postal'], ['ville', 'Ville'],
      ['mobile', 'Mobile'], ['telephone_1', 'Téléphone 1'], ['telephone_2', 'Téléphone 2'],
    ],
  },
  {
    titre: 'Logement',
    champs: [
      ['proprietaire', 'Propriétaire'], ['nb_personnes', 'Nb de personnes'], ['revenus', 'Revenus'],
      ['maison_plus_15_ans', 'Maison +15 ans'], ['type_habitat', "Type d'habitat"],
      ['surface_habitable', 'Surface habitable (m²)'], ['chauffage', 'Type de chauffage'],
    ],
  },
  {
    titre: 'Projet',
    champs: [
      ['produit_1', 'Produit 1'], ['documents_requis', 'Documents à récupérer'],
      ['installateur', 'Installateur'], ['date_installation', "Date d'installation"],
    ],
  },
]

const fmt = (v) => (v == null || v === '' ? '—' : v === true ? 'Oui' : v === false ? 'Non' : v)

export default function ViewLead() {
  const { id } = useParams()
  const [lead, setLead] = useState(null)
  const [msg, setMsg] = useState('Chargement…')

  useEffect(() => { (async () => {
    const { data } = await supabase.from('leads').select('*').eq('id', id).single()
    data ? setLead(data) : setMsg('Lead introuvable.')
  })() }, [id])

  return (
    <AppShell
      backHref="/leads"
      title={lead ? `${lead.prenom ?? ''} ${lead.nom ?? ''}`.trim() || 'Lead' : 'Lead'}
      subtitle={lead ? <StatusBadge statut={lead.statut} /> : undefined}
      actions={lead && <Link href={`/leads/${id}/edit`} className="btn-accent">Modifier</Link>}
    >
      {lead ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            {GROUPS.map((g) => (
              <div key={g.titre} className="card p-4 sm:p-5">
                <h2 className="section-heading mb-3">{g.titre}</h2>
                <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
                  {g.champs.map(([k, l]) => (
                    <div key={k}>
                      <dt className="text-[12px]" style={{ color: 'var(--muted)' }}>{l}</dt>
                      <dd className="mt-0.5 text-[14px] font-medium">{fmt(lead[k])}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
            {lead.commentaire && (
              <div className="card p-4 sm:p-5">
                <h2 className="section-heading mb-3">Commentaire</h2>
                <p className="whitespace-pre-wrap text-[14px]">{lead.commentaire}</p>
              </div>
            )}
          </div>

          <div className="space-y-6 lg:col-span-1">
            <DocumentManager leadId={id} />
            <CallLog leadId={id} />
          </div>
        </div>
      ) : <p style={{ color: 'var(--muted)' }}>{msg}</p>}
    </AppShell>
  )
}
