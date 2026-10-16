'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import AppShell from '@/components/AppShell'
import ImportContactForm from '@/components/ImportContactForm'

export default function ModifierContactImport() {
  const { id } = useParams()
  const [row, setRow] = useState(null)
  const [msg, setMsg] = useState('Chargement…')

  useEffect(() => {
    ;(async () => {
      const { data, error } = await supabase.from('leads_import').select('*').eq('id', id).single()
      data ? setRow(data) : setMsg(error?.message ?? 'Contact introuvable.')
    })()
  }, [id])

  return (
    <AppShell backHref="/leads/import" backLabel="Liste temporaire" title="Modifier le contact">
      {row ? (
        <div className="card p-4 sm:p-6"><ImportContactForm row={row} /></div>
      ) : <p style={{ color: 'var(--muted)' }}>{msg}</p>}
    </AppShell>
  )
}
