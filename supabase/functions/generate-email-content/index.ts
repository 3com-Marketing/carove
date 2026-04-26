// Supabase Edge Function: generate-email-content
//
// Genera el contenido completo (asunto + preview + bloques estructurados) de
// una campaña de email marketing.
//
// Body: { campaignName: string, context: string }
// Devuelve: { subject: string, previewText: string, blocks: EmailBlock[] }
//
// EmailBlock = { type: 'header', logoUrl }
//            | { type: 'text', content }
//            | { type: 'image', url, alt }
//            | { type: 'cta', text, url, color }
//            | { type: 'separator' }
//            | { type: 'footer', text }
//
// Deploy:
//   supabase functions deploy generate-email-content --project-ref flstoaobldowsmsskgiz

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  cors, json, callClaudeText, extractJSON,
  MODEL_SONNET,
  type ClaudeMessage,
} from "../_shared/anthropic.ts";

const SYSTEM_PROMPT = `Eres un copywriter especializado en email marketing para concesionarios de vehículos en España. Generas contenido orientado a conversión, claro y bien estructurado.

REGLAS DE FORMATO
- Devuelves SIEMPRE un único objeto JSON válido. Sin texto fuera del JSON.
- Cada bloque del cuerpo debe ser uno de los tipos permitidos.
- Los textos en bloques 'text' pueden incluir saltos de línea como \\n. NO incluyas HTML.
- El campo 'subject' (asunto) debe ser corto (max 60 caracteres), atractivo y sin spam-words excesivas.
- 'previewText' es el texto que aparece bajo el asunto en la bandeja (max 100 caracteres).
- Estructura recomendada: header → text (saludo + propuesta) → cta → text (cierre + razones) → footer.
- NUNCA uses datos de clientes reales ni inventes nombres concretos.

TIPOS DE BLOQUE PERMITIDOS
- { "type": "header", "logoUrl": "" }
- { "type": "text", "content": "string con saltos de línea \\n permitidos" }
- { "type": "image", "url": "", "alt": "descripción" }
- { "type": "cta", "text": "Reservar test drive", "url": "#", "color": "#3b82f6" }
- { "type": "separator" }
- { "type": "footer", "text": "© 2025 Carove..." }`;

interface EmailContentResult {
  subject?: string;
  previewText?: string;
  blocks?: unknown[];
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const body = await req.json().catch(() => null);
    if (!body) return json({ error: "Body JSON inválido" }, 400);

    const campaignName = String(body.campaignName || "Campaña sin nombre").trim();
    const context = String(body.context || "").trim();

    if (!context) {
      return json({ error: "El campo 'context' es obligatorio" }, 400);
    }

    const userPrompt = `Nombre de la campaña: "${campaignName}"
Contexto / objetivo de la campaña:
${context}

Genera el contenido completo del email. Devuelve un JSON con esta estructura exacta:

{
  "subject": "asunto corto y atractivo",
  "previewText": "texto preview que se muestra bajo el asunto",
  "blocks": [
    { "type": "header", "logoUrl": "" },
    { "type": "text", "content": "texto del cuerpo" },
    { "type": "cta", "text": "texto del botón", "url": "#", "color": "#3b82f6" },
    { "type": "text", "content": "cierre" },
    { "type": "footer", "text": "© 2025 Carove. Todos los derechos reservados." }
  ]
}`;

    const messages: ClaudeMessage[] = [{ role: "user", content: userPrompt }];

    const responseText = await callClaudeText({
      model: MODEL_SONNET,
      system: SYSTEM_PROMPT,
      messages,
      max_tokens: 2500,
    });

    let parsed: EmailContentResult;
    try {
      parsed = extractJSON<EmailContentResult>(responseText);
    } catch (parseErr) {
      console.error("[generate-email-content] JSON parse error:", parseErr, "\nrespuesta:", responseText);
      return json({ error: "El modelo no devolvió JSON válido", raw: responseText.slice(0, 500) }, 502);
    }

    return json({
      subject: parsed.subject ?? "",
      previewText: parsed.previewText ?? "",
      blocks: Array.isArray(parsed.blocks) ? parsed.blocks : [],
    });
  } catch (err) {
    console.error("[generate-email-content] error", err);
    return json({ error: String((err as Error)?.message ?? err) }, 500);
  }
});
