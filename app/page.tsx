import Image from "next/image";
import Funnel from "@/components/Funnel";
import { AVIS, SITE, nom, telHref } from "@/lib/site";

const CHECK = "M5 12.5l4.5 4.5L19 7.5";
const PHONE = "M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z";
function Icon({ d, size = 24, color = "currentColor", sw = 2 }: { d: string; size?: number; color?: string; sw?: number }) {
  return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>);
}
const Tick = ({ size = 14 }: { size?: number }) => (<span className="tick"><Icon d={CHECK} size={size} color="#fff" sw={3.2} /></span>);

// Nombre d'installateurs : modifiez-le dans lib/site.ts (vide = les mentions disparaissent).
const NB = SITE.installateurs;
const CERTIF = SITE.certif;
const PLUS = NB ? (NB.endsWith("+") ? `plus de ${NB.slice(0, -1)}` : NB) : "";
const RESEAU_TXT = NB ? `Nous travaillons avec ${PLUS} installateurs à travers la France` : "Nous travaillons avec des installateurs à travers la France";

const PRODUITS = [
  { titre: "Chauffage", sous: "Moins d'électricité, plus de confort", d: "M12 2c1 4 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-4-1-6 1-9z",
    points: ["Elle capte la chaleur de l'air extérieur : moins d'énergie qu'un chauffage électrique classique", "Chaud l'hiver, frais l'été avec les modèles réversibles", "Une chaleur douce et régulière, sans à-coups"] },
  { titre: "Eau chaude", sous: "Douche, salle de bain, cuisine", d: "M12 2.7s6 6.2 6 10.8a6 6 0 0 1-12 0C6 8.9 12 2.7 12 2.7z",
    points: ["Selon le modèle, elle chauffe aussi votre eau sanitaire", "De l'eau chaude dans toute la maison", "Un seul équipement pour tout gérer"] },
  { titre: "Budget et valeur", sous: "Moins exposé aux hausses de prix", d: "M3 17l6-6 4 4 8-8M15 7h6v6",
    points: ["Vous dépendez moins du fioul ou du gaz, dont les prix varient", "Une meilleure performance énergétique peut valoriser votre bien", "Une facture d'énergie plus maîtrisée"] },
];

const AVANTAGES = [
  { d: "M5 19C5 9 11 4 20 4c0 9-5 15-15 15zM5 19l8-8", t: "Moins d'énergie consommée", s: "selon votre logement" },
  { d: "M3 11l9-8 9 8M5 10v10h14V10", t: "Un confort optimal", s: "en toute saison" },
  { d: "M12 2a10 10 0 100 20 10 10 0 000-20zM2 12h20M12 2c3 3 4 6.5 4 10s-1 7-4 10c-3-3-4-6.5-4-10s1-7 4-10z", t: "Un geste pour la planète", s: "" },
  { d: "M12 3c4.4 0 8 1.3 8 3s-3.6 3-8 3-8-1.3-8-3 3.6-3 8-3zM4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6", t: "Des aides financières possibles", s: "(sous conditions)" },
];

