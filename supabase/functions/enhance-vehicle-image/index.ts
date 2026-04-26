// Supabase Edge Function: enhance-vehicle-image
//
// STUB — devuelve la imagen original sin retocar para que la UI no se rompa.
// El frontend espera { enhancedImageBase64 } y lo guarda en la galería como
// si fuera una versión retocada. Mientras no migremos a un proveedor real
// de edición de imagen (OpenAI gpt-image-1, Replicate Flux, etc.), esta EF
// simplemente espeja la entrada.
//
// Body: { imageBase64: string, logoBase64?: string }
// Devuelve: { enhancedImageBase64: string, stub: true }
//
// TODO: sustituir por implementación real cuando se decida proveedor.
//
// Deploy:
//   supabase functions deploy enhance-vehicle-image --project-ref flstoaobldowsmsskgiz

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { cors, json } from "../_shared/anthropic.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const body = await req.json().catch(() => null);
    if (!body) return json({ error: "Body JSON inválido" }, 400);

    const imageBase64 = String(body.imageBase64 || "");
    if (!imageBase64) {
      return json({ error: "El campo 'imageBase64' es obligatorio" }, 400);
    }

    return json({
      enhancedImageBase64: imageBase64,
      stub: true,
      message: "Stub temporal — la imagen se devuelve sin retocar. Pendiente integrar proveedor real.",
    });
  } catch (err) {
    console.error("[enhance-vehicle-image] error", err);
    return json({ error: String((err as Error)?.message ?? err) }, 500);
  }
});
