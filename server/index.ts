import "dotenv/config";
import path from "node:path";
import { randomUUID } from "node:crypto";
import express, { type NextFunction, type Request, type Response } from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import multer from "multer";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const app = express();
const port = Number(process.env.PORT || 3001);
const secret = process.env.JWT_SECRET;
if (!secret) throw new Error("Defina JWT_SECRET no arquivo .env.");
app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173" }));
app.use(express.json());
app.use("/uploads", express.static(path.resolve("uploads")));

type AuthRequest = Request & { user?: { id: string; role: string } };
const names: Record<string, string> = { profiles: "user", organizations: "organization", pets: "pet", adoption_requests: "adoptionRequest", conversations: "conversation", messages: "message", personal_pets: "personalPet", medical_records: "medicalRecord", vaccination_events: "vaccinationEvent" };
const camel = (key: string) => key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
const snake = (key: string) => key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
function apiError(res: Response, status: number, message: string) { return res.status(status).json({ error: { message } }); }
function auth(req: AuthRequest, _res: Response, next: NextFunction) { const token = req.header("authorization")?.replace(/^Bearer\s+/i, ""); if (token) { try { req.user = jwt.verify(token, secret) as { id: string; role: string }; } catch { /* endpoints decide whether auth is required */ } } next(); }
app.use(auth);
function tokenFor(user: { id: string; email: string; role: string; fullName: string | null; avatarUrl: string | null }) { return jwt.sign({ id: user.id, role: user.role }, secret, { expiresIn: "7d" }); }
function publicUser(user: { id: string; email: string; role: string; fullName: string | null; avatarUrl: string | null }) { const access_token = tokenFor(user); return { access_token, user: { id: user.id, email: user.email, user_metadata: { full_name: user.fullName, role: user.role, avatar_url: user.avatarUrl } } }; }

app.post("/api/auth/signup", async (req, res) => { try { const { email, password, fullName, role = "adopter" } = req.body; if (!email || !password || password.length < 6) return apiError(res, 400, "Informe e-mail e senha com ao menos 6 caracteres."); const exists = await prisma.user.findUnique({ where: { email } }); if (exists) return apiError(res, 409, "Este e-mail já está cadastrado."); const user = await prisma.user.create({ data: { email, passwordHash: await bcrypt.hash(password, 12), fullName, role } }); res.status(201).json(publicUser(user)); } catch { apiError(res, 500, "Não foi possível criar a conta."); } });
app.post("/api/auth/signin", async (req, res) => { const user = await prisma.user.findUnique({ where: { email: req.body.email } }); if (!user || !(await bcrypt.compare(req.body.password || "", user.passwordHash))) return apiError(res, 401, "E-mail ou senha inválidos."); res.json(publicUser(user)); });
app.get("/api/auth/me", async (req: AuthRequest, res) => { if (!req.user) return apiError(res, 401, "Sessão inválida."); const user = await prisma.user.findUnique({ where: { id: req.user.id } }); if (!user) return apiError(res, 401, "Sessão inválida."); res.json(publicUser(user)); });

const upload = multer({ storage: multer.diskStorage({ destination: "uploads", filename: (_r, f, cb) => cb(null, `${randomUUID()}${path.extname(f.originalname)}`) }), limits: { fileSize: 5 * 1024 * 1024 }, fileFilter: (_r, f, cb) => cb(null, f.mimetype.startsWith("image/")) });
app.post("/api/uploads", upload.single("file"), (req: AuthRequest, res) => { if (!req.user) return apiError(res, 401, "Faça login para enviar imagens."); if (!req.file) return apiError(res, 400, "Envie uma imagem válida de até 5 MB."); res.status(201).json({ url: `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}` }); });

/** Creates the adoption request and its chat atomically: there is never a request without a conversation. */
app.post("/api/adoption-requests", async (req: AuthRequest, res) => {
  if (!req.user) return apiError(res, 401, "Faça login para solicitar a adoção.");
  try {
    const pet = await prisma.pet.findFirst({ where: { id: String(req.body.pet_id), status: "available" }, select: { id: true, ongId: true } });
    if (!pet) return apiError(res, 404, "Este animal não está disponível para adoção.");
    const result = await prisma.$transaction(async (db) => {
      const request = await db.adoptionRequest.create({ data: { petId: pet.id, adopterId: req.user!.id, message: String(req.body.message || "") } });
      const conversation = await db.conversation.create({ data: { adoptionRequestId: request.id, adopterId: req.user!.id, ongId: pet.ongId } });
      return { request, conversation };
    });
    res.status(201).json({ data: serialize(result) });
  } catch (error: any) {
    if (error?.code === "P2002") return apiError(res, 409, "Você já possui uma solicitação para este animal.");
    apiError(res, 400, "Não foi possível criar a solicitação e a conversa.");
  }
});

