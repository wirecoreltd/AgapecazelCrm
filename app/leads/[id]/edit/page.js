'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import LeadForm from '@/components/LeadForm'
import DocumentManager from '@/components/DocumentManager'
import CallLog from '@/components/CallLog'

export default function EditLead() {
  const { id } = useParams()
  const cree = useSearchParams().get('cree') === '1'
  const [lead, setLead] = useState(null)
  const [msg, setMsg] = useState('Chargement…')

  useEffect(() => { (async () => {
    const { data, error } = await supabase.from('leads').select('*').eq('id', id).single()
    data ? setLead(data) : setMsg(error?.message ?? 'Lead introuvable.')
  })() }, [id])

  return (
    <main className="mx-auto max-w-2xl p-6">
      <Link href="/leads" className="text-sm underline">Retour aux leads</Link>
      <h1 className="my-4 text-2xl font-bold">Modifier le lead</h1>
      {cree && <p className="mb-4 rounded bg-green-50 p-3 text-sm text-green-800">Lead enregistré. Vous pouvez maintenant ajouter des documents ou un appel ci-dessous.</p>}
      {lead ? (
        <div className="space-y-8">
          <LeadForm lead={lead} />
          <DocumentManager leadId={id} />
          <CallLog leadId={id} />
        </div>
      ) : <p>{msg}</p>}
    </main>
  )
}
