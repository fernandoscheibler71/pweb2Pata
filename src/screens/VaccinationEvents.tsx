import { useEffect, useState } from "react";
import type { Screen } from "../App";
import { apiClient } from "../lib/apiClient";
import { useAuth } from "../contexts/AuthContext";

type Event = { id: string; title: string; starts_at: string; location: string; description: string | null; organizer_id: string | null };

export default function VaccinationEvents({ navigate: _navigate }: { navigate: (s: Screen) => void }) {
  const { session, role } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [eventToDelete, setEventToDelete] = useState<Event | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", starts_at: "", location: "", description: "" });
  const [notice, setNotice] = useState("");

  const load = async () => {
    const { data } = await apiClient.from("vaccination_events").select("id,title,starts_at,location,description,organizer_id").gte("starts_at", new Date().toISOString()).order("starts_at");
    setEvents(data ?? []);
  };

  useEffect(() => { void load(); }, []);
  useEffect(() => {
    if (role !== "organization" || !session) { setOrganizationId(null); return; }
    void apiClient.from("organizations").select("id").eq("owner_id", session.user.id).maybeSingle().then(({ data }) => setOrganizationId(data?.id ?? null));
  }, [role, session]);

  async function create(event: React.FormEvent) {
    event.preventDefault();
    if (!session) return;
    const { error } = await apiClient.functions.invoke("vaccination-events", { body: { ...form, starts_at: new Date(form.starts_at).toISOString() } });
    if (error) { setNotice(error.message); return; }
    setForm({ title: "", starts_at: "", location: "", description: "" });
    setNotice("Evento publicado.");
    await load();
  }

  async function confirmDeletion() {
    if (!eventToDelete) return;
    setDeletingId(eventToDelete.id);
    setNotice("");
    const { error } = await apiClient.vaccinationEvents.delete(eventToDelete.id);
    if (error) setNotice(error.message);
    else {
      setEvents((current) => current.filter((event) => event.id !== eventToDelete.id));
      setNotice("Evento excluído.");
      setEventToDelete(null);
    }
    setDeletingId(null);
  }

  return <div className="size-full overflow-y-auto bg-[#fdf6ee]"><div className="mx-auto max-w-5xl px-4 py-5 sm:p-8">
    <h1 className="text-2xl font-bold text-[#2d1f0f] sm:text-3xl" style={{ fontFamily: "'Fraunces', serif" }}>Eventos de vacinação</h1>
    <p className="mt-1 text-sm text-[#7a5c3f]">Eventos publicados por ONGs e instituições parceiras.</p>
    {role === "organization" && <form onSubmit={create} className="mt-6 grid grid-cols-1 gap-3 rounded-2xl border border-[#e0cdb8] bg-white p-4 sm:grid-cols-2">
      <input required placeholder="Título do evento" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="rounded-xl border border-[#e0cdb8] p-3" />
      <input required type="datetime-local" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} className="rounded-xl border border-[#e0cdb8] p-3" />
      <input required placeholder="Localização" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="rounded-xl border border-[#e0cdb8] p-3 sm:col-span-2" />
      <textarea placeholder="Descrição, vacinas e orientações" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="rounded-xl border border-[#e0cdb8] p-3 sm:col-span-2" />
      <button className="w-fit rounded-xl bg-[#3d6b4f] px-4 py-3 text-sm font-bold text-white">Publicar evento</button>
    </form>}
    {role === "organization" && <h2 className="mt-8 text-xl font-bold text-[#2d1f0f]" style={{ fontFamily: "'Fraunces', serif" }}>Eventos publicados</h2>}
    {notice && <p className="mt-4 text-sm text-[#3d6b4f]" role="status">{notice}</p>}
    <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {events.length ? events.map((item) => {
        const ownsEvent = role === "organization" && item.organizer_id === organizationId;
        return <article key={item.id} className="rounded-2xl border border-[#e0cdb8] bg-white p-5">
          <div className="flex items-start justify-between gap-3"><p className="text-xs font-bold text-[#3d6b4f]">💉 VACINAÇÃO</p>{ownsEvent && <button onClick={() => setEventToDelete(item)} className="shrink-0 rounded-lg border border-[#c4582a] px-3 py-1.5 text-xs font-bold text-[#c4582a] hover:bg-[#fde8da]">Excluir</button>}</div>
          <h2 className="mt-2 font-bold text-[#2d1f0f]">{item.title}</h2>
          <p className="mt-2 text-sm text-[#7a5c3f]">📅 {new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.starts_at))}</p>
          <p className="mt-1 text-sm text-[#7a5c3f]">📍 {item.location}</p>
          <p className="mt-3 text-sm text-[#7a5c3f]">{item.description || "Sem informações adicionais."}</p>
        </article>;
      }) : <p className="text-sm text-[#7a5c3f]">Nenhum evento publicado no momento.</p>}
    </div>
  </div>{eventToDelete && <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="delete-event-title">
    <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
      <div className="grid h-12 w-12 place-items-center rounded-full bg-[#fde0dd] text-2xl">🗑️</div>
      <h2 id="delete-event-title" className="mt-4 text-xl font-bold text-[#2d1f0f]" style={{ fontFamily: "'Fraunces', serif" }}>Excluir evento?</h2>
      <p className="mt-2 text-sm leading-relaxed text-[#7a5c3f]">Você está prestes a excluir <strong className="text-[#2d1f0f]">{eventToDelete.title}</strong>. Esta ação não pode ser desfeita.</p>
      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button onClick={() => setEventToDelete(null)} disabled={deletingId !== null} className="rounded-xl border border-[#e0cdb8] px-4 py-2.5 text-sm font-bold text-[#7a5c3f] disabled:opacity-50">Cancelar</button>
        <button onClick={() => void confirmDeletion()} disabled={deletingId !== null} className="rounded-xl bg-[#c4582a] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#a8461f] disabled:opacity-50">{deletingId ? "Excluindo…" : "Excluir evento"}</button>
      </div>
    </div>
  </div>}</div>;
}
