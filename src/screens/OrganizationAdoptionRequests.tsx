import { useEffect, useState } from "react";
import { apiClient } from "../lib/apiClient";
import AnimalPhoto from "../components/AnimalPhoto";
import { useAuth } from "../contexts/AuthContext";

type AdoptionRequest = {
  id: string;
  status: "submitted" | "reviewing" | "approved" | "declined" | "completed";
  message: string | null;
  created_at: string;
  pet: { name: string; photo_url: string | null; city: string | null };
  adopter: { full_name: string | null; email: string; phone: string | null; whatsapp: string | null };
};

const statusLabel = { submitted: "Pendente", reviewing: "Em análise", approved: "Aprovada", declined: "Recusada", completed: "Concluída" };
const statusColor = { submitted: "bg-[#fef3d8] text-[#b07d1a]", reviewing: "bg-[#fde8da] text-[#c4582a]", approved: "bg-[#d8f0e5] text-[#3d6b4f]", declined: "bg-[#fde0dd] text-[#c4582a]", completed: "bg-[#d8f0e5] text-[#3d6b4f]" };

export default function OrganizationAdoptionRequests() {
  const { session } = useAuth();
  const [requests, setRequests] = useState<AdoptionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadExistingRequests() {
      const direct = await apiClient.functions.invoke("organization-adoption-requests", { body: {} });
      if (!direct.error) { setRequests((direct.data ?? []) as AdoptionRequest[]); setLoading(false); return; }

      // Compatibilidade com servidores já em execução antes da rota dedicada.
      if (!session) { setError("Faça login novamente para consultar os pedidos."); setLoading(false); return; }
      const { data: organization, error: organizationError } = await apiClient.from("organizations").select("id").eq("owner_id", session.user.id).maybeSingle();
      if (organizationError || !organization) { setError(organizationError?.message || direct.error.message); setLoading(false); return; }
      const { data: pets, error: petsError } = await apiClient.from("pets").select("id").eq("ong_id", organization.id);
      const petIds = (pets ?? []).map((pet: { id: string }) => pet.id);
      if (petsError || petIds.length === 0) { if (petsError) setError(petsError.message); setLoading(false); return; }
      const { data: storedRequests, error: requestsError } = await apiClient.from("adoption_requests").select("*").in("pet_id", petIds).order("created_at", { ascending: false });
      if (requestsError) { setError(requestsError.message); setLoading(false); return; }
      const adopterIds = [...new Set<string>((storedRequests ?? []).map((request: { adopter_id: string }) => request.adopter_id))];
      const { data: adopters } = adopterIds.length ? await apiClient.from("profiles").select("*").in("id", adopterIds) : { data: [] };
      const adopterById = new Map((adopters ?? []).map((adopter: { id: string }) => [adopter.id, adopter]));
      const petById = new Map((pets ?? []).map((pet: { id: string }) => [pet.id, pet]));
      setRequests((storedRequests ?? []).map((request: any) => ({ ...request, pet: request.pets ?? petById.get(request.pet_id), adopter: adopterById.get(request.adopter_id) } as AdoptionRequest)));
      setLoading(false);
    }
    void loadExistingRequests();
  }, [session]);

  return <div className="size-full overflow-y-auto bg-[#fdf6ee]"><div className="mx-auto max-w-5xl px-4 py-5 sm:p-8">
    <h1 className="text-2xl font-bold text-[#2d1f0f] sm:text-3xl" style={{ fontFamily: "'Fraunces', serif" }}>Pedidos de adoção</h1>
    <p className="mt-1 text-sm text-[#7a5c3f]">Solicitações enviadas por adotantes para os animais da sua ONG.</p>
    {loading ? <p className="mt-8 text-sm text-[#7a5c3f]">Carregando pedidos…</p> : error ? <p className="mt-8 text-sm text-[#c4582a]">{error}</p> : !requests.length ? <div className="mt-8 rounded-2xl border border-dashed border-[#e0cdb8] bg-white p-8 text-center text-sm text-[#7a5c3f]">Sua ONG ainda não recebeu pedidos de adoção.</div> : <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">{requests.map((request) => <article key={request.id} className="rounded-2xl border border-[#e0cdb8] bg-white p-5"><div className="flex gap-4"><AnimalPhoto src={request.pet.photo_url} alt={request.pet.name} className="h-16 w-16 shrink-0 rounded-xl object-cover" /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-start justify-between gap-2"><div><h2 className="font-bold text-[#2d1f0f]">{request.pet.name}</h2><p className="mt-1 text-xs text-[#7a5c3f]">📍 {request.pet.city || "Localização não informada"}</p></div><span className={`rounded-full px-3 py-1 text-xs font-bold ${statusColor[request.status]}`}>{statusLabel[request.status]}</span></div></div></div><div className="mt-4 rounded-xl bg-[#fdf6ee] p-3"><p className="text-xs font-bold uppercase text-[#b8987a]">Adotante</p><p className="mt-1 font-semibold text-[#2d1f0f]">{request.adopter.full_name || "Nome não informado"}</p><p className="mt-1 break-all text-sm text-[#7a5c3f]">{request.adopter.email}</p>{(request.adopter.whatsapp || request.adopter.phone) && <p className="mt-1 text-sm text-[#7a5c3f]">📞 {request.adopter.whatsapp || request.adopter.phone}</p>}</div><div className="mt-4"><p className="text-xs font-bold uppercase text-[#b8987a]">Mensagem</p><p className="mt-1 text-sm leading-relaxed text-[#7a5c3f]">{request.message || "O adotante não enviou uma mensagem."}</p></div><p className="mt-4 text-xs text-[#b8987a]">Recebido em {new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(new Date(request.created_at))}</p></article>)}</div>}
  </div></div>;
}
