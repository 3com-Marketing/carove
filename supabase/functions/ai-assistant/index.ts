import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Eres un asistente inteligente integrado en Carove, un software de gestión para compraventa de vehículos. Tu función es responder consultas del usuario sobre los datos del sistema de forma clara, precisa y útil.

CONTEXTO DEL SISTEMA
Carove gestiona: vehículos (stock, compras, ventas, gastos, márgenes, seguros, tasaciones), clientes (compradores/vendedores), reservas, propuestas comerciales, facturas de venta y de proveedor, cobros, pagos a proveedores, tesorería (caja y banco), contabilidad de partida doble (diario, mayor, P&L, balance), demandas comerciales, actividad comercial (seguimientos, llamadas, visitas), órdenes de reparación, financiación (entidades, productos, simulaciones, cuotas), postventa (reclamaciones, incidencias, reparaciones, garantías, seguimientos, revisiones), traspasos entre sucursales, gastos operativos, tareas internas y marketing (campañas email, publicaciones RRSS).

DATOS QUE RECIBES
Se te proporcionará un resumen agregado de TODOS los datos reales del sistema en el campo "context". Úsalos para responder con cifras concretas.

REGLAS
1. Responde SIEMPRE en español.
2. Sé conciso pero completo. Usa tablas markdown cuando ayude a la claridad.
3. Si los datos no son suficientes para responder, indícalo claramente.
4. Nunca inventes datos. Si no tienes la información, dilo.
5. Formatea importes con € y separador de miles (ej: 12.500 €).
6. Al final de CADA respuesta, añade una sección "---" seguida de "**Preguntas relacionadas:**" con 3 preguntas contextuales que el usuario podría querer hacer a continuación, basadas en tu respuesta. Formátalas como lista numerada.

