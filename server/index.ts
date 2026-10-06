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

function filters(query: Record<string, string | undefined>) { const where: Record<string, unknown> = {}; for (const [key, value] of Object.entries(query)) { if (!value || !key.includes(".")) continue; const [field, op] = key.split("."); const name = camel(field); if (op === "eq") where[name] = value; if (op === "gte") where[name] = { gte: new Date(value) }; if (op === "in") where[name] = { in: value.split(",") }; } return where; }
function allowed(resource: string, req: AuthRequest, data: Record<string, unknown>, action: "create" | "update") {
  const user = req.user; if (!user) return false;
  if (resource === "profiles") return String(data.id || user.id) === user.id;
  if (resource === "personal_pets") return String(data.owner_id || data.ownerId || user.id) === user.id;
  if (resource === "adoption_requests") return action === "create" && String(data.adopter_id || data.adopterId) === user.id;
  if (resource === "messages") return String(data.sender_id || data.senderId) === user.id;
  return true;
}
function normalize(data: Record<string, unknown>) { const result: Record<string, unknown> = {}; for (const [key, value] of Object.entries(data)) { if (key === "id" || key === "created_at") continue; result[camel(key)] = value === "" ? null : value; } return result; }
function serialize(value: unknown): unknown { if (value instanceof Date) return value.toISOString(); if (Array.isArray(value)) return value.map(serialize); if (value && typeof value === "object") { return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([k, v]) => [snake(k), serialize(v)])); } return value; }
const include: Record<string, Record<string, object>> = { adoption_requests: { pet: true }, conversations: { organization: true } };
app.get("/api/data/:resource", async (req: AuthRequest, res) => { try { const resource = req.params.resource; const model = names[resource]; if (!model) return apiError(res, 404, "Recurso não encontrado."); const where: any = filters(req.query as Record<string, string>); if (req.user && resource === "conversations") where.OR = [{ adopterId: req.user.id }, { organization: { ownerId: req.user.id } }]; if (req.user && resource === "messages") where.conversation = { OR: [{ adopterId: req.user.id }, { organization: { ownerId: req.user.id } }] }; const delegate = (prisma as any)[model]; const count = await delegate.count({ where }); if (req.query.head === "true") return res.json({ data: null, count }); const data = await delegate.findMany({ where, include: include[resource], orderBy: req.query.order ? { [camel(String(req.query.order))]: String(req.query.ascending) === "true" ? "asc" : "desc" } : undefined, take: req.query.limit ? Number(req.query.limit) : undefined }); res.json({ data: serialize(data), count }); } catch (e) { apiError(res, 400, e instanceof Error ? e.message : "Consulta inválida."); } });
app.post("/api/data/:resource", async (req: AuthRequest, res) => { try { const resource = req.params.resource; const model = names[resource]; if (!model) return apiError(res, 404, "Recurso não encontrado."); if (!allowed(resource, req, req.body, "create")) return apiError(res, 403, "Sem permissão."); const data = normalize(req.body); const created = await (prisma as any)[model].create({ data }); res.status(201).json({ data: serialize(created) }); } catch (e) { apiError(res, 400, e instanceof Error ? e.message : "Não foi possível salvar."); } });
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
app.use((_req, res) => apiError(res, 404, "Rota não encontrada."));
app.listen(port, () => console.log(`API Pata Amiga em http://localhost:${port}`));
