'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, fullName?: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const resetPassword = async (email: string) => {
    // Get the site URL from environment variable first
    let siteUrl = process.env.NEXT_PUBLIC_APP_URL;
    
    // If not set, construct from window location
    if (!siteUrl && typeof window !== 'undefined') {
      const { protocol, hostname, port } = window.location;
      
      // Check if we're in development (localhost)
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        siteUrl = `${protocol}//${hostname}${port ? `:${port}` : ''}`;
      } else {
        // Production environment - use the actual domain
        siteUrl = `${protocol}//${hostname}`;
      }
    }
    
    // Server-side fallback - should be set via environment variable in production
    if (!siteUrl) {
      if (process.env.NODE_ENV === 'production') {
        // In production, this should never happen - environment variable should be set
        throw new Error('NEXT_PUBLIC_APP_URL environment variable must be set in production');
      } else {
        // Development fallback
        siteUrl = 'http://localhost:3000';
      }
    }
    
    // Remove trailing slash if present
    siteUrl = siteUrl.replace(/\/$/, '');
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${siteUrl}/reset-password`,
    });
    return { error };
  };

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    resetPassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
