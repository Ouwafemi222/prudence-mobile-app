import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import * as Linking from "expo-linking";
import { supabase } from "../integrations/supabase/client";

export type Role = "super_admin" | "office_admin" | "trainer" | "pro" | "sponsor" | "member";
export type ApprovalStatus = "pending" | "approved" | "rejected";

export interface Office {
  id: string;
  slug: string;
  name: string;
}

export interface Profile {
  id?: string;
  user_id: string;
  office_id: string | null;
  full_name: string | null;
  username: string | null;
  sponsor_username: string | null;
  email: string | null;
  avatar_url: string | null;
  approval_status: ApprovalStatus;
  assigned_trainer_id?: string | null;
  assigned_group_id?: string | null;
  created_at: string | null;
  updated_at?: string | null;
  push_notification_prefs?: unknown;
}

export interface UserRole {
  id?: string;
  user_id: string;
  office_id?: string | null;
  role: Role;
  created_at?: string;
}

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  office: Office | null;
  userRole: UserRole | null;
  loading: boolean;
  userDataLoading: boolean;
  emailConfirmed: boolean;
  passwordRecovery: boolean;
  isApproved: boolean;
  isAdmin: boolean;
  isTrainer: boolean;
  isPro: boolean;
  isSponsor: boolean;
  isSuperAdmin: boolean;
  isOfficeAdmin: boolean;
  officeId: string | null;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (
    email: string,
    password: string,
    metadata: {
      full_name: string;
      username: string;
      sponsor_username: string | null;
      office_slug?: string | null;
    },
  ) => Promise<{ error: Error | null }>;
  resetPasswordForEmail: (email: string) => Promise<{ error: Error | null }>;
  resendConfirmationEmail: (email: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  clearPasswordRecovery: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const ROLE_PRIORITY: Role[] = [
  "super_admin",
  "office_admin",
  "trainer",
  "pro",
  "sponsor",
  "member",
];

function pickPrimaryRole(roles: UserRole[]): UserRole | null {
  for (const role of ROLE_PRIORITY) {
    const found = roles.find((r) => r.role === role);
    if (found) return found;
  }
  return roles[0] ?? null;
}

export function isEmailConfirmed(user: User | null): boolean {
  if (!user) return false;
  const u = user as User & { email_confirmed_at?: string | null; confirmed_at?: string | null };
  return Boolean(u.email_confirmed_at ?? u.confirmed_at);
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [office, setOffice] = useState<Office | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [userDataLoading, setUserDataLoading] = useState(false);
  const [passwordRecovery, setPasswordRecovery] = useState(false);

  const clearUserData = () => {
    setProfile(null);
    setOffice(null);
    setUserRole(null);
  };

  const fetchUserData = async (userId: string, attempt = 0): Promise<void> => {
    setUserDataLoading(true);
    const [{ data: profileData, error: profileError }, { data: rolesData, error: rolesError }] =
      await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
        supabase.from("user_roles").select("*").eq("user_id", userId),
      ]);

    if (profileError) {
      if (__DEV__) console.warn("[Auth] profiles:", profileError.message);
      if (attempt < 2) {
        await new Promise((r) => setTimeout(r, 350 * (attempt + 1)));
        return fetchUserData(userId, attempt + 1);
      }
      setProfile(null);
      setOffice(null);
      setUserDataLoading(false);
      return;
    }
    if (rolesError && __DEV__) console.warn("[Auth] user_roles:", rolesError.message);

    const profileRow = (profileData as Profile | null) ?? null;
    setProfile(profileRow);
    setUserRole(pickPrimaryRole(((rolesData as UserRole[]) ?? []).filter(Boolean)));

    if (profileRow?.office_id) {
      const { data: officeData, error: officeError } = await supabase
        .from("offices")
        .select("id, slug, name")
        .eq("id", profileRow.office_id)
        .maybeSingle();
      if (officeError) {
        if (__DEV__) console.warn("[Auth] offices:", officeError.message);
        setOffice(null);
      } else {
        setOffice((officeData as Office | null) ?? null);
      }
    } else {
      setOffice(null);
    }
    setUserDataLoading(false);
  };

  useEffect(() => {
    let cancelled = false;
    const failsafeTimeout = setTimeout(() => {
      if (!cancelled) setLoading(false);
    }, 10000);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (cancelled) return;
      setSession(nextSession);
      setUser(nextSession?.user ?? null);

      if (event === "PASSWORD_RECOVERY") {
        setPasswordRecovery(true);
      }

      if (event === "SIGNED_OUT") {
        clearUserData();
        setPasswordRecovery(false);
        setUserDataLoading(false);
        setLoading(false);
        return;
      }

      if (event === "TOKEN_REFRESHED") return;

      if (nextSession?.user && isEmailConfirmed(nextSession.user) && event !== "PASSWORD_RECOVERY") {
        setTimeout(() => {
          fetchUserData(nextSession.user.id).finally(() => {
            if (!cancelled) setLoading(false);
          });
        }, 0);
      } else {
        clearUserData();
        setUserDataLoading(false);
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
        if (nextSession?.user && isEmailConfirmed(nextSession.user)) {
          fetchUserData(nextSession.user.id).finally(() => {
            if (!cancelled) setLoading(false);
          });
        } else {
          clearUserData();
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error("Supabase getSession failed:", err);
        if (cancelled) return;
        setSession(null);
        setUser(null);
        clearUserData();
        setLoading(false);
      });

    return () => {
      cancelled = true;
      clearTimeout(failsafeTimeout);
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    const emailConfirmed = isEmailConfirmed(user);
    return {
      user,
      session,
      profile,
      office,
      userRole,
      loading,
      userDataLoading,
      emailConfirmed,
      passwordRecovery,
      isApproved: profile?.approval_status === "approved",
      isAdmin: userRole?.role === "super_admin" || userRole?.role === "trainer",
      isTrainer: userRole?.role === "trainer",
      isPro: userRole?.role === "pro",
      isSponsor: userRole?.role === "sponsor",
      isSuperAdmin: userRole?.role === "super_admin",
      isOfficeAdmin: userRole?.role === "office_admin",
      officeId: profile?.office_id ?? null,
      signIn: async (email: string, password: string) => {
        const trimmedEmail = email.trim().replace(/\u200B/g, "").replace(/\uFEFF/g, "");
        const { error } = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password,
        });
        return { error: (error as Error | null) ?? null };
      },
      signUp: async (email, password, metadata) => {
        const redirectTo = Linking.createURL("auth", { queryParams: { confirmed: "1" } });
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: redirectTo,
            data: {
              full_name: metadata.full_name,
              username: metadata.username,
              sponsor_username: metadata.sponsor_username,
              office_slug: metadata.office_slug ?? null,
            },
          },
        });
        return { error: (error as Error | null) ?? null };
      },
      resetPasswordForEmail: async (email: string) => {
        const redirectTo = Linking.createURL("auth/reset-password");
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
        return { error: (error as Error | null) ?? null };
      },
      resendConfirmationEmail: async (email: string) => {
        const redirectTo = Linking.createURL("auth", { queryParams: { confirmed: "1" } });
        const { error } = await supabase.auth.resend({
          type: "signup",
          email,
          options: { emailRedirectTo: redirectTo },
        });
        return { error: (error as Error | null) ?? null };
      },
      signOut: async () => {
        await supabase.auth.signOut();
        clearUserData();
        setPasswordRecovery(false);
      },
      refreshProfile: async () => {
        if (user && isEmailConfirmed(user)) await fetchUserData(user.id);
      },
      clearPasswordRecovery: () => setPasswordRecovery(false),
    };
  }, [user, session, profile, office, userRole, loading, userDataLoading, passwordRecovery]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
