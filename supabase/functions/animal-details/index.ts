import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/");
    const animalId = pathParts[pathParts.length - 1];

    if (!animalId || animalId === "animal-details") {
      return new Response(
        JSON.stringify({ error: "Animal ID required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Single batch of parallel queries — all data for one animal
    const [
      animalRes, signalementRes, adoptionsRes, visitesRes,
      justiceRes, sejoursRes, transportsRes, documentsRes,
      depensesRes, commsRes, registreRes, faRes, alertsRes
    ] = await Promise.all([
      supabase.from("animals").select("*").eq("id", animalId).maybeSingle(),
      supabase.from("signalements").select("*").eq("animal_id", animalId).maybeSingle(),
      supabase.from("adoptions").select("*").eq("animal_id", animalId).order("created_at", { ascending: false }),
      supabase.from("veterinaire_visites").select("*, veterinaire:veterinaires(*)").eq("animal_id", animalId).order("date_visite", { ascending: false }),
      supabase.from("justice_cases").select("*").eq("animal_id", animalId).order("created_at", { ascending: false }),
      supabase.from("pension_sejours").select("*, pension:pensions(*)").eq("animal_id", animalId).order("date_entree", { ascending: false }),
      supabase.from("transports").select("*").eq("animal_id", animalId).order("date_transport", { ascending: false }),
      supabase.from("documents").select("*").eq("animal_id", animalId).order("created_at", { ascending: false }),
      supabase.from("depenses").select("*").eq("animal_id", animalId).order("date_depense", { ascending: false }),
      supabase.from("communications").select("*").eq("animal_id", animalId).order("date_publication", { ascending: false }),
      supabase.from("registre_entrees_sorties").select("*").eq("animal_id", animalId).order("date", { ascending: false }),
      supabase.from("famille_accueil_animaux").select("*, famille_accueil:famille_accueils(*)").eq("animal_id", animalId).order("date_debut", { ascending: false }),
      supabase.from("alerts").select("*").eq("animal_id", animalId).eq("statut", "active").order("date_echeance"),
    ]);

    if (animalRes.error || !animalRes.data) {
      return new Response(
        JSON.stringify({ error: "Animal not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate total costs
    const coutTotal = (depensesRes.data ?? []).reduce((sum: number, d: any) => sum + (d.montant ?? 0), 0)
      + (visitesRes.data ?? []).reduce((sum: number, v: any) => sum + (v.cout ?? 0), 0)
      + (sejoursRes.data ?? []).reduce((sum: number, s: any) => sum + (s.cout_total ?? 0), 0)
      + (transportsRes.data ?? []).reduce((sum: number, t: any) => sum + (t.cout ?? 0), 0);

    // Build unified timeline from all events
    const timeline: Array<{ date: string; type: string; title: string; description?: string }> = [];

    for (const r of registreRes.data ?? []) {
      timeline.push({ date: r.date, type: "registre", title: r.type === "entree" ? "Entrée au registre" : "Sortie du registre", description: r.motif });
    }
    for (const s of signalementRes.data ?? []) {
      timeline.push({ date: s.date_signalement, type: "signalement", title: "Signalement", description: s.motif });
    }
    for (const v of visitesRes.data ?? []) {
      timeline.push({ date: v.date_visite, type: "veterinaire", title: "Visite vétérinaire", description: `${v.motif}${v.veterinaire ? " — " + v.veterinaire.nom : ""}` });
    }
    for (const f of faRes.data ?? []) {
      const startDate = f.date_debut || f.created_at;
      timeline.push({ date: startDate, type: "famille_accueil", title: "Placement en famille d'accueil", description: f.famille_accueil?.nom });
      if (f.date_fin) {
        timeline.push({ date: f.date_fin, type: "famille_accueil_fin", title: "Fin de placement FA", description: f.famille_accueil?.nom });
      }
    }
    for (const s of sejoursRes.data ?? []) {
      timeline.push({ date: s.date_entree, type: "pension", title: "Entrée en pension", description: s.pension?.nom });
      if (s.date_sortie) {
        timeline.push({ date: s.date_sortie, type: "pension_sortie", title: "Sortie de pension", description: s.pension?.nom });
      }
    }
    for (const t of transportsRes.data ?? []) {
      timeline.push({ date: t.date_transport, type: "transport", title: "Transport", description: `${t.lieu_depart ?? "?"} → ${t.lieu_arrivee ?? "?"}` });
    }
    for (const a of adoptionsRes.data ?? []) {
      timeline.push({ date: a.date_candidature, type: "adoption", title: "Candidature d'adoption", description: a.adoptant_nom });
    }
    for (const j of justiceRes.data ?? []) {
      timeline.push({ date: j.created_at, type: "justice", title: "Dossier judiciaire", description: j.numero_parquet });
      if (j.date_audience) {
        timeline.push({ date: j.date_audience, type: "justice_audience", title: "Audience", description: j.tribunal });
      }
    }
    for (const c of commsRes.data ?? []) {
      timeline.push({ date: c.date_publication, type: "communication", title: c.titre || c.type, description: c.canal });
    }
    for (const d of depensesRes.data ?? []) {
      timeline.push({ date: d.date_depense, type: "depense", title: "Dépense", description: `${d.description} — ${d.montant}€` });
    }

    timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const response = {
      animal: animalRes.data,
      signalement: signalementRes.data,
      adoptions: adoptionsRes.data ?? [],
      visites: visitesRes.data ?? [],
      justice: justiceRes.data ?? [],
      sejours: sejoursRes.data ?? [],
      transports: transportsRes.data ?? [],
      documents: documentsRes.data ?? [],
      depenses: depensesRes.data ?? [],
      communications: commsRes.data ?? [],
      registre: registreRes.data ?? [],
      familles_accueil: faRes.data ?? [],
      alerts: alertsRes.data ?? [],
      cout_total: coutTotal,
      timeline,
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
