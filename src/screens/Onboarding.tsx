import { useEffect, useState } from "react";
import type { Screen } from "../App";
import { useAuth } from "../contexts/AuthContext";
import type { UserRole } from "../contexts/AuthContext";
import { apiClient } from "../lib/apiClient";

const slides = [
  {
    img: "https://images.unsplash.com/photo-1653356163413-4cfd4d14ab1b?w=900&h=1000&fit=crop&auto=format",
    title: "Adote com amor",
    sub: "Milhares de animais esperam por um lar. Encontre seu novo melhor amigo perto de você.",
    accent: "#c4582a",
  },
  {
    img: "https://images.unsplash.com/photo-1770836037793-95bdbf190f71?w=900&h=1000&fit=crop&auto=format",
    title: "Cuide com facilidade",
    sub: "Prontuário digital, clínicas próximas e lembretes de vacina no mesmo lugar.",
    accent: "#3d6b4f",
  },
  {
    img: "https://images.unsplash.com/photo-1653356162039-1236e4656c16?w=900&h=1000&fit=crop&auto=format",
    title: "ONGs mais próximas",
    sub: "Mantenha contato com a ONG após a adoção e acompanhe o bem-estar do seu animal.",
    accent: "#e8a842",
  },
];

export default function Onboarding({ navigate }: { navigate: (s: Screen) => void }) {
  const [step, setStep] = useState(0);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [role, setRole] = useState<UserRole>("adopter");
  const [feedback, setFeedback] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [stats, setStats] = useState({ pets: 0, organizations: 0, adopted: 0 });
  const { signIn, signUp, resetPassword } = useAuth();
  const slide = slides[step];

  useEffect(() => {
    if (!apiClient) return;
    void Promise.all([
      apiClient.from("pets").select("id", { count: "exact", head: true }).eq("status", "available"),
      apiClient.from("organizations").select("id", { count: "exact", head: true }),
      apiClient.from("pets").select("id", { count: "exact", head: true }).eq("status", "adopted"),
    ]).then(([pets, organizations, adopted]) => setStats({ pets: pets.count ?? 0, organizations: organizations.count ?? 0, adopted: adopted.count ?? 0 }));
  }, []);

  async function handleSubmit() {
    if (!email || password.length < 6) { setFeedback("Informe um e-mail válido e uma senha com pelo menos 6 caracteres."); return; }
    if (mode === "signup" && !fullName.trim()) { setFeedback("Informe seu nome para criar a conta."); return; }
    setSubmitting(true);
    const error = mode === "signin" ? await signIn(email, password) : await signUp(email, password, fullName.trim(), role);
    setSubmitting(false);
    setFeedback(error ?? (mode === "signup" ? "Conta criada. Confira seu e-mail para confirmar o cadastro." : ""));
  }

  async function recoverAccess() {
    if (!email) { setFeedback("Informe seu e-mail para receber o link de recuperação."); return; }
    setSubmitting(true);
    const error = await resetPassword(email);
    setSubmitting(false);
    setFeedback(error ?? "Enviamos um link de recuperação para seu e-mail.");
  }

  return (
    <div className="min-h-dvh flex overflow-hidden bg-[#fdf6ee]">
      {/* Left — image panel */}
      <div className="relative hidden w-1/2 flex-shrink-0 overflow-hidden lg:block">
        <img
          src={slide.img}
          alt={slide.title}
          className="absolute inset-0 w-full h-full object-cover transition-all duration-700"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#2d1f0f]/70 via-[#2d1f0f]/30 to-transparent" />

        {/* Logo */}
        <div className="absolute top-10 left-10 flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center text-xl">🐾</div>
          <span className="text-white font-bold text-2xl" style={{ fontFamily: "'Fraunces', serif" }}>PataAmiga</span>
        </div>

        {/* Tagline */}
        <div className="absolute bottom-12 left-10 right-10">
          <p className="text-white/60 text-sm font-semibold mb-2">Passo {step + 1} de {slides.length}</p>
          <h2 className="text-white text-4xl font-bold leading-tight mb-3" style={{ fontFamily: "'Fraunces', serif" }}>
            {slide.title}
          </h2>
          <p className="text-white/80 text-base leading-relaxed">{slide.sub}</p>

          {/* Dots */}
          <div className="flex gap-2 mt-6">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                className={`h-1.5 rounded-full transition-all ${i === step ? "w-8 bg-white" : "w-4 bg-white/40"}`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Right — auth panel */}
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-8 sm:px-8 lg:px-16">
        <div className="w-full max-w-sm">
          <h1 className="text-[#2d1f0f] text-3xl font-bold mb-2" style={{ fontFamily: "'Fraunces', serif" }}>
            Bem-vindo(a) 🐾
          </h1>
          <p className="text-[#7a5c3f] text-sm mb-8">
            Crie sua conta ou entre para começar a transformar vidas.
          </p>

          <div className="space-y-3 mb-6">
            {mode === "signup" && <input
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              type="text"
              placeholder="Nome completo"
              className="w-full bg-white border border-[#e0cdb8] rounded-xl px-4 py-3.5 text-sm text-[#2d1f0f] outline-none focus:border-[#c4582a] transition-colors placeholder:text-[#b8987a]"
            />}
            {mode === "signup" && <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setRole("adopter")} className={`rounded-xl border p-3 text-left text-xs font-bold ${role === "adopter" ? "border-[#c4582a] bg-[#fde8da] text-[#c4582a]" : "border-[#e0cdb8] text-[#7a5c3f]"}`}>🐾 Sou adotante</button>
              <button type="button" onClick={() => setRole("organization")} className={`rounded-xl border p-3 text-left text-xs font-bold ${role === "organization" ? "border-[#3d6b4f] bg-[#d8f0e5] text-[#3d6b4f]" : "border-[#e0cdb8] text-[#7a5c3f]"}`}>🤝 Represento uma ONG</button>
            </div>}
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              placeholder="E-mail"
              className="w-full bg-white border border-[#e0cdb8] rounded-xl px-4 py-3.5 text-sm text-[#2d1f0f] outline-none focus:border-[#c4582a] transition-colors placeholder:text-[#b8987a]"
            />
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              placeholder="Senha"
              className="w-full bg-white border border-[#e0cdb8] rounded-xl px-4 py-3.5 text-sm text-[#2d1f0f] outline-none focus:border-[#c4582a] transition-colors placeholder:text-[#b8987a]"
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full bg-[#c4582a] text-white font-bold py-4 rounded-xl mb-3 hover:bg-[#a8461f] transition-all active:scale-95 text-sm"
          >
            {submitting ? "Aguarde…" : mode === "signin" ? "Entrar" : "Criar conta gratuita"}
          </button>
          {mode === "signin" && <button type="button" onClick={() => void recoverAccess()} disabled={submitting} className="mt-3 w-full text-center text-xs font-bold text-[#c4582a] hover:underline">Esqueci minha senha</button>}
          <button
            onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setFeedback(""); }}
            className="w-full bg-[#efe5d8] text-[#2d1f0f] font-bold py-4 rounded-xl hover:bg-[#e0cdb8] transition-all text-sm"
          >
            {mode === "signin" ? "Criar conta gratuita" : "Já tenho uma conta"}
          </button>
          {feedback && <p className="mt-3 text-center text-xs text-[#c4582a]" role="alert">{feedback}</p>}

          <p className="text-center text-[#b8987a] text-xs mt-6">
            Ao continuar, você concorda com os{" "}
            <span className="text-[#c4582a] cursor-pointer">Termos de Uso</span> e a{" "}
            <span className="text-[#c4582a] cursor-pointer">Política de Privacidade</span>.
          </p>

          <div className="mt-10 grid grid-cols-3 gap-4 text-center">
            {[[new Intl.NumberFormat("pt-BR").format(stats.pets), "animais"], [new Intl.NumberFormat("pt-BR").format(stats.organizations), "ONGs"], [new Intl.NumberFormat("pt-BR").format(stats.adopted), "adotados"]].map(([n, l]) => (
              <div key={l} className="bg-[#efe5d8] rounded-xl p-3">
                <p className="text-[#c4582a] font-bold text-lg" style={{ fontFamily: "'Fraunces', serif" }}>{n}</p>
                <p className="text-[#7a5c3f] text-xs">{l}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
