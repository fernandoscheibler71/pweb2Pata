import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { saveAnimal, type Animal } from "../lib/animals";
import { apiClient } from "../lib/apiClient";
import { uploadImage } from "../lib/uploads";
import AnimalPhoto from "../components/AnimalPhoto";

export default function OrganizationAnimals() {
  const { session, role } = useAuth();
  const [organizationId, setOrganizationId] = useState("");
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [notice, setNotice] = useState("");
  const [form, setForm] = useState({ name: "", species: "dog", breed: "", age_months: "", sex: "male", size: "medium", city: "", photo_url: "", description: "" });
  const load = async () => {
    if (!apiClient || !session) return;
    const { data: organization } = await apiClient.from("organizations").select("id").eq("owner_id", session.user.id).maybeSingle();
    if (!organization) return;
    setOrganizationId(organization.id);
    const { data } = await apiClient.from("pets").select("*").eq("ong_id", organization.id).order("created_at", { ascending: false });
    setAnimals((data ?? []) as Animal[]);
  };
  useEffect(() => { void load(); }, [session]);
  if (role !== "organization") return <div className="p-8 text-[#7a5c3f]">Esta área é exclusiva para ONGs.</div>;
  async function create(event: React.FormEvent) {
    event.preventDefault();
    if (!organizationId) { setNotice("Salve o perfil da ONG antes de cadastrar animais."); return; }
    try {
      if (!form.name.trim() || !form.description.trim()) { setNotice("Nome e descrição são obrigatórios."); return; }
      await saveAnimal({ ong_id: organizationId, name: form.name.trim(), species: form.species as Animal["species"], breed: form.breed || null, age_months: form.age_months ? Number(form.age_months) : null, sex: form.sex as NonNullable<Animal["sex"]>, size: form.size as NonNullable<Animal["size"]>, city: form.city || null, photo_url: form.photo_url || null, description: form.description.trim(), status: "available" });
      setForm({ name: "", species: "dog", breed: "", age_months: "", sex: "male", size: "medium", city: "", photo_url: "", description: "" }); setNotice("Animal cadastrado."); await load();
    } catch (error) { setNotice(error instanceof Error ? error.message : "Não foi possível cadastrar o animal."); }
  }
  async function setStatus(animal: Animal, status: Animal["status"]) { try { await saveAnimal({ ...animal, status }); await load(); } catch { setNotice("Não foi possível atualizar o status."); } }
  return <div className="size-full overflow-y-auto bg-[#fdf6ee]"><div className="max-w-5xl mx-auto px-4 py-5 sm:p-8"><h1 className="text-2xl sm:text-3xl font-bold text-[#2d1f0f]" style={{ fontFamily: "'Fraunces', serif" }}>Animais da minha ONG</h1><p className="mt-1 text-sm text-[#7a5c3f]">A ONG define cada informação exibida ao público. Sem foto, exibimos um cartão branco.</p><form onSubmit={create} className="mt-6 grid grid-cols-1 gap-3 rounded-2xl border border-[#e0cdb8] bg-white p-4 sm:grid-cols-2 lg:grid-cols-3 sm:p-5">{([['name','Nome'], ['breed','Raça'], ['age_months','Idade em meses'], ['city','Cidade']] as [keyof typeof form, string][]).map(([key, label]) => <input key={key} required={key === 'name'} type={key === 'age_months' ? 'number' : 'text'} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} placeholder={label} className="rounded-xl border border-[#e0cdb8] p-3 text-sm" />)}<label className="rounded-xl border border-[#e0cdb8] p-3 text-sm text-[#7a5c3f]">Foto do animal (opcional)<input type="file" accept="image/*" className="mt-1 block w-full" onChange={async (event) => { const file = event.target.files?.[0]; if (!file) return; try { setNotice("Enviando foto…"); setForm({ ...form, photo_url: await uploadImage(file, "pets") }); setNotice("Foto enviada."); } catch (error) { setNotice(error instanceof Error ? error.message : "Falha ao enviar foto."); } }} /></label><select value={form.species} onChange={(e) => setForm({ ...form, species: e.target.value })} className="rounded-xl border border-[#e0cdb8] p-3"><option value="dog">Cão</option><option value="cat">Gato</option><option value="other">Outro</option></select><select value={form.sex} onChange={(e) => setForm({ ...form, sex: e.target.value })} className="rounded-xl border border-[#e0cdb8] p-3"><option value="male">Macho</option><option value="female">Fêmea</option></select><select value={form.size} onChange={(e) => setForm({ ...form, size: e.target.value })} className="rounded-xl border border-[#e0cdb8] p-3"><option value="small">Pequeno</option><option value="medium">Médio</option><option value="large">Grande</option></select><textarea required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Descrição e personalidade" className="lg:col-span-3 sm:col-span-2 rounded-xl border border-[#e0cdb8] p-3" /><button className="w-full sm:w-fit rounded-xl bg-[#c4582a] px-5 py-3 font-bold text-white">Cadastrar animal</button></form>{notice && <p className="mt-4 text-sm text-[#3d6b4f]">{notice}</p>}<div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{animals.map((animal) => <article key={animal.id} className="overflow-hidden rounded-2xl border border-[#e0cdb8] bg-white"><AnimalPhoto src={animal.photo_url} alt={animal.name} className="h-44 w-full object-cover" /><div className="p-4"><b className="text-[#2d1f0f]">{animal.name}</b><p className="mt-1 text-xs text-[#7a5c3f]">{animal.species} · {animal.city ?? "Sem cidade"}</p><select value={animal.status} onChange={(e) => void setStatus(animal, e.target.value as Animal["status"])} className="mt-3 w-full rounded-lg border border-[#e0cdb8] p-2 text-sm"><option value="available">Disponível</option><option value="pending">Em processo</option><option value="adopted">Adotado</option></select></div></article>)}</div></div></div>;
}
