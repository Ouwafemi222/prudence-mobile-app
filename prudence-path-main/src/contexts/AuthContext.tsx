import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface Office {
  id: string;
  slug: string;
  name: string;
}

interface Profile {
  id: string;
  user_id: string;
  office_id: string;
  full_name: string;
  username: string;
  sponsor_username: string;
  avatar_url: string | null;
  email: string | null;
  approval_status: 'pending' | 'approved' | 'rejected';
  assigned_trainer_id: string | null;
  assigned_group_id: string | null;
  created_at: string;
  updated_at: string;
}

interface UserRole {
  id: string;
  user_id: string;
  office_id: string;
  role: 'super_admin' | 'office_admin' | 'trainer' | 'pro' | 'sponsor' | 'member';
  created_at: string;
}

const ROLE_PRIORITY: UserRole["role"][] = [
  'super_admin',
  'office_admin',
  'trainer',
  'pro',
  'sponsor',
  'member',
];

function pickPrimaryRole(roles: UserRole[] | null | undefined): UserRole | null {
  const list = roles || [];
  for (const r of ROLE_PRIORITY) {
    const found = list.find((x) => x.role === r);
    if (found) return found;
  }
  return list[0] ?? null;
}

export function isEmailConfirmed(user: User | null): boolean {
  if (!user) return false;
  const u = user as User & { email_confirmed_at?: string | null; confirmed_at?: string | null };
  return Boolean(u.email_confirmed_at ?? u.confirmed_at);
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  office: Office | null;
  userRole: UserRole | null;
  loading: boolean;
  userDataLoading: boolean;
  emailConfirmed: boolean;
  signUp: (email: string, password: string, metadata: { full_name: string; username: string; sponsor_username: string | null; office_slug?: string | null }) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  resetPasswordForEmail: (email: string) => Promise<{ error: Error | null }>;
  resendConfirmationEmail: (email: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  isApproved: boolean;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isTrainer: boolean;
  isOfficeAdmin: boolean;
  officeId: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [office, setOffice] = useState<Office | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [userDataLoading, setUserDataLoading] = useState(false);

  const clearUserData = () => {
    setProfile(null);
    setOffice(null);
    setUserRole(null);
  };

  const fetchUserData = async (userId: string, options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false;
    if (!silent) {
      setUserDataLoading(true);
    }
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        setProfile(null);
        setOffice(null);
      } else {
        const profileRow = profileData as Profile | null;
        setProfile(profileRow);

        if (profileRow?.office_id) {
          const { data: officeData, error: officeError } = await supabase
            .from('offices')
            .select('id, slug, name')
            .eq('id', profileRow.office_id)
            .maybeSingle();

          if (officeError) {
            console.error('Error fetching office:', officeError);
            setOffice(null);
          } else {
            setOffice((officeData as Office | null) ?? null);
          }
        } else {
          setOffice(null);
        }
      }

      const { data: rolesData, error: roleError } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', userId);

      if (roleError) {
        console.error('Error fetching role:', roleError);
        setUserRole(null);
      } else {
        const picked = pickPrimaryRole((rolesData as UserRole[]) || []);
        setUserRole(picked);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      clearUserData();
    } finally {
      setUserDataLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    const finishBoot = () => {
      if (mounted) setLoading(false);
    };

    // Must run outside the auth callback — awaiting Supabase inside onAuthStateChange deadlocks on reload.
    const scheduleFetchUserData = (userId: string, silent = false) => {
      queueMicrotask(() => {
        if (mounted) void fetchUserData(userId, { silent });
      });
    };

    const syncSession = (nextSession: Session | null) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, nextSession) => {
        if (!mounted) return;

        syncSession(nextSession);

        if (event === "INITIAL_SESSION") {
          if (nextSession?.user && isEmailConfirmed(nextSession.user)) {
            scheduleFetchUserData(nextSession.user.id);
          } else {
            clearUserData();
            setUserDataLoading(false);
          }
          finishBoot();
          return;
        }

        if (event === "SIGNED_OUT") {
          clearUserData();
          setUserDataLoading(false);
          return;
        }

        if (event === "TOKEN_REFRESHED" || event === "USER_UPDATED") {
          return;
        }

        if (nextSession?.user && isEmailConfirmed(nextSession.user)) {
          scheduleFetchUserData(nextSession.user.id);
        } else {
          clearUserData();
          setUserDataLoading(false);
        }
      },
    );

    const bootstrapTimeout = window.setTimeout(finishBoot, 10_000);

    return () => {
      mounted = false;
      window.clearTimeout(bootstrapTimeout);
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (
    email: string,
    password: string,
    metadata: { full_name: string; username: string; sponsor_username: string | null; office_slug?: string | null }
  ) => {
    const redirectUrl = `${window.location.origin}/auth?confirmed=1`;

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: metadata.full_name,
          username: metadata.username,
          sponsor_username: metadata.sponsor_username,
          office_slug: metadata.office_slug ?? null,
        },
      },
    });

    return { error: error as Error | null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    return { error: error as Error | null };
  };

  const resetPasswordForEmail = async (email: string) => {
    const redirectTo = `${window.location.origin}/auth/reset-password`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });
    return { error: error as Error | null };
  };

  const resendConfirmationEmail = async (email: string) => {
    const redirectUrl = `${window.location.origin}/auth?confirmed=1`;
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: redirectUrl },
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    clearUserData();
  };

  const refreshProfile = async () => {
    if (user && isEmailConfirmed(user)) {
      await fetchUserData(user.id);
    }
  };

  const emailConfirmed = isEmailConfirmed(user);
  const isApproved = profile?.approval_status === 'approved';
  const isSuperAdmin = userRole?.role === 'super_admin';
  const isAdmin = isSuperAdmin || userRole?.role === 'trainer';
  const isTrainer = userRole?.role === 'trainer';
  const isOfficeAdmin = userRole?.role === 'office_admin';
  const officeId = profile?.office_id ?? null;

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        office,
        userRole,
        loading,
        userDataLoading,
        emailConfirmed,
        signUp,
        signIn,
        resetPasswordForEmail,
        resendConfirmationEmail,
        signOut,
        refreshProfile,
        isApproved,
        isSuperAdmin,
        isAdmin,
        isTrainer,
        isOfficeAdmin,
        officeId,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