TONO
Profesional, directo y servicial. Como un analista de datos interno.`;

async function fetchContext(supabaseUrl: string, serviceKey: string) {
  const supabase = createClient(supabaseUrl, serviceKey);

  // ═══ BATCH 1: Core tables ═══
  const [
    { data: vehicles },
    { data: sales },
    { data: reservations },
    { data: cashMovements },
    { data: invoices },
    { data: clients },
    { data: payments },
    { data: proposals },
  ] = await Promise.all([
    supabase.from("vehicles").select("id, brand, model, plate, status, purchase_price, pvp_base, price_cash, total_expenses, total_cost, net_profit, km_entry, engine_type, first_registration, expo_date, center, is_deregistered, insurer_id, policy_amount, itv_date, delivery_date").limit(500),
    supabase.from("sales").select("id, vehicle_id, sale_price, sale_date, buyer_name, total_amount, tax_amount, base_amount").order("sale_date", { ascending: false }).limit(100),
    supabase.from("reservations").select("id, vehicle_id, buyer_name, status, deposit_amount, reservation_date, expiration_date").limit(100),
    supabase.from("cash_movements").select("id, movement_type, amount, movement_date, description, payment_method, origin_type").order("movement_date", { ascending: false }).limit(100),
    supabase.from("invoices").select("id, full_number, invoice_type, status, payment_status, total_amount, base_amount, tax_amount, issue_date, buyer_name").order("issue_date", { ascending: false }).limit(100),
    supabase.from("buyers").select("id, name, last_name, company_name, client_type, phone, email, is_buyer, is_seller").eq("active", true).limit(200),
    supabase.from("payments").select("id, amount, payment_type, payment_method, payment_date, is_refund").order("payment_date", { ascending: false }).limit(100),
    supabase.from("proposals").select("id, proposal_type, total_amount, financed_amount, buyer_name, created_at").order("created_at", { ascending: false }).limit(30),
  ]);

  // ═══ BATCH 2: Expenses, Suppliers, Repair Orders ═══
  const [
    { data: expenses },
    { data: suppliers },
    { data: supplierInvoices },
    { data: supplierPayments },
    { data: repairOrders },
    { data: operatingExpenses },
  ] = await Promise.all([
    supabase.from("expenses").select("id, amount, expense_category, date, vehicle_id").limit(500),
    supabase.from("suppliers").select("id, name, active").limit(100),
    supabase.from("supplier_invoices").select("id, status, total_amount, base_amount, invoice_date, supplier_id").order("invoice_date", { ascending: false }).limit(100),
    supabase.from("supplier_payments").select("id, amount, payment_date, payment_method").order("payment_date", { ascending: false }).limit(100),
    supabase.from("repair_orders").select("id, status, estimated_total, vehicle_id, supplier_id, created_at").limit(100),
    supabase.from("operating_expenses").select("id, amount, category, expense_date, description").order("expense_date", { ascending: false }).limit(100),
  ]);

  // ═══ BATCH 3: Accounting ═══
  const [
    { data: journalEntries },
    { data: journalLines },
    { data: accountingPeriods },
  ] = await Promise.all([
    supabase.from("journal_entries").select("id, entry_date, total_debit, total_credit, origin_type, status").order("entry_date", { ascending: false }).limit(50),
    supabase.from("journal_entry_lines").select("account_code, debit, credit").limit(1000),
    supabase.from("accounting_periods").select("year, is_closed, current_number").order("year", { ascending: false }).limit(5),
  ]);

  // ═══ BATCH 4: Finance ═══
  const [
    { data: financeEntities },
    { data: financeProducts },
    { data: financeSimulations },
    { data: financeTermModels },
  ] = await Promise.all([
    supabase.from("finance_entities").select("id, name, active").limit(50),
    supabase.from("finance_products").select("id, name, entity_id, commission_percent, active").limit(50),
    supabase.from("finance_simulations").select("id, status, financed_amount, monthly_payment, term_months_used, entity_name_snapshot, product_name_snapshot, created_at").order("created_at", { ascending: false }).limit(50),
    supabase.from("finance_term_models").select("id, term_months, tin, coefficient, commission_percent, product_id, active").limit(100),
  ]);

  // ═══ BATCH 5: Postventa ═══
  const [
    { data: pvClaims },
    { data: pvIncidents },
    { data: pvRepairs },
    { data: pvFollowups },
    { data: pvWarranties },
    { data: pvReviews },
    { data: pvFinanceIncidents },
  ] = await Promise.all([
    supabase.from("pv_claims").select("id, status, created_at").limit(200),
    supabase.from("pv_incidents").select("id, status, severity, created_at").limit(200),
    supabase.from("pv_repairs").select("id, status, cost, created_at").limit(200),
    supabase.from("pv_followups").select("id, status, due_date, created_at").limit(200),
    supabase.from("pv_warranties").select("id, status, start_date, end_date").limit(200),
    supabase.from("pv_reviews").select("id, status, scheduled_date").limit(200),
    supabase.from("pv_finance_incidents").select("id, status, amount, created_at").limit(200),
  ]);

  // ═══ BATCH 6: Operations & CRM ═══
  const [
    { data: vehicleTransfers },
    { data: bankAccounts },
    { data: bankMovements },
    { data: commercialActivities },
    { data: demands },
    { data: tasks },
    { data: vehicleInsurances },
    { data: vehicleAppraisals },
    { data: insurers },
  ] = await Promise.all([
    supabase.from("vehicle_transfers").select("id, status, origin_branch, destination_branch, created_at").limit(100),
    supabase.from("bank_accounts").select("id, bank_name, account_name, iban, initial_balance, is_active").limit(20),
    supabase.from("bank_movements").select("id, amount, movement_type, movement_date, is_reconciled, bank_account_id").order("movement_date", { ascending: false }).limit(100),
    supabase.from("commercial_activities").select("id, channel, result, status, activity_date, follow_up_date, user_name").order("activity_date", { ascending: false }).limit(100),
    supabase.from("demands").select("id, status, intention_level, brand_preferences, price_min, price_max, user_name, created_at").limit(100),
    supabase.from("tasks").select("id, status, priority, due_date, title").limit(200),
    supabase.from("vehicle_insurances").select("id, vehicle_id, status, start_date, end_date, premium_amount").limit(200),
    supabase.from("vehicle_appraisals").select("id, vehicle_id, appraised_value, created_at").order("created_at", { ascending: false }).limit(50),
    supabase.from("insurers").select("id, name, active").limit(50),
  ]);

  // ═══ BUILD CONTEXT ═══
  const fmt = (n: number) => Math.round(n).toLocaleString("es-ES");

  // --- Vehicles ---
  const activeVehicles = (vehicles || []).filter(v => !v.is_deregistered);
  const statusCounts: Record<string, number> = {};
  activeVehicles.forEach(v => { statusCounts[v.status] = (statusCounts[v.status] || 0) + 1; });
  const stockVehicles = activeVehicles.filter(v => v.status === "disponible" || v.status === "reservado");
  const stockValue = stockVehicles.reduce((s, v) => s + (v.pvp_base || 0), 0);
  const avgMargin = stockVehicles.length > 0 ? stockVehicles.reduce((s, v) => s + (v.net_profit || 0), 0) / stockVehicles.length : 0;

  // --- Sales ---
  const recentSales = (sales || []).slice(0, 30);
  const totalSalesAmount = recentSales.reduce((s, v) => s + (v.total_amount || 0), 0);

  // --- Reservations ---
  const allRes = reservations || [];
  const resByStatus: Record<string, number> = {};
  allRes.forEach(r => { resByStatus[r.status] = (resByStatus[r.status] || 0) + 1; });

  // --- Invoices ---
  const allInv = invoices || [];
  const invPending = allInv.filter(i => i.payment_status === "pendiente" && i.status === "emitida");
  const invPaid = allInv.filter(i => i.payment_status === "cobrada");
  const invByType: Record<string, number> = {};
  allInv.forEach(i => { invByType[i.invoice_type] = (invByType[i.invoice_type] || 0) + 1; });

  // --- Payments ---
  const allPay = payments || [];
  const totalCollected = allPay.filter(p => !p.is_refund).reduce((s, p) => s + p.amount, 0);
  const totalRefunded = allPay.filter(p => p.is_refund).reduce((s, p) => s + p.amount, 0);

  // --- Expenses ---
  const allExp = expenses || [];
  const expByCategory: Record<string, { count: number; total: number }> = {};
  allExp.forEach(e => {
    const cat = e.expense_category || "otros";
    if (!expByCategory[cat]) expByCategory[cat] = { count: 0, total: 0 };
    expByCategory[cat].count++;
    expByCategory[cat].total += e.amount || 0;
  });

  // --- Suppliers ---
  const activeSuppliers = (suppliers || []).filter(s => s.active).length;
  const allSI = supplierInvoices || [];
  const siByStatus: Record<string, { count: number; total: number }> = {};
  allSI.forEach(si => {
    if (!siByStatus[si.status]) siByStatus[si.status] = { count: 0, total: 0 };
    siByStatus[si.status].count++;
    siByStatus[si.status].total += si.total_amount || 0;
  });
  const totalSupplierPaid = (supplierPayments || []).reduce((s, p) => s + p.amount, 0);

  // --- Repair Orders ---
  const roByStatus: Record<string, number> = {};
  (repairOrders || []).forEach(r => { roByStatus[r.status] = (roByStatus[r.status] || 0) + 1; });
  const roTotal = (repairOrders || []).reduce((s, r) => s + (r.estimated_total || 0), 0);

  // --- Operating Expenses ---
  const opExpTotal = (operatingExpenses || []).reduce((s, e) => s + e.amount, 0);
  const opExpByCategory: Record<string, number> = {};
  (operatingExpenses || []).forEach(e => { opExpByCategory[e.category] = (opExpByCategory[e.category] || 0) + e.amount; });

  // --- Cash ---
  const allCash = cashMovements || [];
  const cashIn = allCash.filter(m => m.movement_type === "ingreso").reduce((s, m) => s + m.amount, 0);
  const cashOut = allCash.filter(m => m.movement_type === "gasto").reduce((s, m) => s + m.amount, 0);

  // --- Bank ---
  const activeBanks = (bankAccounts || []).filter(b => b.is_active);
  const allBM = bankMovements || [];
  const bmIn = allBM.filter(m => m.movement_type === "ingreso").reduce((s, m) => s + m.amount, 0);
  const bmOut = allBM.filter(m => m.movement_type === "gasto").reduce((s, m) => s + m.amount, 0);
  const bmReconciled = allBM.filter(m => m.is_reconciled).length;

  // --- Accounting ---
  const allJE = journalEntries || [];
  const allJL = journalLines || [];
  const accountBalances: Record<string, { debit: number; credit: number }> = {};
  allJL.forEach(l => {
    const code = l.account_code;
    if (!accountBalances[code]) accountBalances[code] = { debit: 0, credit: 0 };
    accountBalances[code].debit += l.debit || 0;
    accountBalances[code].credit += l.credit || 0;
  });
  const keyAccounts = ["430", "400", "570", "572", "620", "700", "477"];

  // --- Finance ---
  const activeEntities = (financeEntities || []).filter(e => e.active).length;
  const activeProducts = (financeProducts || []).filter(p => p.active).length;
  const simByStatus: Record<string, { count: number; total: number }> = {};
  (financeSimulations || []).forEach(s => {
    if (!simByStatus[s.status]) simByStatus[s.status] = { count: 0, total: 0 };
    simByStatus[s.status].count++;
    simByStatus[s.status].total += s.financed_amount || 0;
  });

  // --- Postventa ---
  const countByStatus = (arr: any[]) => {
    const r: Record<string, number> = {};
    (arr || []).forEach(i => { r[i.status] = (r[i.status] || 0) + 1; });
    return r;
  };
  const claimStats = countByStatus(pvClaims || []);
  const incidentStats = countByStatus(pvIncidents || []);
  const repairStats = countByStatus(pvRepairs || []);
  const followupStats = countByStatus(pvFollowups || []);
  const warrantyStats = countByStatus(pvWarranties || []);
  const reviewStats = countByStatus(pvReviews || []);
  const finIncStats = countByStatus(pvFinanceIncidents || []);
  const repairCost = (pvRepairs || []).reduce((s, r) => s + (r.cost || 0), 0);
  const finIncAmount = (pvFinanceIncidents || []).reduce((s, i) => s + (i.amount || 0), 0);

  // --- Transfers ---
  const trByStatus: Record<string, number> = {};
  (vehicleTransfers || []).forEach(t => { trByStatus[t.status] = (trByStatus[t.status] || 0) + 1; });

  // --- Commercial ---
  const actByChannel: Record<string, number> = {};
  const actByResult: Record<string, number> = {};
  const pendingFollowups = (commercialActivities || []).filter(a => a.follow_up_date && a.status === "pendiente").length;
  (commercialActivities || []).forEach(a => {
    actByChannel[a.channel] = (actByChannel[a.channel] || 0) + 1;
    actByResult[a.result] = (actByResult[a.result] || 0) + 1;
  });

  // --- Demands ---
  const demByStatus: Record<string, number> = {};
  (demands || []).forEach(d => { demByStatus[d.status] = (demByStatus[d.status] || 0) + 1; });

  // --- Tasks ---
  const taskByStatus: Record<string, number> = {};
  const taskByPriority: Record<string, number> = {};
  (tasks || []).forEach(t => {
    taskByStatus[t.status] = (taskByStatus[t.status] || 0) + 1;
    taskByPriority[t.priority] = (taskByPriority[t.priority] || 0) + 1;
  });

  // --- Insurances ---
  const activeInsurances = (vehicleInsurances || []).filter(i => i.status === "activa" || i.status === "vigente").length;
  const totalPremium = (vehicleInsurances || []).reduce((s, i) => s + (i.premium_amount || 0), 0);

  // --- Appraisals ---
  const totalAppraisals = (vehicleAppraisals || []).length;
  const avgAppraisalValue = totalAppraisals > 0 ? (vehicleAppraisals || []).reduce((s, a) => s + (a.appraised_value || 0), 0) / totalAppraisals : 0;

  // --- Proposals ---
  const propByType: Record<string, number> = {};
  (proposals || []).forEach(p => { propByType[p.proposal_type] = (propByType[p.proposal_type] || 0) + 1; });

  const fmtObj = (obj: Record<string, number>) => Object.entries(obj).map(([k, v]) => `${k}: ${v}`).join(" | ");
  const fmtObjMoney = (obj: Record<string, { count: number; total: number }>) =>
    Object.entries(obj).map(([k, v]) => `${k}: ${v.count} (${fmt(v.total)} €)`).join(" | ");

  return `RESUMEN DE DATOS CAROVE (actualizado al momento):

