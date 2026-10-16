'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import AppShell from '@/components/AppShell'
import { ajouterAuCrm } from '@/lib/importFields'

const GROUPS = [
  { titre: 'Identité', champs: [['civilite', 'Civilité'], ['prenom', 'Prénom'], ['nom', 'Nom']] },
  {
    titre: 'Contact',
    champs: [
      ['adresse', 'Adresse'], ['code_postal', 'Code postal'], ['ville', 'Ville'],
      ['mobile', 'Mobile'], ['telephone_1', 'Téléphone 1'], ['telephone_2', 'Téléphone 2'], ['email', 'Email'],
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
]
const fmt = (v) => (v === null || v === undefined || v === '' ? '—' : v === true ? 'Oui' : v === false ? 'Non' : v)

export default function VoirContactImport() {
  const { id } = useParams()
  const router = useRouter()
  const [row, setRow] = useState(null)
  const [msg, setMsg] = useState('Chargement…')

  useEffect(() => {
    ;(async () => {
      const { data, error } = await supabase.from('leads_import').select('*').eq('id', id).single()
      data ? setRow(data) : setMsg(error?.message ?? 'Contact introuvable.')
    })()
  }, [id])

  return (
    <AppShell
      backHref="/leads/import"
      backLabel="Liste temporaire"
      title={row ? [row.prenom, row.nom].filter(Boolean).join(' ') || 'Contact' : 'Contact'}
      subtitle={row ? `Importé le ${new Date(row.created_at).toLocaleDateString('fr-FR')}${row.fichier ? ` · ${row.fichier}` : ''}` : undefined}
      actions={row && (
        <>
          <Link href={`/leads/import/${id}/edit`} className="btn-ghost" style={{ border: '1px solid var(--border-strong)' }}>Modifier</Link>
          <button type="button" onClick={() => ajouterAuCrm(row, router)} className="btn-accent">Ajouter au CRM</button>
        </>
      )}
    >
      {row ? (
        <div className="space-y-4">
          {GROUPS.map((g) => (
            <div key={g.titre} className="card p-4 sm:p-5">
              <h2 className="section-heading mb-3">{g.titre}</h2>
              <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
                {g.champs.map(([k, l]) => (
                  <div key={k}>
                    <dt className="text-[12px]" style={{ color: 'var(--muted)' }}>{l}</dt>
                    <dd className="mt-0.5 text-[14px] font-medium" style={{ color: '#000' }}>{fmt(row[k])}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>
      ) : <p style={{ color: 'var(--muted)' }}>{msg}</p>}
    </AppShell>
  )
}
