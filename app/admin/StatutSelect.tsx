"use client";
import { useState } from "react";

type Opt = { value: string; label: string };

const COLORS: Record<string, [string, string]> = {
  nouveau: ["#e3eefb", "#1a56a0"],
  a_rappeler: ["#fff3c4", "#8a6a00"],
  contacte: ["#e0f3f5", "#0d6b75"],
  rdv: ["#e3f4ee", "#087F5F"],
  perdu: ["#eceeed", "#5A6E73"],
};

export default function StatutSelect({ id, value, options }: { id: string; value: string; options: Opt[] }) {
  const [v, setV] = useState(value);
  const [state, setState] = useState<"idle" | "saving" | "error">("idle");

  async function change(next: string) {
    const prev = v;
    setV(next);
    setState("saving");
    const res = await fetch(`/api/admin/leads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ statut: next }),
    });
    if (res.ok) setState("idle");
    else { setV(prev); setState("error"); }
  }

  // Si la valeur en base n'est pas dans la liste, on l'affiche quand même.
  const opts = options.some((o) => o.value === v) ? options : [{ value: v, label: v || "—" }, ...options];
  const [bg, fg] = COLORS[v] ?? ["#eef2f1", "#2E3436"];
  return (
    <span>
      <select className="adm-statut" value={v} disabled={state === "saving"} onChange={(e) => change(e.target.value)} style={{ background: bg, color: fg }}>
        {opts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {state === "error" && <span className="err" style={{ marginLeft: 6 }}>Échec</span>}
    </span>
  );
}
