// Supabase Edge Function: ai-incentives
//
// Endpoint multifunción para análisis IA del módulo de incentivos.
// Recibe { type } y devuelve { result: {...} } con la forma esperada por
// cada panel del frontend.
//
// Tipos soportados:
//   - objectives           → result.recommendations[]
//   - finance_optimization → result (objeto con análisis)
//   - leads                → result.assignments[]
//   - predictions          → result (objeto con predicción)
//   - strategic_insights   → result.insights[]
//
// Deploy:
//   supabase functions deploy ai-incentives --project-ref flstoaobldowsmsskgiz

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  cors, json, callClaudeText, extractJSON,
  MODEL_HAIKU, MODEL_SONNET,
  type ClaudeMessage,
} from "../_shared/anthropic.ts";

type IncentivesType = "objectives" | "finance_optimization" | "leads" | "predictions" | "strategic_insights";

// ─── Helpers de contexto ──────────────────────────────────────────────────

async function safeQuery<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try { return await fn(); } catch (err) { console.warn("[ai-incentives] query failed:", err); return fallback; }
}

async function fetchSalesContext(supabase: ReturnType<typeof createClient>) {
  const [sellers, monthlyStats, recentSales, objectives, leads] = await Promise.all([
    safeQuery(async () => (await supabase.from("profiles").select("user_id,full_name,role,active").eq("active", true).limit(50)).data ?? [], []),
    safeQuery(async () => (await supabase.from("seller_monthly_stats").select("user_id,period,total_sales,bonus_total,total_revenue").order("period", { ascending: false }).limit(200)).data ?? [], []),
    safeQuery(async () => (await supabase.from("sales").select("seller_id,sale_date,sale_price,total_amount").order("sale_date", { ascending: false }).limit(100)).data ?? [], []),
    safeQuery(async () => (await supabase.from("sales_objectives").select("period,scope,target_sales,target_revenue").order("period", { ascending: false }).limit(20)).data ?? [], []),
    safeQuery(async () => (await supabase.from("demands").select("id,user_id,intention_level,brand_preferences,price_min,price_max,status,created_at").eq("status", "activa").limit(100)).data ?? [], []),
  ]);
  return { sellers, monthlyStats, recentSales, objectives, leads };
}

async function fetchFinanceContext(supabase: ReturnType<typeof createClient>) {
  const [products, simulations, entities] = await Promise.all([
    safeQuery(async () => (await supabase.from("finance_products").select("id,name,entity_id,commission_percent,active").limit(50)).data ?? [], []),
    safeQuery(async () => (await supabase.from("finance_simulations").select("status,financed_amount,monthly_payment,term_months_used,entity_name_snapshot,product_name_snapshot,created_at").order("created_at", { ascending: false }).limit(100)).data ?? [], []),
    safeQuery(async () => (await supabase.from("finance_entities").select("id,name,active").limit(50)).data ?? [], []),
  ]);
  return { products, simulations, entities };
}

// ─── Prompts y procesado por tipo ─────────────────────────────────────────

interface Handler {
  model: string;
  buildPrompt: (admin: ReturnType<typeof createClient>) => Promise<{ system: string; user: string }>;
  // Si el modelo devuelve algo no-JSON o estructura incorrecta, podemos
  // post-procesar aquí. Por defecto se devuelve { result: parsed }.
  shape?: (parsed: unknown) => Record<string, unknown>;
}

