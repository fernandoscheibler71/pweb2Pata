import { useEffect, useState } from "react";
import type { Screen } from "../App";
import { listAvailableAnimals, type Animal } from "../lib/animals";
import { apiClient } from "../lib/apiClient";
import AnimalPhoto from "../components/AnimalPhoto";

const quickActions = [
  { icon: "🐾", label: "Adotar agora", sub: "Animais disponíveis", screen: "adoption-list" as Screen, color: "#fde8da", text: "#c4582a" },
  { icon: "📍", label: "Clínicas próximas", sub: "Ver no mapa", screen: "nearby-map" as Screen, color: "#d8f0e5", text: "#3d6b4f" },
  { icon: "💉", label: "Vacinação", sub: "Próximos eventos", screen: "vaccination-events" as Screen, color: "#fef3d8", text: "#b07d1a" },
  { icon: "🚨", label: "Denunciar", sub: "Maus-tratos", screen: "abuse-report" as Screen, color: "#fde0dd", text: "#c4582a" },
];

type HomeData = { animalCount: number; organizationCount: number; adoptionCount: number; event: { title: string; starts_at: string; location: string; description: string } | null };
const initialData: HomeData = { animalCount: 0, organizationCount: 0, adoptionCount: 0, event: null };

function humanAge(months: number | null) {
  if (months === null) return "Idade não informada";
  return months < 12 ? `${months} ${months === 1 ? "mês" : "meses"}` : `${Math.floor(months / 12)} ${Math.floor(months / 12) === 1 ? "ano" : "anos"}`;
}

