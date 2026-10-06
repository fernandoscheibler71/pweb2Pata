import { useState } from "react";
import type { Screen } from "../App";

const abuseTypes = [
  { icon: "🔗", label: "Animal acorrentado" },
  { icon: "🍽️", label: "Sem alimentação" },
  { icon: "🏥", label: "Sem cuidados médicos" },
  { icon: "🤕", label: "Sinais de maus-tratos físicos" },
  { icon: "🏚️", label: "Abandono em local inapropriado" },
  { icon: "🌡️", label: "Exposição a temperatura extrema" },
  { icon: "🐕", label: "Confinamento inadequado" },
  { icon: "💊", label: "Envenenamento suspeito" },
];

export default function AbuseReport({ navigate }: { navigate: (s: Screen) => void }) {
  const [step, setStep] = useState<"form" | "sent">("form");
  const [selected, setSelected] = useState<string[]>([]);
  const [description, setDescription] = useState("");
  const [anonymous, setAnonymous] = useState(false);

  const toggle = (l: string) =>
    setSelected((s) => (s.includes(l) ? s.filter((x) => x !== l) : [...s, l]));

  if (step === "sent") {
    return (
      <div className="size-full flex items-center justify-center bg-[#fdf6ee]">
        <div className="max-w-lg w-full mx-auto px-8 text-center">
          <div className="w-24 h-24 bg-[#fde0dd] rounded-full flex items-center justify-center text-5xl mb-6 mx-auto">🚨</div>
          <h1 className="text-[#2d1f0f] text-3xl font-bold mb-3" style={{ fontFamily: "'Fraunces', serif" }}>Denúncia enviada!</h1>
          <p className="text-[#7a5c3f] text-sm leading-relaxed mb-6">
            Sua denúncia foi encaminhada à Delegacia de Proteção Animal e à ONG mais próxima. Obrigada por proteger!
          </p>
          <div className="bg-white border border-[#e0cdb8] rounded-2xl p-5 mb-6 grid grid-cols-3 gap-4">
            {[{ l: "Protocolo", v: "#DEN-2024-00342" }, { l: "Status", v: "Em análise" }, { l: "Prazo", v: "48h úteis" }].map((r) => (
              <div key={r.l} className="text-center">
                <p className="text-[#b8987a] text-xs">{r.l}</p>
                <p className="text-[#2d1f0f] font-bold text-sm mt-0.5">{r.v}</p>
              </div>
            ))}
          </div>
          <div className="bg-[#fef3d8] border border-[#e8a842]/40 rounded-xl p-4 mb-6 text-left">
            <p className="text-sm text-[#2d1f0f] leading-relaxed">
              <span className="font-bold">Em caso de emergência</span>, ligue diretamente:
              <span className="text-[#c4582a] font-bold"> (11) 3392-0000</span>
            </p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setStep("form")} className="flex-1 bg-[#efe5d8] text-[#2d1f0f] font-bold py-3 rounded-xl text-sm">Nova denúncia</button>
            <button onClick={() => navigate("home")} className="flex-1 bg-[#c4582a] text-white font-bold py-3 rounded-xl text-sm">Voltar ao início</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="size-full overflow-y-auto bg-[#fdf6ee]">
      <div className="max-w-5xl mx-auto px-8 py-8">

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-14 h-14 bg-[#fde0dd] rounded-2xl flex items-center justify-center text-2xl">🚨</div>
          <div>
            <h1 className="text-[#2d1f0f] text-3xl font-bold" style={{ fontFamily: "'Fraunces', serif" }}>Denunciar maus-tratos</h1>
            <p className="text-[#7a5c3f] text-sm mt-0.5">Anônimo e confidencial — proteja quem não tem voz</p>
          </div>
          <div className="ml-auto bg-[#c4582a] rounded-2xl px-5 py-3 flex items-center gap-3">
            <span className="text-2xl">📞</span>
            <div>
              <p className="text-white font-bold text-sm">Emergência?</p>
              <p className="text-white/70 text-xs">(11) 3392-0000</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-8">
          {/* Form */}
          <div className="col-span-2 space-y-6">
            {/* Abuse types */}
            <div className="bg-white rounded-2xl border border-[#e0cdb8] p-6">
              <h2 className="text-[#2d1f0f] font-bold mb-4">Tipo de maus-tratos</h2>
              <div className="grid grid-cols-2 gap-3">
                {abuseTypes.map((t) => (
                  <button
                    key={t.label}
                    onClick={() => toggle(t.label)}
                    className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                      selected.includes(t.label) ? "bg-[#fde0dd] border-[#c4582a] text-[#c4582a]" : "bg-[#fdf6ee] border-[#e0cdb8] text-[#7a5c3f] hover:border-[#c4582a]/40"
                    }`}
                  >
                    <span className="text-xl">{t.icon}</span>
                    <span className="text-sm font-bold">{t.label}</span>
                    {selected.includes(t.label) && <span className="ml-auto text-[#c4582a] font-bold">✓</span>}
                  </button>
                ))}
              </div>
            </div>

            {/* Location + description */}
            <div className="bg-white rounded-2xl border border-[#e0cdb8] p-6 space-y-4">
              <h2 className="text-[#2d1f0f] font-bold">Detalhes da ocorrência</h2>
              <div>
                <label className="block text-[#2d1f0f] text-sm font-bold mb-1.5">Local do ocorrido</label>
                <div className="flex gap-2">
                  <input
                    placeholder="Endereço ou ponto de referência"
                    className="flex-1 bg-[#fdf6ee] border border-[#e0cdb8] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#c4582a] placeholder:text-[#b8987a]"
                  />
                  <button className="w-12 h-12 bg-[#efe5d8] rounded-xl flex items-center justify-center text-lg border border-[#e0cdb8] hover:bg-[#e0cdb8] transition-all">📍</button>
                </div>
              </div>
              <div>
                <label className="block text-[#2d1f0f] text-sm font-bold mb-1.5">Descrição detalhada</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descreva com detalhes o que observou: data, hora, características do animal e do responsável..."
                  rows={5}
                  className="w-full bg-[#fdf6ee] border border-[#e0cdb8] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#c4582a] resize-none placeholder:text-[#b8987a]"
                />
              </div>
              <div>
                <label className="block text-[#2d1f0f] text-sm font-bold mb-1.5">Foto ou vídeo (opcional)</label>
                <div className="h-28 border-2 border-dashed border-[#e0cdb8] rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-[#c4582a] hover:bg-[#fde8da]/30 transition-all">
                  <span className="text-3xl">📷</span>
                  <span className="text-[#b8987a] text-sm">Clique para adicionar evidências</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setStep("sent")}
              className="w-full bg-[#c4582a] text-white font-bold py-4 rounded-xl hover:bg-[#a8461f] transition-all active:scale-95 text-base"
            >
              Enviar denúncia 🚨
            </button>
          </div>

          {/* Right sidebar */}
          <div className="space-y-4">
            {/* Anonymous toggle */}
            <div className="bg-white rounded-2xl border border-[#e0cdb8] p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-[#2d1f0f] font-bold text-sm">Denúncia anônima</p>
                  <p className="text-[#7a5c3f] text-xs mt-0.5">Seus dados não serão compartilhados</p>
                </div>
                <button
                  onClick={() => setAnonymous(!anonymous)}
                  className={`w-12 h-6 rounded-full transition-all relative ${anonymous ? "bg-[#c4582a]" : "bg-[#e0cdb8]"}`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all shadow ${anonymous ? "left-6" : "left-0.5"}`} />
                </button>
              </div>
              <p className="text-[#b8987a] text-xs leading-relaxed">
                {anonymous ? "✓ Você não será identificado(a) nesta denúncia." : "Seus dados serão usados apenas internamente."}
              </p>
            </div>

            {/* Contacts */}
            <div className="bg-white rounded-2xl border border-[#e0cdb8] p-5">
              <p className="text-[#2d1f0f] font-bold text-sm mb-3">Contatos de emergência</p>
              {[
                { label: "Delegacia de Proteção Animal SP", phone: "(11) 3392-0000", icon: "🚔" },
                { label: "IBAMA — Fauna Silvestre", phone: "0800 61 8080", icon: "🦜" },
                { label: "ONG Patinhas SP", phone: "(11) 99999-0001", icon: "🐾" },
              ].map((c) => (
                <div key={c.label} className="flex items-start gap-3 py-2.5 border-b border-[#e0cdb8] last:border-0">
                  <span className="text-lg">{c.icon}</span>
                  <div>
                    <p className="text-[#2d1f0f] text-xs font-bold">{c.label}</p>
                    <p className="text-[#c4582a] text-xs font-bold mt-0.5">{c.phone}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-[#fef3d8] border border-[#e8a842]/40 rounded-2xl p-4">
              <p className="text-[#2d1f0f] font-bold text-sm mb-1">⚖️ Lei de Proteção Animal</p>
              <p className="text-[#7a5c3f] text-xs leading-relaxed">
                Maus-tratos a animais é crime previsto na Lei nº 9.605/98, com pena de 2 a 5 anos de reclusão.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
