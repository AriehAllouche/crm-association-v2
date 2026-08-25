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
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const now = new Date();
    const alertsCreated: { type: string; signalement_id: string; message: string }[] = [];

    // Récupérer tous les signalements non clôturés
    const { data: signalements, error } = await supabase
      .from("signalements")
      .select("id, numero_dossier, statut, enqueteur_id, created_at, urgence_calculee, date_prevue_traitement")
      .not("statut", "in", '("cloture","sans_suite")');

    if (error) throw new Error(error.message);

    for (const sig of signalements ?? []) {
      const createdAt = new Date(sig.created_at);
      const hoursSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
      const daysSinceCreation = hoursSinceCreation / 24;

      // 1. Signalement non assigné depuis > 24h
      if (!sig.enqueteur_id && sig.statut === "nouveau" && hoursSinceCreation > 24) {
        const existing = await checkExistingAlert(supabase, sig.id, "non_assigne");
        if (!existing) {
          await supabase.from("signalement_events").insert({
            signalement_id: sig.id,
            type: "alerte",
            titre: "Signalement non assigné depuis plus de 24h",
            description: `Le signalement ${sig.numero_dossier} n'a pas d'enquêteur assigné depuis ${Math.floor(hoursSinceCreation)}h`,
          });
          alertsCreated.push({ type: "non_assigne", signalement_id: sig.id, message: `${sig.numero_dossier}: non assigné depuis ${Math.floor(hoursSinceCreation)}h` });
        }
      }

      // 2. Signalement affecté mais enquête non commencée après 48h
      if (sig.statut === "affecte" && daysSinceCreation > 2) {
        const existing = await checkExistingAlert(supabase, sig.id, "enquete_non_commencee");
        if (!existing) {
          await supabase.from("signalement_events").insert({
            signalement_id: sig.id,
            type: "alerte",
            titre: "Enquête non commencée depuis plus de 48h",
            description: `Le signalement ${sig.numero_dossier} est affecté mais l'enquête n'a pas commencé`,
          });
          alertsCreated.push({ type: "enquete_non_commencee", signalement_id: sig.id, message: `${sig.numero_dossier}: enquête non commencée` });
        }
      }

      // 3. Dossier bloqué — aucune action depuis 7 jours
      const { data: lastEvent } = await supabase
        .from("signalement_events")
        .select("created_at")
        .eq("signalement_id", sig.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (lastEvent) {
        const lastEventDate = new Date(lastEvent.created_at);
        const daysSinceLastEvent = (now.getTime() - lastEventDate.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceLastEvent > 7) {
          const existing = await checkExistingAlert(supabase, sig.id, "dossier_bloque");
          if (!existing) {
            await supabase.from("signalement_events").insert({
              signalement_id: sig.id,
              type: "alerte",
              titre: "Dossier bloqué",
              description: `Aucune action sur le signalement ${sig.numero_dossier} depuis ${Math.floor(daysSinceLastEvent)} jours`,
            });
            alertsCreated.push({ type: "dossier_bloque", signalement_id: sig.id, message: `${sig.numero_dossier}: bloqué depuis ${Math.floor(daysSinceLastEvent)}j` });
          }
        }
      }

      // 4. Date prévue de traitement dépassée
      if (sig.date_prevue_traitement) {
        const datePrevue = new Date(sig.date_prevue_traitement);
        if (datePrevue < now && sig.statut !== 'cloture' && sig.statut !== 'sans_suite') {
          const existing = await checkExistingAlert(supabase, sig.id, "retard_traitement");
          if (!existing) {
            await supabase.from("signalement_events").insert({
              signalement_id: sig.id,
              type: "alerte",
              titre: "Date de traitement dépassée",
              description: `Le signalement ${sig.numero_dossier} devait être traité le ${sig.date_prevue_traitement}`,
            });
            alertsCreated.push({ type: "retard_traitement", signalement_id: sig.id, message: `${sig.numero_dossier}: retard de traitement` });
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, alerts: alertsCreated, checked: signalements?.length ?? 0 }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

async function checkExistingAlert(supabase: ReturnType<typeof createClient>, signalementId: string, alertType: string): Promise<boolean> {
  const { data } = await supabase
    .from("signalement_events")
    .select("id")
    .eq("signalement_id", signalementId)
    .eq("type", "alerte")
    .ilike("titre", `%${alertType}%`)
    .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .limit(1)
    .maybeSingle();
  return !!data;
}
