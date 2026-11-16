// Message de bienvenue envoyé par WhatsApp à la création d'un utilisateur.
// ➜ Modifiez ce texte pour changer le message par défaut.
export const NOM_SOCIETE = 'Agapecazel'

export function messageBienvenue({ nom_complet, email, password }, lien) {
  const prenom = (nom_complet ?? '').trim().split(/\s+/)[0]
  return [
    `Bonjour ${prenom},`,
    `Votre accès au CRM ${NOM_SOCIETE} est prêt.`,
    '',
    `Lien : ${lien}`,
    `Identifiant : ${email}`,
    `Mot de passe temporaire : ${password}`,
    '',
    'À votre première connexion, vous devrez choisir votre propre mot de passe.',
  ].join('\n')
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
