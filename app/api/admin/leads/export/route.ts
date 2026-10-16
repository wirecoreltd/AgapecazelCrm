import { NextResponse } from "next/server";
import { fetchLeads, fetchLeadsByIds, leadsToCsv, readFilters } from "@/lib/leads-admin";

export const dynamic = "force-dynamic";

function csvResponse(csv: string) {
  const day = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="leads-${day}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}

// Tout exporter selon les filtres actifs
export async function GET(req: Request) {
  const { data, error } = await fetchLeads(readFilters(new URL(req.url).searchParams), 10000);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return csvResponse(leadsToCsv(data ?? []));
}

// Exporter uniquement les leads cochés (ids envoyés par le formulaire de la page admin)
export async function POST(req: Request) {
  const form = await req.formData();
  const ids = String(form.get("ids") ?? "").split(",").map((x) => x.trim()).filter((x) => /^[\w-]{1,64}$/.test(x));
  if (ids.length === 0) return NextResponse.json({ error: "Aucune sélection" }, { status: 422 });
  const { data, error } = await fetchLeadsByIds(ids);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return csvResponse(leadsToCsv(data ?? []));
}
