import { createClient } from '@supabase/supabase-js'

// Numéro au format français : 0612345678
function normFR(n) {
  const d = String(n || '').replace(/\D/g, '')
  if (d.startsWith('33') && d.length === 11) return '0' + d.slice(2)
  if (d.length === 9) return '0' + d
  return d
}
const cle9 = (n) => String(n || '').replace(/\D/g, '').slice(-9)

function scinder(nomComplet) {
  const t = String(nomComplet || '').trim().split(/\s+/).filter(Boolean)
  if (t.length < 2) return { nom: t[0] ?? '', prenom: '' }
  let prenom = t[t.length - 1]
  if (prenom === prenom.toUpperCase()) prenom = prenom.charAt(0) + prenom.slice(1).toLowerCase()
  return { nom: t.slice(0, -1).join(' '), prenom }
}

export async function GET(req) {
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

  // L'utilisateur doit être connecté (jeton envoyé par la page)
  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')
  const { data: u } = token ? await admin.auth.getUser(token) : { data: null }
  if (!u?.user) return Response.json({ error: 'Non autorisé' }, { status: 401 })

  const numero = new URL(req.url).searchParams.get('numero') || ''
  if (cle9(numero).length < 9) return Response.json({ error: 'Numéro invalide' }, { status: 400 })

  const principal = normFR(numero)
  const fiche = {}
  fiche[/^0[67]/.test(principal) ? 'mobile' : 'telephone_1'] = principal

  // Infos de la liste de référence
  const { data: ann } = await admin.rpc('find_annuaire_by_phone', { p_number: numero })
  const c = ann?.[0]
  if (c) {
    Object.assign(fiche, scinder(c.nom))
    if (c.prenom) fiche.prenom = c.prenom
    if (c.adresse) fiche.adresse = c.adresse
    if (c.code_postal) fiche.code_postal = c.code_postal
    if (c.ville) fiche.ville = c.ville
    if (c.email) fiche.email = c.email
    if (c.chauffage) fiche.chauffage = c.chauffage
    if (c.proprietaire) fiche.proprietaire = c.proprietaire
    if (c.nb_personnes) fiche.nb_personnes = c.nb_personnes
    for (const autre of [c.telephone, c.telephone_2]) {
      if (autre && cle9(autre) !== cle9(numero)) { fiche.telephone_2 = normFR(autre); break }
    }
  }

  // Historique des appels vers ce numéro (rattaché automatiquement à la création du lead)
  const { data: appels } = await admin
    .from('appels_non_rattaches')
    .select('created_at, resultat, direction, duree_secondes, user_id, numero_externe')
    .order('created_at', { ascending: false })
    .limit(200)
  const histo = (appels ?? []).filter((a) => cle9(a.numero_externe) === cle9(numero)).slice(0, 20)

  return Response.json({ fiche, trouve_dans_annuaire: !!c, appels: histo })
}
