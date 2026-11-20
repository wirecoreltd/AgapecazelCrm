'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import AppShell from '@/components/AppShell'
import DefiscForm from '@/components/DefiscForm'
import { estVerrouillee } from '@/lib/defisc'

export default function Fiche() {
  const { id } = useParams()
  const [fiche, setFiche] = useState(null)
  const [role, setRole] = useState(undefined)
  const [msg, setMsg] = useState('Chargement…')

  useEffect(() => { (async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const { data: p } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    setRole(p?.role ?? null)
    const { data, error } = await supabase.from('defisc_leads').select('*').eq('id', id).single()
    data ? setFiche(data) : setMsg(error?.message ?? 'Fiche introuvable.')
  })() }, [id])

  const titre = fiche ? `${fiche.prenom ?? ''} ${fiche.nom ?? ''}`.trim() || 'Fiche' : 'Fiche'
  const verrouillee = fiche && role !== undefined && estVerrouillee(fiche, role)

  return (
    <AppShell backHref="/defisc" title={titre}
      actions={fiche && !verrouillee && <Link href={`/defisc/${fiche.id}/details`} className="btn-ghost" style={{ border: '1px solid var(--border-strong)' }}>Voir la fiche</Link>}>
      {!fiche || role === undefined ? (
        <p style={{ color: 'var(--muted)' }}>{msg}</p>
      ) : verrouillee ? (
        <div className="card p-6 text-sm">
          <p className="font-medium">Cette fiche est « Validée » : elle n'est plus modifiable.</p>
          <p className="mt-1" style={{ color: 'var(--muted)' }}>Seul un administrateur peut la modifier.</p>
          <Link href={`/defisc/${fiche.id}/details`} className="btn-accent mt-4 inline-block">Voir les détails</Link>
        </div>
      ) : (
        <div className="card p-4 sm:p-6"><DefiscForm fiche={fiche} /></div>
      )}
    </AppShell>
  )
}
