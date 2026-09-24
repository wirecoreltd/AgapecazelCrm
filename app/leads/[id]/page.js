'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const ROWS = [
  ['civilite', 'Civilité'], ['prenom', 'Prénom'], ['nom', 'Nom'], ['adresse', 'Adresse'],
  ['code_postal', 'Code postal'], ['ville', 'Ville'], ['mobile', 'Mobile'],
  ['telephone_1', 'Téléphone 1'], ['telephone_2', 'Téléphone 2'], ['proprietaire', 'Propriétaire'],
  ['nb_personnes', 'Nb de personnes'], ['revenus', 'Revenus'], ['maison_plus_15_ans', 'Maison +15 ans'],
  ['type_habitat', "Type d'habitat"], ['surface_habitable', 'Surface habitable (m²)'],
  ['chauffage', 'Type de chauffage'], ['produit_1', 'Produit 1'],
  ['documents_a_recuperer', 'Documents à récupérer'], ['statut', 'Statut'],
]
const fmt = (v) => (v == null || v === '' ? '—' : v === true ? 'Oui' : v === false ? 'Non' : v)

export default function ViewLead() {
  const { id } = useParams()
  const [lead, setLead] = useState(null)
  const [staff, setStaff] = useState(false)
  const [msg, setMsg] = useState('Chargement…')

  useEffect(() => { (async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const { data: p } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    setStaff(!!p && p.role !== 'branch')
    const { data } = await supabase.from('leads').select('*').eq('id', id).single()
    data ? setLead(data) : setMsg('Lead introuvable.')
  })() }, [id])

  return (
    <main className="mx-auto max-w-2xl p-6">
      <Link href="/leads" className="text-sm underline">Retour aux leads</Link>
      <div className="my-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{lead ? `${lead.prenom ?? ''} ${lead.nom ?? ''}` : 'Lead'}</h1>
        {lead && staff && <Link href={`/leads/${id}/edit`} className="btn">Modifier</Link>}
      </div>
      {lead ? (
        <dl className="divide-y rounded border bg-white">
          {ROWS.map(([k, l]) => (
            <div key={k} className="grid grid-cols-3 gap-2 p-3 text-sm">
              <dt className="font-medium">{l}</dt>
              <dd className="col-span-2 whitespace-pre-wrap">{fmt(lead[k])}</dd>
            </div>
          ))}
        </dl>
      ) : <p>{msg}</p>}
    </main>
  )
}
