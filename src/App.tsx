import { useEffect, useState } from "react";
import Onboarding from "./screens/Onboarding";
import Home from "./screens/Home";
import AdoptionList from "./screens/AdoptionList";
import AnimalProfile from "./screens/AnimalProfile";
import AdoptionProcess from "./screens/AdoptionProcess";
import MedicalHistory from "./screens/MedicalHistory";
import NearbyMap from "./screens/NearbyMap";
import VaccinationEvents from "./screens/VaccinationEvents";
import Chat from "./screens/Chat";
import AbuseReport from "./screens/AbuseReport";
import UserProfile from "./screens/UserProfile";
import OrganizationProfile from "./screens/OrganizationProfile";
import OrganizationAnimals from "./screens/OrganizationAnimals";
import MyAdoptions from "./screens/MyAdoptions";
import OrganizationDashboard from "./screens/OrganizationDashboard";
import OrganizationAdoptionRequests from "./screens/OrganizationAdoptionRequests";
import Sidebar from "./components/BottomNav";
import { AuthProvider, useAuth } from "./contexts/AuthContext";

export type Screen =
  | "onboarding"
  | "home"
  | "adoption-list"
  | "animal-profile"
  | "adoption-process"
  | "medical-history"
  | "nearby-map"
  | "vaccination-events"
  | "chat"
  | "abuse-report"
  | "user-profile"
  | "edit-profile"
  | "organization-profile"
  | "organization-animals"
  | "my-adoptions"
  | "organization-dashboard"
  | "organization-adoption-requests";

export default function App() {
  return <AuthProvider><AppContent /></AuthProvider>;
}

function AppContent() {
  const { session, loading, role } = useAuth();
  const [screen, setScreen] = useState<Screen>("onboarding");
  const [selectedAnimalId, setSelectedAnimalId] = useState<string>("");

  useEffect(() => {
    if (session) setScreen((current) => current === "onboarding" ? "home" : current);
  }, [session]);

  const navigate = (s: Screen, animalId?: string) => {
    if (animalId !== undefined) setSelectedAnimalId(animalId);
    setScreen(s);
  };

  const isAuthenticated = Boolean(session);
  const activeScreen = isAuthenticated ? screen : "onboarding";
  const showSidebar = activeScreen !== "onboarding";

  if (loading) return <div className="min-h-screen grid place-items-center bg-[#fdf6ee] text-[#7a5c3f]">Carregando Pata Amiga…</div>;

  return (
    <div className="app-shell min-h-dvh bg-[#fdf6ee] flex overflow-hidden" style={{ fontFamily: "'Nunito', sans-serif" }}>
      {showSidebar && <Sidebar current={screen} navigate={navigate} />}

      <main className="min-w-0 flex-1 overflow-hidden pb-16 md:pb-0">
        {activeScreen === "onboarding" && <Onboarding navigate={navigate} />}
        {activeScreen === "home" && <Home navigate={navigate} />}
        {activeScreen === "adoption-list" && <AdoptionList navigate={navigate} />}
        {activeScreen === "animal-profile" && <AnimalProfile navigate={navigate} animalId={selectedAnimalId} />}
        {activeScreen === "adoption-process" && <AdoptionProcess navigate={navigate} animalId={selectedAnimalId} />}
        {activeScreen === "medical-history" && <MedicalHistory navigate={navigate} />}
        {activeScreen === "nearby-map" && <NearbyMap navigate={navigate} />}
        {activeScreen === "vaccination-events" && <VaccinationEvents navigate={navigate} />}
        {activeScreen === "chat" && <Chat navigate={navigate} />}
        {activeScreen === "abuse-report" && <AbuseReport navigate={navigate} />}
        {activeScreen === "user-profile" && <UserProfile navigate={navigate} />}
        {activeScreen === "edit-profile" && <UserProfile navigate={navigate} editingMode />}
        {activeScreen === "organization-profile" && role === "organization" && <OrganizationProfile />}
        {activeScreen === "organization-animals" && role === "organization" && <OrganizationAnimals />}
        {activeScreen === "my-adoptions" && <MyAdoptions />}
        {activeScreen === "organization-dashboard" && role === "organization" && <OrganizationDashboard navigate={navigate} />}
        {activeScreen === "organization-adoption-requests" && role === "organization" && <OrganizationAdoptionRequests navigate={navigate} />}
      </main>
    </div>
  );
}
