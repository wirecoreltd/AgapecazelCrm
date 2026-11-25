// Outils du module Défiscalisation : statuts, conversions Excel, découpage du commentaire.

// Deux statuts par fiche :
//  - statut_cc    : posé par le call center (l'admin peut aussi le modifier)
//  - statut_admin : posé uniquement par l'admin (vide tant qu'il n'a rien décidé)
export const STATUTS_CC = {
  a_confirmer: { label: 'À confirmer', color: '#361fa1' },
  confirme: { label: 'Confirmé', color: '#a86614' },
  reporte: { label: 'Reporté', color: '#8f7a0b' },
  annule: { label: 'Annulé', color: '#d63220' },
}
export const STATUT_CC_KEYS = Object.keys(STATUTS_CC)
export const STATUTS_ADMIN = {
  valide: { label: 'Validé', color: '#15803d' },
  reporte: { label: 'Reporté', color: '#8f7a0b' },
  lapin: { label: 'Lapin', color: '#9333ea' },
  hors_cible: { label: 'Hors cible', color: '#64748b' },
  refus: { label: 'Refus', color: '#be123c' },
  annule: { label: 'Annulé', color: '#d63220' },
}
export const STATUT_ADMIN_KEYS = Object.keys(STATUTS_ADMIN)
// Seul « Validé » fige la fiche : les autres statuts admin (Reporté, Lapin, Hors cible, Refus) laissent le call center modifier
export const STATUTS_ADMIN_FINAUX = ['valide']

// Fiche figée pour les non-admin : uniquement quand l'admin l'a validée
export const estVerrouillee = (f, role) =>
  role !== 'admin' && !!f && STATUTS_ADMIN_FINAUX.includes(f.statut_admin)
// Le call center peut changer son statut tant que l'admin n'a pas validé la fiche
export const peutChangerStatutCC = (f, role) => role === 'admin' || !STATUTS_ADMIN_FINAUX.includes(f?.statut_admin)
// RDV encore à traiter (alertes demain / aujourd'hui / heure atteinte)
export const estActif = (f) => (f.statut_admin ? f.statut_admin === 'reporte' : ['a_confirmer', 'confirme', 'reporte'].includes(f.statut_cc))

// ---------- Modèle de commentaire pré-rempli pour les NOUVELLES fiches ----------
export const COMMENTAIRE_MODELE = [
  'Age : ',
  'Situation Familiale : ',
  'Enfants : ',
  'Profession : ',
  'Revenus Total (annuel net) : ',
  'Impots sur revenus : ',
  'Crédit / loyer / RP : ',
  'Endettement : ',
  'épargne : ',
  "Capacité d'épargne : ",
].join('\n')
// Vrai si le texte est le modèle laissé tel quel (on n'enregistre alors aucun commentaire)
const sansEspaces = (t) => String(t ?? '').replace(/\r/g, '').split('\n').map((l) => l.trim()).join('\n').trim()
export const estModeleVide = (t) => sansEspaces(t) === sansEspaces(COMMENTAIRE_MODELE)

// ---------- Téléphone : même logique que l'API des appels (format 0612345678) ----------
export function normFR(n) {
  if (n == null || n === '') return ''
  let d = typeof n === 'number' ? String(Math.round(n)) : String(n).replace(/\D/g, '')
  if (d.startsWith('33') && d.length === 11) return '0' + d.slice(2)
  if (d.length === 9) return '0' + d // Excel a mangé le 0 initial
  return d
}
export const cle9 = (n) => String(n || '').replace(/\D/g, '').slice(-9)

// ---------- Dates / heures Excel ----------
const pad = (n) => String(n).padStart(2, '0')
export function toISODate(v) {
  if (v == null || v === '') return null
  if (v instanceof Date) return isNaN(v) ? null : v.toISOString().slice(0, 10)
  if (typeof v === 'number') { // numéro de série Excel (jours depuis 1899-12-30)
    const d = new Date(Math.round((v - 25569) * 86400000))
    return isNaN(d) ? null : d.toISOString().slice(0, 10)
  }
  const s = String(v).trim()
  let m = s.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})$/)
  if (m) return `${m[3].length === 2 ? '20' + m[3] : m[3]}-${pad(m[2])}-${pad(m[1])}`
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null
}
export function toTime(v) {
  if (v == null || v === '') return null
  if (typeof v === 'number') { // fraction de jour : 0.5833 -> 14:00
    const t = Math.round((v % 1) * 1440)
    return `${pad(Math.floor(t / 60) % 24)}:${pad(t % 60)}`
  }
  const m = String(v).trim().match(/^(\d{1,2})\s*[:hH]\s*(\d{2})?/)
  return m ? `${pad(m[1])}:${m[2] ?? '00'}` : null
}

// ---------- Nombres : "132K" -> 132000, "15%" -> 15, "1 750" -> 1750 ----------
function lireNombre(txt) {
  // K/M = unité seulement si elle n'est pas le début d'un mot (« 5000 Monsieur » ≠ 5000 M)
  const m = String(txt ?? '').match(/^[\s:]*(-?\d[\d\s.,]*)([kKmM](?![\p{L}]))?/u)
  if (!m) return { n: null, reste: String(txt ?? '').trim() }
  let n = parseFloat(m[1].replace(/\s/g, '').replace(',', '.'))
  if (isNaN(n)) return { n: null, reste: String(txt).trim() }
  if (m[2]) n *= /k/i.test(m[2]) ? 1000 : 1000000
  const reste = String(txt).slice(m[0].length).replace(/^\s*(€|euros?|%)/i, '').trim()
  return { n, reste }
}

