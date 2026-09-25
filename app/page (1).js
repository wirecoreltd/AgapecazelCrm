import AppShell from '@/components/AppShell'
import LeadForm from '@/components/LeadForm'

export default function NewLead() {
  return (
    <AppShell backHref="/leads" title="Nouveau lead">
      <div className="card p-4 sm:p-6">
        <LeadForm />
      </div>
    </AppShell>
  )
}
