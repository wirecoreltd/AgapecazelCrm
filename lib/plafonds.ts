// Plafonds de ressources MaPrimeRénov' au 1er janvier 2026 (revenu fiscal de référence).
// Données publiques : elles servent à afficher les tranches du menu ET au calcul du profil côté serveur.
// ⚠ À mettre à jour chaque année (nouveau tableau officiel, en janvier).
export type Zone = "idf" | "hors_idf";

// Seuils [bleu, jaune, violet] pour 1 à 5 personnes + montant par personne supplémentaire.
const PLAFONDS: Record<Zone, { base: number[][]; extra: number[] }> = {
  hors_idf: {
    base: [[17363, 22259, 31185], [25393, 32553, 45842], [30540, 39148, 55196], [35676, 45735, 64550], [40835, 52348, 73907]],
    extra: [5151, 6598, 9357],
  },
  idf: {
    base: [[24031, 29253, 40851], [35270, 42933, 60051], [42357, 51564, 71846], [49455, 60208, 84562], [56580, 68877, 96817]],
    extra: [7116, 8663, 12257],
  },
};

const IDF_DEPARTEMENTS = ["75", "77", "78", "91", "92", "93", "94", "95"];
export const zoneFromCodePostal = (cp: string): Zone => (IDF_DEPARTEMENTS.includes(cp.slice(0, 2)) ? "idf" : "hors_idf");

/** Plafonds [bleu, jaune, violet] du foyer. */
export function seuils(zone: Zone, personnes: number): number[] {
  const t = PLAFONDS[zone];
  const n = Math.max(1, Math.floor(personnes));
  return n <= 5 ? t.base[n - 1] : t.base[4].map((v, i) => v + (n - 5) * t.extra[i]);
}

const eur = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " €";

/** Les 4 choix du menu « Revenu fiscal de référence » : bleu, jaune, violet, rose (dans cet ordre). */
export function tranchesRevenu(zone: Zone, personnes: number): string[] {
  const [b, j, v] = seuils(zone, personnes);
  return [`Jusqu'à ${eur(b)}`, `Entre ${eur(b + 1)} et ${eur(j)}`, `Entre ${eur(j + 1)} et ${eur(v)}`, `Plus de ${eur(v)}`];
}

/** Revenu « représentatif » d'une tranche (profil bleu = tranche 0, etc.), pour le calcul du profil. */
export function revenuDeTranche(zone: Zone, personnes: number, tranche: number): number {
  const [b, j, v] = seuils(zone, personnes);
  return [b, j, v, v + 1][tranche];
}
