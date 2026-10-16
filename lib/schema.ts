import { z } from "zod";

export const CONSENT_VERSION = "v1";
const FR_PHONE = /^(?:(?:\+|00)33|0)\s*[1-9](?:[\s.\-]*\d{2}){4}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const normalizePhone = (p: string) => {
  const d = p.replace(/[^\d+]/g, "").replace(/^00/, "+").replace(/^\+33/, "0");
  return "+33" + d.replace(/^0/, "");
};

export const HEURES = ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00"] as const;
const yn = z.enum(["oui", "non"]);

// Réponses du sondage pompe à chaleur.
const answersSchema = z
  .object({
    proprietaire: yn,
    surface_habitable: z.coerce.number().min(9).max(2000).optional(), // montant exact (facultatif)
    surface_tranche: z.coerce.number().int().min(0).max(2).optional(), // tranche choisie dans le menu (0 à 2)
    personnes_foyer_fiscal: z.coerce.number().int().min(1).max(20),
    revenu_fiscal_reference: z.coerce.number().min(0).max(10_000_000).optional(), // montant exact (facultatif)
    revenu_tranche: z.coerce.number().int().min(0).max(3).optional(), // tranche choisie dans le menu (0 à 3)
    maprimerenov_5_ans: yn.optional(),
    type_logement: z.enum(["maison", "appartement"]).optional(),
    chauffage: z.enum(["gaz", "fioul", "electrique_autre"]).optional(),
    annee_construction: z.enum(["apres_2009", "avant_2009"]).optional(),
  })
  .refine((v) => v.revenu_fiscal_reference !== undefined || v.revenu_tranche !== undefined, { path: ["revenu_tranche"], message: "Revenu requis" })
  .refine((v) => v.surface_habitable !== undefined || v.surface_tranche !== undefined, { path: ["surface_tranche"], message: "Surface requise" });

// Formulaire unique : coordonnées + réponses + date/heure de rappel + consentement.
export const leadSchema = z
  .object({
    prenom: z.string().trim().min(1).max(80),
    nom: z.string().trim().min(1).max(80),
    adresse: z.string().trim().min(3).max(200),
    code_postal: z.string().trim().regex(/^\d{5}$/),
    ville: z.string().trim().min(1).max(100),
    email: z.string().trim().toLowerCase().max(200).optional().default(""), // facultatif
    telephone: z.string().trim().regex(FR_PHONE),
    answers: answersSchema,
    rappel_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    rappel_heure: z.enum(HEURES).optional(),
    consent: z.boolean().optional(), // plus exigé à l'enregistrement : le consentement est recueilli à l'étape du créneau
    preview: z.boolean().optional(), // aperçu du résultat : rien n'est enregistré
    website: z.string().optional(),
  })
  .superRefine((d, ctx) => {
    if (d.email && !EMAIL.test(d.email)) ctx.addIssue({ code: "custom", path: ["email"], message: "E-mail invalide" });
    if (d.rappel_date) {
      const t = Date.parse(d.rappel_date + "T00:00:00Z");
      if (!Number.isFinite(t) || t < Date.now() - 2 * 86400000 || t > Date.now() + 120 * 86400000)
        ctx.addIssue({ code: "custom", path: ["rappel_date"], message: "Date invalide" });
    }
  });

// Étape « créneau de rappel » : elle complète une demande déjà enregistrée (identifiée par son id + un jeton à usage unique).
export const rappelSchema = z.object({
  id: z.union([z.string().min(1).max(64), z.number()]),
  token: z.string().min(8).max(80),
  rappel_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  rappel_heure: z.enum(HEURES),
  consent: z.literal(true), // case « J'accepte d'être contacté(e)… » cochée
  website: z.string().optional(),
});
