// Supabase Edge Function: ai-assistant
//
// Chat conversacional sobre los datos del sistema CAROVE.
// Recopila un resumen agregado de las tablas principales y se lo manda a Claude
// como contexto. Devuelve respuesta en streaming SSE en formato OpenAI-compatible
// (la frontend AiAssistant.tsx ya consume ese formato — no hay que tocarla).
//
// Body: { messages: [{ role, content }] }
//
// Deploy:
//   supabase functions deploy ai-assistant --project-ref flstoaobldowsmsskgiz

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  cors,
  json,
  callClaude,
  claudeStreamToOpenAI,
  MODEL_HAIKU,
  type ClaudeMessage,
} from "../_shared/anthropic.ts";

const SYSTEM_PROMPT = `Eres un asistente inteligente integrado en Carove, un software de gestión para compraventa de vehículos. Tu función es responder consultas del usuario sobre los datos del sistema de forma clara, precisa y útil.

CONTEXTO DEL SISTEMA
Carove gestiona: vehículos (stock, compras, ventas, gastos, márgenes, seguros, tasaciones), clientes (compradores/vendedores), reservas, propuestas comerciales, facturas de venta y de proveedor, cobros, pagos a proveedores, tesorería (caja y banco), contabilidad de partida doble (diario, mayor, P&L, balance), demandas comerciales, actividad comercial, órdenes de reparación, financiación, postventa, traspasos entre sucursales, gastos operativos, tareas internas y marketing.

DATOS QUE RECIBES
Se te proporcionará un resumen agregado de los datos reales del sistema. Úsalos para responder con cifras concretas.

REGLAS
1. Responde SIEMPRE en español.
2. Sé conciso pero completo. Usa tablas markdown cuando ayude a la claridad.
3. Si los datos no son suficientes para responder, indícalo claramente.
4. Nunca inventes datos. Si no tienes la información, dilo.
5. Formatea importes con € y separador de miles (ej: 12.500 €).
6. Al final de CADA respuesta, añade una sección "---" seguida de "**Preguntas relacionadas:**" con 3 preguntas contextuales que el usuario podría querer hacer a continuación, basadas en tu respuesta. Formátalas como lista numerada.

TONO
Profesional, directo y servicial. Como un analista de datos interno.`;

