// Supabase Edge Function: generate-report-pdf
// Genera HTML maquetado para contratos / recibos / informes de Carove Hub.
//
// Contrato (compatible con el frontend existente):
//   Request:   POST  body: { type: string, params: object }
//   Response:  { url: "data:text/html;charset=utf-8;base64,XXX" }
//
//   El frontend hace `fetch(url).then(r => r.text())` para obtener el HTML.
//   Luego lo muestra en un iframe editable y/o el usuario hace Cmd+P para
//   guardar como PDF (el HTML lleva @media print con maquetación A4 limpia).
//
// Tipos soportados:
//   - reservation-contract    → contrato de reserva (params: reservation_id)
//   - reservation-receipt     → recibo de señal (params: reservation_id)
//   - purchase-contract       → contrato de compra (params: purchase_id)
//
// Tipos pendientes de implementar (devuelven 501):
//   - sales-contract, proforma-invoice, finance-proposal,
//     pyg, balance, vehicle-margin
//
// Despliegue:
//   supabase functions deploy generate-report-pdf --project-ref flstoaobldowsmsskgiz
//
// Variables de entorno (auto-provistas por la plataforma):
//   SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function fmtCurrency(n: number | null | undefined): string {
  if (n == null || isNaN(Number(n))) return "—";
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(Number(n));
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return "—";
  try {
    return new Intl.DateTimeFormat("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(d));
  } catch {
    return "—";
  }
}

function fmtDateLong(d: string | null | undefined): string {
  if (!d) return "—";
  try {
    return new Intl.DateTimeFormat("es-ES", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date(d));
  } catch {
    return "—";
  }
}

