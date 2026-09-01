import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { authRedirectTo } from '../lib/authRedirect';
import { supabase, supabaseConfigured } from '../lib/supabase';
import type { Profile } from '../lib/types';

type AuthCtx = {
  ready: boolean;
  configured: boolean;
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  refreshProfile: () => Promise<Profile | null>;
  signUp: (email: string, password: string) => Promise<{ error: string | null; needsConfirm: boolean }>;
  signIn: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<string | null>;
  resendConfirmation: (email: string) => Promise<string | null>;
  setDisplayName: (name: string) => Promise<string | null>;
  deleteAccount: () => Promise<string | null>;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  const refreshProfile = useCallback(async () => {
    if (!supabase || !session?.user) {
      setProfile(null);
      return null;
    }
    const { data, error } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
    if (error) {
      setProfile(null);
      return null;
    }
    let p = data as Profile;
    if (p.needs_display_name) {
      const pending = localStorage.getItem('stellarsudoku.pendingDisplayName');
      if (pending) {
        const { error: nameErr } = await supabase.rpc('set_display_name', { p_name: pending });
        if (!nameErr) {
          localStorage.removeItem('stellarsudoku.pendingDisplayName');
          const again = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
          if (again.data) p = again.data as Profile;
        }
      }
    }
    setProfile(p);
    const theme = p.settings?.theme === 'light' ? 'light' : 'dark';
    document.documentElement.dataset.theme = theme;
    return p;
  }, [session?.user]);

  useEffect(() => {
    if (!supabase) {
      setReady(true);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, next) => setSession(next));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    void refreshProfile();
  }, [refreshProfile]);

  const signUp = async (email: string, password: string) => {
    if (!supabase) return { error: 'Supabase is not configured', needsConfirm: false };
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: authRedirectTo() },
    });
    return { error: error?.message ?? null, needsConfirm: !data.session };
  };

  const signIn = async (email: string, password: string) => {
    if (!supabase) return 'Supabase is not configured';
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error?.message ?? null;
  };

  const signOut = async () => {
    await supabase?.auth.signOut();
    setProfile(null);
  };

  const resetPassword = async (email: string) => {
    if (!supabase) return 'Supabase is not configured';
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: authRedirectTo(),
    });
    return error?.message ?? null;
  };

  const resendConfirmation = async (email: string) => {
    if (!supabase) return 'Supabase is not configured';
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: authRedirectTo() },
    });
    return error?.message ?? null;
  };

  const setDisplayName = async (name: string) => {
    if (!supabase) return 'Supabase is not configured';
    const { error } = await supabase.rpc('set_display_name', { p_name: name });
    if (error) return error.message;
    await refreshProfile();
    return null;
  };

  const deleteAccount = async () => {
    if (!supabase) return 'Supabase is not configured';
    const { error } = await supabase.functions.invoke('delete-account', { method: 'POST' });
    if (error) return error.message;
    await supabase.auth.signOut();
    setProfile(null);
    return null;
  };

  const value = useMemo<AuthCtx>(
    () => ({
      ready,
      configured: supabaseConfigured,
      session,
      user: session?.user ?? null,
      profile,
      refreshProfile,
      signUp,
      signIn,
      signOut,
      resetPassword,
      resendConfirmation,
      setDisplayName,
      deleteAccount,
    }),
    [ready, session, profile, refreshProfile],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth outside provider');
  return ctx;
}