app.post("/api/organization-adoption-requests", async (req: AuthRequest, res) => {
  if (!req.user || req.user.role !== "organization") return apiError(res, 403, "Esta área é exclusiva para ONGs.");
  const organization = await prisma.organization.findUnique({ where: { ownerId: req.user.id } });
  if (!organization) return apiError(res, 400, "Cadastre o perfil da ONG antes de consultar os pedidos.");
  const requests = await prisma.adoptionRequest.findMany({
    where: { pet: { ongId: organization.id } },
    include: { pet: true, adopter: { select: { fullName: true, email: true, phone: true, whatsapp: true } } },
    orderBy: { createdAt: "desc" },
  });
  res.json({ data: serialize(requests) });
});

app.post("/api/organization-adoption-requests/:id/status", async (req: AuthRequest, res) => {
  if (!req.user || req.user.role !== "organization") return apiError(res, 403, "Esta ação é exclusiva para ONGs.");
  const status = String(req.body.status || "");
  if (!["reviewing", "approved", "declined", "completed"].includes(status)) return apiError(res, 400, "Status de solicitação inválido.");
  try {
    const request = await prisma.adoptionRequest.findUnique({ where: { id: req.params.id }, include: { pet: { include: { organization: true } } } });
    if (!request || request.pet.organization.ownerId !== req.user.id) return apiError(res, 404, "Pedido não encontrado para esta ONG.");
    const petStatus = status === "completed" ? "adopted" : status === "declined" ? "available" : "pending";
    const result = await prisma.$transaction(async (db) => {
      const updatedRequest = await db.adoptionRequest.update({ where: { id: request.id }, data: { status } });
      await db.pet.update({ where: { id: request.petId }, data: { status: petStatus } });
      return updatedRequest;
    });
    res.json({ data: serialize(result) });
  } catch (error) { apiError(res, 400, error instanceof Error ? error.message : "Não foi possível atualizar a solicitação."); }
});

app.post("/api/organization-adoption-requests/:id/conversation", async (req: AuthRequest, res) => {
  if (!req.user || req.user.role !== "organization") return apiError(res, 403, "Esta ação é exclusiva para ONGs.");
  try {
    const request = await prisma.adoptionRequest.findUnique({ where: { id: req.params.id }, include: { pet: { include: { organization: true } } } });
    if (!request || request.pet.organization.ownerId !== req.user.id) return apiError(res, 404, "Pedido não encontrado para esta ONG.");
    const conversation = await prisma.conversation.upsert({
      where: { adoptionRequestId: request.id },
      update: {},
      create: { adoptionRequestId: request.id, adopterId: request.adopterId, ongId: request.pet.ongId },
    });
    res.json({ data: serialize(conversation) });
  } catch (error) { apiError(res, 400, error instanceof Error ? error.message : "Não foi possível abrir a conversa."); }
});