function escapeHtml(s: unknown): string {
  if (s == null) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buyerName(b: any): string {
  if (!b) return "—";
  if (b.client_type === "profesional" || b.client_type === "empresa") {
    return b.company_name || b.name || "—";
  }
  return [b.name, b.last_name].filter(Boolean).join(" ") || "—";
}

function buyerTaxId(b: any): string {
  return b?.cif || b?.dni || "—";
}

function buyerFullAddress(b: any): string {
  if (!b) return "—";
  const parts = [
    b.fiscal_address || b.address,
    b.postal_code,
    b.city,
    b.province,
  ].filter(Boolean);
  return parts.join(", ") || "—";
}

function htmlAsDataUrl(html: string): string {
  // Codifica en base64 manteniendo UTF-8.
  const utf8 = new TextEncoder().encode(html);
  let bin = "";
  utf8.forEach((b) => (bin += String.fromCharCode(b)));
  const b64 = btoa(bin);
  return `data:text/html;charset=utf-8;base64,${b64}`;
}

// ─── Estilos comunes para todos los documentos ─────────────────────────────

const COMMON_CSS = `
<style>
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    color: #1f2937;
    background: #f9fafb;
    line-height: 1.55;
    font-size: 12px;
  }
  .page {
    background: white;
    max-width: 210mm;
    min-height: 297mm;
    margin: 24px auto;
    padding: 18mm 16mm;
    box-shadow: 0 1px 3px rgba(0,0,0,0.08);
  }
  .toolbar {
    max-width: 210mm;
    margin: 0 auto 16px;
    padding: 8px 16mm;
    display: flex;
    justify-content: flex-end;
    gap: 8px;
  }
  .btn {
    background: #1f2a44;
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 6px;
    font-size: 13px;
    cursor: pointer;
    font-family: inherit;
  }
  .btn:hover { opacity: 0.9; }
  .btn-secondary {
    background: white;
    color: #1f2a44;
    border: 1px solid #d1d5db;
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    border-bottom: 2px solid #1f2a44;
    padding-bottom: 14px;
    margin-bottom: 22px;
  }
  .header .company { font-size: 11px; color: #4b5563; line-height: 1.5; }
  .header .company strong { display: block; color: #111827; font-size: 14px; margin-bottom: 4px; }
  .header .doc-meta { text-align: right; font-size: 11px; color: #4b5563; }
  .header .doc-meta .doc-type {
    display: inline-block;
    padding: 4px 10px;
    background: #1f2a44;
    color: white;
    font-weight: 600;
    border-radius: 4px;
    font-size: 11px;
    margin-bottom: 6px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .header .doc-meta .doc-id { font-family: ui-monospace, monospace; font-size: 11px; color: #111827; }
  .header .doc-meta .doc-date { color: #6b7280; }

  h1 {
    font-size: 18px;
    font-weight: 700;
    text-align: center;
    margin: 22px 0 14px;
    color: #111827;
    letter-spacing: -0.01em;
  }

  h2 {
    font-size: 13px;
    font-weight: 700;
    color: #1f2a44;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    margin: 22px 0 8px;
    padding-bottom: 4px;
    border-bottom: 1px solid #e5e7eb;
  }

  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }

  .party {
    background: #f3f4f6;
    border-radius: 6px;
    padding: 12px 14px;
  }
  .party .label {
    font-size: 10px;
    font-weight: 600;
    color: #6b7280;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 6px;
  }
  .party .name { font-size: 14px; font-weight: 600; color: #111827; }
  .party .meta { font-size: 11px; color: #4b5563; margin-top: 4px; line-height: 1.6; }

  table {
    width: 100%;
    border-collapse: collapse;
    margin: 8px 0 12px;
    font-size: 11px;
  }
  table th {
    text-align: left;
    background: #f3f4f6;
    color: #4b5563;
    font-weight: 600;
    padding: 8px 10px;
    border-bottom: 1px solid #d1d5db;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    font-size: 10px;
  }
  table td {
    padding: 8px 10px;
    border-bottom: 1px solid #f3f4f6;
    color: #1f2937;
  }
  table td.right, table th.right { text-align: right; }
  table tfoot td {
    background: #f9fafb;
    font-weight: 600;
    border-top: 2px solid #d1d5db;
    border-bottom: none;
  }

  .summary {
    margin: 10px 0 14px;
    margin-left: auto;
    width: 280px;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    overflow: hidden;
  }
  .summary .row {
    display: flex;
    justify-content: space-between;
    padding: 6px 12px;
    font-size: 11px;
    border-bottom: 1px solid #f3f4f6;
  }
  .summary .row:last-child { border-bottom: none; }
  .summary .row.total {
    background: #1f2a44;
    color: white;
    font-weight: 700;
    font-size: 13px;
    padding: 10px 12px;
  }

  .clauses { margin-top: 20px; }
  .clause { margin-bottom: 14px; page-break-inside: avoid; }
  .clause .num {
    font-weight: 700;
    color: #1f2a44;
    margin-right: 6px;
  }
  .clause .title {
    font-weight: 700;
    color: #111827;
    text-transform: uppercase;
    font-size: 11px;
    letter-spacing: 0.04em;
    margin-bottom: 4px;
  }
  .clause .content {
    font-size: 11px;
    color: #374151;
    text-align: justify;
    white-space: pre-wrap;
  }

  .signatures {
    margin-top: 50px;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 32px;
    page-break-inside: avoid;
  }
  .signature-box {
    border-top: 1px solid #1f2937;
    padding-top: 8px;
    text-align: center;
  }
  .signature-box .label {
    font-size: 10px;
    color: #6b7280;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .signature-box .name {
    font-size: 12px;
    font-weight: 600;
    color: #111827;
    margin-top: 2px;
  }

  .place-date {
    margin-top: 30px;
    text-align: center;
    font-size: 11px;
    color: #4b5563;
  }

  .footer {
    margin-top: 28px;
    padding-top: 12px;
    border-top: 1px solid #e5e7eb;
    text-align: center;
    font-size: 9px;
    color: #9ca3af;
  }

  .empty-state {
    color: #9ca3af;
    font-style: italic;
    font-size: 11px;
  }

  /* Estilos para impresión */
  @media print {
    body { background: white; }
    .toolbar { display: none; }
    .page {
      box-shadow: none;
      margin: 0;
      max-width: 100%;
      padding: 14mm;
    }
    @page { size: A4; margin: 0; }
  }
</style>
`;

const TOOLBAR_HTML = `
<div class="toolbar no-print">
  <button class="btn-secondary btn" onclick="window.close()">Cerrar</button>
  <button class="btn" onclick="window.print()">Imprimir / Guardar PDF</button>
</div>
`;

// ─── Header común con datos de empresa ──────────────────────────────────────

function renderHeader(opts: {
  company: any;
  docType: string;
  docId: string;
  docDate: string;
}): string {
  const c = opts.company || {};
  const companyAddress = [c.address, c.postal_code, c.city, c.province]
    .filter(Boolean)
    .join(", ");
  return `
  <div class="header">
    <div class="company">
      <strong>${escapeHtml(c.company_name || "Carove")}</strong>
      ${c.cif ? `CIF: ${escapeHtml(c.cif)}<br>` : ""}
      ${companyAddress ? `${escapeHtml(companyAddress)}<br>` : ""}
      ${c.phone ? `Tel: ${escapeHtml(c.phone)}` : ""}
      ${c.phone && c.email ? " · " : ""}
      ${c.email ? `${escapeHtml(c.email)}` : ""}
    </div>
    <div class="doc-meta">
      <div class="doc-type">${escapeHtml(opts.docType)}</div>
      <div class="doc-id">${escapeHtml(opts.docId)}</div>
      <div class="doc-date">${escapeHtml(opts.docDate)}</div>
    </div>
  </div>
  `;
}

// ─── Cláusulas ──────────────────────────────────────────────────────────────

function renderClauses(clauses: any[], fallback: { title: string; content: string }[]): string {
  const list = clauses && clauses.length > 0 ? clauses : fallback;
  if (!list || list.length === 0) return "";
  return `
  <div class="clauses">
    <h2>Cláusulas y condiciones</h2>
    ${list
      .map(
        (cl, i) => `
      <div class="clause">
        <div class="title"><span class="num">${i + 1}.</span>${escapeHtml(cl.title || "")}</div>
        <div class="content">${escapeHtml(cl.content || "").replace(/\n/g, "<br>")}</div>
      </div>
    `,
      )
      .join("")}
  </div>
  `;
}

// ─── Generadores específicos ───────────────────────────────────────────────

async function generateReservationContract(
  admin: any,
  reservationId: string,
): Promise<string> {
  // 1. Cargar datos
  const { data: reservation, error: rerr } = await admin
    .from("reservations")
    .select("*")
    .eq("id", reservationId)
    .maybeSingle();
  if (rerr) throw new Error("Reserva no encontrada: " + rerr.message);
  if (!reservation) throw new Error("Reserva no encontrada");

  const [
    { data: vehicle },
    { data: buyer },
    { data: company },
    { data: clauses },
  ] = await Promise.all([
    admin.from("vehicles").select("*").eq("id", reservation.vehicle_id).maybeSingle(),
    admin.from("buyers").select("*").eq("id", reservation.buyer_id).maybeSingle(),
    admin.from("company_settings").select("*").limit(1).maybeSingle(),
    admin
      .from("reservation_clauses")
      .select("title, content, order_index")
      .eq("active", true)
      .order("order_index", { ascending: true }),
  ]);

  const pvp = Number(reservation.vehicle_pvp_snapshot || vehicle?.pvp_base || 0);
  const senal = Number(reservation.reservation_amount || 0);
  const restoPagar = pvp - senal;

  const docId = `RES-${(reservation.id || "").slice(0, 8).toUpperCase()}`;
  const docDate = fmtDate(reservation.reservation_date || reservation.created_at);

  const fallbackClauses = [
    {
      title: "Objeto del contrato",
      content:
        "El COMPRADOR reserva el vehículo descrito a continuación abonando la cantidad indicada como señal. Esta reserva no transmite la propiedad del vehículo, que permanecerá del VENDEDOR hasta el pago total y formalización de la compraventa.",
    },
    {
      title: "Vigencia de la reserva",
      content:
        "La presente reserva tendrá validez hasta la fecha de vencimiento indicada. Si el COMPRADOR no formaliza la compraventa dentro de ese plazo, perderá el importe entregado como señal salvo causa imputable al VENDEDOR.",
    },
    {
      title: "Importe de la señal",
      content:
        "El importe abonado en concepto de señal se descontará del precio total de venta. En caso de formalizarse la compra, dicho importe formará parte del pago.",
    },
    {
      title: "Estado del vehículo",
      content:
        "El COMPRADOR declara haber inspeccionado el vehículo y conocer su estado actual, kilometraje y características. La reserva se realiza tal cual, sin más garantías que las que correspondan legalmente.",
    },
    {
      title: "Protección de datos",
      content:
        "Los datos personales facilitados serán tratados conforme al RGPD y la LOPDGDD para la gestión de la operación. El COMPRADOR podrá ejercer sus derechos dirigiéndose al VENDEDOR.",
    },
  ];

  const docName = company?.company_name || "Carove";
  const placeDate = `En ${company?.city || "Las Palmas"}, a ${fmtDateLong(reservation.reservation_date || reservation.created_at)}`;

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Contrato de reserva ${docId}</title>
${COMMON_CSS}
</head>
<body>
${TOOLBAR_HTML}
<div class="page">
  ${renderHeader({
    company,
    docType: "Contrato de reserva",
    docId,
    docDate,
  })}

  <h1>CONTRATO DE RESERVA DE VEHÍCULO</h1>

  <h2>Partes</h2>
  <div class="grid-2">
    <div class="party">
      <div class="label">Vendedor</div>
      <div class="name">${escapeHtml(docName)}</div>
      <div class="meta">
        ${company?.cif ? `CIF: ${escapeHtml(company.cif)}<br>` : ""}
        ${[company?.address, company?.postal_code, company?.city]
          .filter(Boolean)
          .map(escapeHtml)
          .join(", ")}
        ${company?.phone ? `<br>Tel: ${escapeHtml(company.phone)}` : ""}
        ${company?.email ? `<br>${escapeHtml(company.email)}` : ""}
      </div>
    </div>
    <div class="party">
      <div class="label">Comprador</div>
      <div class="name">${escapeHtml(buyerName(buyer))}</div>
      <div class="meta">
        ${buyer ? `${buyer.client_type === "profesional" || buyer.client_type === "empresa" ? "CIF" : "DNI"}: ${escapeHtml(buyerTaxId(buyer))}<br>` : ""}
        ${escapeHtml(buyerFullAddress(buyer))}
        ${buyer?.phone ? `<br>Tel: ${escapeHtml(buyer.phone)}` : ""}
        ${buyer?.email ? `<br>${escapeHtml(buyer.email)}` : ""}
      </div>
    </div>
  </div>

  <h2>Vehículo objeto de la reserva</h2>
  <table>
    <tbody>
      <tr><th style="width:30%">Marca y modelo</th><td>${escapeHtml(vehicle?.brand || "")} ${escapeHtml(vehicle?.model || "")} ${escapeHtml(vehicle?.version || "")}</td></tr>
      <tr><th>Matrícula</th><td>${escapeHtml(vehicle?.plate || "—")}</td></tr>
      <tr><th>VIN / Bastidor</th><td style="font-family:ui-monospace,monospace">${escapeHtml(vehicle?.vin || "—")}</td></tr>
      <tr><th>1ª matriculación</th><td>${fmtDate(vehicle?.first_registration)}</td></tr>
      <tr><th>Combustible</th><td>${escapeHtml(vehicle?.fuel_type || vehicle?.engine_type || "—")}</td></tr>
      <tr><th>Kilometraje</th><td>${vehicle?.km_entry != null ? Number(vehicle.km_entry).toLocaleString("es-ES") + " km" : vehicle?.mileage != null ? Number(vehicle.mileage).toLocaleString("es-ES") + " km" : "—"}</td></tr>
      <tr><th>Color</th><td>${escapeHtml(vehicle?.color || "—")}</td></tr>
    </tbody>
  </table>

  <h2>Condiciones económicas</h2>
  <div class="summary">
    <div class="row"><span>Precio del vehículo</span><span>${fmtCurrency(pvp)}</span></div>
    <div class="row"><span>Señal entregada</span><span>${fmtCurrency(senal)}</span></div>
    <div class="row total"><span>Resto a pagar</span><span>${fmtCurrency(restoPagar)}</span></div>
  </div>
  ${reservation.expiration_date ? `<p style="font-size:11px"><strong>Fecha de vencimiento de la reserva:</strong> ${fmtDate(reservation.expiration_date)}</p>` : ""}
  ${reservation.notes ? `<p style="font-size:11px;color:#4b5563"><strong>Observaciones:</strong> ${escapeHtml(reservation.notes)}</p>` : ""}

  ${renderClauses(clauses || [], fallbackClauses)}

  <p class="place-date">${escapeHtml(placeDate)}</p>

  <div class="signatures">
    <div class="signature-box">
      <div class="label">Por el VENDEDOR</div>
      <div class="name">${escapeHtml(docName)}</div>
    </div>
    <div class="signature-box">
      <div class="label">Por el COMPRADOR</div>
      <div class="name">${escapeHtml(buyerName(buyer))}</div>
    </div>
  </div>

  <div class="footer">
    Documento generado el ${fmtDateLong(new Date().toISOString())} · ${escapeHtml(docName)}
  </div>
</div>
</body>
</html>`;
}

async function generateReservationReceipt(
  admin: any,
  reservationId: string,
): Promise<string> {
  const { data: reservation, error: rerr } = await admin
    .from("reservations")
    .select("*")
    .eq("id", reservationId)
    .maybeSingle();
  if (rerr) throw new Error("Reserva no encontrada: " + rerr.message);
  if (!reservation) throw new Error("Reserva no encontrada");

  const [{ data: vehicle }, { data: buyer }, { data: company }] =
    await Promise.all([
      admin.from("vehicles").select("*").eq("id", reservation.vehicle_id).maybeSingle(),
      admin.from("buyers").select("*").eq("id", reservation.buyer_id).maybeSingle(),
      admin.from("company_settings").select("*").limit(1).maybeSingle(),
    ]);

  const senal = Number(reservation.reservation_amount || 0);
  const docId = `REC-${(reservation.id || "").slice(0, 8).toUpperCase()}`;
  const docDate = fmtDate(reservation.reservation_date || reservation.created_at);
  const docName = company?.company_name || "Carove";
  const placeDate = `En ${company?.city || "Las Palmas"}, a ${fmtDateLong(reservation.reservation_date || reservation.created_at)}`;

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Recibo de señal ${docId}</title>
${COMMON_CSS}
</head>
<body>
${TOOLBAR_HTML}
<div class="page">
  ${renderHeader({
    company,
    docType: "Recibo de señal",
    docId,
    docDate,
  })}

  <h1>RECIBO DE SEÑAL</h1>

  <p style="margin: 16px 0 24px; font-size: 12px; line-height: 1.7;">
    <strong>${escapeHtml(docName)}</strong>${company?.cif ? ` (CIF ${escapeHtml(company.cif)})` : ""}
    declara haber recibido de
    <strong>${escapeHtml(buyerName(buyer))}</strong>${buyer ? ` (${buyer.client_type === "profesional" || buyer.client_type === "empresa" ? "CIF" : "DNI"} ${escapeHtml(buyerTaxId(buyer))})` : ""}
    la cantidad de:
  </p>

  <div class="summary" style="margin: 24px auto;">
    <div class="row total">
      <span>Importe recibido</span>
      <span>${fmtCurrency(senal)}</span>
    </div>
  </div>

  <p style="margin: 24px 0; font-size: 12px;">
    En concepto de <strong>señal de reserva</strong> del vehículo:
  </p>

  <table>
    <tbody>
      <tr><th style="width:30%">Marca y modelo</th><td>${escapeHtml(vehicle?.brand || "")} ${escapeHtml(vehicle?.model || "")}</td></tr>
      <tr><th>Matrícula</th><td>${escapeHtml(vehicle?.plate || "—")}</td></tr>
      <tr><th>VIN</th><td style="font-family:ui-monospace,monospace">${escapeHtml(vehicle?.vin || "—")}</td></tr>
    </tbody>
  </table>

  <p style="margin: 24px 0; font-size: 11px; color: #4b5563;">
    El importe entregado se descontará del precio total de venta del vehículo. En caso de no formalizarse la compraventa por causas imputables al comprador, el importe quedará retenido como compensación al vendedor.
  </p>

  <p class="place-date">${escapeHtml(placeDate)}</p>

  <div class="signatures">
    <div class="signature-box">
      <div class="label">Recibí (Vendedor)</div>
      <div class="name">${escapeHtml(docName)}</div>
    </div>
    <div class="signature-box">
      <div class="label">Entregué (Comprador)</div>
      <div class="name">${escapeHtml(buyerName(buyer))}</div>
    </div>
  </div>

  <div class="footer">
    Documento generado el ${fmtDateLong(new Date().toISOString())} · ${escapeHtml(docName)}
  </div>
</div>
</body>
</html>`;
}

async function generatePurchaseContract(
  admin: any,
  purchaseId: string,
): Promise<string> {
  const { data: purchase, error: perr } = await admin
    .from("vehicle_purchases")
    .select("*")
    .eq("id", purchaseId)
    .maybeSingle();
  if (perr) throw new Error("Compra no encontrada: " + perr.message);
  if (!purchase) throw new Error("Compra no encontrada");

  const [
    { data: vehicle },
    { data: seller },
    { data: company },
  ] = await Promise.all([
    admin.from("vehicles").select("*").eq("id", purchase.vehicle_id).maybeSingle(),
    purchase.seller_id
      ? admin.from("buyers").select("*").eq("id", purchase.seller_id).maybeSingle()
      : Promise.resolve({ data: null }),
    admin.from("company_settings").select("*").limit(1).maybeSingle(),
  ]);

  const precio = Number(
    purchase.purchase_price ||
      purchase.requested_price ||
      vehicle?.purchase_price ||
      0,
  );
  const docId = `COMP-${(purchase.id || "").slice(0, 8).toUpperCase()}`;
  const docDate = fmtDate(purchase.purchase_date || purchase.created_at);
  const docName = company?.company_name || "Carove";
  const placeDate = `En ${company?.city || "Las Palmas"}, a ${fmtDateLong(purchase.purchase_date || purchase.created_at)}`;

  const sourceLabels: Record<string, string> = {
    particular: "particular",
    profesional: "profesional",
    subasta: "subasta",
    concesionario: "concesionario",
    otro: "otro",
  };
  const sourceLabel = sourceLabels[purchase.source_type] || "particular";

  const fallbackClauses = [
    {
      title: "Objeto del contrato",
      content:
        "El VENDEDOR transmite al COMPRADOR la propiedad del vehículo descrito, libre de cargas, gravámenes y embargos, y el COMPRADOR lo adquiere por el precio acordado.",
    },
    {
      title: "Estado del vehículo",
      content:
        "El VENDEDOR declara que el vehículo se entrega en el estado físico y mecánico actualmente conocido por ambas partes, con la documentación técnica al día y sin reclamaciones de terceros pendientes.",
    },
    {
      title: "Pago",
      content:
        "El precio se abonará según el método y plazos acordados entre las partes. El COMPRADOR no se hará cargo de obligaciones tributarias o multas anteriores a la fecha de este contrato.",
    },
    {
      title: "Transferencia de titularidad",
      content:
        "El VENDEDOR se compromete a entregar al COMPRADOR la documentación necesaria (permiso de circulación, ficha técnica, justificante de IVTM al corriente) para realizar el cambio de titularidad ante la Jefatura Provincial de Tráfico.",
    },
    {
      title: "Garantía y responsabilidad",
      content:
        sourceLabel === "particular"
          ? "Al tratarse de una compraventa entre particular y profesional, el COMPRADOR (profesional) asume la responsabilidad sobre el estado del vehículo desde la firma del contrato."
          : "Las partes acuerdan las garantías legales aplicables a la operación según la normativa vigente.",
    },
    {
      title: "Protección de datos",
      content:
        "Los datos personales facilitados serán tratados conforme al RGPD y la LOPDGDD para la gestión de la operación.",
    },
  ];

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Contrato de compraventa ${docId}</title>
${COMMON_CSS}
</head>
<body>
${TOOLBAR_HTML}
<div class="page">
  ${renderHeader({
    company,
    docType: "Contrato de compraventa",
    docId,
    docDate,
  })}

  <h1>CONTRATO DE COMPRAVENTA DE VEHÍCULO</h1>

  <h2>Partes</h2>
  <div class="grid-2">
    <div class="party">
      <div class="label">Vendedor (${sourceLabel})</div>
      <div class="name">${escapeHtml(buyerName(seller))}</div>
      <div class="meta">
        ${seller ? `${seller.client_type === "profesional" || seller.client_type === "empresa" ? "CIF" : "DNI"}: ${escapeHtml(buyerTaxId(seller))}<br>` : ""}
        ${escapeHtml(buyerFullAddress(seller))}
        ${seller?.phone ? `<br>Tel: ${escapeHtml(seller.phone)}` : ""}
        ${seller?.email ? `<br>${escapeHtml(seller.email)}` : ""}
      </div>
    </div>
    <div class="party">
      <div class="label">Comprador</div>
      <div class="name">${escapeHtml(docName)}</div>
      <div class="meta">
        ${company?.cif ? `CIF: ${escapeHtml(company.cif)}<br>` : ""}
        ${[company?.address, company?.postal_code, company?.city]
          .filter(Boolean)
          .map(escapeHtml)
          .join(", ")}
        ${company?.phone ? `<br>Tel: ${escapeHtml(company.phone)}` : ""}
        ${company?.email ? `<br>${escapeHtml(company.email)}` : ""}
      </div>
    </div>
  </div>

  <h2>Vehículo</h2>
  <table>
    <tbody>
      <tr><th style="width:30%">Marca y modelo</th><td>${escapeHtml(vehicle?.brand || "")} ${escapeHtml(vehicle?.model || "")} ${escapeHtml(vehicle?.version || "")}</td></tr>
      <tr><th>Matrícula</th><td>${escapeHtml(vehicle?.plate || "—")}</td></tr>
      <tr><th>VIN / Bastidor</th><td style="font-family:ui-monospace,monospace">${escapeHtml(vehicle?.vin || "—")}</td></tr>
      <tr><th>1ª matriculación</th><td>${fmtDate(vehicle?.first_registration)}</td></tr>
      <tr><th>Combustible</th><td>${escapeHtml(vehicle?.fuel_type || vehicle?.engine_type || "—")}</td></tr>
      <tr><th>Kilometraje</th><td>${vehicle?.km_entry != null ? Number(vehicle.km_entry).toLocaleString("es-ES") + " km" : "—"}</td></tr>
      <tr><th>Color</th><td>${escapeHtml(vehicle?.color || "—")}</td></tr>
    </tbody>
  </table>

  <h2>Precio</h2>
  <div class="summary">
    <div class="row total"><span>Precio acordado</span><span>${fmtCurrency(precio)}</span></div>
  </div>
  ${purchase.payment_method ? `<p style="font-size:11px"><strong>Forma de pago:</strong> ${escapeHtml(purchase.payment_method)}</p>` : ""}
  ${purchase.payment_date ? `<p style="font-size:11px"><strong>Fecha de pago:</strong> ${fmtDate(purchase.payment_date)}</p>` : ""}
  ${purchase.notes ? `<p style="font-size:11px;color:#4b5563"><strong>Observaciones:</strong> ${escapeHtml(purchase.notes)}</p>` : ""}

  ${renderClauses([], fallbackClauses)}

  <p class="place-date">${escapeHtml(placeDate)}</p>

  <div class="signatures">
    <div class="signature-box">
      <div class="label">El VENDEDOR</div>
      <div class="name">${escapeHtml(buyerName(seller))}</div>
    </div>
    <div class="signature-box">
      <div class="label">El COMPRADOR</div>
      <div class="name">${escapeHtml(docName)}</div>
    </div>
  </div>

  <div class="footer">
    Documento generado el ${fmtDateLong(new Date().toISOString())} · ${escapeHtml(docName)}
  </div>
</div>
</body>
</html>`;
}

// ─── Handler principal ─────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get(
      "SUPABASE_SERVICE_ROLE_KEY",
    )!;

    // 1. Verificar usuario autenticado (no requiere rol específico — cualquier usuario con sesión)
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return json({ error: "Falta cabecera Authorization" }, 401);
    }
    const callerClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller }, error: callerErr } =
      await callerClient.auth.getUser();
    if (callerErr || !caller) {
      return json({ error: "Sesión no válida" }, 401);
    }

    // 2. Body
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return json({ error: "Body JSON inválido" }, 400);
    }
    const type = String(body.type || "");
    const params = body.params || {};

    // 3. Cliente con service_role para acceder a datos sin RLS
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 4. Generar HTML según tipo
    let html: string;
    switch (type) {
      case "reservation-contract": {
        if (!params.reservation_id) {
          return json({ error: "Falta params.reservation_id" }, 400);
        }
        html = await generateReservationContract(admin, params.reservation_id);
        break;
      }
      case "reservation-receipt": {
        if (!params.reservation_id) {
          return json({ error: "Falta params.reservation_id" }, 400);
        }
        html = await generateReservationReceipt(admin, params.reservation_id);
        break;
      }
      case "purchase-contract": {
        if (!params.purchase_id) {
          return json({ error: "Falta params.purchase_id" }, 400);
        }
        html = await generatePurchaseContract(admin, params.purchase_id);
        break;
      }
      case "sales-contract":
      case "proforma-invoice":
      case "finance-proposal":
      case "pyg":
      case "balance":
      case "vehicle-margin":
        return json(
          {
            error: `Tipo '${type}' aún no implementado en esta versión de la Edge Function. Implementados: reservation-contract, reservation-receipt, purchase-contract.`,
          },
          501,
        );
      default:
        return json({ error: `Tipo '${type}' desconocido` }, 400);
    }

    // 5. Devolver data URL para mantener compatibilidad con el contrato
    //    `{ url }` que el frontend espera. El frontend hará fetch(url).text()
    //    y obtendrá el HTML para mostrarlo en iframe / imprimir.
    const dataUrl = htmlAsDataUrl(html);
    return json({ url: dataUrl, type });
  } catch (err) {
    console.error("[generate-report-pdf] error", err);
    return json(
      {
        error: String((err as Error)?.message ?? err),
      },
      500,
    );
  }
});