const HANDLERS: Record<IncentivesType, Handler> = {

  objectives: {
    model: MODEL_HAIKU,
    buildPrompt: async (admin) => {
      const { sellers, monthlyStats, objectives } = await fetchSalesContext(admin);
      const ctx = `VENDEDORES ACTIVOS (${sellers.length}):
${sellers.slice(0, 20).map((s) => `· ${s.full_name} (${s.role})`).join("\n")}

OBJETIVOS HISTÓRICOS (${objectives.length}):
${objectives.slice(0, 10).map((o) => `· ${o.period} (${o.scope}): ventas ${o.target_sales} | revenue ${o.target_revenue}€`).join("\n")}

ESTADÍSTICAS MENSUALES RECIENTES (${monthlyStats.length}):
${monthlyStats.slice(0, 20).map((m) => `· ${m.period} usuario=${m.user_id}: ${m.total_sales} ventas, ${m.total_revenue}€ revenue, bonus ${m.bonus_total}€`).join("\n")}`;

      return {
        system: "Eres un consultor que recomienda objetivos de ventas para un concesionario de coches. Devuelve SOLO JSON.",
        user: `${ctx}

Genera 5 recomendaciones de objetivos para el próximo mes basadas en el rendimiento histórico. Devuelve JSON con esta forma:
{
  "recommendations": [
    {
      "title": "string corto",
      "scope": "global" | "individual",
      "target_user_id": "uuid o null",
      "target_sales": número,
      "target_revenue": número,
      "rationale": "explicación 1-2 frases",
      "confidence": "alta" | "media" | "baja"
    }
  ]
}`,
      };
    },
  },

  leads: {
    model: MODEL_HAIKU,
    buildPrompt: async (admin) => {
      const { sellers, recentSales, leads } = await fetchSalesContext(admin);
      const ctx = `VENDEDORES (${sellers.length}):
${sellers.slice(0, 15).map((s) => `· ${s.user_id} ${s.full_name}`).join("\n")}

VENTAS RECIENTES POR VENDEDOR:
${Object.entries(recentSales.reduce<Record<string, number>>((acc, s) => { const k = String(s.seller_id ?? "unknown"); acc[k] = (acc[k] || 0) + 1; return acc; }, {})).map(([id, n]) => `· ${id}: ${n} ventas`).join("\n")}

LEADS ACTIVOS (${leads.length}):
${leads.slice(0, 30).map((l) => `· ${l.id} | intención ${l.intention_level} | marcas ${(l.brand_preferences || []).join(",")} | precio ${l.price_min}-${l.price_max}€`).join("\n")}`;

      return {
        system: "Eres un router inteligente de leads. Devuelve SOLO JSON.",
        user: `${ctx}

Sugiere a qué vendedor asignar cada lead, basándote en su carga de trabajo y rendimiento. Devuelve:
{
  "assignments": [
    {
      "lead_id": "uuid",
      "suggested_seller_id": "uuid",
      "suggested_seller_name": "string",
      "rationale": "1 frase",
      "priority": "alta" | "media" | "baja"
    }
  ]
}`,
      };
    },
  },

  predictions: {
    model: MODEL_SONNET,
    buildPrompt: async (admin) => {
      const { recentSales, monthlyStats } = await fetchSalesContext(admin);
      const totalRecent = recentSales.reduce((s, r) => s + (r.total_amount ?? 0), 0);
      const ctx = `VENTAS ÚLTIMOS 100 REGISTROS: total ${Math.round(totalRecent)}€
${recentSales.slice(0, 30).map((s) => `· ${s.sale_date} → ${s.total_amount ?? 0}€`).join("\n")}

ESTADÍSTICAS MENSUALES:
${monthlyStats.slice(0, 12).map((m) => `· ${m.period}: ${m.total_sales} ventas / ${m.total_revenue}€`).join("\n")}`;

      return {
        system: "Eres un analista que predice ventas futuras basándose en tendencias históricas. Devuelve SOLO JSON.",
        user: `${ctx}

Predice las ventas de los próximos 3 meses con análisis. Devuelve:
{
  "predictions_by_month": [
    { "period": "YYYY-MM", "predicted_sales": número, "predicted_revenue": número, "confidence": "alta|media|baja" }
  ],
  "trend": "creciente|estable|decreciente",
  "key_drivers": ["string 1", "string 2"],
  "risks": ["string 1", "string 2"],
  "recommendations": ["string 1", "string 2"]
}`,
      };
    },
  },

  finance_optimization: {
    model: MODEL_SONNET,
    buildPrompt: async (admin) => {
      const { products, simulations, entities } = await fetchFinanceContext(admin);
      const totalFinanced = simulations.reduce((s, x) => s + (x.financed_amount ?? 0), 0);
      const acceptedCount = simulations.filter((s) => s.status === "aceptada" || s.status === "approved").length;
      const ctx = `ENTIDADES ACTIVAS: ${entities.filter(e => e.active).length}
${entities.slice(0, 10).map((e) => `· ${e.name}`).join("\n")}

PRODUCTOS DE FINANCIACIÓN: ${products.filter(p => p.active).length}
${products.slice(0, 15).map((p) => `· ${p.name} | comisión ${p.commission_percent}%`).join("\n")}

SIMULACIONES (${simulations.length}, total financiado ${Math.round(totalFinanced)}€, aceptadas ${acceptedCount}):
${simulations.slice(0, 20).map((s) => `· ${s.entity_name_snapshot} / ${s.product_name_snapshot}: ${s.financed_amount}€ a ${s.term_months_used}m → ${s.monthly_payment}€/mes [${s.status}]`).join("\n")}`;

      return {
        system: "Eres un analista financiero que optimiza la cartera de productos de financiación. Devuelve SOLO JSON.",
        user: `${ctx}

Analiza qué productos rinden mejor y propón optimizaciones. Devuelve:
{
  "top_performers": [{ "product_name": "string", "acceptance_rate": número 0-1, "avg_amount": número, "comment": "string" }],
  "underperformers": [{ "product_name": "string", "issue": "string", "suggestion": "string" }],
  "summary": "párrafo con análisis general",
  "expected_revenue_lift": "string"
}`,
      };
    },
  },

  strategic_insights: {
    model: MODEL_SONNET,
    buildPrompt: async (admin) => {
      const sales = await fetchSalesContext(admin);
      const finance = await fetchFinanceContext(admin);
      const ctx = `VENTAS RECIENTES: ${sales.recentSales.length}
ESTADÍSTICAS MENSUALES: ${sales.monthlyStats.length} períodos
LEADS ACTIVOS: ${sales.leads.length}
SIMULACIONES FINANCIERAS: ${finance.simulations.length}
PRODUCTOS ACTIVOS: ${finance.products.filter(p => p.active).length}

KPIs:
- Total revenue últimas 100 ventas: ${Math.round(sales.recentSales.reduce((s, r) => s + (r.total_amount ?? 0), 0))}€
- Total financiado últimas 100 simulaciones: ${Math.round(finance.simulations.reduce((s, x) => s + (x.financed_amount ?? 0), 0))}€`;

      return {
        system: "Eres un consultor estratégico que identifica oportunidades en datos comerciales. Devuelve SOLO JSON.",
        user: `${ctx}

Genera 5-7 insights estratégicos accionables. Devuelve:
{
  "insights": [
    {
      "title": "string corto",
      "category": "ventas|financiacion|leads|operaciones|cliente",
      "description": "1-2 frases con el insight",
      "action": "acción concreta recomendada",
      "impact": "alto|medio|bajo",
      "effort": "bajo|medio|alto"
    }
  ]
}`,
      };
    },
  },
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const body = await req.json().catch(() => null);
    if (!body) return json({ error: "Body JSON inválido" }, 400);

    const type = String(body.type || "") as IncentivesType;
    const handler = HANDLERS[type];
    if (!handler) {
      return json({
        error: `Tipo '${type}' desconocido. Permitidos: ${Object.keys(HANDLERS).join(", ")}`,
      }, 400);
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { system, user } = await handler.buildPrompt(admin);

    const messages: ClaudeMessage[] = [{ role: "user", content: user }];

    const responseText = await callClaudeText({
      model: handler.model,
      system,
      messages,
      max_tokens: 3000,
    });

    let parsed: unknown;
    try {
      parsed = extractJSON(responseText);
    } catch (parseErr) {
      console.error(`[ai-incentives:${type}] no se pudo parsear JSON:`, parseErr, "\nrespuesta:", responseText);
      return json({ error: "El modelo no devolvió JSON válido", raw: responseText.slice(0, 1000) }, 502);
    }

    return json({
      result: handler.shape ? handler.shape(parsed) : parsed,
      type,
      model: handler.model,
    });
  } catch (err) {
    console.error("[ai-incentives] error", err);
    return json({ error: String((err as Error)?.message ?? err) }, 500);
  }
});
