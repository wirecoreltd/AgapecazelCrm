'use client'
import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import AppShell from '@/components/AppShell'
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
    <AppShell backHref="/leads" title="Modifier le lead">
      {cree && (
        <p className="mb-4 rounded-lg px-3 py-2.5 text-sm" style={{ background: 'var(--accent-soft)', color: 'var(--ink)' }}>
          Lead enregistré. Vous pouvez maintenant ajouter des documents ou un appel ci-dessous.
        </p>
      )}
      {lead ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="card p-4 sm:p-6 lg:col-span-2">
            <LeadForm lead={lead} />
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
