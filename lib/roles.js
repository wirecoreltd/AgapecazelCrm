// Rôles : admin (tout), agent (leads, appels, stats / défisc), call_center (leads / défisc)
// Modules : pac (pompe à chaleur) et defisc (défiscalisation). L'accès à un module est indépendant du rôle.
export const ROLES = {
  admin: { label: 'Admin', pages: null }, // null = tout
  agent: { label: 'Agent', pages: ['/leads', '/appels', '/stats', '/defisc'] },
  call_center: { label: 'Call Center', pages: ['/leads', '/defisc'] },
}
export const ROLE_VALUES = Object.keys(ROLES)
export const roleLabel = (r) => ROLES[r]?.label ?? r ?? ''

export const MODULES = {
  pac: { label: 'Pompe à chaleur', home: '/leads', prefixes: ['/leads', '/appels', '/stats'] },
  defisc: { label: 'Défiscalisation', home: '/defisc', prefixes: ['/defisc'] },
}
export const MODULE_KEYS = Object.keys(MODULES)

const startsWithPath = (path, p) => path === p || path.startsWith(p + '/')
// Pages réservées à l'admin, même à l'intérieur d'un module
const ADMIN_ONLY = ['/defisc/import']

// Module auquel appartient une page (null = page commune : admin, logs, choix…)
export const moduleOf = (path) =>
  MODULE_KEYS.find((k) => MODULES[k].prefixes.some((p) => startsWithPath(path, p))) ?? null

// Modules réellement utilisables : l'admin a tout, les autres uniquement ceux cochés (pac par défaut si colonne absente)
export const modulesOf = (role, modules) =>
  role === 'admin' ? MODULE_KEYS : (modules ?? ['pac']).filter((m) => MODULE_KEYS.includes(m))

// modules : liste brute du profil. Si elle est fournie, le module de la page est aussi contrôlé.
export const canAccess = (role, path, modules) => {
  const r = ROLES[role]
  if (!r) return false
  const mod = moduleOf(path)
  if (mod && role !== 'admin' && !modulesOf(role, modules).includes(mod)) return false
  if (ADMIN_ONLY.some((p) => startsWithPath(path, p))) return role === 'admin'
  if (!r.pages) return true
  return r.pages.some((p) => startsWithPath(path, p))
}
// Page d'accueil après connexion : l'écran de choix (il redirige seul s'il n'y a qu'un module)
export const homeFor = () => '/choix'
