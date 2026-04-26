// Supabase Edge Function: generate-caption
//
// Genera el caption (texto) de una publicación para redes sociales.
//
// Body: { context: string, tone?: string, language?: string,
//         includeHashtags?: boolean, includeCTA?: boolean }
// Devuelve: { caption: string }
//
// Deploy:
//   supabase functions deploy generate-caption --project-ref flstoaobldowsmsskgiz

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  cors, json, callClaudeText,
  MODEL_HAIKU,
  type ClaudeMessage,
} from "../_shared/anthropic.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const body = await req.json().catch(() => null);
    if (!body) return json({ error: "Body JSON inválido" }, 400);

    const context = String(body.context || "").trim();
    const tone = String(body.tone || "profesional").trim();
    const language = String(body.language || "es").trim();
    const includeHashtags = body.includeHashtags !== false;
    const includeCTA = body.includeCTA !== false;

    if (!context) {
      return json({ error: "El campo 'context' es obligatorio" }, 400);
    }

    const langInstruction = language === "es"
      ? "Escribe en español de España (no latinoamericano)."
      : `Escribe en idioma con código '${language}'.`;

    const system = `Eres un community manager experto en redes sociales para concesionarios de vehículos. Generas captions atractivos, concisos y orientados a conversión.

REGLAS
- ${langInstruction}
- Tono: ${tone}.
- Longitud máxima: 280 caracteres incluyendo espacios.
- Estructura sugerida: gancho inicial → beneficio o detalle clave → ${includeCTA ? "llamada a la acción explícita" : "cierre suave"}.
${includeHashtags ? "- Incluye 3-5 hashtags relevantes al final, separados por espacios. No los mezcles con el cuerpo." : "- NO incluyas hashtags."}
- Puedes usar emojis con moderación (máximo 3) si encajan con el tono.
- Devuelve SOLO el texto del caption. Nada de introducciones tipo "Aquí tienes:", ni explicaciones, ni comillas alrededor.`;

    const userPrompt = `Contexto de la publicación:\n${context}\n\nGenera el caption.`;

    const messages: ClaudeMessage[] = [{ role: "user", content: userPrompt }];

    const text = await callClaudeText({
      model: MODEL_HAIKU,
      system,
      messages,
      max_tokens: 400,
      temperature: 0.8,
    });

    // Limpieza ligera: quitar comillas envolventes si las pusiera
    let caption = text.trim();
    if ((caption.startsWith('"') && caption.endsWith('"')) ||
        (caption.startsWith("«") && caption.endsWith("»")) ||
        (caption.startsWith("'") && caption.endsWith("'"))) {
      caption = caption.slice(1, -1).trim();
    }

    return json({ caption });
  } catch (err) {
    console.error("[generate-caption] error", err);
    return json({ error: String((err as Error)?.message ?? err) }, 500);
  }
});
