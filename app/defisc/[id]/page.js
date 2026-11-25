'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import AppShell from '@/components/AppShell'
import RetourDefisc from '@/components/RetourDefisc'
import HistoriqueStatuts from '@/components/HistoriqueStatuts'
import { STATUTS_CC, STATUTS_ADMIN, estVerrouillee } from '@/lib/defisc'

const date = (d) => (d ? new Date(d + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : null)

function Bloc({ titre, lignes }) {
  return (
    <div className="card p-4 sm:p-6">
      <h2 className="section-heading mb-3">{titre}</h2>
      <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
        {lignes.map(([label, valeur]) => (
          <div key={label}>
            <dt className="text-[10px] font-medium uppercase tracking-wide" style={{ color: 'var(--muted)' }}>{label}</dt>
            <dd className="mt-0.5 whitespace-pre-wrap break-words text-[14px] font-medium">{valeur ?? '—'}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

export default function DetailsFiche() {
  const { id } = useParams()
  const [f, setF] = useState(null)
  const [role, setRole] = useState(null)
  const [msg, setMsg] = useState('Chargement…')

  useEffect(() => { (async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const { data: p } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    setRole(p?.role ?? null)
    const { data, error } = await supabase.from('defisc_leads').select('*').eq('id', id).single()
    data ? setF(data) : setMsg(error?.message ?? 'Fiche introuvable.')
  })() }, [id])

  const nom = f ? [f.civilite, f.prenom, f.nom].filter(Boolean).join(' ') : ''
  return (
    <AppShell backHref="/defisc" title={nom || 'Détails'}
      actions={f && !estVerrouillee(f, role) && <Link href={`/defisc/${f.id}`} className="btn-accent">Modifier</Link>}
      subtitle={f ? `Call center : ${STATUTS_CC[f.statut_cc]?.label ?? '—'} · Admin : ${STATUTS_ADMIN[f.statut_admin]?.label ?? '—'}` : undefined}>
      {!f ? <p style={{ color: 'var(--muted)' }}>{msg}</p> : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Bloc titre="Contact" lignes={[['Mobile', f.mobile], ['Fixe', f.fixe], ['E-mail', f.email]]} />
          <Bloc titre="Rendez-vous" lignes={[
            ['Date', date(f.date_rdv)], ['Heure', f.heure_rdv?.slice(0, 5)], ['Type', f.type_rdv],
            ['Nature', f.nature], ['Lieu', f.lieu_rdv], ['Vérif', f.verif]]} />
          <Bloc titre="Suivi" lignes={[['Commentaire d\'origine', f.commentaire], ['Notes', f.notes]]} />
          <HistoriqueStatuts ficheId={f.id} />
          {['admin', 'call_center'].includes(role) && <RetourDefisc ficheId={f.id} role={role} />}
        </div>
      )}
    </AppShell>
  )
}
