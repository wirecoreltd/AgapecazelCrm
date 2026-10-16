// Champs importables (mêmes champs que le formulaire de lead)
export const IMPORT_FIELDS = [
  { key: 'civilite', label: 'Civilité', aliases: ['civilite', 'civ', 'titre', 'genre', 'sexe'] },
  { key: 'prenom', label: 'Prénom', aliases: ['prenom', 'first name', 'firstname'] },
  { key: 'nom', label: 'Nom', aliases: ['nom', 'last name', 'lastname', 'nom de famille'] },
  { key: 'adresse', label: 'Adresse', aliases: ['adresse', 'add', 'address', 'rue'] },
  { key: 'code_postal', label: 'Code postal', aliases: ['code postal', 'codepostal', 'cp', 'zip', 'postal'] },
  { key: 'ville', label: 'Ville', aliases: ['ville', 'city', 'commune'] },
  { key: 'mobile', label: 'Mobile', aliases: ['mobile', 'portable', 'gsm', 'tel mobile', 'telephone mobile'] },
  { key: 'telephone_1', label: 'Téléphone', aliases: ['tel', 'telephone', 'tel 1', 'telephone 1', 'phone', 'fixe', 'tel fixe'] },
  { key: 'telephone_2', label: 'Téléphone 2', aliases: ['tel 2', 'telephone 2'] },
  { key: 'email', label: 'Email', aliases: ['email', 'e mail', 'mail', 'courriel'] },
  { key: 'proprietaire', label: 'Propriétaire', aliases: ['proprietaire', 'proprio', 'owner'] },
  { key: 'nb_personnes', label: 'Nb de personnes', aliases: ['nb personnes', 'nbs personnes', 'nombre de personnes', 'personnes', 'nb pers', 'foyer'] },
  { key: 'revenus', label: 'Revenus', aliases: ['revenus', 'revenu', 'renvenu', 'income'] },
  { key: 'maison_plus_15_ans', label: 'Maison +15 ans', aliases: ['maison 15 ans', 'maison plus de 15 ans', 'maison plus 15 ans', 'maison15', 'maison 15'] },
  { key: 'type_habitat', label: "Type d'habitat", aliases: ['type habitat', 'habitat', 'type de logement', 'logement'] },
  { key: 'surface_habitable', label: 'Surface habitable', aliases: ['surface', 'surface habitable', 'm2', 'superficie'] },
  { key: 'chauffage', label: 'Type de chauffage', aliases: ['chauffage', 'type chauffage', 'type de chauffage', 'energie'] },
]

// Champs obligatoires dans la fiche lead (utilisés pour signaler ce qui manque)
export const REQUIRED_CRM = [
  ['civilite', 'Civilité'], ['adresse', 'Adresse'], ['code_postal', 'Code postal'], ['ville', 'Ville'],
  ['proprietaire', 'Propriétaire'], ['nb_personnes', 'Nb de personnes'], ['type_habitat', "Type d'habitat"],
  ['surface_habitable', 'Surface'], ['chauffage', 'Chauffage'],
]
export const missingFields = (r) =>
  REQUIRED_CRM.filter(([k]) => r[k] === null || r[k] === undefined || r[k] === '').map(([, l]) => l)

