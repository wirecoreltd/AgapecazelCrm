// Rôles : admin (tout), agent (leads, appels, stats), call_center (leads seulement)
export const ROLES = {
  admin: { label: 'Admin', pages: null }, // null = tout
  agent: { label: 'Agent', pages: ['/leads', '/appels', '/stats'] },
  call_center: { label: 'Call Center', pages: ['/leads'] },
}
export const ROLE_VALUES = Object.keys(ROLES)
export const roleLabel = (r) => ROLES[r]?.label ?? r ?? ''

export const canAccess = (role, path) => {
  const r = ROLES[role]
  if (!r) return false
  if (!r.pages) return true
  return r.pages.some((p) => path === p || path.startsWith(p + '/'))
}
// Page d'accueil d'un rôle autorisé
export const homeFor = () => '/leads'
