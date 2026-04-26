// Supabase Edge Function: generate-vehicle
//
// Genera datos sintéticos de un vehículo de ocasión para autocompletar
// el formulario de alta cuando se está haciendo una demo o prueba.
//
// Body: ninguno
// Devuelve: { vehicle: {...}, expenses: [...], notes: [...] }
//
// Deploy:
//   supabase functions deploy generate-vehicle --project-ref flstoaobldowsmsskgiz

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  cors, json, callClaudeText, extractJSON,
  MODEL_HAIKU,
  type ClaudeMessage,
} from "../_shared/anthropic.ts";

const SYSTEM_PROMPT = `Eres un asistente que genera datos realistas y plausibles de vehículos de ocasión para un concesionario español. Devuelve SIEMPRE un único objeto JSON con la estructura exacta que se te pida, sin texto adicional fuera del JSON.

Reglas:
- Matrículas españolas formato "1234ABC" (4 dígitos + 3 letras consonantes, sin vocales ni Ñ/Q/CH/LL).
- VIN: 17 caracteres alfanuméricos sin I, O, Q.
- Fechas en ISO 8601 (YYYY-MM-DD).
- Precios coherentes con el mercado español de coches usados (turismos 5K-50K €).
- Año de matriculación entre 2010 y 2024.
- Kilometraje coherente con la antigüedad (~15.000-25.000 km/año).
- Centro: "Las Palmas" o "Tenerife".
- IGIC al 7% (régimen Canarias). REBU posible si vehículo de >2 años.`;

const USER_PROMPT = `Genera datos completos para un vehículo de ocasión. Devuelve un JSON exactamente con esta estructura:

{
  "vehicle": {
    "plate": "1234ABC",
    "vin": "VF1ABC1234567890X",
    "color": "Gris plata",
    "vehicle_class": "turismo",
    "vehicle_type": "ocasion",
    "engine_type": "gasolina",
    "transmission": "manual",
    "displacement": 1598,
    "horsepower": 110,
    "km_entry": 65000,
    "first_registration": "2019-04-15",
    "itv_date": "2025-04-15",
    "purchase_date": "2026-01-10",
    "expo_date": "2026-01-15",
    "purchase_price": 9500,
    "pvp_base": 13900,
    "price_professionals": 11800,
    "price_financed": 14500,
    "price_cash": 13500,
    "tax_type": "igic",
    "tax_rate": 7,
    "center": "Las Palmas",
    "has_second_key": true,
    "has_technical_sheet": true,
    "has_circulation_permit": true,
    "has_manual": false
  },
  "expenses": [
    { "category": "transporte", "amount": 250, "description": "Traslado de Península" },
    { "category": "preparacion", "amount": 180, "description": "Pulido y limpieza" },
    { "category": "itv", "amount": 45, "description": "ITV en origen" }
  ],
  "notes": [
    "Mantenimiento al día con sello del concesionario oficial.",
    "Pintura con marcas leves en parachoques trasero (subsanadas)."
  ]
}

Genera valores nuevos y diferentes cada vez. NO incluyas marca/modelo (los rellenará el operador desde maestros).`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST" && req.method !== "GET") return json({ error: "Method not allowed" }, 405);

  try {
    const messages: ClaudeMessage[] = [{ role: "user", content: USER_PROMPT }];

    const responseText = await callClaudeText({
      model: MODEL_HAIKU,
      system: SYSTEM_PROMPT,
      messages,
      max_tokens: 1500,
      temperature: 0.9, // Más variabilidad entre invocaciones
    });

    let parsed: { vehicle?: Record<string, unknown>; expenses?: unknown[]; notes?: unknown[] };
    try {
      parsed = extractJSON(responseText);
    } catch (parseErr) {
      console.error("[generate-vehicle] JSON parse error:", parseErr, "\nrespuesta:", responseText);
      return json({ error: "El modelo no devolvió JSON válido", raw: responseText.slice(0, 500) }, 502);
    }

    if (!parsed.vehicle) {
      return json({ error: "Respuesta sin campo 'vehicle'", raw: responseText.slice(0, 500) }, 502);
    }

    return json({
      vehicle: parsed.vehicle,
      expenses: parsed.expenses ?? [],
      notes: parsed.notes ?? [],
    });
  } catch (err) {
    console.error("[generate-vehicle] error", err);
    return json({ error: String((err as Error)?.message ?? err) }, 500);
  }
});