const earthRadiusKm = 6371;
const distanceKm = (lat1: number, lng1: number, lat2: number, lng2: number) => {
  const radians = (value: number) => value * Math.PI / 180;
  const dLat = radians(lat2 - lat1), dLng = radians(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(radians(lat1)) * Math.cos(radians(lat2)) * Math.sin(dLng / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

app.post("/api/organizations/geocode", async (req: AuthRequest, res) => {
  if (!req.user || req.user.role !== "organization") return apiError(res, 403, "Esta ação é exclusiva para ONGs.");
  const organization = await prisma.organization.findUnique({ where: { ownerId: req.user.id } });
  if (!organization) return apiError(res, 404, "ONG não encontrada.");
  const query = [organization.address, organization.neighborhood, organization.city, organization.state, organization.cep, "Brasil"].filter(Boolean).join(", ");
  if (!query) return apiError(res, 400, "Informe o endereço da ONG antes de localizá-la.");
  try {
    const search = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(query)}`, { headers: { "User-Agent": "PataAmiga/1.0 (local development)" } });
    if (!search.ok) return apiError(res, 502, "Não foi possível localizar o endereço no OpenStreetMap.");
    const matches = await search.json() as Array<{ lat: string; lon: string }>;
    if (!matches[0]) return apiError(res, 404, "Endereço não encontrado. Revise os dados da ONG.");
    const updated = await prisma.organization.update({ where: { id: organization.id }, data: { latitude: Number(matches[0].lat), longitude: Number(matches[0].lon) } });
    res.json({ data: serialize(updated) });
  } catch { apiError(res, 502, "Falha ao consultar o serviço de localização."); }
});

app.get("/api/nearby-places", async (req, res) => {
  const latitude = Number(req.query.latitude), longitude = Number(req.query.longitude), radiusKm = Math.min(Math.max(Number(req.query.radius_km) || 5, 1), 5);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return apiError(res, 400, "Informe uma localização válida.");
  const googleApiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (googleApiKey) {
    try {
      const googleResponse = await fetch("https://places.googleapis.com/v1/places:searchNearby", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": googleApiKey,
          "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location,places.nationalPhoneNumber,places.websiteUri,places.types",
        },
        body: JSON.stringify({ includedTypes: ["pet_store", "veterinary_care"], maxResultCount: 20, rankPreference: "DISTANCE", locationRestriction: { circle: { center: { latitude, longitude }, radius: radiusKm * 1000 } } }),
        signal: AbortSignal.timeout(15000),
      });
      if (googleResponse.ok) {
        const payload = await googleResponse.json() as { places?: Array<{ id: string; displayName?: { text?: string }; formattedAddress?: string; location?: { latitude?: number; longitude?: number }; nationalPhoneNumber?: string; websiteUri?: string; types?: string[] }> };
        const places = (payload.places ?? []).map((place) => {
          const itemLatitude = place.location?.latitude, itemLongitude = place.location?.longitude;
          if (!Number.isFinite(itemLatitude) || !Number.isFinite(itemLongitude)) return null;
          const category = place.types?.includes("veterinary_care") ? "Veterinária" : "Pet shop";
          return { id: `google-${place.id}`, name: place.displayName?.text || category, category, latitude: itemLatitude!, longitude: itemLongitude!, address: place.formattedAddress || null, phone: place.nationalPhoneNumber || null, website: place.websiteUri || null, distance_km: distanceKm(latitude, longitude, itemLatitude!, itemLongitude!) };
        }).filter(Boolean).sort((a: any, b: any) => a.distance_km - b.distance_km);
        if (places.length) return res.json({ data: places, source: "google" });
      }
    } catch { /* se Google estiver indisponível, mantém a busca pública como reserva */ }
  }
  const query = `[out:json][timeout:25];(nwr[amenity=veterinary](around:${Math.round(radiusKm * 1000)},${latitude},${longitude});nwr[shop=pet](around:${Math.round(radiusKm * 1000)},${latitude},${longitude});nwr[amenity=animal_shelter](around:${Math.round(radiusKm * 1000)},${latitude},${longitude});nwr[amenity=animal_boarding](around:${Math.round(radiusKm * 1000)},${latitude},${longitude}););out center tags;`;
  try {
    const endpoints = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter"];
    let response: Response | null = null;
    for (const endpoint of endpoints) {
      try {
        const candidate = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "PataAmiga/1.0 (local development)" }, body: new URLSearchParams({ data: query }), signal: AbortSignal.timeout(30000) });
        if (candidate.ok) { response = candidate; break; }
      } catch { /* tenta o próximo servidor público */ }
    }
    if (!response) {
      const latSpan = radiusKm / 111, lngSpan = radiusKm / (111 * Math.max(Math.cos(latitude * Math.PI / 180), 0.2));
      const viewbox = `${longitude - lngSpan},${latitude + latSpan},${longitude + lngSpan},${latitude - latSpan}`;
      const searches: Array<[string, string]> = [["veterinária", "Veterinária"], ["pet shop", "Pet shop"], ["abrigo de animais", "Abrigo"], ["hotel para animais", "Hospedagem animal"]];
      const fallback: Array<{ id: string; name: string; category: string; latitude: number; longitude: number; address: string | null; phone: null; website: null; distance_km: number }> = [];
      for (const [term, category] of searches) {
        const lookup = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=20&bounded=1&viewbox=${encodeURIComponent(viewbox)}&q=${encodeURIComponent(term)}`, { headers: { "User-Agent": "PataAmiga/1.0 (local development)" } });
        if (lookup.ok) {
          const matches = await lookup.json() as Array<{ place_id: number; display_name: string; name?: string; lat: string; lon: string }>;
          fallback.push(...matches.map((item) => ({ id: `nominatim-${item.place_id}`, name: item.name || item.display_name.split(",")[0] || category, category, latitude: Number(item.lat), longitude: Number(item.lon), address: item.display_name, phone: null, website: null, distance_km: distanceKm(latitude, longitude, Number(item.lat), Number(item.lon)) })));
        }
        await new Promise((resolve) => setTimeout(resolve, 1100));
      }
      return res.json({ data: fallback.filter((item) => item.distance_km <= radiusKm).sort((a, b) => a.distance_km - b.distance_km).slice(0, 80), fallback: true });
    }
    const payload = await response.json() as { elements?: Array<{ type: string; id: number; lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string> }> };
    const places = (payload.elements ?? []).map((item) => {
      const itemLatitude = item.lat ?? item.center?.lat, itemLongitude = item.lon ?? item.center?.lon;
      if (itemLatitude === undefined || itemLongitude === undefined) return null;
      const tags = item.tags ?? {}, category = tags.amenity === "veterinary" ? "Veterinária" : tags.shop === "pet" ? "Pet shop" : tags.amenity === "animal_shelter" ? "Abrigo" : "Hospedagem animal";
      return { id: `osm-${item.type}-${item.id}`, name: tags.name || category, category, latitude: itemLatitude, longitude: itemLongitude, address: [tags["addr:street"], tags["addr:housenumber"], tags["addr:city"]].filter(Boolean).join(", ") || null, phone: tags.phone || tags["contact:phone"] || null, website: tags.website || tags["contact:website"] || null, distance_km: distanceKm(latitude, longitude, itemLatitude, itemLongitude) };
    }).filter(Boolean).sort((a: any, b: any) => a.distance_km - b.distance_km).slice(0, 80);
    res.json({ data: places });
  } catch { apiError(res, 502, "Falha ao consultar os serviços do OpenStreetMap."); }
});

