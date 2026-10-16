import type { Metadata } from "next";
import LegalShell from "@/components/LegalShell";

export const metadata: Metadata = { title: "Mentions légales | EclaFoyer" };

export default function MentionsLegales() {
  return (
    <LegalShell titre="Mentions légales" maj="[DATE]">
      <h2>Éditeur du site</h2>
      <p>Le site EclaFoyer est édité par <b>[NOM DE VOTRE SOCIÉTÉ]</b>, [forme juridique] au capital de [montant] €, immatriculée sous le numéro SIREN [SIREN] au RCS de [ville].</p>
      <p>Siège social : [Adresse complète].<br />Téléphone : [TÉLÉPHONE]<br />E-mail : [E-MAIL DE CONTACT]<br />N° de TVA intracommunautaire : [N° TVA]</p>
      <p>Directeur de la publication : [Nom et prénom].</p>

      <h2>Hébergement</h2>
      <p>Le site est hébergé par Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis. Les données du formulaire sont stockées via Supabase ([région d'hébergement à préciser]).</p>

      <h2>Nature du service</h2>
      <p>EclaFoyer propose un sondage gratuit permettant d'estimer l'éligibilité à des aides pour des travaux de rénovation énergétique et de mettre en relation les personnes intéressées avec un conseiller, puis avec un installateur partenaire de notre réseau. Le résultat affiché est indicatif et ne constitue ni une offre ferme ni une promesse d'aide : il est soumis à la validation de votre dossier.</p>

      <h2>Propriété intellectuelle</h2>
      <p>L'ensemble des contenus du site (textes, logo, graphismes, images) est protégé par le droit d'auteur. Toute reproduction sans autorisation écrite préalable est interdite.</p>

      <h2>Données personnelles</h2>
      <p>Le traitement de vos données est décrit dans notre <a href="/confidentialite">politique de confidentialité</a>.</p>

      <h2>Médiation de la consommation</h2>
      <p>Conformément à l'article L.612-1 du Code de la consommation, vous pouvez recourir gratuitement à un médiateur de la consommation : [Nom et coordonnées du médiateur].</p>
    </LegalShell>
  );
}
