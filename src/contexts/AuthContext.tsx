import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from "react";
import { apiClient } from "../lib/apiClient";

export type UserRole = "adopter" | "organization";
type Session = { user: { id: string; email: string; user_metadata: Record<string, string | null> } };

type AuthContextValue = {
  session: Session | null;
  role: UserRole | null;
  profile: { full_name: string | null; avatar_url: string | null } | null;
  loading: boolean;
  signIn(email: string, password: string): Promise<string | null>;
  signUp(email: string, password: string, fullName: string, role: UserRole): Promise<string | null>;
  resetPassword(email: string): Promise<string | null>;
  signOut(): Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function authErrorMessage(error: { message: string } | null) {
  if (!error) return null;
  if (/failed to fetch|networkerror|network request failed/i.test(error.message)) {
    return "Não foi possível conectar à API. Confira se o servidor e o MySQL estão em execução.";
  }
  return error.message;
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [profile, setProfile] = useState<{ full_name: string | null; avatar_url: string | null } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const client = apiClient;
    const loadProfile = async (nextSession: Session | null) => {
      setSession(nextSession);
      if (!nextSession) { setRole(null); setProfile(null); return; }
      const { data: storedProfile } = await client.from("profiles").select("role, full_name, avatar_url").eq("id", nextSession.user.id).maybeSingle();
      const metadataRole = nextSession.user.user_metadata.role;
      setRole(storedProfile?.role === "organization" || metadataRole === "organization" ? "organization" : "adopter");
      setProfile(storedProfile);
    };
    client.auth.getSession().then(async ({ data }) => {
      await loadProfile(data.session);
      setLoading(false);
    });
    const { data } = client.auth.onAuthStateChange((_event, nextSession) => { void loadProfile(nextSession); });
    return () => data.subscription.unsubscribe();
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    session, role, profile, loading,
    async signIn(email, password) {
      const { error } = await apiClient.auth.signInWithPassword({ email, password });
      return authErrorMessage(error);
    },
    async signUp(email, password, fullName, role) {
      const { data, error } = await apiClient.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName, role } },
      });
      if (error) return authErrorMessage(error);
      if (data.session && data.user) {
        const { error: profileError } = await apiClient.from("profiles").upsert({ id: data.user.id, full_name: fullName, role });
        if (profileError) return authErrorMessage(profileError);
      }
      return null;
    },
    async resetPassword(email) {
      const { error } = await apiClient.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/`,
      });
      return authErrorMessage(error);
    },
    async signOut() { await apiClient.auth.signOut(); },
  }), [loading, profile, role, session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return context;
}