═══ STOCK DE VEHÍCULOS (${activeVehicles.length} activos) ═══
Por estado: ${fmtObj(statusCounts)}
Valor stock (PVP): ${fmt(stockValue)} €
Margen medio en stock: ${fmt(avgMargin)} €
Seguros activos: ${activeInsurances} | Prima total: ${fmt(totalPremium)} €
Tasaciones realizadas: ${totalAppraisals} | Valor medio: ${fmt(avgAppraisalValue)} €
Aseguradoras registradas: ${(insurers || []).length} (activas: ${(insurers || []).filter(i => i.active).length})

Detalle stock (top 20):
${stockVehicles.slice(0, 20).map(v => `  · ${v.brand} ${v.model} (${v.plate}) — PVP: ${fmt(v.pvp_base || 0)} € | Coste: ${fmt(v.total_cost || 0)} € | Margen: ${fmt(v.net_profit || 0)} € | Centro: ${v.center || "—"}`).join("\n")}

═══ VENTAS Y RESERVAS ═══
Ventas recientes (${recentSales.length}): Facturación total: ${fmt(totalSalesAmount)} €
${recentSales.slice(0, 10).map(s => `  · ${s.sale_date}: ${s.buyer_name} — ${fmt(s.total_amount || 0)} €`).join("\n")}

