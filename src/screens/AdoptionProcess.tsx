import { useState } from "react";
import type { Screen } from "../App";
import { submitAdoptionRequest } from "../lib/animals";

const steps = [
  { id: 1, title: "Dados pessoais", icon: "👤" },
  { id: 2, title: "Sua moradia", icon: "🏠" },
  { id: 3, title: "Experiência com pets", icon: "🐾" },
  { id: 4, title: "Confirmação", icon: "✅" },
];

export default function AdoptionProcess({ navigate, animalId }: { navigate: (s: Screen, id?: string) => void; animalId: string }) {
  const [step, setStep] = useState(1);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "", cpf: "", phone: "", email: "",
    houseType: "", yard: "",
    hasPets: "", reason: "",
  });

  async function submit() {
    if (!animalId) { setError("Selecione um animal antes de iniciar a adoção."); return; }
    setSubmitting(true);
    setError("");
    try {
      await submitAdoptionRequest(animalId, [
        `Nome: ${form.name}`,
        `CPF: ${form.cpf}`,
        `Telefone: ${form.phone}`,
        `E-mail: ${form.email}`,
        `Moradia: ${form.houseType}; quintal: ${form.yard}`,
        `Experiência com pets: ${form.hasPets}`,
        `Motivação: ${form.reason}`,
      ].join("\n"));
      setDone(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível enviar a solicitação.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="size-full flex items-center justify-center bg-[#fdf6ee]">
        <div className="max-w-md w-full mx-auto px-8 text-center">
          <div className="w-24 h-24 bg-[#d8f0e5] rounded-full flex items-center justify-center text-5xl mb-6 mx-auto">🎉</div>
          <h1 className="text-[#2d1f0f] text-3xl font-bold mb-3" style={{ fontFamily: "'Fraunces', serif" }}>Solicitação enviada!</h1>
          <p className="text-[#7a5c3f] text-sm leading-relaxed mb-8">
            A ONG Patinhas SP vai analisar seu perfil e entrar em contato em até 3 dias úteis.
          </p>
          <div className="bg-white rounded-2xl border border-[#e0cdb8] p-5 mb-6 text-left">
            <p className="text-[#b8987a] text-xs mb-1">Número do protocolo</p>
            <p className="text-[#2d1f0f] font-bold font-mono text-xl">#ADO-2024-08741</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => navigate("chat")} className="flex-1 bg-[#efe5d8] text-[#2d1f0f] font-bold py-3 rounded-xl text-sm">
              💬 Mensagens
            </button>
            <button onClick={() => navigate("home")} className="flex-1 bg-[#c4582a] text-white font-bold py-3 rounded-xl text-sm">
              Voltar ao início
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="size-full overflow-y-auto bg-[#fdf6ee]">
      <div className="max-w-4xl mx-auto px-8 py-8">

        {/* Header */}
        <button onClick={() => step > 1 ? setStep(step - 1) : navigate("animal-profile")} className="text-[#c4582a] font-bold text-sm mb-6 flex items-center gap-1 hover:gap-2 transition-all">
          ← Voltar
        </button>
        <h1 className="text-[#2d1f0f] text-3xl font-bold mb-1" style={{ fontFamily: "'Fraunces', serif" }}>
          Processo de adoção
        </h1>
        <p className="text-[#7a5c3f] text-sm mb-8">Adotando: <strong>Mel</strong> · ONG Patinhas SP</p>

        {/* Step indicators */}
        <div className="flex items-center gap-0 mb-10">
          {steps.map((s, i) => (
            <div key={s.id} className="flex items-center flex-1">
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-base font-bold transition-all ${
                    s.id < step ? "bg-[#c4582a] text-white"
                    : s.id === step ? "bg-[#fde8da] border-2 border-[#c4582a] text-[#c4582a]"
                    : "bg-[#efe5d8] text-[#b8987a]"
                  }`}
                >
                  {s.id < step ? "✓" : s.icon}
                </div>
                <p className={`text-xs font-bold text-center whitespace-nowrap ${s.id === step ? "text-[#c4582a]" : "text-[#b8987a]"}`}>
                  {s.title}
                </p>
              </div>
              {i < steps.length - 1 && (
                <div className={`flex-1 h-0.5 mx-2 mb-4 rounded-full ${s.id < step ? "bg-[#c4582a]" : "bg-[#e0cdb8]"}`} />
              )}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-8">
          {/* Form */}
          <div className="col-span-2 bg-white rounded-2xl border border-[#e0cdb8] p-8">
            <h2 className="text-[#2d1f0f] font-bold text-lg mb-6" style={{ fontFamily: "'Fraunces', serif" }}>
              {steps[step - 1].icon} {steps[step - 1].title}
            </h2>

            {step === 1 && (
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "Nome completo", key: "name", placeholder: "Digite seu nome completo", full: true },
                  { label: "CPF", key: "cpf", placeholder: "000.000.000-00" },
                  { label: "Telefone / WhatsApp", key: "phone", placeholder: "(11) 99999-9999" },
                  { label: "E-mail", key: "email", placeholder: "voce@exemplo.com", full: true },
                ].map((f) => (
                  <div key={f.key} className={f.full ? "col-span-2" : ""}>
                    <label className="block text-[#2d1f0f] text-sm font-bold mb-1.5">{f.label}</label>
                    <input
                      value={form[f.key as keyof typeof form]}
                      onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                      placeholder={f.placeholder}
                      className="w-full bg-[#fdf6ee] border border-[#e0cdb8] rounded-xl px-4 py-3 text-sm text-[#2d1f0f] outline-none focus:border-[#c4582a] transition-colors placeholder:text-[#b8987a]"
                    />
                  </div>
                ))}
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <div>
                  <label className="block text-[#2d1f0f] text-sm font-bold mb-3">Tipo de residência</label>
                  <div className="grid grid-cols-3 gap-3">
                    {["Casa", "Apartamento", "Sítio"].map((t) => (
                      <button key={t} onClick={() => setForm({ ...form, houseType: t })}
                        className={`py-3 rounded-xl text-sm font-bold border transition-all ${form.houseType === t ? "bg-[#c4582a] text-white border-[#c4582a]" : "bg-[#fdf6ee] text-[#7a5c3f] border-[#e0cdb8] hover:border-[#c4582a]"}`}>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-[#2d1f0f] text-sm font-bold mb-3">Possui quintal ou área externa?</label>
                  <div className="grid grid-cols-2 gap-3">
                    {["Sim", "Não"].map((t) => (
                      <button key={t} onClick={() => setForm({ ...form, yard: t })}
                        className={`py-3 rounded-xl text-sm font-bold border transition-all ${form.yard === t ? "bg-[#c4582a] text-white border-[#c4582a]" : "bg-[#fdf6ee] text-[#7a5c3f] border-[#e0cdb8] hover:border-[#c4582a]"}`}>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-[#2d1f0f] text-sm font-bold mb-1.5">CEP da residência</label>
                  <input placeholder="00000-000" className="w-full bg-[#fdf6ee] border border-[#e0cdb8] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#c4582a] placeholder:text-[#b8987a]" />
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                <div>
                  <label className="block text-[#2d1f0f] text-sm font-bold mb-3">Tem ou já teve animais?</label>
                  <div className="grid grid-cols-3 gap-3">
                    {["Sim, tenho", "Já tive", "Primeira vez"].map((t) => (
                      <button key={t} onClick={() => setForm({ ...form, hasPets: t })}
                        className={`py-3 rounded-xl text-sm font-bold border transition-all ${form.hasPets === t ? "bg-[#c4582a] text-white border-[#c4582a]" : "bg-[#fdf6ee] text-[#7a5c3f] border-[#e0cdb8] hover:border-[#c4582a]"}`}>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-[#2d1f0f] text-sm font-bold mb-1.5">Por que deseja adotar?</label>
                  <textarea
                    value={form.reason}
                    onChange={(e) => setForm({ ...form, reason: e.target.value })}
                    placeholder="Conte um pouco sobre sua motivação..."
                    rows={5}
                    className="w-full bg-[#fdf6ee] border border-[#e0cdb8] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#c4582a] resize-none placeholder:text-[#b8987a]"
                  />
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { l: "Nome", v: form.name || "Não informado" },
                    { l: "Telefone", v: form.phone || "(11) 98765-4321" },
                    { l: "Moradia", v: form.houseType || "Casa" },
                    { l: "Quintal", v: form.yard || "Sim" },
                    { l: "Experiência", v: form.hasPets || "Sim, tenho" },
                    { l: "E-mail", v: form.email || "Não informado" },
                  ].map((r) => (
                    <div key={r.l} className="bg-[#fdf6ee] rounded-xl p-3">
                      <p className="text-[#b8987a] text-xs">{r.l}</p>
                      <p className="text-[#2d1f0f] font-bold text-sm mt-0.5">{r.v}</p>
                    </div>
                  ))}
                </div>
                <div className="bg-[#fef3d8] border border-[#e8a842]/40 rounded-xl p-4 flex gap-3">
                  <span>ℹ️</span>
                  <p className="text-[#2d1f0f] text-sm leading-relaxed">
                    Ao enviar, você concorda em receber uma visita domiciliar da ONG e assinar o termo de responsabilidade.
                  </p>
                </div>
              </div>
            )}

            <div className="flex gap-3 mt-8">
              {step > 1 && (
                <button onClick={() => setStep(step - 1)} className="px-6 py-3 bg-[#efe5d8] text-[#2d1f0f] font-bold rounded-xl text-sm hover:bg-[#e0cdb8] transition-all">
                  ← Anterior
                </button>
              )}
              <button
                onClick={() => step < 4 ? setStep(step + 1) : void submit()}
                disabled={submitting}
                className="flex-1 bg-[#c4582a] text-white font-bold py-3 rounded-xl hover:bg-[#a8461f] transition-all text-sm"
              >
                {submitting ? "Enviando…" : step < 4 ? "Continuar →" : "Enviar solicitação 🐾"}
              </button>
            </div>
            {error && <p className="mt-4 text-sm text-[#c4582a]" role="alert">{error}</p>}
          </div>

          {/* Sidebar — animal card */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-[#e0cdb8] overflow-hidden">
              <img src="https://images.unsplash.com/photo-1653356163413-4cfd4d14ab1b?w=400&h=300&fit=crop" alt="Mel" className="w-full h-40 object-cover" />
              <div className="p-4">
                <p className="font-bold text-[#2d1f0f]" style={{ fontFamily: "'Fraunces', serif" }}>Mel</p>
                <p className="text-[#7a5c3f] text-xs">Vira-lata · 2 anos · Fêmea</p>
                <p className="text-[#b8987a] text-xs mt-1">📍 ONG Patinhas SP</p>
              </div>
            </div>
            <div className="bg-[#fde8da] rounded-2xl p-4">
              <p className="text-[#c4582a] font-bold text-sm mb-2">📋 Próximos passos</p>
              <ol className="space-y-1.5">
                {["Análise de perfil (3 dias)", "Entrevista com a ONG", "Visita domiciliar", "Assinatura do termo", "Buscar o animal!"].map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-[#7a5c3f]">
                    <span className="w-4 h-4 rounded-full bg-white text-[#c4582a] font-bold flex items-center justify-center flex-shrink-0 text-[10px]">{i + 1}</span>
                    {s}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
