// Message WhatsApp envoyé à la création d'un contact.
// ➜ Modifiez ce texte pour changer le message par défaut. Variables : {civilite} {nom} {agent} {societe}
export const NOM_SOCIETE = 'Agapecazel'

export const MESSAGE_MODELE =
  "Bonjour {civilite} {nom}, c'est {agent} de {societe}. " +
  "Suite à notre échange, je vous confirme la bonne réception de votre demande concernant votre projet de pompe à chaleur. " +
  "Je reste à votre disposition pour toute question. Bonne journée !"

export function construireMessage(lead, agent) {
  const civilite = lead?.civilite === 'Mme' ? 'Madame' : lead?.civilite === 'M' ? 'Monsieur' : ''
  return MESSAGE_MODELE
    .replace('{civilite}', civilite)
    .replace('{nom}', lead?.nom ?? '')
    .replace('{agent}', agent || 'votre conseiller')
    .replace('{societe}', NOM_SOCIETE)
    .replace(/Bonjour\s+,/, 'Bonjour,')
    .replace(/\s{2,}/g, ' ')
}

// Numéro au format international sans « + » (exigé par wa.me). France par défaut.
export function numeroWhatsApp(brut) {
  let n = String(brut ?? '').replace(/[^\d+]/g, '')
  if (!n) return null
  if (n.startsWith('+')) n = n.slice(1)
  else if (n.startsWith('00')) n = n.slice(2)
  else if (n.startsWith('0')) n = '33' + n.slice(1)
  return n.length >= 10 ? n : null
}

export const lienWhatsApp = (numero, message) =>
  `https://wa.me/${numero}?text=${encodeURIComponent(message)}`
