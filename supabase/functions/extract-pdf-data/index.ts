// Supabase Edge Function: extract-pdf-data
//
// Extrae campos estructurados de un documento (PDF o imagen) subido al
// bucket `smart-documents`. El frontend convierte PDFs multi-página a imágenes
// antes de subir y manda `file_paths[]`. Para subidas individuales manda
// `file_path` y puede ser PDF o imagen.
//
// Body:
//   { file_path: string, document_type: string }   ó
//   { file_paths: string[], document_type: string }
//
// Devuelve:
//   { extracted_data: { ... }, extraction_meta: { model, document_type, pages, ... } }
//
// Deploy:
//   supabase functions deploy extract-pdf-data --project-ref flstoaobldowsmsskgiz

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  cors, json, callClaudeText, extractJSON,
  MODEL_SONNET,
  type ClaudeMessage,
} from "../_shared/anthropic.ts";

const STORAGE_BUCKET = "smart-documents";

const SYSTEM_PROMPT = `Eres un asistente experto en extraer información estructurada de documentos relacionados con la compraventa de vehículos en España (concesionarios).

INSTRUCCIONES
1. Analiza el documento que recibes (puede ser un permiso de circulación, ficha técnica, DNI/NIE, contrato, factura, etc.).
2. Extrae los campos relevantes y devuélvelos como un objeto JSON.
3. Si un campo no aparece en el documento, omítelo o devuelve null. NUNCA inventes valores.
4. Las matrículas españolas tienen formato "1234ABC" (4 dígitos + 3 letras) — devuélvelas SIEMPRE en mayúsculas y sin espacios.
5. Los números de bastidor (VIN) tienen 17 caracteres alfanuméricos.
6. Las fechas en formato ISO 8601 (YYYY-MM-DD).
7. Los importes como número (sin separadores de miles ni símbolos).
8. Los DNI/NIE con formato "12345678A" (8 dígitos + letra) o "X1234567A" (letra + 7 dígitos + letra).

FORMATO DE RESPUESTA
Devuelve SOLO un bloque JSON válido. No incluyas explicaciones ni texto adicional fuera del JSON.

Ejemplo de campos para un permiso de circulación:
{
  "plate": "1234ABC",
  "vin": "VF1ABC...",
  "first_registration": "2020-05-12",
  "brand": "Renault",
  "model": "Clio",
  "color": "Blanco",
  "owner_name": "Juan Pérez García",
  "owner_dni": "12345678A",
  "vehicle_type": "turismo",
  "displacement": 1149,
  "horsepower": 75
}`;

function extOf(path: string): string {
  const m = path.toLowerCase().match(/\.([a-z0-9]+)$/);
  return m ? m[1] : "";
}

function mediaTypeFor(ext: string): string {
  switch (ext) {
    case "pdf": return "application/pdf";
    case "png": return "image/png";
    case "jpg":
    case "jpeg": return "image/jpeg";
    case "webp": return "image/webp";
    case "gif": return "image/gif";
    default: return "application/octet-stream";
  }
}

function bytesToBase64(bytes: Uint8Array): string {
  // Conversión chunked para evitar stack overflow en archivos grandes
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const body = await req.json().catch(() => null);
    if (!body) return json({ error: "Body JSON inválido" }, 400);

    const documentType = String(body.document_type || "documento");
    let paths: string[] = [];
    if (Array.isArray(body.file_paths) && body.file_paths.length > 0) {
      paths = body.file_paths.map(String);
    } else if (typeof body.file_path === "string" && body.file_path) {
      paths = [body.file_path];
    } else {
      return json({ error: "Debes pasar file_path o file_paths[]" }, 400);
    }

    // Anthropic limita ~100 páginas/documento. En la práctica nadie sube
    // más de 10 páginas para extraer datos.
    if (paths.length > 20) {
      return json({ error: "Máximo 20 archivos por petición" }, 400);
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Descargar archivos del bucket en paralelo
    const downloads = await Promise.all(paths.map(async (p) => {
      const { data, error } = await admin.storage.from(STORAGE_BUCKET).download(p);
      if (error || !data) throw new Error(`No se pudo descargar ${p}: ${error?.message ?? "sin datos"}`);
      const bytes = new Uint8Array(await data.arrayBuffer());
      const ext = extOf(p);
      const mediaType = mediaTypeFor(ext);
      return { path: p, ext, mediaType, base64: bytesToBase64(bytes) };
    }));

    // Construir mensaje con bloques de contenido
    type ContentBlock =
      | { type: "text"; text: string }
      | { type: "image"; source: { type: "base64"; media_type: string; data: string } }
      | { type: "document"; source: { type: "base64"; media_type: "application/pdf"; data: string } };

    const contentBlocks: ContentBlock[] = [];

    for (const f of downloads) {
      if (f.ext === "pdf") {
        contentBlocks.push({
          type: "document",
          source: { type: "base64", media_type: "application/pdf", data: f.base64 },
        });
      } else if (f.mediaType.startsWith("image/")) {
        contentBlocks.push({
          type: "image",
          source: { type: "base64", media_type: f.mediaType, data: f.base64 },
        });
      } else {
        return json({ error: `Tipo de archivo no soportado: ${f.ext}` }, 400);
      }
    }

    contentBlocks.push({
      type: "text",
      text: `Tipo de documento: "${documentType}".\nExtrae los campos estructurados como JSON. Devuelve SOLO el JSON, sin texto adicional.`,
    });

    const messages: ClaudeMessage[] = [{ role: "user", content: contentBlocks }];

    const t0 = Date.now();
    const responseText = await callClaudeText({
      model: MODEL_SONNET,
      system: SYSTEM_PROMPT,
      messages,
      max_tokens: 4096,
    });
    const elapsedMs = Date.now() - t0;

    let extractedData: Record<string, unknown>;
    try {
      extractedData = extractJSON<Record<string, unknown>>(responseText);
    } catch (parseErr) {
      console.error("[extract-pdf-data] no se pudo parsear JSON:", parseErr, "\nrespuesta:", responseText);
      return json({
        error: "El modelo no devolvió JSON válido",
        raw_response: responseText.slice(0, 1000),
      }, 502);
    }

    return json({
      extracted_data: extractedData,
      extraction_meta: {
        model: MODEL_SONNET,
        document_type: documentType,
        pages: paths.length,
        elapsed_ms: elapsedMs,
        provider: "anthropic",
      },
    });
  } catch (err) {
    console.error("[extract-pdf-data] error", err);
    return json({ error: String((err as Error)?.message ?? err) }, 500);
  }
});
