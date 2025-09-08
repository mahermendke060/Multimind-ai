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
    let siteUrl = process.env.NEXT_PUBLIC_APP_URL;
    
    // If environment variable is not set, try to detect from window location
    if (!siteUrl && typeof window !== 'undefined') {
      const { protocol, hostname, port } = window.location;
      
      // For Vercel deployments, hostname will be like 'multimind-ai.vercel.app'
      if (hostname.includes('vercel.app') || hostname.includes('netlify.app') || 
          (!hostname.includes('localhost') && !hostname.includes('127.0.0.1'))) {
        // Production deployment
        siteUrl = `${protocol}//${hostname}`;
      } else {
        // Local development
        siteUrl = `${protocol}//${hostname}${port ? `:${port}` : ''}`;
      }
    }
    
    // Hard-coded fallback for your specific deployment
    if (!siteUrl) {
      if (typeof window !== 'undefined' && window.location.hostname.includes('vercel.app')) {
        siteUrl = 'https://multimind-ai.vercel.app';
      } else if (process.env.NODE_ENV === 'production') {
        // Production fallback - use your actual deployment URL
        siteUrl = 'https://multimind-ai.vercel.app';
      } else {
        // Development fallback
        siteUrl = 'http://localhost:3000';
      }
    }
    
    // Remove trailing slash if present
    siteUrl = siteUrl.replace(/\/$/, '');
    
    console.log('Reset password redirect URL:', `${siteUrl}/reset-password`); // Debug log
    
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
