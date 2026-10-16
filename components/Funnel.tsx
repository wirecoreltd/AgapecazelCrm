"use client";
import { useEffect, useRef, useState } from "react";
import { dpoMail, nom } from "@/lib/site";
import { tranchesRevenu, zoneFromCodePostal } from "@/lib/plafonds";

type YN = "" | "oui" | "non";
type Resultat = { eligible: boolean; titre: string; message: string; detail: string; profil?: string };
const FIELDS: [string, string, string, string][] = [
  ["prenom", "Prénom", "given-name", "text"],
  ["nom", "Nom", "family-name", "text"],
  ["adresse", "Adresse", "street-address", "text"],
  ["code_postal", "Code postal", "postal-code", "text"],
  ["ville", "Ville", "address-level2", "text"],
  ["email", "E-mail (facultatif)", "email", "email"],
  ["telephone", "Téléphone", "tel", "tel"],
];
const CONSENT = () =>
  `J'accepte d'être contacté(e) par téléphone par ${nom()} au sujet de ma demande, et que les informations saisies (dont mes revenus) soient utilisées pour étudier mon éligibilité. Mes données sont conservées 3 ans maximum ; je peux exercer mes droits en écrivant à ${dpoMail()}.`;
const GRATUIT = "Ce sondage est totalement gratuit et ne vous engage à rien.";
const HEURES = ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00"];
const SURFACES = ["Moins de 70 m²", "Entre 70 et 90 m²", "Plus de 90 m²"]; // l'équivalent est enregistré côté serveur
const ANNEES: [string, string][] = [["apres_2009", "2009 ou après (moins de 15 ans)"], ["avant_2009", "Avant 2009 (plus de 15 ans)"]];
const heureLabel = (h: string) => h.replace(":", "h");
const dateLabel = (d: string) => new Date(d + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
const BADGE: Record<string, [string, string]> = { bleu: ["#1D4ED8", "#fff"], jaune: ["#F59E2B", "#0E2A2F"], violet: ["#7C3AED", "#fff"], rose: ["#DB2777", "#fff"] };
const FR_PHONE = /^(?:(?:\+|00)33|0)\s*[1-9](?:[\s.\-]*\d{2}){4}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
function fieldError(k: string, v: string): string {
  const t = (v ?? "").trim();
  if (k === "email") return t && !EMAIL.test(t) ? "E-mail invalide" : "";
  if (!t) return "Champ obligatoire";
  if (k === "code_postal" && !/^\d{5}$/.test(t)) return "Code postal à 5 chiffres";
  if (k === "telephone" && !FR_PHONE.test(t)) return "Numéro de téléphone invalide";
  if (k === "adresse" && t.length < 3) return "Adresse trop courte";
  return "";
}
const COORD_KEYS = ["prenom", "nom", "adresse", "code_postal", "ville", "email", "telephone"];
const LAST_Q = 6, RESULT = 7, TOTAL = 7;

type A = { proprio: YN; type: string; chauff: string; annee: string; surface: string; nbPers: string; tranche: string; mpr: YN };
const A0: A = { proprio: "", type: "", chauff: "", annee: "", surface: "", nbPers: "", tranche: "", mpr: "" };

export default function Funnel() {
  const [step, setStep] = useState(0); // 0 coordonnées · 1-6 questions · 7 résultat + rappel + consentement
  const [f, setF] = useState<Record<string, string>>({});
  const [a, setA] = useState<A>(A0);
  const [consent, setConsent] = useState(false);
  const [hp, setHp] = useState("");
  const [date, setDate] = useState("");
  const [heure, setHeure] = useState("");
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [res, setRes] = useState<Resultat | null>(null);
  const [lead, setLead] = useState<{ id: string | number; token: string } | null>(null);
  // Les 4 choix du revenu (bleu, jaune, violet, rose) dépendent de la zone (code postal) et du nombre de personnes.
  const labels = a.nbPers ? tranchesRevenu(zoneFromCodePostal((f.code_postal ?? "").trim()), Number(a.nbPers)) : [];
  // À chaque changement d'étape, on remonte au début du formulaire (sans saut si son début est déjà visible).
  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) { mounted.current = true; return; }
    const el = document.getElementById("simulateur");
    if (el && el.getBoundingClientRect().top < 80) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [step, done]);
  const set = <K extends keyof A>(k: K, v: A[K]) => setA((p) => ({ ...p, [k]: v }));

  function validate(s: number): string {
    if (s === 1 && !a.proprio) return "Indiquez si vous êtes propriétaire.";
    if (s === 2 && !a.type) return "Indiquez votre type de logement.";
    if (s === 3 && !a.chauff) return "Indiquez votre énergie de chauffage actuelle.";
    if (s === 4) {
      if (!a.annee) return "Indiquez l'année de construction de votre logement.";
      if (a.surface === "") return "Indiquez votre surface chauffée.";
    }
    if (s === 5) {
      const n = Number(a.nbPers);
      if (a.nbPers === "" || !Number.isInteger(n) || n < 1 || n > 20) return "Indiquez le nombre de personnes de votre foyer fiscal.";
      if (a.tranche === "") return "Indiquez votre revenu fiscal de référence (sur votre avis d'imposition).";
    }
    return "";
  }

  async function send() {
    const answers: Record<string, string | number> = {
      proprietaire: a.proprio, surface_tranche: Number(a.surface), personnes_foyer_fiscal: Number(a.nbPers),
      revenu_tranche: Number(a.tranche), type_logement: a.type, chauffage: a.chauff, annee_construction: a.annee,
    };
    if (a.mpr) answers.maprimerenov_5_ans = a.mpr;
    setBusy(true);
    try {
      const r = await fetch("/api/leads", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...f, answers, preview: false, website: hp }),
      });
      const j = await r.json().catch(() => ({}));
      if (r.ok && j.resultat) { if (j.id !== undefined && j.token) setLead({ id: j.id, token: j.token }); setBusy(false); return j.resultat as Resultat; }
      const fe: Record<string, string[]> = j.fields ?? {};
      setErrs(Object.fromEntries(Object.keys(fe).map((k) => [k, "Valeur invalide"]))); setMsg(j.error ?? "Une erreur est survenue. Réessayez.");
      if (Object.keys(fe).some((k) => COORD_KEYS.includes(k))) setStep(0); // coordonnée invalide : on y retourne
    } catch { setMsg("Connexion impossible. Réessayez."); }
    setBusy(false);
    return null;
  }

  async function next() {
    if (step === 0) {
      const e: Record<string, string> = {};
      FIELDS.forEach(([k]) => { const m = fieldError(k, f[k] ?? ""); if (m) e[k] = m; });
      setErrs(e);
      if (Object.keys(e).length) return setMsg(Object.values(e).includes("Champ obligatoire") ? "Merci de remplir tous les champs obligatoires." : "Merci de corriger les champs indiqués.");
    }
    const m = validate(step);
    if (step !== 0) setErrs({});
    if (m) return setMsg(m);
    setMsg("");
    if (step < LAST_Q) return setStep(step + 1);
    if (lead && res) return setStep(RESULT); // déjà enregistré : on ne crée pas de doublon
    const r = await send(); // le serveur calcule le résultat ET enregistre toutes les données
    if (r) { setRes(r); setStep(RESULT); }
  }
  const back = () => { setMsg(""); setStep(Math.max(0, step - 1)); };

  // Choix du créneau : complète la demande déjà enregistrée.
  async function finalize() {
    setMsg("");
    if (!date || !heure) return setMsg("Choisissez la date et l'heure de votre rappel.");
    if (date < new Date().toISOString().slice(0, 10)) return setMsg("Choisissez une date à partir d'aujourd'hui.");
    if (!consent) return setMsg("Cochez la case ci-dessus pour finaliser le sondage.");
    if (!lead) return setMsg("Une erreur est survenue. Réessayez.");
    setBusy(true);
    try {
      const r = await fetch("/api/leads/rappel", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: lead.id, token: lead.token, rappel_date: date, rappel_heure: heure, consent: true, website: hp }),
      });
      const j = await r.json().catch(() => ({}));
      if (r.ok) { setDone(true); setBusy(false); return; }
      setMsg(j.error ?? "Une erreur est survenue. Réessayez.");
    } catch { setMsg("Connexion impossible. Réessayez."); }
    setBusy(false);
  }

  if (step === RESULT && res && done) {
    return (
      <div className="card" role="status">
        <h2>Sondage finalisé, merci {f.prenom} !</h2>
        <p>Un conseiller vous rappelle au numéro indiqué le {dateLabel(date)} à {heureLabel(heure)}.</p>
        <p className="strong">✓ {GRATUIT}</p>
      </div>
    );
  }

  if (step === RESULT && res) {
    const rows: [string, string][] = [
      ["Nom", `${f.prenom ?? ""} ${f.nom ?? ""}`],
      ["Adresse", `${f.adresse ?? ""}, ${f.code_postal ?? ""} ${f.ville ?? ""}`],
      ["Téléphone", f.telephone ?? ""],
      ...(f.email ? ([["E-mail", f.email]] as [string, string][]) : []),
      ["Propriétaire", a.proprio === "oui" ? "Oui" : "Non"],
      ["Surface chauffée", SURFACES[Number(a.surface)]],
      ["Personnes du foyer fiscal", a.nbPers],
      ["Revenu fiscal de référence", labels[Number(a.tranche)] ?? ""],
      ...(a.mpr ? ([["MaPrimeRénov' (5 ans)", a.mpr === "oui" ? "Oui" : "Non"]] as [string, string][]) : []),
    ];
    const [bg, fg] = BADGE[res.profil ?? ""] ?? ["", ""];
    return (
      <div className="card" role="status">
        <div className="prog"><i style={{ width: "100%" }} /></div>
        <small className="kicker">Votre résultat</small>
        <h2>{res.titre}</h2>
        <div className={"res" + (res.eligible ? " ok" : "")}><strong>{res.message}</strong><small>{res.detail}</small></div>
        <div className="recap">
          <div className="recap-t">Récapitulatif de votre demande</div>
          {rows.map(([k, v]) => (<div className="row" key={k}><span>{k}</span><b>{v}</b></div>))}
          {res.profil && (
            <div className="row last"><span>Votre profil</span><b className="badge" style={{ background: bg, color: fg }}>Profil {res.profil}</b></div>
          )}
        </div>

        <p className="strong" style={{ margin: "18px 0 10px" }}>Un conseiller prendra contact avec vous à l'heure de votre choix afin de discuter de la faisabilité de votre projet.</p>
        <label className="chk" style={{ marginTop: 0, marginBottom: 14 }}><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} /><span>{CONSENT()}</span></label>
        <div className="grid">
          <label>Date *
            <input type="date" min={new Date().toISOString().slice(0, 10)} value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          <label>Heure *
            <select value={heure} onChange={(e) => setHeure(e.target.value)}>
              <option value="">Sélectionner…</option>{HEURES.map((h) => <option key={h} value={h}>{heureLabel(h)}</option>)}
            </select>
          </label>
        </div>

        {msg && <p className="err" role="alert">{msg}</p>}
        <button className="btn" disabled={busy} onClick={finalize}>{busy ? "Envoi…" : "Envoyer"}</button>
      </div>
    );
  }

  return (
    <div className="card fq">
      <div className="prog"><i style={{ width: `${((step + 1) / (TOTAL + 1)) * 100}%` }} /></div>
      <small className="kicker">Étape {step + 1} sur {TOTAL}</small>

      {step === 0 && (
        <>
          <h2>Vérifiez votre éligibilité</h2>
          <p className="mut">Quelques questions pour savoir si vous pouvez bénéficier de l'offre pompe à chaleur. Un conseiller vous rappelle ensuite.</p>
          <p className="strong">✓ {GRATUIT}</p>
          <h3 className="sub">Vos coordonnées</h3>
          <div className="grid">
            {FIELDS.map(([k, label, ac, type]) => (
              <label key={k} className={k === "adresse" ? "full" : ""}>{label}{k === "email" ? "" : " *"}
                <input name={k} type={type} autoComplete={ac} required={k !== "email"} value={f[k] ?? ""}
                  onChange={(e) => { setF({ ...f, [k]: e.target.value }); if (errs[k]) setErrs(({ [k]: _x, ...r }) => r); }}
                  onBlur={() => { const m = fieldError(k, f[k] ?? ""); setErrs(({ [k]: _x, ...r }) => (m ? { ...r, [k]: m } : r)); }}
                  aria-invalid={!!errs[k]} />
                {errs[k] && <span className="err">{errs[k]}</span>}
              </label>
            ))}
          </div>
          <input className="hp" tabIndex={-1} autoComplete="off" aria-hidden value={hp} onChange={(e) => setHp(e.target.value)} name="website" />
        </>
      )}

      {step >= 1 && <h3 className="sub">Votre logement et votre foyer</h3>}

      {step === 1 && (
        <>
          <h2 className="fq-q">Êtes-vous propriétaire de votre logement ?</h2>
          <select aria-label="Êtes-vous propriétaire de votre logement ?" value={a.proprio} onChange={(e) => set("proprio", e.target.value as YN)}>
            <option value="">Sélectionner…</option><option value="oui">🏠 Oui</option><option value="non">🔑 Non</option>
          </select>
          {a.proprio === "non" && <p className="warn">Les aides à la rénovation concernent en général les propriétaires. Un conseiller pourra vous indiquer ce qui s'applique à votre cas.</p>}
        </>
      )}
      {step === 2 && (
        <>
          <h2 className="fq-q">Quel type de logement habitez-vous ?</h2>
          <select aria-label="Quel type de logement habitez-vous ?" value={a.type} onChange={(e) => set("type", e.target.value)}>
            <option value="">Sélectionner…</option>
            <option value="maison">🏡 Maison individuelle</option>
            <option value="appartement">🏢 Appartement / copropriété</option>
          </select>
        </>
      )}
      {step === 3 && (
        <>
          <h2 className="fq-q">Votre chauffage actuel fonctionne à quelle énergie ?</h2>
          <select aria-label="Votre chauffage actuel fonctionne à quelle énergie ?" value={a.chauff} onChange={(e) => set("chauff", e.target.value)}>
            <option value="">Sélectionner…</option>
            <option value="gaz">🔥 Gaz naturel</option>
            <option value="fioul">🛢️ Fioul</option>
            <option value="electrique_autre">⚡ Électrique / autre (bois, granulés…)</option>
          </select>
        </>
      )}
      {step === 4 && (
        <>
          <h2 className="fq-q">Parlez-nous de votre logement</h2>
          <label>Année de construction *
            <select value={a.annee} onChange={(e) => set("annee", e.target.value)}>
              <option value="">Sélectionner…</option>{ANNEES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </label>
          <label>Surface chauffée *
            <select value={a.surface} onChange={(e) => set("surface", e.target.value)}>
              <option value="">Sélectionner…</option>{SURFACES.map((t, i) => <option key={t} value={i}>{t}</option>)}
            </select>
          </label>
        </>
      )}
      {step === 5 && (
        <>
          <h2 className="fq-q">Votre foyer</h2>
          <label>Nombre de personnes dans le foyer fiscal *
            <select value={a.nbPers} onChange={(e) => setA((p) => ({ ...p, nbPers: e.target.value, tranche: "" }))}>
              <option value="">Sélectionner…</option>
              {["1", "2", "3", "4"].map((n) => <option key={n} value={n}>{n}</option>)}
              <option value="5">5 ou plus</option>
            </select>
          </label>
          <label>Revenu fiscal de référence (€) *
            <select value={a.tranche} disabled={!a.nbPers} onChange={(e) => set("tranche", e.target.value)}>
              <option value="">{a.nbPers ? "Sélectionner…" : "Choisissez d'abord le nombre de personnes"}</option>{labels.map((t, i) => <option key={t} value={i}>{t}</option>)}
            </select>
            <small className="help">Indiqué sur votre dernier avis d'imposition.</small>
          </label>
        </>
      )}
      {step === 6 && (
        <>
          <h2 className="fq-q">Avez-vous déjà bénéficié de MaPrimeRénov' ces 5 dernières années ?</h2>
          <select aria-label="Avez-vous déjà bénéficié de MaPrimeRénov' ces 5 dernières années ?" value={a.mpr} onChange={(e) => set("mpr", e.target.value as YN)}>
            <option value="">Sélectionner…</option><option value="oui">✅ Oui</option><option value="non">🚫 Non</option>
          </select>
        </>
      )}

      {msg && <p className="err" role="alert">{msg}</p>}
      <button className="btn" disabled={busy} onClick={next}>{busy ? "Calcul…" : step === LAST_Q ? "Voir mon résultat" : "Continuer"}</button>
      {step > 0 && <button type="button" className="linkbtn" onClick={back}>← Retour</button>}
    </div>
  );
}
