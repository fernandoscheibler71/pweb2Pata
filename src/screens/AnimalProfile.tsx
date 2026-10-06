import { useEffect, useState } from "react";
import type { Screen } from "../App";
import { listAvailableAnimals, type Animal } from "../lib/animals";
import AnimalPhoto from "../components/AnimalPhoto";
const labels = { dog: "Cão", cat: "Gato", other: "Outro", male: "Macho", female: "Fêmea", small: "Pequeno", medium: "Médio", large: "Grande" } as const;

function age(months: number | null) {
  if (months === null) return "Idade não informada";
  return months < 12 ? `${months} ${months === 1 ? "mês" : "meses"}` : `${Math.floor(months / 12)} ano(s)`;
}

export default function AnimalProfile({ navigate, animalId }: { navigate: (s: Screen, id?: string) => void; animalId: string }) {
  const [animal, setAnimal] = useState<Animal | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void listAvailableAnimals().then((items) => { if (active) setAnimal(items.find((item) => item.id === animalId) ?? null); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [animalId]);

  if (loading) return <div className="p-8 text-[#7a5c3f]">Carregando informações do animal…</div>;
  if (!animal) return <div className="p-8"><p className="text-[#7a5c3f]">Este animal não está mais disponível.</p><button onClick={() => navigate("adoption-list")} className="mt-4 font-bold text-[#c4582a]">Voltar para adoção</button></div>;

  const details = [
    ["Espécie", labels[animal.species]],
    ["Raça", animal.breed || "Não informada"],
    ["Idade", age(animal.age_months)],
    ["Sexo", animal.sex ? labels[animal.sex] : "Não informado"],
    ["Porte", animal.size ? labels[animal.size] : "Não informado"],
    ["Cidade", animal.city || "Não informada"],
  ];

  return <div className="size-full overflow-y-auto bg-[#fdf6ee]"><div className="mx-auto max-w-5xl px-4 py-5 sm:p-8">
    <button onClick={() => navigate("adoption-list")} className="mb-6 font-bold text-sm text-[#c4582a]">← Voltar para adoção</button>
    <div className="grid gap-6 lg:grid-cols-[minmax(280px,2fr)_3fr]">
      <div><div className="aspect-[3/4] overflow-hidden rounded-2xl bg-[#efe5d8]"><AnimalPhoto src={animal.photo_url} alt={animal.name} className="h-full w-full object-cover" /></div><p className="mt-2 text-center text-xs text-[#7a5c3f]">Foto fornecida pela ONG responsável.</p></div>
      <section className="rounded-2xl border border-[#e0cdb8] bg-white p-5 sm:p-7"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-sm font-bold text-[#c4582a]">Para adoção</p><h1 className="mt-1 text-3xl font-bold text-[#2d1f0f] sm:text-4xl" style={{ fontFamily: "'Fraunces', serif" }}>{animal.name}</h1><p className="mt-2 text-sm text-[#7a5c3f]">Cadastro administrado pela ONG.</p></div><span className="rounded-full bg-[#d8f0e5] px-3 py-1.5 text-sm font-bold text-[#3d6b4f]">Disponível</span></div>
        <h2 className="mt-7 font-bold text-[#2d1f0f]">Sobre {animal.name}</h2><p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-[#7a5c3f]">{animal.description || "A ONG ainda não adicionou uma descrição para este animal."}</p>
        <h2 className="mt-7 font-bold text-[#2d1f0f]">Informações cadastradas pela ONG</h2><dl className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">{details.map(([label, value]) => <div key={label} className="rounded-xl bg-[#fdf6ee] p-3"><dt className="text-xs font-bold uppercase text-[#b8987a]">{label}</dt><dd className="mt-1 text-sm text-[#2d1f0f]">{value}</dd></div>)}</dl>
        <p className="mt-6 text-xs text-[#7a5c3f]">Vacinação, castração, comportamento e requisitos não são exibidos até que a ONG os cadastre.</p>
        <button onClick={() => navigate("adoption-process", animal.id)} className="mt-6 w-full rounded-xl bg-[#c4582a] py-4 font-bold text-white hover:bg-[#a8461f]">Quero adotar {animal.name} 🐾</button>
      </section>
    </div>
  </div></div>;
}
