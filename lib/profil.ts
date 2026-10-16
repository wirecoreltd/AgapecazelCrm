// Calcul du profil et textes du résultat : exécuté côté SERVEUR (ne pas importer depuis un composant "use client").
// Les plafonds de ressources (publics) sont dans lib/plafonds.ts, à mettre à jour chaque année.
import { seuils, zoneFromCodePostal, type Zone } from "@/lib/plafonds";

export type Profil = "bleu" | "jaune" | "violet" | "rose";
export type { Zone };

const PAC_COUT = 14500;
const PAC_RESTE_A_CHARGE_BLEU = 1; // reste à charge estimé (symbolique) pour le profil bleu
const eur = (n: number) => n.toLocaleString("fr-FR").replace(/\u202f/g, " ") + " €";

export function getProfil(rfr: number, personnes: number, zone: Zone): Profil {
  const s = seuils(zone, personnes);
  if (rfr <= s[0]) return "bleu";
  if (rfr <= s[1]) return "jaune";
  if (rfr <= s[2]) return "violet";
  return "rose";
}

export type Resultat = { eligible: boolean; titre: string; message: string; detail: string; profil?: Profil };

export function evaluerPac(p: { rfr: number; personnes: number; codePostal: string; proprietaire: "oui" | "non" }): { profil: Profil; zone: Zone; resultat: Resultat } {
  const zone = zoneFromCodePostal(p.codePostal);
  const profil = getProfil(p.rfr, p.personnes, zone);
  const eligible = profil === "bleu" && p.proprietaire === "oui";
  const base = { eligible, profil };
  const resultat: Resultat = eligible
    ? { ...base, titre: "Bonne nouvelle, vous êtes éligible à la pompe à chaleur à 1 € symbolique",
        message: "Profil bleu : votre pompe à chaleur ne vous coûte que 1 €",
        detail: `Pompe à chaleur d'environ ${eur(PAC_COUT)}, installée pour ${eur(PAC_RESTE_A_CHARGE_BLEU)} symbolique. Sous réserve de validation de votre dossier par un conseiller.` }
    : { ...base, titre: "Merci, votre demande est enregistrée",
        message: "Après analyse de votre dossier, un reste à charge est à prévoir",
        detail: "Un conseiller vous rappelle pour en parler avec vous et étudier les aides qui s'appliquent à votre situation." };
  return { profil, zone, resultat };
}

export const RESULTAT_GENERIQUE: Resultat = {
  eligible: false,
  titre: "Demande envoyée",
  message: "Un conseiller vous rappelle très vite",
  detail: "Il étudiera votre situation avec vous, sans engagement.",
};

// Tranches du menu « Surface habitable ».
export const SURFACES = ["Moins de 70 m²", "Entre 70 et 90 m²", "Plus de 90 m²"] as const;
