import AppShell from '@/components/AppShell'
import DefiscForm from '@/components/DefiscForm'

export default function NouvelleFiche() {
  return (
    <AppShell backHref="/defisc" title="Nouvelle fiche">
      <div className="card p-4 sm:p-6"><DefiscForm /></div>
    </AppShell>
  )
}
