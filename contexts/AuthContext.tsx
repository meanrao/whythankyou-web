import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/utils/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue>({
  user: null,
  session: null,
  loading: true,
  signUp: async () => {},
  signIn: async () => {},
  signOut: async () => {},
});

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('[Auth] Restoring persisted session...');
    supabase.auth.getSession().then(({ data, error }) => {
      if (error) {
        console.log('[Auth] getSession error:', error.message);
      } else {
        console.log('[Auth] Session restored, user:', data.session?.user?.email ?? 'none');
        setSession(data.session);
        setUser(data.session?.user ?? null);
      }
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, newSession) => {
      console.log('[Auth] onAuthStateChange event:', event, 'user:', newSession?.user?.email ?? 'none');
      setSession(newSession);
      setUser(newSession?.user ?? null);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  async function signUp(email: string, password: string) {
    console.log('[Auth] signUp called for:', email);
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      console.log('[Auth] signUp error:', error.message);
      throw error;
    }
    // If Supabase returns a session immediately (email confirmation disabled), use it
    if (data.session) {
      console.log('[Auth] signUp returned session immediately, user:', data.session.user.email);
      setSession(data.session);
      setUser(data.session.user);
      return;
    }
    // Fallback: try signing in directly (handles cases where session isn't returned)
    console.log('[Auth] signUp no session returned, attempting signIn fallback');
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      console.log('[Auth] signUp fallback signIn error:', signInError.message);
      throw new Error('Account created but could not sign in automatically. Please log in manually.');
    }
    console.log('[Auth] signUp fallback signIn succeeded for:', email);
    setSession(signInData.session);
    setUser(signInData.session?.user ?? null);
  }

  async function signIn(email: string, password: string) {
    console.log('[Auth] signIn called for:', email);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      console.log('[Auth] signIn error:', error.message);
      throw error;
    }
    console.log('[Auth] signIn succeeded for:', email);
  }

  async function signOut() {
    console.log('[Auth] signOut called');
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.log('[Auth] signOut error:', error.message);
      throw error;
    }
    console.log('[Auth] signOut succeeded');
  }

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth() {
  return useContext(AuthContext);
}