const ETAPES = [
  { d: "M12 2a10 10 0 100 20 10 10 0 000-20zM2 12h20M12 2c3 3 4 6.5 4 10s-1 7-4 10c-3-3-4-6.5-4-10s1-7 4-10z", t: "Vous découvrez l'offre", s: "Vous en apprenez plus sur la pompe à chaleur et ses avantages." },
  { d: "M9 4h6v3H9zM7 5H5v16h14V5h-2M8 12h8M8 16h5", t: "Vous répondez aux questions", s: "Quelques minutes suffisent pour renseigner votre situation." },
  { d: "M5 3h14v18H5zM8 7h8M8 11h2M12 11h2M8 15h2M12 15h2", t: "Vous découvrez votre profil", s: "Nous estimons votre éligibilité : résultat immédiat." },
  { d: PHONE, t: "Un conseiller vous rappelle", s: "À la date et à l'heure que vous avez choisies." },
  { d: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.9M16 3.1a4 4 0 010 7.8", t: "Mise en relation", s: "Un installateur partenaire de votre secteur étudie votre projet." },
];

const GARANTIES = [
  ["Vérification gratuite", "Aucun paiement n'est demandé pour savoir si vous êtes éligible."],
  ["Rien n'est signé à la fin", "L'installateur étudie votre projet et vous remet un devis. Vous décidez librement."],
  ["Vos données, avec votre accord", "Vos coordonnées et vos réponses sont transmises à un installateur partenaire pour traiter votre demande, uniquement si vous validez."],
  ["Vous pouvez tout vérifier", "France Rénov', le service public, vous informe gratuitement avant tout engagement."],
];

const CONDITIONS = [
  ["Propriétaire", "Occupant d'une maison ou d'un appartement."],
  ["Revenus sous plafond", "Selon la composition du foyer et le lieu d'habitation. La simulation le vérifie pour vous."],
  ["Logement existant", "L'installateur vérifie avec vous l'ancienneté du logement et le chauffage à remplacer."],
];

const FAQ = [
  ["Est-ce vraiment gratuit ?", "Oui. La vérification d'éligibilité est gratuite et ne vous engage à rien. Vous décidez ensuite."],
  ["Que veut dire « 1 € symbolique » ?", "Selon votre profil de revenus, les aides publiques peuvent couvrir l'essentiel du coût de l'installation. Le reste à charge exact figure sur le devis, que vous recevez avant tout engagement. L'offre est soumise à conditions et à validation de votre dossier."],
  ["Qui va m'appeler ?", `Un conseiller de ${nom()} vous rappelle à la date et à l'heure choisies, pour confirmer votre demande et vous mettre en relation avec un installateur partenaire de votre secteur.`],
  ["Qui réalise les travaux ?", `Nous travaillons avec ${NB ? PLUS : "des"} installateurs à travers la France${CERTIF ? `, entreprises certifiées ${CERTIF}` : ""}. C'est l'installateur qui étudie votre projet, établit le devis et réalise les travaux.`],
  ["Pourquoi demander mes revenus ?", "Les aides dépendent de votre revenu fiscal de référence et de la taille de votre foyer. Vous pouvez aussi ne pas le renseigner : l'installateur le vérifiera avec vous."],
  ["Que deviennent mes données ?", "Elles servent à traiter votre demande et, avec votre accord, sont transmises à un installateur partenaire. Rien n'est enregistré tant que vous n'avez pas validé votre demande de rappel. Détails dans la politique de confidentialité."],
];

export default function Home() {
  return (
    <>
      <header className="top"><div className="wrap bar">
        <a href="#top" aria-label="EclaFoyer, accueil"><Image src="/logoEF.png" alt="EclaFoyer" width={168} height={42} priority /></a>
        <nav className="nav" aria-label="Navigation principale">
          <a href="#comment">Comment ça marche</a><a href="#avantages">Avantages</a><a href="#garanties">Nos engagements</a><a href="#faq">FAQ</a>
        </nav>
        <div className="bar-r">
          {SITE.tel && <a className="topphone" href={telHref(SITE.tel)}><Icon d={PHONE} size={18} /><span className="tp-num">{SITE.tel}</span></a>}
          <a className="cta-btn sm" href="#simulateur">Je vérifie</a>
        </div>
      </div></header>

      <div className="notice"><div className="wrap">Avant de vous engager, le service public vous informe gratuitement sur les aides : <a href="https://france-renov.gouv.fr" target="_blank" rel="noopener noreferrer">france-renov.gouv.fr</a></div></div>

      <main id="top">
        {/* 1. Hero */}
        <section className="hero">
          <div className="wrap hero-in">
            <div className="hero-txt">
              {NB && <div className="netchip"><b>{NB}</b><span>Nous travaillons avec {PLUS} installateurs à travers la France{CERTIF && <>, <span className="nc-c">entreprises certifiées {CERTIF}</span></>}</span></div>}
              <h1>Pompe à chaleur à <em>1 € symbolique</em> : vérifiez votre éligibilité</h1>
              <p className="lead">Répondez à quelques questions en 2 minutes : votre profil s'affiche tout de suite, puis un conseiller vous rappelle à l'heure de votre choix.</p>
              <ul className="ticks">
                {["Vérification gratuite", "Sans engagement, rien n'est signé", "Un rappel à la date et l'heure que vous choisissez"].map((t) => (<li key={t}><Tick />{t}</li>))}
              </ul>
              <p className="fine">Offre soumise à conditions de ressources et à validation de votre dossier.</p>
            </div>
            <div id="simulateur" className="hero-form"><Funnel /></div>
          </div>
        </section>

        {/* 3. Comment ça marche */}
        <section className="sec" id="comment">
          <div className="wrap">
            <div className="sec-h"><span className="eyebrow">En un coup d'œil</span><h2>Comment ça marche</h2></div>
            <div className="steps s5">
              {ETAPES.map((e, i) => (
                <div className="step" key={e.t}>
                  <span className="step-n">{i + 1}</span>
                  <span className="step-ic"><Icon d={e.d} size={26} /></span>
                  <h3>{e.t}</h3><p>{e.s}</p>
                </div>
              ))}
            </div>
            <p className="center" style={{ marginTop: 34 }}><a className="cta-btn" href="#simulateur">Faire ma simulation gratuite</a></p>
          </div>
        </section>

        {/* 4. Offre 1 € */}
        <section className="sec alt">
          <div className="wrap">
            <div className="offer">
              <div className="big">1<span> €</span></div>
              <div>
                <h2>symbolique pour votre pompe à chaleur</h2>
                <p>Pour les ménages qui remplissent les conditions de ressources. La simulation vous dit en 2 minutes si c'est votre cas.</p>
                <small>Sous réserve de validation de votre dossier. Le reste à charge exact figure sur le devis de l'installateur.</small>
              </div>
            </div>
          </div>
        </section>

        {/* 4b. Pourquoi nous */}
        <section className="sec why-s">
          <div className="wrap why">
            <div className="why-txt">
              <h2>Pourquoi choisir <em>{nom()}</em> ?</h2>
              <p>Notre objectif : vous faire gagner du temps. En quelques minutes, vous savez si vous pouvez prétendre aux aides, puis vous êtes mis en relation avec un installateur partenaire de votre secteur.</p>
              <ul className="ticks">
                {["Une vérification 100 % gratuite et sans engagement", "Un rappel à la date et à l'heure de votre choix", "Un installateur partenaire proche de chez vous"].map((t) => (<li key={t}><Tick />{t}</li>))}
              </ul>
            </div>
            <Image className="why-img" src="/images/famille.jpg" alt="Une famille souriante dans son salon" width={700} height={496} />
            <aside className="why-card">
              <span className="adv-ic"><Icon d="M5 19C5 9 11 4 20 4c0 9-5 15-15 15zM5 19l8-8" size={24} color="#0F6B6B" /></span>
              <h3>Un investissement pour demain</h3>
              <p>En choisissant une pompe à chaleur, vous pouvez réduire votre impact environnemental tout en améliorant votre confort au quotidien.</p>
            </aside>
          </div>
        </section>

        {/* 5. Avantages */}
        <section className="sec" id="avantages">
          <div className="wrap">
            <div className="sec-h"><span className="eyebrow">Pompe à chaleur</span><h2>Les avantages pour votre maison</h2></div>
            <div className="pcards">
              {PRODUITS.map((p) => (
                <article className="pcard" key={p.titre}>
                  <div className="ph"><span className="ph-ic"><Icon d={p.d} size={34} color="#fff" sw={2} /></span></div>
                  <div className="pbody">
                    <h3>{p.titre}</h3><div className="psub">{p.sous}</div>
                    <ul>{p.points.map((t) => (<li key={t}><Icon d={CHECK} size={18} color="#7DB955" sw={3} />{t}</li>))}</ul>
                  </div>
                </article>
              ))}
            </div>
            <p className="fine center" style={{ marginTop: 26 }}>Les performances varient selon le logement, l'équipement choisi et son installation.</p>
          </div>
        </section>

        {/* 6. Engagements + réseau */}
        <section className="sec" id="garanties" style={{ paddingTop: 0 }}>
          <div className="wrap">
            <div className="network">
              <div>
                {NB ? <div className="net-num">{NB}</div> : null}
                <div className="net-lbl">{RESEAU_TXT}</div>
                <p className="net-sub">{CERTIF ? `Des entreprises certifiées ${CERTIF}, pour trouver un professionnel près de chez vous.` : "Un réseau national pour trouver un professionnel près de chez vous."}</p>
              </div>
              <div className="net-list">
                {GARANTIES.map(([t, d]) => (<div className="net-item" key={t}><Tick size={18} /><div><b>{t}</b><p>{d}</p></div></div>))}
              </div>
            </div>
          </div>
        </section>

        {/* 7. Conditions */}
        <section className="sec alt">
          <div className="wrap">
            <div className="sec-h"><span className="eyebrow">Éligibilité</span><h2>Qui peut en profiter ?</h2></div>
            <div className="conds">
              {CONDITIONS.map(([t, d]) => (
                <div className="cond" key={t}><span className="cond-ic"><Icon d={CHECK} size={22} color="#fff" sw={3} /></span><b>{t}</b><p>{d}</p></div>
              ))}
            </div>
          </div>
        </section>

        {AVIS.length > 0 && (
          <section className="sec alt">
            <div className="wrap">
              <div className="sec-h"><span className="eyebrow">Avis</span><h2>Ils nous font confiance</h2></div>
              <div className="avis">
                {AVIS.map((a) => (<figure className="avi" key={a.nom}><blockquote>« {a.texte} »</blockquote><figcaption><b>{a.nom}</b> · {a.ville}</figcaption></figure>))}
              </div>
            </div>
          </section>
        )}

        {/* 8. FAQ */}
        <section className="sec" id="faq">
          <div className="wrap">
            <div className="faq-2">
            <div className="faq-h"><h2>Questions <em>fréquentes</em></h2><p>Vous avez des questions ? Retrouvez ici les réponses aux plus courantes.</p></div>
            <div className="faq-in">
              {FAQ.map(([q, a]) => (<details className="faq-i" key={q}><summary>{q}</summary><p>{a}</p></details>))}
            </div>
            </div>
          </div>
        </section>

        {/* 9. CTA final */}
        <section className="wrap" style={{ paddingBottom: 0 }}>
          <div className="final final-photo">
            <h2>Prêt à améliorer votre <em>confort</em> ?</h2>
            <p>Gratuit, sans engagement, en 2 minutes.</p>
            <a className="cta-btn" href="#simulateur">Commencer</a>
            {SITE.tel && <p className="final-tel">ou appelez-nous : <a href={telHref(SITE.tel)}>{SITE.tel}</a><br /><small>{SITE.horaires}</small></p>}
          </div>
        </section>
      </main>

      <footer className="foot">
        <div className="foot-row">
          <a className="foot-brand" href="#top" aria-label="EclaFoyer, haut de page"><Image className="foot-logo" src="/logoEF.png" alt="EclaFoyer" width={136} height={34} /></a>
          <div className="foot-c">© {new Date().getFullYear()} {nom()} · Tous droits réservés</div>
          <div className="foot-r">Mentions légales<span className="foot-dot"> · </span>Politique de confidentialité</div>
        </div>
      </footer>

      {/* Barre d'actions fixe sur mobile */}
      <div className="mbar">
        <a className="cta-btn" href="#simulateur">Vérifier mon éligibilité</a>
        {SITE.tel && <a className="mbar-call" href={telHref(SITE.tel)} aria-label={`Appeler le ${SITE.tel}`}><Icon d={PHONE} size={22} color="#fff" /></a>}
      </div>
    </>
  );
}
