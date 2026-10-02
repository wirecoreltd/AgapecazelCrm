import { createClient } from '@supabase/supabase-js'
import { timingSafeEqual } from 'crypto'

const RESULTATS = [
  'Ne répond pas (NRP)', 'Client réfléchit', "N'a pas décroché", 'Rappeler plus tard',
  'Répondeur', 'Numéro erroné', 'Pas intéressé', 'RDV fixé', 'Autre',
]
const STATUT_LABEL = {
  ANSWERED: 'décroché', MISSED_CALL: 'manqué', BUSY: 'occupé',
  WRONG_NUMBER: 'numéro erroné', VMS: 'répondeur', UNKNOWN: 'statut inconnu',
}

function keyOk(req) {
  const expected = process.env.ONOFF_WEBHOOK_KEY
  if (!expected) return false
  const a = Buffer.from(req.headers.get('x-api-key') || '')
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}

function resultatDe(p) {
  // Si l'agent a mis un tag OnOff portant exactement le nom d'un résultat, on le prend
  const tag = (p.tags || []).map((t) => t.tagName).find((n) => RESULTATS.includes(n))
  if (tag) return tag
  if (p.eventName === 'VM' || p.callDirection === 'INBOUND') return 'Autre'
  switch (p.callStatus) {
    case 'MISSED_CALL':
    case 'BUSY': return "N'a pas décroché"
    case 'VMS': return 'Répondeur'
    case 'WRONG_NUMBER': return 'Numéro erroné'
    default: return 'Autre'
  }
}

function noteDe(p) {
  const sens = p.eventName === 'VM' ? 'Message vocal reçu' : p.callDirection === 'INBOUND' ? 'Appel entrant' : 'Appel sortant'
  const parts = [`[OnOff] ${sens}`, STATUT_LABEL[p.callStatus]]
  if (p.callDuration) parts.push(`${Math.floor(p.callDuration / 60)} min ${String(p.callDuration % 60).padStart(2, '0')} s`)
  let note = parts.filter(Boolean).join(' · ')
  if (p.callNotes) note += `\n${p.callNotes}`
  return note
}

export async function POST(req) {
  if (!keyOk(req)) return Response.json({ error: 'Non autorisé' }, { status: 401 })

  let p
  try { p = await req.json() } catch { return Response.json({ error: 'JSON invalide' }, { status: 400 }) }
  if (!['CDR', 'RECORDING', 'VM'].includes(p?.eventName)) return Response.json({ ignored: true })

  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

  // 1. Retrouver le lead par numéro
  const { data: leads, error: leadErr } = await admin.rpc('find_lead_by_phone', { p_number: p.externalNumber || '' })
  if (leadErr) return Response.json({ error: leadErr.message }, { status: 500 }) // 5xx => OnOff réessaie
  const lead = leads?.[0]
  // Numéro inconnu (ou test de validation OnOff) : on répond 200 pour éviter les renvois inutiles
  if (!lead) return Response.json({ ok: true, matched: false })

  // 2. Retrouver l'agent par email (même email dans OnOff et dans le CRM), sinon l'agent du lead
  let userId = null
  if (p.onoffUserEmail) {
    const { data: prof } = await admin.from('profiles').select('id').ilike('email', p.onoffUserEmail).maybeSingle()
    userId = prof?.id ?? null
  }
  userId = userId ?? lead.agent_id ?? null
  if (!userId) return Response.json({ ok: true, matched: true, saved: false, reason: 'agent introuvable' })

  // 3. Enregistrer (upsert = idempotent)
  const { error } = await admin.from('lead_appels').upsert({
    onoff_id: String(p.id),
    lead_id: lead.id,
    user_id: userId,
    resultat: resultatDe(p),
    note: noteDe(p),
    direction: p.callDirection ?? null,
    duree_secondes: p.callDuration ?? null,
    numero_externe: p.externalNumber ?? null,
    enregistrement_url: p.callRecordingUrl || p.voicemailUrl || null,
    source: 'onoff',
    created_at: p.callStarted || new Date().toISOString(),
  }, { onConflict: 'onoff_id' })
  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json({ ok: true, matched: true, saved: true })
}