Reservas: ${fmtObj(resByStatus)}
${allRes.filter(r => r.status === "activa").slice(0, 5).map(r => `  · ${r.buyer_name} — Señal: ${fmt(r.deposit_amount || 0)} €`).join("\n")}

Propuestas recientes: ${(proposals || []).length} | Por tipo: ${fmtObj(propByType)}

═══ FACTURACIÓN Y COBROS ═══
Facturas recientes: ${allInv.length} | Por tipo: ${fmtObj(invByType)}
Pendientes de cobro: ${invPending.length} (${fmt(invPending.reduce((s, i) => s + i.total_amount, 0))} €)
Cobradas: ${invPaid.length} (${fmt(invPaid.reduce((s, i) => s + i.total_amount, 0))} €)

Cobros registrados: ${allPay.length}
Total cobrado: ${fmt(totalCollected)} € | Devoluciones: ${fmt(totalRefunded)} €

═══ PROVEEDORES Y REPARACIONES ═══
Proveedores activos: ${activeSuppliers}
Facturas de proveedor por estado: ${fmtObjMoney(siByStatus)}
Total pagado a proveedores: ${fmt(totalSupplierPaid)} €

Órdenes de reparación por estado: ${fmtObj(roByStatus)}
Coste estimado total OR: ${fmt(roTotal)} €