// ---------- Découpage de la colonne COMMENTAIRE ----------
// Repère les libellés connus et prend le texte jusqu'au libellé suivant.
// Ce qui n'est pas reconnu reste vide : le texte brut est toujours conservé à côté.
const LIBELLES = [
  ['age', /\bage\b\s*:?/g],
  ['situation_familiale', /situation\s+familiale\s*:?/g],
  ['enfants', /\benfants?\b\s*:?/g],
  ['profession', /\bprofession\b\s*:?/g],
  ['revenus_annuels', /revenus?\s+total\s*(\(\s*annuel\s+net\s*\))?\s*:?|revenus?\s*\(\s*annuel\s+net\s*\)\s*:?/g],
  ['impots', /imp[oô]ts?\s*(sur\s+(les\s+)?revenus?)?\s*:?/g],
  ['credit_loyer', /credit\s*\/\s*loyer(\s*\/\s*rp)?\s*:?/g],
  ['endettement', /endettement\s*:?/g],
  ['capacite_epargne', /capacite\s+d['’]?\s*epargne\s*:?/g],
  ['epargne', /\bepargne\b\s*:?/g],
]
const NUM = ['age', 'enfants', 'revenus_annuels', 'impots', 'credit_loyer', 'endettement', 'epargne', 'capacite_epargne']

export function parseCommentaire(texte) {
  const out = {}
  const t = String(texte ?? '').normalize('NFC')
  if (!t.trim()) return out
  const n = t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase() // même longueur que t pour le français
  if (n.length !== t.length) return out // cas exotique : on ne découpe pas, le brut est conservé

  let trouves = []
  for (const [cle, re] of LIBELLES) {
    for (const m of n.matchAll(re)) trouves.push({ cle, debut: m.index, fin: m.index + m[0].length })
  }
  trouves.sort((a, b) => a.debut - b.debut || b.fin - a.fin)
  // « épargne » à l'intérieur de « capacité d'épargne » n'est pas un libellé à part
  trouves = trouves.filter((x, i) => !trouves.some((y, j) => j !== i && y.debut <= x.debut && y.fin >= x.fin && (y.fin - y.debut) > (x.fin - x.debut)))

  trouves.forEach((x, i) => {
    if (out[x.cle] !== undefined) return // 1re occurrence seulement (Monsieur ; Madame viendrait après)
    const brut = t.slice(x.fin, trouves[i + 1]?.debut ?? t.length).trim()
    if (NUM.includes(x.cle)) {
      const { n: val, reste } = lireNombre(brut)
      if (val != null) out[x.cle] = ['age', 'enfants'].includes(x.cle) ? Math.round(val) : val
      // Texte qui suit le dernier chiffre de la dernière rubrique : c'est l'intérêt exprimé
      if (i === trouves.length - 1 && reste) out.interet = reste
    } else if (brut) {
      // « Profession Monsieur » : « Monsieur » est le titre du bloc, pas une profession
      if (!(x.cle === 'profession' && /^(monsieur|madame|mme|m\.?)$/i.test(brut))) out[x.cle] = brut
    }
  })
  return out
}

// ---------- Une ligne Excel -> une fiche ----------
// Colonnes attendues : CIVILITE, NOM, PRENOM, TYPE RDV, NATURE, DATE RDV, HEURE RDV, LIEU RDV, MOBILE, FIXE, E-MAIL, COMMENTAIRE, VERIF
const norm = (s) => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '')
const ALIAS = {
  civilite: ['civilite'], nom: ['nom'], prenom: ['prenom'], type_rdv: ['typerdv'], nature: ['nature'],
  date_rdv: ['daterdv'], heure_rdv: ['heurerdv'], lieu_rdv: ['lieurdv'], mobile: ['mobile'], fixe: ['fixe'],
  email: ['email'], commentaire: ['commentaire'], verif: ['verif'],
}
const txt = (v) => { const s = String(v ?? '').trim(); return s || null }

export function ligneVersFiche(row, colonnes) {
  const get = (k) => row[colonnes[k]]
  const commentaire = txt(get('commentaire'))
  return {
    civilite: txt(get('civilite')), nom: txt(get('nom')), prenom: txt(get('prenom')),
    type_rdv: txt(get('type_rdv')), nature: txt(get('nature')),
    date_rdv: toISODate(get('date_rdv')), heure_rdv: toTime(get('heure_rdv')), lieu_rdv: txt(get('lieu_rdv')),
    mobile: normFR(get('mobile')) || null, fixe: normFR(get('fixe')) || null, email: txt(get('email')),
    commentaire, verif: txt(get('verif')),
    ...parseCommentaire(commentaire),
  }
}

// En-têtes (1re ligne) -> index de colonne
export function reperer(entetes) {
  const cols = {}
  entetes.forEach((h, i) => {
    const k = Object.keys(ALIAS).find((key) => ALIAS[key].includes(norm(h)))
    if (k && cols[k] === undefined) cols[k] = i
  })
  return cols
}
