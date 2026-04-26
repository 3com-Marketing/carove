// Supabase Edge Function: market-comparison
//
// STUB — devuelve un análisis simulado para que el bloque de comparativa de
// mercado en la ficha de vehículo no quede en error. Genera ~6 anuncios
// pseudo-aleatorios alrededor del precio "típico" del coche y calcula
// estadísticas reales sobre esa muestra simulada.
//
// Body:
//   { brand, model, year, km, fuel, transmission, vehicle_id }
// Devuelve:
//   { id: null, comparables: [...], total_comparables, precio_medio,
//     mediana, percentil_25, percentil_75, competencia, valor_sugerido,
//     stub: true }
//
// TODO: sustituir por implementación real con Brave Search API + Claude.
//
// Deploy:
//   supabase functions deploy market-comparison --project-ref flstoaobldowsmsskgiz

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { cors, json } from "../_shared/anthropic.ts";

interface BodyShape {
  brand?: string;
  model?: string;
  year?: number;
  km?: number;
  fuel?: string;
  transmission?: string;
  vehicle_id?: string;
}

interface Comparable {
  titulo: string;
  precio: number;
  year: number;
  km: number;
  provincia: string;
  url: string;
  fuente?: string;
  dias_publicado?: number;
  fecha_publicacion?: string;
}

const PROVINCIAS = ["Madrid", "Barcelona", "Valencia", "Sevilla", "Las Palmas", "Bilbao", "Málaga"];
const FUENTES = ["coches.net (simulado)", "autocasion.com (simulado)", "milanuncios.com (simulado)"];

function rng(seed: string) {
  // Hash determinista simple para que la respuesta sea estable por vehículo
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = ((h << 5) - h + seed.charCodeAt(i)) | 0;
  let state = Math.abs(h) || 1;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0xffffffff;
  };
}

function basePriceFor(year: number, km: number): number {
  // Heurística muy rudimentaria: vehículo nuevo ronda 18.000€, deprecia 1.500€/año
  // y 0.04€/km. Mínimo 1.500€.
  const currentYear = new Date().getFullYear();
  const ageDeprec = Math.max(0, currentYear - (year || currentYear)) * 1500;
  const kmDeprec = (km || 0) * 0.04;
  return Math.max(1500, 18000 - ageDeprec - kmDeprec);
}

function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

function percentile(arr: number[], p: number): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor((p / 100) * sorted.length)));
  return sorted[idx];
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const body: BodyShape = (await req.json().catch(() => null)) ?? {};
    const brand = String(body.brand || "Vehículo").trim();
    const model = String(body.model || "Modelo").trim();
    const year = Number(body.year) || new Date().getFullYear() - 5;
    const km = Number(body.km) || 80000;

    const seed = `${body.vehicle_id ?? ""}|${brand}|${model}|${year}|${km}`;
    const rand = rng(seed);

    const base = basePriceFor(year, km);
    const comparables: Comparable[] = Array.from({ length: 6 }).map((_, i) => {
      const variation = 0.85 + rand() * 0.30; // ±15%
      const precio = Math.round((base * variation) / 100) * 100;
      const yearOffset = Math.floor(rand() * 3) - 1; // ±1 año
      const kmDelta = Math.round((rand() - 0.5) * 30000);
      const dias = Math.floor(rand() * 60) + 1;
      const fechaPub = new Date(Date.now() - dias * 86400_000).toISOString().slice(0, 10);
      return {
        titulo: `${brand} ${model} ${year + yearOffset}`,
        precio,
        year: year + yearOffset,
        km: Math.max(0, km + kmDelta),
        provincia: PROVINCIAS[Math.floor(rand() * PROVINCIAS.length)],
        url: "https://example.com/anuncio-simulado",
        fuente: FUENTES[i % FUENTES.length],
        dias_publicado: dias,
        fecha_publicacion: fechaPub,
      };
    });

    const precios = comparables.map((c) => c.precio);
    const precio_medio = Math.round(precios.reduce((s, n) => s + n, 0) / precios.length);
    const mediana = median(precios);
    const percentil_25 = percentile(precios, 25);
    const percentil_75 = percentile(precios, 75);
    // Heurística: si el rango intercuartil es estrecho, alta competencia
    const iqr = percentil_75 - percentil_25;
    const competencia: "baja" | "media" | "alta" = iqr < precio_medio * 0.08 ? "alta" : iqr < precio_medio * 0.18 ? "media" : "baja";
    // Sugerencia: ligeramente por debajo de la mediana
    const valor_sugerido = Math.round(mediana * 0.97 / 100) * 100;

    return json({
      id: null,
      comparables,
      total_comparables: comparables.length,
      total_ads_available: comparables.length,
      precio_medio,
      mediana,
      percentil_25,
      percentil_75,
      competencia,
      valor_sugerido,
      stub: true,
      message: "Datos simulados. Pendiente integrar Brave Search API.",
    });
  } catch (err) {
    console.error("[market-comparison] error", err);
    return json({ error: String((err as Error)?.message ?? err) }, 500);
  }
});