═══ GASTOS ═══
Gastos de vehículos por categoría:
${Object.entries(expByCategory).map(([cat, data]) => `  · ${cat}: ${data.count} gastos — ${fmt(data.total)} €`).join("\n")}

Gastos operativos: ${(operatingExpenses || []).length} — Total: ${fmt(opExpTotal)} €
${Object.entries(opExpByCategory).map(([cat, total]) => `  · ${cat}: ${fmt(total)} €`).join("\n")}

═══ TESORERÍA ═══
Movimientos de caja (últimos ${allCash.length}):
Ingresos: ${fmt(cashIn)} € | Gastos: ${fmt(cashOut)} €

Cuentas bancarias activas: ${activeBanks.length}
${activeBanks.map(b => `  · ${b.bank_name} — ${b.account_name} (${b.iban})`).join("\n")}
Movimientos bancarios (últimos ${allBM.length}): Ingresos: ${fmt(bmIn)} € | Gastos: ${fmt(bmOut)} €
Conciliados: ${bmReconciled} / ${allBM.length}

═══ CONTABILIDAD ═══
Asientos recientes: ${allJE.length}
${(accountingPeriods || []).map(p => `  · Año ${p.year}: ${p.is_closed ? "CERRADO" : "ABIERTO"} — ${p.current_number} asientos`).join("\n")}

