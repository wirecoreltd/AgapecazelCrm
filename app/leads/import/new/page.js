'use client'
import AppShell from '@/components/AppShell'
import ImportContactForm from '@/components/ImportContactForm'

export default function NouveauContactImport() {
  return (
    <AppShell backHref="/leads/import" backLabel="Liste temporaire" title="Nouveau contact temporaire">
      <div className="card p-4 sm:p-6"><ImportContactForm /></div>
    </AppShell>
  )
}
