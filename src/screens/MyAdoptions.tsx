import { useEffect, useState } from "react";
import { apiClient } from "../lib/apiClient";
import { useAuth } from "../contexts/AuthContext";
import AnimalPhoto from "../components/AnimalPhoto";

type Request = { id: string; status: "submitted" | "reviewing" | "approved" | "declined" | "completed"; created_at: string; pets: { name: string; photo_url: string | null; city: string | null } | null };
const labels = { submitted: "Pendente", reviewing: "Em análise", approved: "Aprovada", declined: "Rejeitada", completed: "Concluída" };
const colors = { submitted: "bg-[#fef3d8] text-[#b07d1a]", reviewing: "bg-[#fde8da] text-[#c4582a]", approved: "bg-[#d8f0e5] text-[#3d6b4f]", declined: "bg-[#fde0dd] text-[#c4582a]", completed: "bg-[#d8f0e5] text-[#3d6b4f]" };

export default function MyAdoptions() {
  const { session } = useAuth(); const [requests, setRequests] = useState<Request[]>([]); const [loading, setLoading] = useState(true);
  useEffect(() => { if (!apiClient || !session) return; void apiClient.from("adoption_requests").select("id, status, created_at, pets(name, photo_url, city)").eq("adopter_id", session.user.id).order("created_at", { ascending: false }).then(({ data }) => { setRequests((data ?? []) as unknown as Request[]); setLoading(false); }); }, [session]);
  return <div className="size-full overflow-y-auto bg-[#fdf6ee]"><div className="mx-auto max-w-4xl px-4 py-5 sm:p-8"><h1 className="text-2xl font-bold text-[#2d1f0f] sm:text-3xl" style={{ fontFamily: "'Fraunces', serif" }}>Minhas adoções</h1><p className="mt-1 text-sm text-[#7a5c3f]">Acompanhe cada solicitação e suas mudanças de status.</p>{loading ? <p className="mt-8 text-sm text-[#7a5c3f]">Carregando solicitações…</p> : !requests.length ? <div className="mt-8 rounded-2xl border border-dashed border-[#e0cdb8] bg-white p-8 text-center text-sm text-[#7a5c3f]">Você ainda não iniciou nenhuma adoção.</div> : <div className="mt-6 space-y-3">{requests.map((request) => <article key={request.id} className="flex flex-col gap-4 rounded-2xl border border-[#e0cdb8] bg-white p-4 sm:flex-row sm:items-center"><AnimalPhoto src={request.pets?.photo_url ?? null} alt={request.pets?.name || "Pet"} className="h-16 w-16 rounded-xl object-cover" /><div className="min-w-0 flex-1"><h2 className="truncate font-bold text-[#2d1f0f]">{request.pets?.name || "Animal indisponível"}</h2><p className="mt-1 text-xs text-[#7a5c3f]">📍 {request.pets?.city || "Localização não informada"} · Solicitada em {new Intl.DateTimeFormat("pt-BR").format(new Date(request.created_at))}</p></div><span className={`w-fit rounded-full px-3 py-1.5 text-xs font-bold ${colors[request.status]}`}>{labels[request.status]}</span></article>)}</div>}</div></div>;
}