export default function Home({ navigate }: { navigate: (s: Screen, id?: string) => void }) {
  const [featured, setFeatured] = useState<Animal[]>([]);
  const [data, setData] = useState<HomeData>(initialData);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadHome() {
      if (!apiClient) { setLoading(false); return; }
      try {
        const [animalsResult, organizationsResult, adoptionsResult, eventResult] = await Promise.all([
          listAvailableAnimals(),
          apiClient.from("organizations").select("id", { count: "exact", head: true }),
          apiClient.from("adoption_requests").select("id", { count: "exact", head: true }).eq("status", "approved"),
          apiClient.from("vaccination_events").select("title, starts_at, location, description").gte("starts_at", new Date().toISOString()).order("starts_at").limit(1).maybeSingle(),
        ]);
        setFeatured(animalsResult.slice(0, 4));
        setData({ animalCount: animalsResult.length, organizationCount: organizationsResult.count ?? 0, adoptionCount: adoptionsResult.count ?? 0, event: eventResult.data });
      } finally {
        setLoading(false);
      }
    }
    void loadHome();
  }, []);

  const formatCount = (value: number) => new Intl.NumberFormat("pt-BR").format(value);
  const eventDate = data.event ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(new Date(data.event.starts_at)) : "Nenhum evento cadastrado";
  return (
    <div className="size-full overflow-y-auto bg-[#fdf6ee]">
      <div className="max-w-6xl mx-auto px-8 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-[#7a5c3f] text-sm font-semibold">Olá! 👋</p>
            <h1 className="text-[#2d1f0f] text-3xl font-bold mt-0.5" style={{ fontFamily: "'Fraunces', serif" }}>
              Encontre um amigo
            </h1>
          </div>
        </div>

        {/* Hero + Quick Actions */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {/* Hero banner */}
          <div className="col-span-2 relative h-52 bg-[#c4582a] rounded-2xl overflow-hidden">
            <AnimalPhoto src={featured[0]?.photo_url ?? null} alt={featured[0]?.name ?? "Animal em destaque"} className="absolute inset-0 h-full w-full object-cover opacity-30" />
            <div className="relative z-10 p-8 h-full flex flex-col justify-between">
              <div>
                <span className="bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full">🐾 Destaque</span>
                <h2 className="text-white text-2xl font-bold mt-3 leading-tight" style={{ fontFamily: "'Fraunces', serif" }}>
                  {data.event?.title ?? "Encontre um novo amigo"}
                </h2>
              </div>
              <button
                onClick={() => navigate("adoption-list")}
                className="self-start bg-white text-[#c4582a] font-bold text-sm px-5 py-2.5 rounded-xl hover:bg-[#fde8da] transition-all"
              >
                Ver animais disponíveis →
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="flex flex-col gap-3">
            {[
              { n: formatCount(data.animalCount), l: "animais disponíveis", icon: "🐶", color: "#fde8da" },
              { n: formatCount(data.organizationCount), l: "ONGs parceiras", icon: "🤝", color: "#d8f0e5" },
              { n: formatCount(data.adoptionCount), l: "adoções realizadas", icon: "❤️", color: "#fef3d8" },
            ].map((s) => (
              <div key={s.l} className="flex-1 rounded-2xl flex items-center gap-3 px-4" style={{ backgroundColor: s.color }}>
                <span className="text-2xl">{s.icon}</span>
                <div>
                  <p className="text-[#2d1f0f] font-bold text-xl leading-none" style={{ fontFamily: "'Fraunces', serif" }}>{s.n}</p>
                  <p className="text-[#7a5c3f] text-xs mt-0.5">{s.l}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {quickActions.map((a) => (
            <button
              key={a.screen}
              onClick={() => navigate(a.screen)}
              className="flex items-center gap-3 p-4 rounded-2xl text-left hover:scale-105 transition-all active:scale-95"
              style={{ backgroundColor: a.color }}
            >
              <span className="text-3xl">{a.icon}</span>
              <div>
                <p className="font-bold text-sm text-[#2d1f0f]">{a.label}</p>
                <p className="text-xs mt-0.5" style={{ color: a.text }}>{a.sub}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Featured animals */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[#2d1f0f] font-bold text-xl" style={{ fontFamily: "'Fraunces', serif" }}>
              Em destaque
            </h2>
            <button onClick={() => navigate("adoption-list")} className="text-[#c4582a] text-sm font-bold hover:underline">
              Ver todos →
            </button>
          </div>
          {loading ? <p className="text-[#7a5c3f] text-sm">Carregando animais cadastrados…</p> : featured.length === 0 ? <p className="text-[#7a5c3f] text-sm">Ainda não há animais disponíveis cadastrados.</p> : <div className="grid grid-cols-4 gap-4">
            {featured.map((a) => (
              <div
                key={a.id}
                onClick={() => navigate("animal-profile", a.id)}
                className="bg-white rounded-2xl overflow-hidden border border-[#e0cdb8] cursor-pointer hover:shadow-lg transition-all group"
              >
                <div className="relative h-48 bg-[#efe5d8]">
                  <AnimalPhoto src={a.photo_url} alt={a.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  <span className="absolute top-2 left-2 bg-[#c4582a] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    Disponível
                  </span>
                  <span
                    className="absolute top-2 right-2 w-7 h-7 bg-white/80 rounded-full flex items-center justify-center text-sm cursor-pointer hover:bg-white transition-all"
                    onClick={(e) => e.stopPropagation()}
                  >
                    🤍
                  </span>
                </div>
                <div className="p-3">
                  <p className="font-bold text-[#2d1f0f]" style={{ fontFamily: "'Fraunces', serif" }}>{a.name}</p>
                  <p className="text-[#7a5c3f] text-xs">{a.breed ?? "SRD"} · {humanAge(a.age_months)}</p>
                  <p className="text-[#b8987a] text-[10px] mt-1">📍 {a.city ?? "Localização não informada"}</p>
                </div>
              </div>
            ))}
          </div>}
        </div>

        {/* Vaccination CTA */}
        <button
          onClick={() => navigate("vaccination-events")}
          className="w-full bg-[#3d6b4f] rounded-2xl p-5 flex items-center gap-5 hover:bg-[#325a42] transition-all active:scale-[0.99]"
        >
          <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center text-3xl">💉</div>
          <div className="text-left">
            <p className="text-white font-bold text-base">{data.event?.title ?? "Próximo evento de vacinação"}</p>
            <p className="text-white/70 text-sm mt-0.5">{eventDate}{data.event ? ` · ${data.event.location} · ${data.event.description ?? ""}` : ""}</p>
          </div>
          <span className="ml-auto text-white text-xl font-bold">→</span>
        </button>

      </div>
    </div>
  );
}
