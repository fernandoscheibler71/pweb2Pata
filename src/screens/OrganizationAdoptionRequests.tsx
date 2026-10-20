import { useEffect, useState } from "react";
import type { Screen } from "../App";
import { apiClient } from "../lib/apiClient";
import AnimalPhoto from "../components/AnimalPhoto";
import { useAuth } from "../contexts/AuthContext";

type RequestStatus = "submitted" | "reviewing" | "approved" | "declined" | "completed";
type AdoptionRequest = { id: string; status: RequestStatus; message: string | null; created_at: string; pet: { name: string; photo_url: string | null; city: string | null }; adopter: { full_name: string | null; email: string; phone: string | null; whatsapp: string | null } };
const statusLabel: Record<RequestStatus, string> = { submitted: "Pendente", reviewing: "Em análise", approved: "Aprovada", declined: "Negada", completed: "Adotado" };
const statusColor: Record<RequestStatus, string> = { submitted: "bg-[#fef3d8] text-[#b07d1a]", reviewing: "bg-[#fde8da] text-[#c4582a]", approved: "bg-[#d8f0e5] text-[#3d6b4f]", declined: "bg-[#fde0dd] text-[#c4582a]", completed: "bg-[#d8f0e5] text-[#3d6b4f]" };

export default function OrganizationAdoptionRequests({ navigate }: { navigate: (screen: Screen) => void }) {
  const { session, role } = useAuth();
  const [requests, setRequests] = useState<AdoptionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true); setError("");
    const direct = await apiClient.functions.invoke("organization-adoption-requests", { body: {} });
    if (!direct.error) { setRequests((direct.data ?? []) as AdoptionRequest[]); setLoading(false); return; }
    setError(direct.error.message); setLoading(false);
  }
  useEffect(() => { if (role === "organization" && session) void load(); }, [role, session]);

  async function changeStatus(request: AdoptionRequest, status: RequestStatus) {
    setBusyId(request.id); setError("");
    const { error: updateError } = await apiClient.organizationAdoptionRequests.updateStatus(request.id, status);
    if (updateError) setError(updateError.message);
    else setRequests((current) => current.map((item) => item.id === request.id ? { ...item, status } : item));
    setBusyId(null);
  }

  async function openChat(request: AdoptionRequest) {
    setBusyId(request.id); setError("");
    const { data, error: conversationError } = await apiClient.organizationAdoptionRequests.conversation(request.id);
    if (conversationError) setError(conversationError.message);
    else { sessionStorage.setItem("pata-amiga-active-conversation", data.id); navigate("chat"); }
    setBusyId(null);
  }

  if (role !== "organization") return null;
  return <div className="size-full overflow-y-auto bg-[#fdf6ee]"><div className="mx-auto max-w-5xl px-4 py-5 sm:p-8">
    <h1 className="text-2xl font-bold text-[#2d1f0f] sm:text-3xl" style={{ fontFamily: "'Fraunces', serif" }}>Pedidos de adoção</h1>
    <p className="mt-1 text-sm text-[#7a5c3f]">Gerencie os pedidos recebidos e converse com cada adotante.</p>
    {error && <p className="mt-4 rounded-xl bg-[#fde0dd] p-3 text-sm text-[#c4582a]" role="alert">{error}</p>}
    {loading ? <p className="mt-8 text-sm text-[#7a5c3f]">Carregando pedidos…</p> : !requests.length ? <div className="mt-8 rounded-2xl border border-dashed border-[#e0cdb8] bg-white p-8 text-center text-sm text-[#7a5c3f]">Sua ONG ainda não recebeu pedidos de adoção.</div> : <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">{requests.map((request) => <article key={request.id} className="rounded-2xl border border-[#e0cdb8] bg-white p-5"><div className="flex gap-4"><AnimalPhoto src={request.pet.photo_url} alt={request.pet.name} className="h-16 w-16 shrink-0 rounded-xl object-cover" /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-start justify-between gap-2"><div><h2 className="font-bold text-[#2d1f0f]">{request.pet.name}</h2><p className="mt-1 text-xs text-[#7a5c3f]">📍 {request.pet.city || "Localização não informada"}</p></div><span className={`rounded-full px-3 py-1 text-xs font-bold ${statusColor[request.status]}`}>{statusLabel[request.status]}</span></div></div></div><div className="mt-4 rounded-xl bg-[#fdf6ee] p-3"><p className="text-xs font-bold uppercase text-[#b8987a]">Adotante</p><p className="mt-1 font-semibold text-[#2d1f0f]">{request.adopter.full_name || "Nome não informado"}</p><p className="mt-1 break-all text-sm text-[#7a5c3f]">{request.adopter.email}</p>{(request.adopter.whatsapp || request.adopter.phone) && <p className="mt-1 text-sm text-[#7a5c3f]">📞 {request.adopter.whatsapp || request.adopter.phone}</p>}</div><div className="mt-4"><p className="text-xs font-bold uppercase text-[#b8987a]">Mensagem</p><p className="mt-1 text-sm leading-relaxed text-[#7a5c3f]">{request.message || "O adotante não enviou uma mensagem."}</p></div><div className="mt-5 grid gap-3"><label className="text-xs font-bold uppercase text-[#b8987a]">Status da solicitação<select value={request.status} disabled={busyId === request.id} onChange={(event) => void changeStatus(request, event.target.value as RequestStatus)} className="mt-1.5 w-full rounded-xl border border-[#e0cdb8] bg-white px-3 py-2.5 text-sm font-semibold normal-case text-[#2d1f0f] disabled:opacity-50"><option value="reviewing">Em análise</option><option value="approved">Aprovada — pet em processo</option><option value="completed">Adotado — concluir pedido</option><option value="declined">Negada — liberar pet</option></select></label><button onClick={() => void openChat(request)} disabled={busyId === request.id} className="rounded-xl bg-[#3d6b4f] px-4 py-3 text-sm font-bold text-white hover:bg-[#325a42] disabled:opacity-50">{busyId === request.id ? "Aguarde…" : "💬 Conversar com adotante"}</button></div><p className="mt-4 text-xs text-[#b8987a]">Recebido em {new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(new Date(request.created_at))}</p></article>)}</div>}
  </div></div>;
}
