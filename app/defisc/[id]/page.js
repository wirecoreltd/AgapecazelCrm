'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import AppShell from '@/components/AppShell'
import DefiscForm from '@/components/DefiscForm'

export default function Fiche() {
  const { id } = useParams()
  const [fiche, setFiche] = useState(null)
  const [msg, setMsg] = useState('Chargement…')

  useEffect(() => { (async () => {
    const { data, error } = await supabase.from('defisc_leads').select('*').eq('id', id).single()
    data ? setFiche(data) : setMsg(error?.message ?? 'Fiche introuvable.')
  })() }, [id])

  return (
    <AppShell backHref="/defisc" title={fiche ? `${fiche.prenom ?? ''} ${fiche.nom ?? ''}`.trim() || 'Fiche' : 'Fiche'}>
      {fiche ? <div className="card p-4 sm:p-6"><DefiscForm fiche={fiche} /></div> : <p style={{ color: 'var(--muted)' }}>{msg}</p>}
    </AppShell>
  )
}
