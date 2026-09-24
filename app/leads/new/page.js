import Link from 'next/link'
import LeadForm from '@/components/LeadForm'

export default function NewLead() {
  return (
    <main className="mx-auto max-w-2xl p-6">
      <Link href="/leads" className="text-sm underline">Retour aux leads</Link>
      <h1 className="my-4 text-2xl font-bold">Nouveau lead</h1>
      <LeadForm />
    </main>
  )
}
