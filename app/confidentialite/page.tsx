import type { Metadata } from "next";
import LegalShell from "@/components/LegalShell";

export const metadata: Metadata = { title: "Politique de confidentialité | EclaFoyer" };

export default function Confidentialite() {
  return (
    <LegalShell titre="Politique de confidentialité" maj="[DATE]">
      <h2>Responsable du traitement</h2>
      <p>[NOM DE VOTRE SOCIÉTÉ], [Adresse], SIREN [SIREN]. Contact pour toute question relative à vos données : <b>[E-MAIL DPO]</b>.</p>

      <h2>Données collectées</h2>
      <p>Via le sondage, nous collectons : nom, prénom, adresse postale, téléphone, e-mail (facultatif), statut de propriétaire, surface habitable, nombre de personnes du foyer fiscal, revenu fiscal de référence, éventuelle aide MaPrimeRénov' perçue ces 5 dernières années, ainsi que la date et l'heure de rappel choisies.</p>

      <h2>Finalités et bases légales</h2>
      <ul>
        <li><b>Étudier votre éligibilité et vous rappeler</b> : votre consentement, donné en cochant la case avant l'envoi.</li>
        <li><b>Vous mettre en relation avec un installateur partenaire</b> : votre consentement. [À CONFIRMER : cette transmission doit aussi figurer dans le texte de la case de consentement du formulaire.]</li>
        <li><b>Sécurité et lutte contre le spam</b> : notre intérêt légitime.</li>
      </ul>

      <h2>Destinataires</h2>
      <p>Vos données sont accessibles à nos conseillers habilités et, pour donner suite à votre demande, aux installateurs de notre réseau de plus de 100 partenaires en France. Elles sont traitées par nos sous-traitants techniques : Vercel (hébergement) et Supabase (base de données). [Compléter si d'autres prestataires.]</p>

      <h2>Durée de conservation</h2>
      <p>Vos données sont conservées 3 ans maximum à compter de votre dernier contact avec nous, puis supprimées ou anonymisées.</p>

      <h2>Transferts hors Union européenne</h2>
      <p>[À préciser selon la région d'hébergement et les garanties des sous-traitants : clauses contractuelles types, etc.]</p>

      <h2>Vos droits</h2>
      <p>Vous disposez d'un droit d'accès, de rectification, d'effacement, de limitation, d'opposition et de portabilité, ainsi que du droit de retirer votre consentement à tout moment et de définir des directives sur le sort de vos données après votre décès. Pour les exercer, écrivez à [E-MAIL DPO]. Vous pouvez aussi introduire une réclamation auprès de la CNIL (cnil.fr).</p>
      <p>Vous pouvez également vous inscrire gratuitement sur la liste d'opposition au démarchage téléphonique : bloctel.gouv.fr.</p>

      <h2>Cookies</h2>
      <p>[À compléter : ce site n'utilise actuellement aucun traceur publicitaire ou de mesure d'audience. Si vous en ajoutez, une bannière de consentement sera nécessaire.]</p>
    </LegalShell>
  );
}
