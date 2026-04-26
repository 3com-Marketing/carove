// Supabase Edge Function: invite-user
//
// Invita un nuevo usuario al sistema CAROVE Hub.
// Crea el auth.user vía Supabase Admin (con email de invitación) y siembra
// las filas correspondientes en `public.profiles` y `public.user_roles`.
//
// Body esperado (alineado con UsersList.tsx → inviteSchema):
//   { email: string, full_name: string, role: 'vendedor'|'postventa'|'administrador'|'contabilidad' }
//
// Auth: requiere Bearer token de un usuario cuyo `profiles.role === 'administrador'`.
//
// Deploy:
//   supabase functions deploy invite-user --project-ref flstoaobldowsmsskgiz
//
// Variables de entorno (auto-provistas por Supabase):
//   SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const VALID_ROLES = ["vendedor", "postventa", "administrador", "contabilidad"] as const;
type Role = typeof VALID_ROLES[number];

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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // 1. Identificar al caller
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return json({ error: "Falta cabecera Authorization Bearer" }, 401);
    }
    const callerClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller }, error: callerErr } = await callerClient.auth.getUser();
    if (callerErr || !caller) {
      return json({ error: "No autenticado" }, 401);
    }

    // 2. Verificar que el caller es administrador (vía service-role para saltar RLS)
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: callerProfile, error: profErr } = await admin
      .from("profiles")
      .select("role")
      .eq("user_id", caller.id)
      .maybeSingle();
    if (profErr) {
      return json({ error: `Error consultando perfil del caller: ${profErr.message}` }, 500);
    }
    if (!callerProfile || callerProfile.role !== "administrador") {
      return json({ error: "Acceso denegado: solo administradores" }, 403);
    }

    // 3. Validar body
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return json({ error: "Body JSON inválido" }, 400);
    }

    const email = String(body.email ?? "").trim().toLowerCase();
    const fullName = String(body.full_name ?? "").trim();
    const role = String(body.role ?? "") as Role;

    if (!email || !email.includes("@")) {
      return json({ error: "Email inválido" }, 400);
    }
    if (!fullName) {
      return json({ error: "El nombre completo es obligatorio" }, 400);
    }
    if (!VALID_ROLES.includes(role)) {
      return json({ error: `Rol inválido. Permitidos: ${VALID_ROLES.join(", ")}` }, 400);
    }

    // 4. Invitar al usuario por email (envía el correo de invitación de Supabase Auth)
    const { data: invited, error: inviteErr } = await admin.auth.admin
      .inviteUserByEmail(email, {
        data: { full_name: fullName },
      });
    if (inviteErr) {
      return json({ error: `Error invitando usuario: ${inviteErr.message}` }, 400);
    }
    const userId = invited.user?.id;
    if (!userId) {
      return json({ error: "Usuario invitado pero no se obtuvo user_id" }, 500);
    }

    // 5. Sembrar profile (INSERT si no existe, UPDATE si ya existe — más robusto
    //    que upsert porque no asumimos un unique constraint concreto).
    const { data: existingProfile, error: fetchProfileErr } = await admin
      .from("profiles")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();
    if (fetchProfileErr) {
      return json(
        { ok: true, userId, warning: `Usuario invitado pero falló la lectura de profile: ${fetchProfileErr.message}` },
        207,
      );
    }

    const profilePatch = {
      user_id: userId,
      email,
      full_name: fullName,
      role,
      active: true,
    };

    if (existingProfile) {
      const { error: updErr } = await admin
        .from("profiles")
        .update(profilePatch)
        .eq("user_id", userId);
      if (updErr) {
        return json(
          { ok: true, userId, warning: `Usuario invitado pero falló UPDATE profile: ${updErr.message}` },
          207,
        );
      }
    } else {
      const { error: insErr } = await admin
        .from("profiles")
        .insert(profilePatch);
      if (insErr) {
        return json(
          { ok: true, userId, warning: `Usuario invitado pero falló INSERT profile: ${insErr.message}` },
          207,
        );
      }
    }

    // 6. Sembrar user_roles (mismo patrón SELECT → INSERT/UPDATE)
    const { data: existingRole, error: fetchRoleErr } = await admin
      .from("user_roles")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();
    if (fetchRoleErr) {
      return json(
        { ok: true, userId, warning: `Profile OK pero falló lectura de user_roles: ${fetchRoleErr.message}` },
        207,
      );
    }

    if (existingRole) {
      const { error: updRoleErr } = await admin
        .from("user_roles")
        .update({ role })
        .eq("user_id", userId);
      if (updRoleErr) {
        return json(
          { ok: true, userId, warning: `Profile OK pero falló UPDATE user_roles: ${updRoleErr.message}` },
          207,
        );
      }
    } else {
      const { error: insRoleErr } = await admin
        .from("user_roles")
        .insert({ user_id: userId, role });
      if (insRoleErr) {
        return json(
          { ok: true, userId, warning: `Profile OK pero falló INSERT user_roles: ${insRoleErr.message}` },
          207,
        );
      }
    }

    return json({ ok: true, userId, email, role });
  } catch (err) {
    console.error("[invite-user] error", err);
    return json({ error: String((err as Error)?.message ?? err) }, 500);
  }
});