async function fetchContext(supabaseUrl: string, serviceKey: string): Promise<string> {
  const supabase = createClient(supabaseUrl, serviceKey);

  // Lectura defensiva: si una tabla no existe o cambia de schema, seguimos sin
  // romper la respuesta del asistente.
  const safe = async <T>(fn: () => Promise<T>, fallback: T): Promise<T> => {
    try {
      return await fn();
    } catch (err) {
      console.warn("[ai-assistant] context query failed:", err);
      return fallback;
    }
  };

  const [
    vehicles, sales, reservations, cashMovements, invoices, clients, payments, proposals,
  ] = await Promise.all([
    safe(async () => (await supabase.from("vehicles").select("brand,model,plate,status,pvp_base,total_cost,net_profit,is_deregistered,center").limit(500)).data ?? [], []),
    safe(async () => (await supabase.from("sales").select("sale_price,sale_date,buyer_name,total_amount").order("sale_date", { ascending: false }).limit(100)).data ?? [], []),
    safe(async () => (await supabase.from("reservations").select("buyer_name,reservation_status,reservation_amount").limit(100)).data ?? [], []),
    safe(async () => (await supabase.from("cash_movements").select("movement_type,amount").limit(100)).data ?? [], []),
    safe(async () => (await supabase.from("invoices").select("invoice_type,status,payment_status,total_amount").limit(100)).data ?? [], []),
    safe(async () => (await supabase.from("buyers").select("client_type,is_buyer,is_seller").limit(200)).data ?? [], []),
    safe(async () => (await supabase.from("payments").select("amount,is_refund").limit(100)).data ?? [], []),
    safe(async () => (await supabase.from("proposals").select("proposal_type,total_amount,buyer_name").limit(30)).data ?? [], []),
  ]);

  const fmt = (n: number) => Math.round(n).toLocaleString("es-ES");
  const fmtObj = (obj: Record<string, number>) =>
    Object.entries(obj).map(([k, v]) => `${k}: ${v}`).join(" | ");

  const activeVehicles = vehicles.filter((v: { is_deregistered?: boolean }) => !v.is_deregistered);
  const statusCounts: Record<string, number> = {};
  activeVehicles.forEach((v: { status: string }) => { statusCounts[v.status] = (statusCounts[v.status] || 0) + 1; });
  const stockVehicles = activeVehicles.filter((v: { status: string }) => v.status === "disponible" || v.status === "reservado");
  const stockValue = stockVehicles.reduce((s: number, v: { pvp_base?: number }) => s + (v.pvp_base || 0), 0);
  const avgMargin = stockVehicles.length > 0
    ? stockVehicles.reduce((s: number, v: { net_profit?: number }) => s + (v.net_profit || 0), 0) / stockVehicles.length
    : 0;

  const totalSalesAmount = sales.reduce((s: number, v: { total_amount?: number }) => s + (v.total_amount || 0), 0);

  const invPending = invoices.filter((i: { payment_status: string; status: string }) => i.payment_status === "pendiente" && i.status === "emitida");
  const invByType: Record<string, number> = {};
  invoices.forEach((i: { invoice_type: string }) => { invByType[i.invoice_type] = (invByType[i.invoice_type] || 0) + 1; });

  const totalCollected = payments.filter((p: { is_refund?: boolean }) => !p.is_refund).reduce((s: number, p: { amount: number }) => s + p.amount, 0);
  const totalRefunded = payments.filter((p: { is_refund?: boolean }) => p.is_refund).reduce((s: number, p: { amount: number }) => s + p.amount, 0);

  const cashIn = cashMovements.filter((m: { movement_type: string }) => m.movement_type === "ingreso").reduce((s: number, m: { amount: number }) => s + m.amount, 0);
  const cashOut = cashMovements.filter((m: { movement_type: string }) => m.movement_type === "gasto").reduce((s: number, m: { amount: number }) => s + m.amount, 0);

  const resByStatus: Record<string, number> = {};
  reservations.forEach((r: { reservation_status: string }) => { resByStatus[r.reservation_status] = (resByStatus[r.reservation_status] || 0) + 1; });

  return `RESUMEN DE DATOS CAROVE:

═══ STOCK (${activeVehicles.length} vehículos activos) ═══
Por estado: ${fmtObj(statusCounts)}
Valor stock (PVP): ${fmt(stockValue)} €
Margen medio en stock: ${fmt(avgMargin)} €

Top 15 stock:
${stockVehicles.slice(0, 15).map((v: { brand: string; model: string; plate: string; pvp_base?: number; total_cost?: number; net_profit?: number; center?: string }) =>
  `  · ${v.brand} ${v.model} (${v.plate}) — PVP: ${fmt(v.pvp_base || 0)} € | Coste: ${fmt(v.total_cost || 0)} € | Margen: ${fmt(v.net_profit || 0)} € | Centro: ${v.center || "—"}`
).join("\n")}

═══ VENTAS ═══
Ventas (${sales.length}): Facturación total: ${fmt(totalSalesAmount)} €
${sales.slice(0, 8).map((s: { sale_date: string; buyer_name?: string; total_amount?: number }) =>
  `  · ${s.sale_date}: ${s.buyer_name || "—"} — ${fmt(s.total_amount || 0)} €`
).join("\n")}

═══ RESERVAS ═══
Por estado: ${fmtObj(resByStatus)}

═══ FACTURAS Y COBROS ═══
Facturas: ${invoices.length} | Por tipo: ${fmtObj(invByType)}
Pendientes de cobro: ${invPending.length} (${fmt(invPending.reduce((s: number, i: { total_amount: number }) => s + i.total_amount, 0))} €)
Total cobrado: ${fmt(totalCollected)} € | Devoluciones: ${fmt(totalRefunded)} €

═══ TESORERÍA ═══
Caja: ingresos ${fmt(cashIn)} € | gastos ${fmt(cashOut)} €

═══ CLIENTES ═══
Total activos: ${clients.length}
Compradores: ${clients.filter((c: { is_buyer?: boolean }) => c.is_buyer).length} | Vendedores: ${clients.filter((c: { is_seller?: boolean }) => c.is_seller).length}

═══ PROPUESTAS ═══
Recientes: ${proposals.length}`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const body = await req.json().catch(() => null);
    if (!body || !Array.isArray(body.messages)) {
      return json({ error: "Body inválido. Se esperaba { messages: [...] }" }, 400);
    }

    const userMessages: ClaudeMessage[] = body.messages
      .filter((m: { role: string; content: string }) => m.role === "user" || m.role === "assistant")
      .map((m: { role: string; content: string }) => ({
        role: m.role as "user" | "assistant",
        content: String(m.content || ""),
      }));

    if (userMessages.length === 0) {
      return json({ error: "No hay mensajes para procesar" }, 400);
    }

    const context = await fetchContext(SUPABASE_URL, SERVICE_KEY);
    const system = `${SYSTEM_PROMPT}\n\n${context}`;

    const claudeResp = await callClaude({
      model: MODEL_HAIKU,
      system,
      messages: userMessages,
      max_tokens: 2048,
      stream: true,
    });

    if (!claudeResp.ok) {
      const errBody = await claudeResp.text();
      console.error("[ai-assistant] Anthropic error", claudeResp.status, errBody);
      if (claudeResp.status === 429) {
        return json({ error: "Demasiadas solicitudes. Inténtalo de nuevo en unos segundos." }, 429);
      }
      if (claudeResp.status === 401) {
        return json({ error: "API key inválida o no configurada" }, 500);
      }
      return json({ error: "Error del servicio de IA" }, 500);
    }

    return claudeStreamToOpenAI(claudeResp);
  } catch (err) {
    console.error("[ai-assistant] error", err);
    return json({ error: String((err as Error)?.message ?? err) }, 500);
  }
});
