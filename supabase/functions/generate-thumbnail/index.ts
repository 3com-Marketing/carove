// Supabase Edge Function: generate-thumbnail
//
// Genera un thumbnail (400x300, JPEG) de una imagen subida al bucket
// indicado y actualiza la fila correspondiente en `vehicle_images.thumbnail_url`.
// Llamada desde el frontend en modo fire-and-forget al subir cada foto.
//
// Body: { bucket: string, path: string, vehicleId: string, imageId: string }
//
// Deploy:
//   supabase functions deploy generate-thumbnail --project-ref flstoaobldowsmsskgiz

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { decode, Image } from "https://deno.land/x/imagescript@1.2.17/mod.ts";
import { cors, json } from "../_shared/anthropic.ts";

const THUMB_W = 400;
const THUMB_H = 300;
const THUMB_QUALITY = 78;
const THUMB_PREFIX = "thumbs/";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const body = await req.json().catch(() => null);
    if (!body) return json({ error: "Body JSON inválido" }, 400);

    const bucket = String(body.bucket || "");
    const path = String(body.path || "");
    const vehicleId = String(body.vehicleId || "");
    const imageId = String(body.imageId || "");

    if (!bucket || !path || !imageId) {
      return json({ error: "Faltan campos: bucket, path, imageId" }, 400);
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // 1. Descargar la imagen original
    const { data: blob, error: dlErr } = await admin.storage.from(bucket).download(path);
    if (dlErr || !blob) {
      return json({ error: `No se pudo descargar la imagen: ${dlErr?.message ?? "sin datos"}` }, 500);
    }
    const inputBytes = new Uint8Array(await blob.arrayBuffer());

    // 2. Decodificar y redimensionar manteniendo proporción (cover)
    const decoded = await decode(inputBytes);
    if (!(decoded instanceof Image)) {
      return json({ error: "Solo se soportan imágenes estáticas (no GIFs animados)" }, 400);
    }
    const srcW = decoded.width;
    const srcH = decoded.height;
    const scale = Math.max(THUMB_W / srcW, THUMB_H / srcH);
    const targetW = Math.round(srcW * scale);
    const targetH = Math.round(srcH * scale);
    decoded.resize(targetW, targetH);
    // Crop centrado al ratio THUMB_W x THUMB_H
    const cropX = Math.max(0, Math.round((targetW - THUMB_W) / 2));
    const cropY = Math.max(0, Math.round((targetH - THUMB_H) / 2));
    decoded.crop(cropX, cropY, THUMB_W, THUMB_H);

    // 3. Encode a JPEG
    const thumbBytes = await decoded.encodeJPEG(THUMB_QUALITY);

    // 4. Subir al mismo bucket bajo prefijo `thumbs/`
    const thumbPath = THUMB_PREFIX + path.replace(/\.(png|jpg|jpeg|webp|gif)$/i, ".jpg");
    const { error: upErr } = await admin.storage.from(bucket).upload(thumbPath, thumbBytes, {
      contentType: "image/jpeg",
      upsert: true,
    });
    if (upErr) {
      return json({ error: `Error subiendo thumbnail: ${upErr.message}` }, 500);
    }

    // 5. URL pública del thumb
    const { data: pub } = admin.storage.from(bucket).getPublicUrl(thumbPath);
    const thumbnailUrl = pub.publicUrl;

    // 6. Actualizar la fila vehicle_images
    const { error: updErr } = await admin
      .from("vehicle_images")
      .update({ thumbnail_url: thumbnailUrl })
      .eq("id", imageId);
    if (updErr) {
      return json({ ok: true, thumbnailUrl, warning: `Thumb generado pero no se pudo actualizar la BD: ${updErr.message}` }, 207);
    }

    return json({ ok: true, thumbnailUrl, vehicleId, imageId });
  } catch (err) {
    console.error("[generate-thumbnail] error", err);
    return json({ error: String((err as Error)?.message ?? err) }, 500);
  }
});
