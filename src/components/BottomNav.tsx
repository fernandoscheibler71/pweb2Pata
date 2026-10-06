import type { Screen } from "../App";
import { useAuth } from "../contexts/AuthContext";

const tabs = [
  { id: "home", icon: "🏠", label: "Início" },
  { id: "adoption-list", icon: "🐾", label: "Adotar" },
  { id: "nearby-map", icon: "📍", label: "Mapa" },
  { id: "vaccination-events", icon: "💉", label: "Vacinas" },
  { id: "chat", icon: "💬", label: "Chat" },
  { id: "medical-history", icon: "📋", label: "Saúde" },
  { id: "abuse-report", icon: "🚨", label: "Denunciar" },
  { id: "user-profile", icon: "👤", label: "Meu Perfil" },
  { id: "my-adoptions", icon: "📋", label: "Minhas adoções" },
] as const;

export default function Sidebar({
  current,
  navigate,
}: {
  current: Screen;
  navigate: (s: Screen) => void;
}) {
  const { signOut, role, profile, session } = useAuth();
  const displayName = profile?.full_name || session?.user.user_metadata.full_name || session?.user.email || "Minha conta";
  return (
    <aside className="app-sidebar w-64 flex-shrink-0 bg-[#fff9f3] border-r border-[#e0cdb8] flex flex-col h-full">
      {/* Logo */}
      <div className="px-6 py-6 border-b border-[#e0cdb8]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#c4582a] rounded-xl flex items-center justify-center text-xl">🐾</div>
          <span className="text-[#2d1f0f] font-bold text-xl" style={{ fontFamily: "'Fraunces', serif" }}>
            PataAmiga
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {tabs.filter((tab) => role !== "organization" || (tab.id !== "user-profile" && tab.id !== "my-adoptions")).map((tab) => {
          const active = current === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => navigate(tab.id as Screen)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all ${
                active
                  ? "bg-[#fde8da] text-[#c4582a]"
                  : "text-[#7a5c3f] hover:bg-[#efe5d8] hover:text-[#2d1f0f]"
              }`}
            >
              <span className="text-xl">{tab.icon}</span>
              <span className="font-semibold text-sm">{tab.label}</span>
              {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#c4582a]" />}
            </button>
          );
        })}
        {role === "organization" && <button onClick={() => navigate("organization-profile")} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left ${current === "organization-profile" ? "bg-[#d8f0e5] text-[#3d6b4f]" : "text-[#7a5c3f] hover:bg-[#efe5d8]"}`}><span className="text-xl">🏢</span><span className="font-semibold text-sm">Minha ONG</span></button>}
        {role === "organization" && <button onClick={() => navigate("organization-dashboard")} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left ${current === "organization-dashboard" ? "bg-[#d8f0e5] text-[#3d6b4f]" : "text-[#7a5c3f] hover:bg-[#efe5d8]"}`}><span className="text-xl">📊</span><span className="font-semibold text-sm">Painel da ONG</span></button>}
        {role === "organization" && <button onClick={() => navigate("organization-adoption-requests")} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left ${current === "organization-adoption-requests" ? "bg-[#d8f0e5] text-[#3d6b4f]" : "text-[#7a5c3f] hover:bg-[#efe5d8]"}`}><span className="text-xl">📋</span><span className="font-semibold text-sm">Pedidos de adoção</span></button>}
        {role === "organization" && <button onClick={() => navigate("organization-animals")} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left ${current === "organization-animals" ? "bg-[#d8f0e5] text-[#3d6b4f]" : "text-[#7a5c3f] hover:bg-[#efe5d8]"}`}><span className="text-xl">🐶</span><span className="font-semibold text-sm">Meus animais</span></button>}
      </nav>

      {/* User profile */}
      <div className="px-4 py-4 border-t border-[#e0cdb8]">
        <button
          onClick={() => navigate((role === "organization" ? "organization-profile" : "user-profile") as Screen)}
          className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
            (role === "organization" ? current === "organization-profile" : current === "user-profile") ? "bg-[#fde8da]" : "hover:bg-[#efe5d8]"
          }`}
        >
          <img
            src={profile?.avatar_url || "https://images.unsplash.com/photo-1558788353-f76d92427f16?w=80&h=80&fit=crop&auto=format"}
            alt={displayName}
            className="w-9 h-9 rounded-full object-cover border-2 border-[#e0cdb8]"
          />
          <div className="flex-1 min-w-0 text-left">
            <p className={`font-bold text-sm leading-none truncate ${(role === "organization" ? current === "organization-profile" : current === "user-profile") ? "text-[#c4582a]" : "text-[#2d1f0f]"}`}>{role === "organization" ? "Minha ONG" : displayName}</p>
            <p className="text-[#b8987a] text-xs mt-0.5">{role === "organization" ? "Conta de ONG" : "Conta de adotante"}</p>
          </div>
          {(role === "organization" ? current === "organization-profile" : current === "user-profile") && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#c4582a]" />}
        </button>
        <button onClick={() => void signOut()} className="mt-2 w-full text-left px-3 text-xs font-bold text-[#7a5c3f] hover:text-[#c4582a]">
          Sair da conta
        </button>
      </div>
    </aside>
  );
}
