// Helper compartido para llamar a la API de Anthropic Messages desde Edge Functions.
// - callClaude(opts) → respuesta JSON parseada o stream
// - claudeStreamToOpenAI(stream) → re-empaqueta el stream Anthropic SSE como
//   chunks OpenAI-compatible para que frontends que esperan OpenAI sigan funcionando.
// - extractJSON(text) → parsea bloques ```json``` o JSON directo.

export const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
export const ANTHROPIC_VERSION = "2023-06-01";

// Modelos por defecto (centralizar para facilitar bumps futuros)
export const MODEL_HAIKU = "claude-haiku-4-5-20251001";
export const MODEL_SONNET = "claude-sonnet-4-6";

export const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export function json(body: unknown, status = 200, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json", ...extraHeaders },
  });
}

export interface ClaudeMessage {
  role: "user" | "assistant";
  content: string | Array<
    | { type: "text"; text: string }
    | { type: "image"; source: { type: "base64"; media_type: string; data: string } }
    | { type: "document"; source: { type: "base64"; media_type: "application/pdf"; data: string } }
  >;
}

export interface CallClaudeOpts {
  model?: string;
  system?: string;
  messages: ClaudeMessage[];
  max_tokens?: number;
  temperature?: number;
  stream?: boolean;
}

export async function callClaude(opts: CallClaudeOpts): Promise<Response> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY no está configurada en Supabase Functions Secrets");
  }

  const body = {
    model: opts.model ?? MODEL_HAIKU,
    max_tokens: opts.max_tokens ?? 2048,
    messages: opts.messages,
    ...(opts.system ? { system: opts.system } : {}),
    ...(opts.temperature !== undefined ? { temperature: opts.temperature } : {}),
    ...(opts.stream ? { stream: true } : {}),
  };

  return fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

/**
 * Llama a Claude y devuelve directamente el texto generado (no-stream).
 * Lanza si el response no es 2xx.
 */
export async function callClaudeText(opts: Omit<CallClaudeOpts, "stream">): Promise<string> {
  const resp = await callClaude({ ...opts, stream: false });
  if (!resp.ok) {
    const errBody = await resp.text();
    throw new Error(`Anthropic API error ${resp.status}: ${errBody}`);
  }
  const data = await resp.json();
  // Anthropic responde { content: [{ type: "text", text: "..." }, ...], ... }
  const blocks = data.content || [];
  return blocks
    .filter((b: { type: string }) => b.type === "text")
    .map((b: { text: string }) => b.text)
    .join("");
}

/**
 * Re-empaqueta un stream SSE de Anthropic como SSE OpenAI-compatible.
 * Anthropic emite eventos `content_block_delta` con `delta.text`.
 * OpenAI emite `data: { choices: [{ delta: { content: "..." } }] }`.
 *
 * Útil cuando el frontend ya está escrito para consumir formato OpenAI.
 */
export function claudeStreamToOpenAI(anthropicResponse: Response): Response {
  if (!anthropicResponse.body) {
    return new Response("data: [DONE]\n\n", {
      headers: { ...cors, "Content-Type": "text/event-stream" },
    });
  }

  const reader = anthropicResponse.body.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let buffer = "";
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          // Eventos SSE separados por "\n\n"
          let evtEnd: number;
          while ((evtEnd = buffer.indexOf("\n\n")) !== -1) {
            const evt = buffer.slice(0, evtEnd);
            buffer = buffer.slice(evtEnd + 2);

            // Cada evento tiene líneas "event: X" y "data: {...}"
            const dataLine = evt.split("\n").find(l => l.startsWith("data: "));
            if (!dataLine) continue;

            const json = dataLine.slice(6).trim();
            if (!json) continue;

            try {
              const parsed = JSON.parse(json);
              // Solo nos interesan los deltas de texto
              if (parsed.type === "content_block_delta" && parsed.delta?.type === "text_delta") {
                const chunk = {
                  choices: [{ delta: { content: parsed.delta.text } }],
                };
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
              }
              // message_stop señala fin de generación
              if (parsed.type === "message_stop") {
                controller.enqueue(encoder.encode("data: [DONE]\n\n"));
              }
            } catch {
              // Evento no parseable — lo ignoramos
            }
          }
        }
      } catch (err) {
        console.error("[claudeStreamToOpenAI] error reading stream:", err);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { ...cors, "Content-Type": "text/event-stream" },
  });
}

/**
 * Intenta parsear JSON desde una respuesta de Claude. Soporta:
 *   - JSON crudo
 *   - JSON dentro de bloque ```json ... ```
 *   - JSON dentro de bloque ``` ... ```
 *   - Texto donde el primer { o [ inicia el JSON
 */
export function extractJSON<T = unknown>(text: string): T {
  const trimmed = text.trim();

  // Bloque markdown ```json ... ``` o ``` ... ```
  const fenceMatch = trimmed.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (fenceMatch) {
    return JSON.parse(fenceMatch[1].trim()) as T;
  }

  // JSON crudo directo
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    return JSON.parse(trimmed) as T;
  }

  // Buscar primer objeto/array completo en el texto
  const firstBrace = Math.min(
    trimmed.indexOf("{") >= 0 ? trimmed.indexOf("{") : Infinity,
    trimmed.indexOf("[") >= 0 ? trimmed.indexOf("[") : Infinity,
  );
  if (firstBrace === Infinity) {
    throw new Error(`No se encontró JSON en la respuesta:\n${text.slice(0, 500)}`);
  }

  // Cuenta llaves equilibradas para encontrar el cierre correspondiente
  const open = trimmed[firstBrace];
  const close = open === "{" ? "}" : "]";
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = firstBrace; i < trimmed.length; i++) {
    const ch = trimmed[i];
    if (escape) { escape = false; continue; }
    if (ch === "\\") { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === open) depth++;
    else if (ch === close) {
      depth--;
      if (depth === 0) {
        return JSON.parse(trimmed.slice(firstBrace, i + 1)) as T;
      }
    }
  }

  throw new Error(`JSON sin cerrar en la respuesta:\n${text.slice(0, 500)}`);
}
