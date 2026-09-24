'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import LeadForm from '@/components/LeadForm'

export default function EditLead() {
  const { id } = useParams()
  const [lead, setLead] = useState(null)
  const [msg, setMsg] = useState('Chargement…')

  useEffect(() => { (async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const { data: p } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (p?.role === 'branch') return setMsg('La modification est réservée au call center.')
    const { data } = await supabase.from('leads').select('*').eq('id', id).single()
    data ? setLead(data) : setMsg('Lead introuvable.')
  })() }, [id])

  return (
    <main className="mx-auto max-w-2xl p-6">
      <Link href={`/leads/${id}`} className="text-sm underline">Retour à la fiche</Link>
      <h1 className="my-4 text-2xl font-bold">Modifier le lead</h1>
      {lead ? <LeadForm lead={lead} /> : <p>{msg}</p>}
    </main>
  )
}
