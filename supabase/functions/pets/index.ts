import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const headers = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Content-Type": "application/json" };
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers });
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const auth = request.headers.get("Authorization") ?? "";
  const admin = createClient(supabaseUrl, serviceKey);

  // GET /api/pets (public catalog; deploy this function behind the /api prefix).
  if (request.method === "GET") {
    const { data, error } = await admin.from("pets").select("*").eq("status", "available").order("created_at", { ascending: false });
    return error ? reply({ error: error.message }, 500) : reply({ pets: data });
  }
  if (request.method !== "POST") return reply({ error: "Method not allowed" }, 405);
  const token = auth.replace(/^Bearer\s+/i, "");
  const { data: authData, error: authError } = await admin.auth.getUser(token);
  if (authError || !authData.user) return reply({ error: "Autenticação obrigatória." }, 401);
  const { data: profile } = await admin.from("profiles").select("role").eq("id", authData.user.id).single();
  if (profile?.role !== "organization") return reply({ error: "Apenas contas de ONG podem cadastrar animais." }, 403);
  const body = await request.json();
  const { data: organization } = await admin.from("organizations").select("id").eq("id", body.ong_id).eq("owner_id", authData.user.id).maybeSingle();
  if (!organization) return reply({ error: "ONG não encontrada ou sem permissão." }, 403);
  const payload = { ong_id: organization.id, name: String(body.name ?? "").trim(), species: body.species, breed: body.breed || null, age_months: body.age_months ?? null, sex: body.sex ?? null, size: body.size ?? null, city: body.city || null, photo_url: body.photo_url || null, description: String(body.description ?? "").trim(), status: body.status ?? "available" };
  if (!payload.name || !payload.description || !payload.species || !payload.size || !payload.sex) return reply({ error: "Preencha nome, espécie, porte, sexo e descrição." }, 422);
  const query = body.id ? admin.from("pets").update(payload).eq("id", body.id).eq("ong_id", organization.id) : admin.from("pets").insert(payload);
  const { data, error } = await query.select().single();
  return error ? reply({ error: error.message }, 400) : reply({ pet: data }, body.id ? 200 : 201);
});
