// ⚠️ À REMPLIR UNE SEULE FOIS : ces valeurs sont reprises sur toute la page, le formulaire, le pied de page et la page « Merci ».
// Un champ laissé vide n'est simplement pas affiché (ex. : pas de téléphone = pas de bouton « Appeler »).
const CFG = {
  societe: "",                          // raison sociale exacte, ex. "EclaFoyer SAS" (vide = « EclaFoyer »)
  tel: "",                              // ex. "06 12 34 56 78"
  email: "",                            // ex. "contact@eclafoyer.fr"
  siret: "",                            // ex. "123 456 789 00012"
  adresse: "",                          // ex. "12 rue X, 75000 Paris"
  horaires: "Du lundi au vendredi, 9h–19h",
  dpo: "",                              // e-mail pour exercer ses droits RGPD (vide = e-mail de contact)
  certif: "RGE QualiPAC & QualiPV",     // certifications de vos installateurs partenaires (vide = non affiché)
  installateurs: "100+",                // à ne garder que si c'est exact et prouvable ; vide = non affiché
};
// CONFIG = valeurs brutes saisies ci-dessus (vides si non remplies) ; SITE = valeurs avec repli, utilisées par le formulaire.
export const CONFIG = CFG;
export const SITE = { ...CFG, societe: CFG.societe || "EclaFoyer", dpo: CFG.dpo || CFG.email || "[E-MAIL DPO]" };
export const nom = () => SITE.societe;
export const dpoMail = () => SITE.dpo;
export const telHref = (t: string) => "tel:" + t.replace(/[^\d+]/g, "");

// Avis clients : à remplir UNIQUEMENT avec de vrais avis (publier de faux avis est illégal). Tant que la liste est vide, la section n'apparaît pas.
export const AVIS: { nom: string; ville: string; texte: string }[] = [];
