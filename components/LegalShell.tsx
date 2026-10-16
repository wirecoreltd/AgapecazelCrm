import Image from "next/image";
import Link from "next/link";

export default function LegalShell({ titre, maj, children }: { titre: string; maj: string; children: React.ReactNode }) {
  return (
    <>
      <header className="top"><div className="wrap bar">
        <Link href="/" aria-label="EclaFoyer, accueil"><Image src="/logoEF.png" alt="EclaFoyer" width={168} height={42} priority /></Link>
        <Link className="cta-btn sm" href="/">Retour au site</Link>
      </div></header>
      <main className="wrap legal">
        <h1>{titre}</h1>
        <p className="fine">Dernière mise à jour : {maj}</p>
        {children}
      </main>
      <footer className="foot">© EclaFoyer · Tous droits réservés · <Link href="/mentions-legales">Mentions légales</Link> · <Link href="/confidentialite">Politique de confidentialité</Link></footer>
    </>
  );
}