function filters(query: Record<string, string | undefined>) { const where: Record<string, unknown> = {}; for (const [key, value] of Object.entries(query)) { if (!value || !key.includes(".")) continue; const [field, op] = key.split("."); const name = camel(field); if (op === "eq") where[name] = value; if (op === "gte") where[name] = { gte: new Date(value) }; if (op === "in") where[name] = { in: value.split(",") }; } return where; }
function allowed(resource: string, req: AuthRequest, data: Record<string, unknown>, action: "create" | "update") {
  const user = req.user; if (!user) return false;
  if (resource === "profiles") return String(data.id || user.id) === user.id;
  if (resource === "personal_pets") return String(data.owner_id || data.ownerId || user.id) === user.id;
  if (resource === "adoption_requests") return action === "create" && String(data.adopter_id || data.adopterId) === user.id;
  if (resource === "messages") return String(data.sender_id || data.senderId) === user.id;
  return true;
}
function normalize(data: Record<string, unknown>) { const result: Record<string, unknown> = {}; for (const [key, value] of Object.entries(data)) { if (key === "id" || key === "created_at") continue; const name = camel(key); if (value === "") { result[name] = null; continue; } result[name] = (name === "birthDate" || name === "occurredOn") && typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T12:00:00.000Z`) : value; } return result; }
function serialize(value: unknown): unknown { if (value instanceof Date) return value.toISOString(); if (Array.isArray(value)) return value.map(serialize); if (value && typeof value === "object") { return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([k, v]) => [snake(k), serialize(v)])); } return value; }
const include: Record<string, Record<string, object>> = { adoption_requests: { pet: true }, conversations: { organization: true } };
app.get("/api/data/:resource", async (req: AuthRequest, res) => { try { const resource = req.params.resource; const model = names[resource]; if (!model) return apiError(res, 404, "Recurso não encontrado."); const where: any = filters(req.query as Record<string, string>); if (req.user && resource === "conversations") where.OR = [{ adopterId: req.user.id }, { organization: { ownerId: req.user.id } }]; if (req.user && resource === "messages") where.conversation = { OR: [{ adopterId: req.user.id }, { organization: { ownerId: req.user.id } }] }; const delegate = (prisma as any)[model]; const count = await delegate.count({ where }); if (req.query.head === "true") return res.json({ data: null, count }); const data = await delegate.findMany({ where, include: include[resource], orderBy: req.query.order ? { [camel(String(req.query.order))]: String(req.query.ascending) === "true" ? "asc" : "desc" } : undefined, take: req.query.limit ? Number(req.query.limit) : undefined }); res.json({ data: serialize(data), count }); } catch (e) { apiError(res, 400, e instanceof Error ? e.message : "Consulta inválida."); } });
app.post("/api/data/:resource", async (req: AuthRequest, res) => { try { const resource = req.params.resource; const model = names[resource]; if (!model) return apiError(res, 404, "Recurso não encontrado."); if (resource === "personal_pets" && !req.user) return apiError(res, 401, "Sua sessão expirou. Saia da conta e entre novamente para cadastrar pets."); const payload = resource === "personal_pets" ? { ...req.body, owner_id: req.user!.id } : req.body; if (!allowed(resource, req, payload, "create")) return apiError(res, 403, "Sem permissão para cadastrar este pet."); const data = normalize(payload); const created = await (prisma as any)[model].create({ data }); res.status(201).json({ data: serialize(created) }); } catch { apiError(res, 400, "Não foi possível salvar. Verifique os dados e tente novamente."); } });
app.patch("/api/data/:resource", async (req: AuthRequest, res) => { try { const model = names[req.params.resource]; if (!model || !req.query.id) return apiError(res, 400, "Informe o recurso e id."); if (!req.user) return apiError(res, 401, "Faça login."); const data = normalize(req.body); const updated = await (prisma as any)[model].update({ where: { id: String(req.query.id) }, data }); res.json({ data: serialize(updated) }); } catch (e) { apiError(res, 400, e instanceof Error ? e.message : "Não foi possível atualizar."); } });
app.post("/api/pets", async (req: AuthRequest, res) => { if (!req.user || req.user.role !== "organization") return apiError(res, 403, "Somente ONGs podem cadastrar animais."); const organization = await prisma.organization.findUnique({ where: { ownerId: req.user.id } }); if (!organization) return apiError(res, 400, "Cadastre o perfil da ONG antes de cadastrar animais."); const payload = normalize({ ...req.body, ong_id: organization.id }); try { const pet = req.body.id ? await prisma.pet.update({ where: { id: req.body.id }, data: payload }) : await prisma.pet.create({ data: payload as any }); res.json({ data: serialize(pet) }); } catch (e) { apiError(res, 400, e instanceof Error ? e.message : "Não foi possível salvar o animal."); } });
app.post("/api/vaccination-events", async (req: AuthRequest, res) => {
  if (!req.user || req.user.role !== "organization") return apiError(res, 403, "Somente ONGs podem publicar eventos de vacinação.");
  const { title, starts_at: startsAt, location, description } = req.body;
  const startsAtDate = new Date(startsAt);
  if (!title || !location || Number.isNaN(startsAtDate.getTime())) return apiError(res, 400, "Informe título, data, horário e local do evento.");
  const organization = await prisma.organization.findUnique({ where: { ownerId: req.user.id } });
  if (!organization) return apiError(res, 400, "Cadastre o perfil da sua ONG antes de publicar um evento.");
  try {
    const vaccinationEvent = await prisma.vaccinationEvent.create({ data: { title: String(title), startsAt: startsAtDate, location: String(location), description: description ? String(description) : null, organizerId: organization.id } });
    res.status(201).json({ data: serialize(vaccinationEvent) });
  } catch (error) {
    apiError(res, 400, error instanceof Error ? error.message : "Não foi possível publicar o evento.");
  }
});
app.delete("/api/vaccination-events/:id", async (req: AuthRequest, res) => {
  if (!req.user || req.user.role !== "organization") return apiError(res, 403, "Somente ONGs podem excluir eventos de vacinação.");
  try {
    const vaccinationEvent = await prisma.vaccinationEvent.findUnique({ where: { id: req.params.id }, include: { organization: true } });
    if (!vaccinationEvent) return apiError(res, 404, "Evento não encontrado.");
    if (!vaccinationEvent.organization || vaccinationEvent.organization.ownerId !== req.user.id) return apiError(res, 403, "Você só pode excluir eventos publicados pela sua ONG.");
    await prisma.vaccinationEvent.delete({ where: { id: vaccinationEvent.id } });
    res.status(204).send();
  } catch (error) {
    apiError(res, 400, error instanceof Error ? error.message : "Não foi possível excluir o evento.");
  }
});
app.use((_req, res) => apiError(res, 404, "Rota não encontrada."));
app.listen(port, () => console.log(`API Pata Amiga em http://localhost:${port}`));