Saldos cuentas principales:
${keyAccounts.map(code => {
  const b = accountBalances[code];
  return b ? `  · ${code}: Debe ${fmt(b.debit)} € | Haber ${fmt(b.credit)} € | Saldo ${fmt(b.debit - b.credit)} €` : null;
}).filter(Boolean).join("\n")}

═══ FINANCIACIÓN ═══
Entidades activas: ${activeEntities} | Productos activos: ${activeProducts}
Modelos por plazo configurados: ${(financeTermModels || []).filter(t => t.active).length}

Simulaciones por estado: ${fmtObjMoney(simByStatus)}

═══ CRM / COMERCIAL ═══
Actividades recientes: ${(commercialActivities || []).length}
Por canal: ${fmtObj(actByChannel)}
Por resultado: ${fmtObj(actByResult)}
Seguimientos pendientes: ${pendingFollowups}

Demandas por estado: ${fmtObj(demByStatus)}

Clientes activos: ${(clients || []).length}
Compradores: ${(clients || []).filter(c => c.is_buyer).length} | Vendedores: ${(clients || []).filter(c => c.is_seller).length}

═══ POSTVENTA ═══
Reclamaciones: ${(pvClaims || []).length} — ${fmtObj(claimStats)}
Incidencias: ${(pvIncidents || []).length} — ${fmtObj(incidentStats)}
Reparaciones PV: ${(pvRepairs || []).length} — ${fmtObj(repairStats)} — Coste total: ${fmt(repairCost)} €
Seguimientos PV: ${(pvFollowups || []).length} — ${fmtObj(followupStats)}
Garantías: ${(pvWarranties || []).length} — ${fmtObj(warrantyStats)}
Revisiones: ${(pvReviews || []).length} — ${fmtObj(reviewStats)}
Incidencias financieras: ${(pvFinanceIncidents || []).length} — ${fmtObj(finIncStats)} — Importe: ${fmt(finIncAmount)} €

═══ TRASPASOS ═══
Por estado: ${fmtObj(trByStatus)}

═══ TAREAS ═══
Total: ${(tasks || []).length}
Por estado: ${fmtObj(taskByStatus)}
Por prioridad: ${fmtObj(taskByPriority)}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const context = await fetchContext(supabaseUrl, serviceKey);

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: "Bearer " + LOVABLE_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: SYSTEM_PROMPT + "\n\n" + context },
            ...messages,
          ],
          stream: true,
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Demasiadas solicitudes. Inténtalo de nuevo en unos segundos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos agotados. Contacta con el administrador." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(
        JSON.stringify({ error: "Error del servicio de IA" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ai-assistant error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Error desconocido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
