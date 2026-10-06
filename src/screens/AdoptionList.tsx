import { useEffect, useMemo, useState } from "react";
import type { Screen } from "../App";
import { listAvailableAnimals, type Animal } from "../lib/animals";
import { useAuth } from "../contexts/AuthContext";
import AnimalPhoto from "../components/AnimalPhoto";

const filters = ["Todos", "Cães", "Gatos"];
const age = (months: number | null) => months === null ? "Idade não informada" : months < 12 ? `${months} meses` : `${Math.floor(months / 12)} ano(s)`;

export default function AdoptionList({ navigate }: { navigate: (s: Screen, id?: string) => void }) {
  const { role } = useAuth();
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [activeFilter, setActiveFilter] = useState("Todos");
  const [search, setSearch] = useState("");
  const [size, setSize] = useState("all");
  const [sex, setSex] = useState("all");
  const [ageRange, setAgeRange] = useState("all");
  const [error, setError] = useState("");
  const [registrationNotice, setRegistrationNotice] = useState("");

  useEffect(() => { listAvailableAnimals().then(setAnimals).catch(() => setError("Não foi possível carregar os animais agora.")); }, []);
  const filtered = useMemo(() => animals.filter((animal) => {
    const type = activeFilter === "Todos" || (activeFilter === "Cães" && animal.species === "dog") || (activeFilter === "Gatos" && animal.species === "cat");
    const term = search.toLocaleLowerCase();
    const matchesSearch = [animal.name, animal.breed, animal.city].filter(Boolean).some((value) => value!.toLocaleLowerCase().includes(term));
    const matchesSize = size === "all" || animal.size === size;
    const matchesSex = sex === "all" || animal.sex === sex;
    const matchesAge = ageRange === "all" || (ageRange === "young" && (animal.age_months ?? Infinity) < 12) || (ageRange === "adult" && (animal.age_months ?? 0) >= 12);
    return type && matchesSearch && matchesSize && matchesSex && matchesAge;
  }), [activeFilter, ageRange, animals, search, sex, size]);

  return <div className="size-full overflow-y-auto bg-[#fdf6ee]"><div className="max-w-6xl mx-auto px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
    <div className="mb-6 flex flex-col items-stretch justify-between gap-4 lg:flex-row lg:items-center"><div><h1 className="text-[#2d1f0f] text-2xl sm:text-3xl font-bold" style={{ fontFamily: "'Fraunces', serif" }}>Animais para adoção</h1><p className="text-[#7a5c3f] text-sm mt-1">{filtered.length} animais disponíveis</p></div><div className="flex flex-col gap-2 sm:flex-row sm:items-center"><div className="flex items-center gap-2 bg-white border border-[#e0cdb8] rounded-xl px-4 py-2.5 w-full sm:w-72"><span>🔍</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nome, raça ou cidade" className="min-w-0 flex-1 bg-transparent text-sm outline-none" /></div><button onClick={() => role === "organization" ? navigate("organization-animals") : setRegistrationNotice("O cadastro de pets para adoção é exclusivo para contas de ONG. Entre com uma conta institucional para continuar.")} className="shrink-0 rounded-xl bg-[#c4582a] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#a8461f]">+ Cadastrar pet</button></div></div>
    {registrationNotice && <p className="mb-4 rounded-xl bg-[#fef3d8] px-4 py-3 text-sm text-[#7a5c3f]" role="status">{registrationNotice}</p>}
    <div className="flex gap-2 mb-6 overflow-x-auto pb-1">{filters.map((filter) => <button key={filter} onClick={() => setActiveFilter(filter)} className={`shrink-0 px-4 py-2 rounded-xl text-sm font-bold ${activeFilter === filter ? "bg-[#c4582a] text-white" : "bg-white text-[#7a5c3f] border border-[#e0cdb8]"}`}>{filter}</button>)}</div>
    <div className="mb-6 grid grid-cols-1 gap-2 sm:grid-cols-3"><select value={size} onChange={(event) => setSize(event.target.value)} className="rounded-xl border border-[#e0cdb8] bg-white px-3 py-2.5 text-sm text-[#2d1f0f]"><option value="all">Todos os portes</option><option value="small">Pequeno</option><option value="medium">Médio</option><option value="large">Grande</option></select><select value={sex} onChange={(event) => setSex(event.target.value)} className="rounded-xl border border-[#e0cdb8] bg-white px-3 py-2.5 text-sm text-[#2d1f0f]"><option value="all">Todos os sexos</option><option value="female">Fêmea</option><option value="male">Macho</option></select><select value={ageRange} onChange={(event) => setAgeRange(event.target.value)} className="rounded-xl border border-[#e0cdb8] bg-white px-3 py-2.5 text-sm text-[#2d1f0f]"><option value="all">Todas as idades</option><option value="young">Até 11 meses</option><option value="adult">1 ano ou mais</option></select></div>
    {error && <p className="text-[#c4582a] text-sm">{error}</p>}{!error && filtered.length === 0 && <p className="text-[#7a5c3f] text-sm">Nenhum animal encontrado. Cadastre animais para vê-los aqui.</p>}
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{filtered.map((animal) => <article key={animal.id} onClick={() => navigate("animal-profile", animal.id)} className="bg-white rounded-2xl overflow-hidden border border-[#e0cdb8] cursor-pointer hover:shadow-lg transition-all group"><div className="relative h-48 bg-[#efe5d8]"><AnimalPhoto src={animal.photo_url} alt={animal.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" /><span className="absolute bottom-2 left-2 bg-[#3d6b4f] text-white text-[9px] font-bold px-2 py-1 rounded-full">{animal.status === "available" ? "Disponível" : animal.status === "pending" ? "Em adoção" : "Adotado"}</span></div><div className="p-4"><p className="font-bold text-[#2d1f0f]" style={{ fontFamily: "'Fraunces', serif" }}>{animal.name}</p><p className="text-[#7a5c3f] text-xs mt-1">{animal.breed ?? "SRD"} · {age(animal.age_months)} · {animal.sex === "female" ? "Fêmea" : animal.sex === "male" ? "Macho" : "Sexo não informado"}</p><p className="text-[#b8987a] text-[11px] mt-1.5">{animal.size ? `Porte ${animal.size === "small" ? "pequeno" : animal.size === "medium" ? "médio" : "grande"} · ` : ""}📍 {animal.city ?? "Localização não informada"}</p><button className="mt-3 w-full bg-[#fde8da] text-[#c4582a] font-bold text-xs py-2 rounded-lg">Ver perfil →</button></div></article>)}</div>
  </div></div>;
}
