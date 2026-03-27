import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "../integrations/supabase/client";
import * as Linking from "expo-linking";

type Role = "super_admin" | "trainer" | "pro" | "sponsor" | "member";
type ApprovalStatus = "pending" | "approved" | "rejected";

interface Profile {
  user_id: string;
  full_name: string | null;
  username: string | null;
  approval_status: ApprovalStatus;
}

interface UserRole {
  user_id: string;
  role: Role;
}

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  userRole: UserRole | null;
  loading: boolean;
  isApproved: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (
    email: string,
    password: string,
    metadata: { full_name: string; username: string; sponsor_username: string | null },
  ) => Promise<{ error: Error | null }>;
  resetPasswordForEmail: (email: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const ROLE_PRIORITY: Role[] = ["super_admin", "trainer", "pro", "sponsor", "member"];

function pickPrimaryRole(roles: UserRole[]): UserRole | null {
  for (const role of ROLE_PRIORITY) {
    const found = roles.find((r) => r.role === role);
    if (found) return found;
  }
  return roles[0] ?? null;
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserData = async (userId: string) => {
    const [{ data: profileData }, { data: rolesData }] = await Promise.all([
      supabase.from("profiles").select("user_id, full_name, username, approval_status").eq("user_id", userId).maybeSingle(),
      supabase.from("user_roles").select("user_id, role").eq("user_id", userId),
    ]);

    setProfile((profileData as Profile | null) ?? null);
    setUserRole(pickPrimaryRole(((rolesData as UserRole[]) ?? []).filter(Boolean)));
  };

  useEffect(() => {
    let cancelled = false;
    const failsafeTimeout = setTimeout(() => {
      if (cancelled) return;
      // Failsafe: prevent getting stuck on the splash screen if getSession never resolves.
      setLoading(false);
    }, 10000);
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (cancelled) return;
      setSession(nextSession);
      setUser(nextSession?.user ?? null);

      if (nextSession?.user) {
        setTimeout(() => {
          fetchUserData(nextSession.user.id).finally(() => {
            if (!cancelled) setLoading(false);
          });
        }, 0);
      } else {
        setProfile(null);
        setUserRole(null);
        setLoading(false);
      }
    });

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (cancelled) return;
        const nextSession = data.session;
        setSession(nextSession);
        setUser(nextSession?.user ?? null);
        if (nextSession?.user) {
          fetchUserData(nextSession.user.id).finally(() => {
            if (!cancelled) setLoading(false);
          });
        } else {
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error("Supabase getSession failed:", err);
        if (cancelled) return;
        setSession(null);
        setUser(null);
        setProfile(null);
        setUserRole(null);
        setLoading(false);
      });

    return () => {
      cancelled = true;
      clearTimeout(failsafeTimeout);
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      profile,
      userRole,
      loading,
      isApproved: profile?.approval_status === "approved",
      signIn: async (email: string, password: string) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        return { error: (error as Error | null) ?? null };
      },
      signUp: async (email: string, password: string, metadata) => {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: metadata.full_name,
              username: metadata.username,
              sponsor_username: metadata.sponsor_username,
            },
          },
        });
        return { error: (error as Error | null) ?? null };
      },
      resetPasswordForEmail: async (email: string) => {
        // Supabase sends a link, then expects the app to open after confirmation.
        // Even if we don't implement the deep-link route yet, the password reset flow can still work.
        const redirectTo = Linking.createURL("/");
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
        return { error: (error as Error | null) ?? null };
      },
      signOut: async () => {
        await supabase.auth.signOut();
        setProfile(null);
        setUserRole(null);
      },
      refreshProfile: async () => {
        if (!user) return;
        await fetchUserData(user.id);
      },
    }),
    [user, session, profile, userRole, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
