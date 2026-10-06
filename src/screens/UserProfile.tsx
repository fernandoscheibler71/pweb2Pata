import { useEffect, useState } from "react";
import type { Screen } from "../App";
import { apiClient } from "../lib/apiClient";
import { useAuth } from "../contexts/AuthContext";
import OrganizationProfile from "./OrganizationProfile";
import { uploadImage } from "../lib/uploads";

type Profile = { full_name: string; cpf: string; phone: string; whatsapp: string; avatar_url: string; cep: string; street: string; number: string; neighborhood: string; city: string; state: string };
const emptyProfile: Profile = { full_name: "", cpf: "", phone: "", whatsapp: "", avatar_url: "", cep: "", street: "", number: "", neighborhood: "", city: "", state: "" };

export default function UserProfile({ navigate, editingMode = false }: { navigate: (s: Screen) => void; editingMode?: boolean }) {
  const { session, role } = useAuth();
  const [profile, setProfile] = useState<Profile>(emptyProfile);
  const [message, setMessage] = useState("");
  const [adoptionCount, setAdoptionCount] = useState(0);

  useEffect(() => { if (apiClient && session) void Promise.all([
    apiClient.from("profiles").select("full_name, cpf, phone, whatsapp, avatar_url, cep, street, number, neighborhood, city, state").eq("id", session.user.id).maybeSingle(),
    apiClient.from("adoption_requests").select("id", { count: "exact", head: true }).eq("adopter_id", session.user.id),
  ]).then(([profileResult, adoptionsResult]) => { setProfile({ ...emptyProfile, ...profileResult.data }); setAdoptionCount(adoptionsResult.count ?? 0); }); }, [session]);

  const update = (key: keyof Profile, value: string) => setProfile((current) => ({ ...current, [key]: value }));
  async function save() {
    if (!apiClient || !session) return;
    if (!profile.full_name || !profile.cpf || !profile.phone || !profile.cep || !profile.street || !profile.number || !profile.neighborhood || !profile.city || !profile.state) { setMessage("Preencha todos os dados cadastrais obrigatórios."); return; }
    const { error } = await apiClient.from("profiles").upsert({ id: session.user.id, ...profile });
    setMessage(error ? "Não foi possível salvar suas informações." : "Perfil atualizado com sucesso.");
    if (!error) navigate("user-profile");
  }
  if (role === "organization") return <OrganizationProfile />;
  const name = profile.full_name || session?.user.user_metadata.full_name || "Seu perfil";
  const address = [profile.street && `${profile.street}, ${profile.number}`, profile.neighborhood, profile.city, profile.state, profile.cep && `CEP ${profile.cep}`].filter(Boolean).join(" · ");
  return <div className="size-full overflow-y-auto bg-[#fdf6ee]"><div className="max-w-4xl mx-auto px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
    <div className="overflow-hidden rounded-2xl border border-[#e0cdb8] bg-white"><div className="h-28 sm:h-36 bg-gradient-to-r from-[#c4582a] via-[#e8a842] to-[#3d6b4f]" /><div className="px-4 pb-6 sm:px-8 sm:pb-8">
      <div className="mb-6 -mt-12 flex flex-col items-start gap-4 sm:flex-row sm:items-end sm:justify-between"><img src={profile.avatar_url || "https://images.unsplash.com/photo-1558788353-f76d92427f16?w=160&h=160&fit=crop&auto=format"} alt={name} className="h-20 w-20 rounded-2xl border-4 border-white object-cover shadow-lg sm:h-24 sm:w-24" />{!editingMode && <button onClick={() => navigate("edit-profile")} className="rounded-xl bg-[#c4582a] px-5 py-2.5 text-sm font-bold text-white">Editar perfil</button>}</div>
      <h1 className="text-2xl font-bold text-[#2d1f0f] sm:text-3xl" style={{ fontFamily: "'Fraunces', serif" }}>{editingMode ? "Editar perfil" : name}</h1><p className="mt-1 text-sm text-[#7a5c3f]">{editingMode ? "Atualize seus dados e salve para voltar ao seu perfil." : profile.city ? `📍 ${profile.city}, ${profile.state}` : "Complete seus dados cadastrais."}</p>
      {message && <p className="mt-4 text-sm text-[#3d6b4f]" role="status">{message}</p>}
      {editingMode ? <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">{([['full_name','Nome completo *'], ['cpf','CPF *'], ['phone','Telefone *'], ['whatsapp','WhatsApp'], ['cep','CEP *'], ['street','Rua *'], ['number','Número *'], ['neighborhood','Bairro *'], ['city','Cidade *'], ['state','Estado *']] as [keyof Profile, string][]).map(([key, label]) => <Field key={key} label={label} value={profile[key]} onChange={(value) => update(key, value)} />)}<ImageUpload current={profile.avatar_url} onUploaded={(url) => update("avatar_url", url)} /><p className="text-xs text-[#7a5c3f] sm:col-span-2">O e-mail da conta é gerenciado pela autenticação: {session?.user.email}</p><div className="flex gap-3 sm:col-span-2"><button onClick={() => void save()} className="rounded-xl bg-[#c4582a] px-5 py-3 text-sm font-bold text-white">Salvar alterações</button><button onClick={() => navigate("user-profile")} className="rounded-xl border border-[#e0cdb8] px-5 py-3 text-sm font-bold text-[#7a5c3f]">Cancelar</button></div></div> : <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2"><Info label="E-mail" value={session?.user.email ?? ""} /><Info label="CPF" value={profile.cpf || "Não informado"} /><Info label="Telefone / WhatsApp" value={profile.whatsapp || profile.phone || "Não informado"} /><Info label="Endereço" value={address || "Não informado"} /></div>}
    </div></div>
    {!editingMode && <><div className="mt-6 rounded-2xl bg-[#fde8da] p-5 sm:p-6"><h2 className="font-bold text-[#2d1f0f]">Histórico de adoções</h2><p className="mt-1 text-sm text-[#7a5c3f]">Você tem {adoptionCount} solicitação(ões) de adoção.</p></div>
    <div className="mt-6 flex flex-col gap-4 rounded-2xl bg-[#d8f0e5] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"><div><h2 className="font-bold text-[#2d1f0f]">Seus pets e prontuários</h2><p className="mt-1 text-sm text-[#7a5c3f]">Mantenha o histórico médico dos seus animais sempre atualizado.</p></div><button onClick={() => navigate("medical-history")} className="shrink-0 rounded-xl bg-[#3d6b4f] px-4 py-2.5 text-sm font-bold text-white">Abrir prontuários</button></div></>}
  </div></div>;
}
function Field({ label, value, onChange }: { label: string; value: string; onChange(value: string): void }) { return <label className="min-w-0 text-sm font-bold text-[#7a5c3f]">{label}<input required={label.includes("*")} value={value} onChange={(event) => onChange(event.target.value)} className="mt-1.5 w-full rounded-xl border border-[#e0cdb8] px-3 py-2.5 font-normal text-[#2d1f0f] outline-none" /></label>; }
function Info({ label, value }: { label: string; value: string }) { return <div className="min-w-0 rounded-xl bg-[#fdf6ee] p-4"><p className="text-xs font-bold uppercase text-[#b8987a]">{label}</p><p className="mt-1 break-words text-[#2d1f0f]">{value}</p></div>; }
function ImageUpload({ current, onUploaded }: { current: string; onUploaded(url: string): void }) { const [notice, setNotice] = useState(""); return <label className="min-w-0 text-sm font-bold text-[#7a5c3f]">Foto de perfil<input type="file" accept="image/*" className="mt-1 block w-full text-sm font-normal" onChange={async (event) => { const file = event.target.files?.[0]; if (!file) return; try { setNotice("Enviando imagem…"); onUploaded(await uploadImage(file, "profiles")); setNotice("Imagem enviada."); } catch (error) { setNotice(error instanceof Error ? error.message : "Falha ao enviar imagem."); } }} />{current && <img src={current} alt="Prévia" className="mt-2 h-16 w-16 rounded-xl object-cover" />}{notice && <span className="mt-1 block text-xs font-normal">{notice}</span>}</label>; }
