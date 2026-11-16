'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { construireMessage, numeroWhatsApp, lienWhatsApp } from '@/lib/whatsapp'

// Proposé juste après la création d'un lead : ouvre WhatsApp avec le message prêt, ou copie le message.
export default function WhatsAppMessage({ lead }) {
  const [message, setMessage] = useState('')
  const [copie, setCopie] = useState(false)

  useEffect(() => { (async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const { data: p } = user ? await supabase.from('profiles').select('nom_complet').eq('id', user.id).single() : { data: null }
    setMessage(construireMessage(lead, p?.nom_complet))
  })() }, [lead])

  const numero = numeroWhatsApp(lead.mobile) ?? numeroWhatsApp(lead.telephone_1) ?? numeroWhatsApp(lead.telephone_2)

  const copier = async () => {
    try { await navigator.clipboard.writeText(message); setCopie(true); setTimeout(() => setCopie(false), 2000) } catch {}
  }

  return (
    <div className="card mb-6 p-4 sm:p-5">
      <h2 className="section-heading mb-1">Message WhatsApp au client</h2>
      <p className="mb-3 text-[13px]" style={{ color: 'var(--muted)' }}>
        Vous pouvez adapter le message avant de l'envoyer.
        {numero ? ` Destinataire : +${numero}.` : ' Aucun numéro valide : copiez le message et collez-le dans WhatsApp.'}
      </p>
      <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4} className="inp" aria-label="Message WhatsApp" />
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        {numero && (
          <a href={lienWhatsApp(numero, message)} target="_blank" rel="noopener noreferrer" className="btn-accent text-center">
            Ouvrir dans WhatsApp
          </a>
        )}
        <button type="button" onClick={copier} className="btn-ghost" style={{ border: '1px solid var(--border-strong)' }}>
          {copie ? 'Message copié !' : 'Copier le message'}
        </button>
      </div>
    </div>
  )
}
