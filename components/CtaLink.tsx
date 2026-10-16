"use client";

export default function CtaLink({ motif, interet, children }: { motif: "defiscalisation" | "energies"; interet: string; children: React.ReactNode }) {
  return (
    <a className="btn cta" href="#simulateur"
      onClick={() => window.dispatchEvent(new CustomEvent("choose-motif", { detail: { motif, interet } }))}>
      {children}
    </a>
  );
}
