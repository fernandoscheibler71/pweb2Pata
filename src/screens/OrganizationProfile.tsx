import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { apiClient } from "../lib/apiClient";
import { uploadImage } from "../lib/uploads";

type Form = { name: string; cnpj: string; email: string; phone: string; cep: string; address: string; neighborhood: string; city: string; state: string; website: string; description: string; logo_url: string };
const empty: Form = { name: "", cnpj: "", email: "", phone: "", cep: "", address: "", neighborhood: "", city: "", state: "", website: "", description: "", logo_url: "" };
const fields: [keyof Form, string, boolean][] = [['name','Nome da instituição/fantasia',true], ['cnpj','CNPJ',true], ['email','E-mail de contato',true], ['phone','Telefone',true], ['cep','CEP',true], ['address','Rua e número',true], ['neighborhood','Bairro',true], ['city','Cidade',true], ['state','Estado',true], ['website','Site ou rede social',false]];

export default function OrganizationProfile() {
  const { session, role } = useAuth();
  const [form, setForm] = useState<Form>(empty);
  const [organizationId, setOrganizationId] = useState("");
  const [editing, setEditing] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!session || role !== "organization") return;
    void apiClient.from("organizations").select("id, name, cnpj, email, phone, cep, address, neighborhood, city, state, website, description, logo_url").eq("owner_id", session.user.id).maybeSingle().then(({ data }) => {
      if (data) { setOrganizationId(data.id); setForm({ ...empty, ...data }); }
      else setEditing(true);
      setLoaded(true);
    });
  }, [role, session]);

  if (role !== "organization") return <div className="p-6 text-[#7a5c3f]">Esta área é exclusiva para contas de ONG.</div>;
  const set = (key: keyof Form, value: string) => setForm((current) => ({ ...current, [key]: value }));
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!session) return;
    const payload = { ...form, owner_id: session.user.id };
    const result = organizationId ? await apiClient.from("organizations").update(payload).eq("id", organizationId).select("id").single() : await apiClient.from("organizations").insert(payload).select("id").single();
    if (result.error) { setNotice(result.error.message); return; }
    setOrganizationId(result.data.id);
    setEditing(false);
    setNotice("Dados da ONG salvos com sucesso.");
  }
  const address = [form.address, form.neighborhood, form.city && `${form.city}${form.state ? `, ${form.state}` : ""}`, form.cep && `CEP ${form.cep}`].filter(Boolean).join(" · ");
  if (!loaded) return <div className="p-8 text-[#7a5c3f]">Carregando dados da ONG…</div>;

  return <div className="size-full overflow-y-auto bg-[#fdf6ee]"><div className="mx-auto max-w-4xl px-4 py-5 sm:p-8">
    <div className="overflow-hidden rounded-2xl border border-[#e0cdb8] bg-white"><div className="h-28 bg-gradient-to-r from-[#3d6b4f] via-[#79ad8b] to-[#e8a842] sm:h-36" />
      <div className="px-4 pb-6 sm:px-8 sm:pb-8"><div className="mb-6 -mt-12 flex flex-col items-start gap-4 sm:flex-row sm:items-end sm:justify-between">{form.logo_url ? <img src={form.logo_url} alt={form.name || "Logo da ONG"} className="h-20 w-20 rounded-2xl border-4 border-white object-cover bg-white shadow-lg sm:h-24 sm:w-24" /> : <div className="grid h-20 w-20 place-items-center rounded-2xl border-4 border-white bg-white text-4xl shadow-lg sm:h-24 sm:w-24">🐾</div>}{!editing && <button onClick={() => setEditing(true)} className="rounded-xl bg-[#3d6b4f] px-5 py-2.5 text-sm font-bold text-white">Editar dados da ONG</button>}</div>
        <p className="text-sm font-bold text-[#3d6b4f]">ONG parceira</p><h1 className="mt-1 text-2xl font-bold text-[#2d1f0f] sm:text-3xl" style={{ fontFamily: "'Fraunces', serif" }}>{editing ? (organizationId ? "Editar minha ONG" : "Cadastrar minha ONG") : form.name}</h1><p className="mt-1 text-sm text-[#7a5c3f]">{form.city ? `📍 ${form.city}${form.state ? `, ${form.state}` : ""}` : "Complete os dados da sua instituição."}</p>{notice && <p className="mt-4 text-sm text-[#3d6b4f]" role="status">{notice}</p>}
        {editing ? <form onSubmit={save} className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">{fields.map(([key,label,required]) => <label key={key} className="min-w-0 text-sm font-bold text-[#7a5c3f]">{label}{required ? " *" : ""}<input required={required} value={form[key]} onChange={(event) => set(key, event.target.value)} className="mt-1.5 w-full rounded-xl border border-[#e0cdb8] px-3 py-2.5 font-normal text-[#2d1f0f] outline-none" /></label>)}<label className="min-w-0 text-sm font-bold text-[#7a5c3f]">Logo da instituição<input type="file" accept="image/*" className="mt-1 block w-full text-sm font-normal" onChange={async (event) => { const file = event.target.files?.[0]; if (!file) return; try { setNotice("Enviando logo…"); set("logo_url", await uploadImage(file, "organizations")); setNotice("Logo enviado. Salve para concluir."); } catch (error) { setNotice(error instanceof Error ? error.message : "Falha ao enviar logo."); } }} /></label><label className="text-sm font-bold text-[#7a5c3f] sm:col-span-2">Sobre a ONG *<textarea required rows={5} value={form.description} onChange={(event) => set("description", event.target.value)} className="mt-1.5 w-full rounded-xl border border-[#e0cdb8] px-3 py-2.5 font-normal text-[#2d1f0f] outline-none" /></label><div className="flex gap-3 sm:col-span-2"><button className="rounded-xl bg-[#3d6b4f] px-5 py-3 text-sm font-bold text-white">Salvar dados</button>{organizationId && <button type="button" onClick={() => setEditing(false)} className="rounded-xl border border-[#e0cdb8] px-5 py-3 text-sm font-bold text-[#7a5c3f]">Cancelar</button>}</div></form> : <div className="mt-8"><div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><Info label="E-mail" value={form.email || "Não informado"} /><Info label="Telefone" value={form.phone || "Não informado"} /><Info label="CNPJ" value={form.cnpj || "Não informado"} /><Info label="Endereço" value={address || "Não informado"} />{form.website && <Info label="Site ou rede social" value={form.website} />}</div><div className="mt-4 rounded-xl bg-[#fdf6ee] p-4"><p className="text-xs font-bold uppercase text-[#b8987a]">Sobre a ONG</p><p className="mt-1 whitespace-pre-line text-[#2d1f0f]">{form.description || "Apresente o trabalho da sua organização para a comunidade."}</p></div></div>}
      </div></div>
  </div></div>;
}

function Info({ label, value }: { label: string; value: string }) { return <div className="min-w-0 rounded-xl bg-[#fdf6ee] p-4"><p className="text-xs font-bold uppercase text-[#b8987a]">{label}</p><p className="mt-1 break-words text-[#2d1f0f]">{value}</p></div>; }
