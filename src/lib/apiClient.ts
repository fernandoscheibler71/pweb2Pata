/** Browser API client. The MySQL connection is held only by the Prisma server. */
const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:3001/api";
const storageKey = "pata-amiga-session";
type Session = { access_token: string; user: { id: string; email: string; user_metadata: Record<string, string | null> } };
let listeners: Array<(event: string, session: Session | null) => void> = [];
const current = (): Session | null => { try { return JSON.parse(localStorage.getItem(storageKey) || "null"); } catch { return null; } };
const notify = (event: string, session: Session | null) => listeners.forEach((listener) => listener(event, session));
async function request(path: string, options: RequestInit = {}) {
  const session = current();
  const response = await fetch(`${baseUrl}${path}`, { ...options, headers: { "Content-Type": "application/json", ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}), ...(options.headers || {}) } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) return { error: body.error || { message: "Não foi possível concluir a operação." }, data: null, count: null };
  return { ...body, error: null };
}
const aliasesMap: Record<string, string> = { pet: "pets", organization: "organizations" };
function aliases(value: any): any { if (Array.isArray(value)) return value.map(aliases); if (!value || typeof value !== "object") return value; return Object.fromEntries(Object.entries(value).map(([key, item]) => [aliasesMap[key] || key, aliases(item)])); }
class Query {
  private checks: Array<[string, string, string]> = []; private mutation: "insert" | "update" | "upsert" | null = null; private payload: any; private one = false; private head = false; private countRequested = false; private sort?: { field: string; ascending: boolean }; private max?: number;
  constructor(private table: string) {}
  select(_columns = "*", options?: { count?: "exact"; head?: boolean }) { this.countRequested = options?.count === "exact"; this.head = Boolean(options?.head); return this; }
  eq(field: string, value: string) { this.checks.push([field, "eq", value]); return this; }
  gte(field: string, value: string) { this.checks.push([field, "gte", value]); return this; }
  in(field: string, values: string[]) { this.checks.push([field, "in", values.join(",")]); return this; }
  order(field: string, options?: { ascending?: boolean }) { this.sort = { field, ascending: options?.ascending ?? true }; return this; }
  limit(max: number) { this.max = max; return this; }
  maybeSingle() { this.one = true; return this; }
  single() { this.one = true; return this; }
  insert(payload: any) { this.mutation = "insert"; this.payload = Array.isArray(payload) ? payload[0] : payload; return this; }
  update(payload: any) { this.mutation = "update"; this.payload = payload; return this; }
  upsert(payload: any) { this.mutation = "upsert"; this.payload = payload; return this; }
  async execute() {
    if (this.mutation) { const id = this.checks.find(([field]) => field === "id")?.[2] || this.payload.id; const method = this.mutation === "insert" && !id ? "POST" : "PATCH"; const result = await request(`/data/${this.table}${method === "PATCH" ? `?id=${encodeURIComponent(id)}` : ""}`, { method, body: JSON.stringify(this.payload) }); return { data: aliases(result.data), error: result.error, count: null }; }
    const params = new URLSearchParams(); this.checks.forEach(([field, op, value]) => params.set(`${field}.${op}`, value)); if (this.sort) { params.set("order", this.sort.field); params.set("ascending", String(this.sort.ascending)); } if (this.max) params.set("limit", String(this.max)); if (this.head) params.set("head", "true"); const result = await request(`/data/${this.table}?${params}`); const data = aliases(result.data); return { data: this.one ? (data?.[0] || null) : data, error: result.error, count: this.countRequested ? result.count : null };
  }
  then<TResult1 = any, TResult2 = never>(onfulfilled?: ((value: any) => TResult1 | PromiseLike<TResult1>) | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null) { return this.execute().then(onfulfilled, onrejected); }
}
export const apiClient = {
  from: (table: string) => new Query(table), functions: { invoke: (name: string, { body }: { body: unknown }) => request(`/${name}`, { method: "POST", body: JSON.stringify(body) }) },
  auth: {
    async getSession() { return { data: { session: current() } }; }, async getUser() { return { data: { user: current()?.user || null } }; },
    async signInWithPassword(credentials: { email: string; password: string }) { const result = await request("/auth/signin", { method: "POST", body: JSON.stringify(credentials) }); if (!result.error) { localStorage.setItem(storageKey, JSON.stringify(result)); notify("SIGNED_IN", result as Session); } return { data: result.error ? null : result, error: result.error }; },
    async signUp(input: { email: string; password: string; options?: { data?: { full_name?: string; role?: string } } }) { const result = await request("/auth/signup", { method: "POST", body: JSON.stringify({ email: input.email, password: input.password, fullName: input.options?.data?.full_name, role: input.options?.data?.role }) }); if (!result.error) { localStorage.setItem(storageKey, JSON.stringify(result)); notify("SIGNED_IN", result as Session); } return { data: result.error ? { session: null, user: null } : { session: result, user: result.user }, error: result.error }; },
    async signOut() { localStorage.removeItem(storageKey); notify("SIGNED_OUT", null); return { error: null }; },
    async resetPasswordForEmail(_email: string, _options?: { redirectTo?: string }) { return { error: { message: "A recuperação de senha deve ser configurada com um provedor de e-mail no servidor." } }; },
    onAuthStateChange(callback: (event: string, session: Session | null) => void) { listeners.push(callback); return { data: { subscription: { unsubscribe: () => { listeners = listeners.filter((listener) => listener !== callback); } } } }; },
  }, storage: { from: () => ({ upload: async () => ({ error: { message: "Use uploadImage." } }), getPublicUrl: () => ({ data: { publicUrl: "" } }) }) },
};
export const isApiConfigured = true;