const norm = (s) =>
  String(s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ').trim()

// Devine le champ CRM de chaque colonne du fichier (un champ n'est attribué qu'une fois)
export function autoMap(headers) {
  const used = new Set()
  return headers.map((h) => {
    const n = norm(h)
    const f = IMPORT_FIELDS.find((f) => !used.has(f.key) && (f.aliases.map(norm).includes(n) || norm(f.label) === n))
    if (f) { used.add(f.key); return f.key }
    return ''
  })
}

// Clé de comparaison d'un numéro (pour les doublons)
export function phoneKey(v) {
  let d = String(v ?? '').replace(/\D/g, '')
  if (d.startsWith('0033')) d = '0' + d.slice(4)
  else if (d.length === 11 && d.startsWith('33')) d = '0' + d.slice(2)
  else if (/^[1-9]\d{8}$/.test(d)) d = '0' + d
  return d.length >= 6 ? d : ''
}

export const cleanPhone = (v) => {
  let s = String(v ?? '').trim().replace(/[\s.\-()]/g, '')
  if (!s) return null
  if (/^[1-9]\d{8}$/.test(s)) s = '0' + s // zéro initial perdu par Excel
  return s
}
const parseBool = (v) => {
  const n = norm(v)
  if (['oui', 'o', 'yes', 'y', 'true', '1', 'vrai', 'proprietaire'].includes(n)) return true
  if (['non', 'n', 'no', 'false', '0', 'faux', 'locataire'].includes(n)) return false
  return null
}
const parseInt0 = (v) => {
  const d = String(v ?? '').replace(/[^\d]/g, '')
  return d ? parseInt(d, 10) : null
}
const parseNum = (v) => {
  const s = String(v ?? '').replace(',', '.').replace(/[^\d.]/g, '')
  const n = parseFloat(s)
  return Number.isFinite(n) ? n : null
}
const parseCivilite = (v) => {
  const n = norm(v)
  if (['m', 'mr', 'monsieur', 'homme', 'h'].includes(n)) return 'M'
  if (['mme', 'madame', 'mlle', 'mademoiselle', 'femme', 'f'].includes(n)) return 'Mme'
  return null
}
const parseHabitat = (v) => {
  const n = norm(v)
  if (n.includes('maison')) return 'maison'
  if (n.includes('appart')) return 'appartement'
  return null
}
const parseChauffage = (v) => {
  const n = norm(v)
  if (!n) return null
  if (n.includes('condens')) return 'gaz condensation'
  if (n.includes('gaz')) return 'gaz naturel'
  if (n.includes('elec')) return 'électrique'
  if (n.includes('fioul') || n.includes('mazout')) return 'fioul'
  if (n.includes('bois') || n.includes('granul')) return 'bois'
  if (n.includes('aucun') || n.includes('pas de')) return 'pas de chauffage'
  if (n === 'autre') return 'autre'
  return null
}
const txt = (v) => { const s = String(v ?? '').trim(); return s || null }

// fieldIdx : { champ: index de colonne } ; cells : valeurs de la ligne
export function buildRow(fieldIdx, cells) {
  const get = (k) => (fieldIdx[k] === undefined ? '' : cells[fieldIdx[k]] ?? '')
  let cp = txt(get('code_postal'))
  if (cp && /^\d{4}$/.test(cp)) cp = '0' + cp
  return {
    civilite: parseCivilite(get('civilite')),
    prenom: txt(get('prenom')),
    nom: txt(get('nom')),
    adresse: txt(get('adresse')),
    code_postal: cp,
    ville: txt(get('ville')),
    mobile: cleanPhone(get('mobile')),
    telephone_1: cleanPhone(get('telephone_1')),
    telephone_2: cleanPhone(get('telephone_2')),
    email: txt(get('email')),
    proprietaire: parseBool(get('proprietaire')),
    nb_personnes: parseInt0(get('nb_personnes')),
    revenus: txt(get('revenus')),
    maison_plus_15_ans: parseBool(get('maison_plus_15_ans')),
    type_habitat: parseHabitat(get('type_habitat')),
    surface_habitable: parseNum(get('surface_habitable')),
    chauffage: parseChauffage(get('chauffage')),
  }
}

// Lecture CSV (séparateur ; , ou tabulation détecté automatiquement)
export function parseCSV(text) {
  text = text.replace(/^\uFEFF/, '')
  const first = text.split(/\r?\n/, 1)[0] ?? ''
  const delim = [';', '\t', ','].map((d) => [d, first.split(d).length]).sort((a, b) => b[1] - a[1])[0][0]
  const rows = []
  let row = [], cur = '', q = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++ } else q = false } else cur += c
    } else if (c === '"') q = true
    else if (c === delim) { row.push(cur); cur = '' }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      row.push(cur); cur = ''; rows.push(row); row = []
    } else cur += c
  }
  if (cur !== '' || row.length) { row.push(cur); rows.push(row) }
  return rows.filter((r) => r.some((x) => String(x).trim() !== ''))
}

// Prépare le formulaire « Nouveau lead » avec les données d'un contact de la liste temporaire
export function ajouterAuCrm(r, router) {
  const fiche = {
    civilite: r.civilite, prenom: r.prenom, nom: r.nom, adresse: r.adresse, code_postal: r.code_postal,
    ville: r.ville, mobile: r.mobile, telephone_1: r.telephone_1, telephone_2: r.telephone_2, email: r.email,
    proprietaire: r.proprietaire === null || r.proprietaire === undefined ? null : r.proprietaire ? 'oui' : 'non',
    nb_personnes: r.nb_personnes, revenus: r.revenus, maison_plus_15_ans: r.maison_plus_15_ans,
    type_habitat: r.type_habitat, surface_habitable: r.surface_habitable, chauffage: r.chauffage,
  }
  sessionStorage.setItem('prefill_lead', JSON.stringify({ fiche, appels: [] }))
  sessionStorage.setItem('import_lead_id', r.id)
  router.push('/leads/new')
}
