'use client';

import { useState, useEffect } from 'react';
// import { useAuth } from '@/lib/auth-context'; // Unused for now
import { useTheme } from '@/lib/theme-context';
import { Sparkles, Eye, EyeOff, Brain, Cpu, Zap, Network, Bot } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [animatedElements, setAnimatedElements] = useState<number[]>([]);

  const { darkMode, mounted } = useTheme();
  const router = useRouter();

  // Animated neural network effect
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimatedElements(prev => {
        const newElements = Array.from({ length: 6 }, (_, i) => Math.random() * 100);
        return newElements;
      });
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Handle the password reset flow
    const handlePasswordReset = async () => {
      // Check URL parameters for reset tokens (both hash and query params)
      const urlParams = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      
      // Try to get tokens from either location
      const accessToken = hashParams.get('access_token') || urlParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token') || urlParams.get('refresh_token');
      const type = hashParams.get('type') || urlParams.get('type');
      
      // Check for errors in the URL
      const error = hashParams.get('error') || urlParams.get('error');
      const errorDescription = hashParams.get('error_description') || urlParams.get('error_description');
      
      if (error) {
        if (error === 'access_denied' && errorDescription?.includes('expired')) {
          setError('The reset link has expired. Please request a new password reset.');
        } else {
          setError(`Reset link error: ${errorDescription || error}`);
        }
        return;
      }
      
      if (type === 'recovery' && accessToken && refreshToken) {
        try {
          // Set the session using the tokens from the URL
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });
          
          if (sessionError) {
            console.error('Session error:', sessionError);
            setError('Invalid or expired reset link. Please request a new password reset.');
            return;
          }
          
          // Clear the URL parameters after successful session setup
          window.history.replaceState({}, document.title, window.location.pathname);
          
        } catch (err) {
          console.error('Reset flow error:', err);
          setError('Failed to process reset link. Please try again.');
          return;
        }
      } else {
        // Check if we have an existing session
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setError('Invalid reset link. Please request a new password reset from the login page.');
          setTimeout(() => router.push('/auth'), 3000);
          return;
        }
      }
    };
    
    handlePasswordReset();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      setLoading(false);
      return;
    }

    try {
      // First check if we have a valid session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Your session has expired. Please request a new password reset.');
        setTimeout(() => router.push('/auth'), 2000);
        setLoading(false);
        return;
      }

      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        if (error.message.includes('session_not_found') || error.message.includes('invalid_token')) {
          setError('Your reset session has expired. Please request a new password reset.');
          setTimeout(() => router.push('/auth'), 2000);
        } else {
          throw error;
        }
        return;
      }
      
      setMessage('Password updated successfully! Redirecting to login...');
      
      // Sign out the user after successful password reset
      await supabase.auth.signOut();
      
      setTimeout(() => {
        router.push('/auth');
      }, 2000);
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Don't render until theme is mounted to prevent hydration issues
  if (!mounted) {
    return <div className="min-h-screen bg-white dark:bg-slate-900"></div>;
  }

  return (
    <div className={cn(
      "min-h-screen relative overflow-hidden transition-colors duration-500",
      darkMode 
        ? "bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900" 
        : "bg-gradient-to-br from-slate-50 via-violet-50/30 to-slate-50"
    )}>
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Neural Network Pattern */}
        <div className="absolute inset-0 opacity-10">
          {animatedElements.map((pos, i) => (
            <div
              key={i}
              className={cn(
                "absolute w-2 h-2 rounded-full transition-all duration-2000 ease-in-out",
                darkMode ? "bg-violet-400" : "bg-purple-500"
              )}
              style={{
                left: `${pos}%`,
                top: `${(pos * 1.3) % 100}%`,
                transform: `scale(${0.5 + (pos % 50) / 100})`,
              }}
            />
          ))}
        </div>
        
        {/* Floating AI Icons */}
        <div className="absolute top-20 left-10 opacity-5 animate-pulse">
          <Brain className="w-24 h-24 text-violet-500" />
        </div>
        <div className="absolute top-40 right-16 opacity-5 animate-pulse delay-1000">
          <Cpu className="w-20 h-20 text-purple-500" />
        </div>
        <div className="absolute bottom-32 left-20 opacity-5 animate-pulse delay-2000">
          <Network className="w-28 h-28 text-indigo-500" />
        </div>
        <div className="absolute bottom-20 right-10 opacity-5 animate-pulse delay-500">
          <Bot className="w-22 h-22 text-cyan-500" />
        </div>
        
        {/* Gradient Orbs */}
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-gradient-to-r from-violet-500/10 to-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="relative z-10 h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Logo Section */}
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-r from-violet-500 via-purple-600 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-xl relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-violet-400/20 to-purple-500/20 animate-pulse"></div>
              <img src="/svg-logos/app-logo.svg" alt="MultiMind" className="w-8 h-8 relative z-10" />
              <div className="absolute inset-0 rounded-2xl border-2 border-violet-400/30 animate-spin" style={{ animationDuration: '8s' }}></div>
            </div>
            
            <h1 className={cn(
              "text-2xl font-bold mb-2",
              darkMode ? "text-white" : "text-slate-900"
            )}>
              <span className="bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
                MultiMind
              </span>
            </h1>
            
            <p className={cn(
              "text-sm",
              darkMode ? "text-slate-300" : "text-slate-600"
            )}>
              Reset your password securely
            </p>
          </div>

          {/* Reset Password Form */}
          <div className={cn(
            "rounded-3xl p-6 backdrop-blur-xl border transition-all duration-500 shadow-2xl relative overflow-hidden",
            darkMode 
              ? "bg-slate-800/40 border-slate-700/30 shadow-violet-500/10" 
              : "bg-white/60 border-slate-200/40 shadow-purple-500/10"
          )}>
            {/* Form glow effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-violet-500/5 via-purple-500/5 to-indigo-500/5 rounded-3xl"></div>
            
            <div className="relative z-10">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="group">
                  <label htmlFor="password" className={cn(
                    "block text-sm font-semibold mb-3 transition-colors",
                    darkMode ? "text-slate-200" : "text-slate-700"
                  )}>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full"></div>
                      New Password
                    </div>
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={cn(
                        "w-full rounded-2xl px-6 py-4 pr-14 border-2 focus:outline-none transition-all duration-300 text-base font-medium",
                        "focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500",
                        "group-hover:border-emerald-400/50",
                        darkMode 
                          ? "bg-slate-700/30 text-white border-slate-600/30 placeholder-slate-400" 
                          : "bg-white/70 text-slate-900 border-slate-300/30 placeholder-slate-500"
                      )}
                      placeholder="Enter your new password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className={cn(
                        "absolute right-4 top-1/2 transform -translate-y-1/2 p-2 rounded-lg transition-colors",
                        darkMode ? "text-slate-400 hover:text-white" : "text-slate-500 hover:text-slate-700"
                      )}
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-emerald-500/5 to-teal-500/5 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  </div>
                </div>

                <div className="group">
                  <label htmlFor="confirmPassword" className={cn(
                    "block text-sm font-semibold mb-3 transition-colors",
                    darkMode ? "text-slate-200" : "text-slate-700"
                  )}>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-gradient-to-r from-violet-500 to-purple-600 rounded-full"></div>
                      Confirm New Password
                    </div>
                  </label>
                  <div className="relative">
                    <input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className={cn(
                        "w-full rounded-2xl px-6 py-4 pr-14 border-2 focus:outline-none transition-all duration-300 text-base font-medium",
                        "focus:ring-4 focus:ring-violet-500/20 focus:border-violet-500",
                        "group-hover:border-violet-400/50",
                        darkMode 
                          ? "bg-slate-700/30 text-white border-slate-600/30 placeholder-slate-400" 
                          : "bg-white/70 text-slate-900 border-slate-300/30 placeholder-slate-500"
                      )}
                      placeholder="Confirm your new password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className={cn(
                        "absolute right-4 top-1/2 transform -translate-y-1/2 p-2 rounded-lg transition-colors",
                        darkMode ? "text-slate-400 hover:text-white" : "text-slate-500 hover:text-slate-700"
                      )}
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-violet-500/5 to-purple-500/5 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  </div>
                </div>

                {error && (
                  <div className="bg-red-500/10 border-2 border-red-500/20 rounded-2xl p-4 backdrop-blur-sm">
                    <p className="text-red-400 text-sm font-medium">{error}</p>
                  </div>
                )}

                {message && (
                  <div className="bg-green-500/10 border-2 border-green-500/20 rounded-2xl p-4 backdrop-blur-sm">
                    <p className="text-green-400 text-sm font-medium">{message}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className={cn(
                    "w-full relative overflow-hidden rounded-2xl py-4 px-6 font-bold text-lg transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]",
                    "bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 text-white",
                    "hover:from-violet-700 hover:via-purple-700 hover:to-indigo-700",
                    "focus:outline-none focus:ring-4 focus:ring-violet-500/30",
                    "disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none",
                    "shadow-xl shadow-violet-500/25"
                  )}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="relative z-10 flex items-center justify-center gap-3">
                    {loading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        Updating Password...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5" />
                        Update Password
                      </>
                    )}
                  </div>
                </button>
              </form>

              <div className="mt-8 text-center space-y-4">
                {error && error.includes('expired') && (
                  <button
                    onClick={() => router.push('/auth')}
                    className={cn(
                      "w-full relative overflow-hidden rounded-2xl py-3 px-6 font-medium transition-all duration-300 transform hover:scale-[1.02]",
                      "bg-violet-600/20 text-violet-400 border-2 border-violet-600/30",
                      "hover:bg-violet-600/30 hover:border-violet-500/40"
                    )}
                  >
                    <div className="relative z-10 flex items-center justify-center gap-2">
                      <Zap className="w-4 h-4" />
                      Request New Reset Link
                    </div>
                  </button>
                )}
                
                <div className="flex items-center gap-4">
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent"></div>
                  <span className={cn(
                    "text-xs font-medium px-3",
                    darkMode ? "text-slate-400" : "text-slate-500"
                  )}>
                    OR
                  </span>
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent"></div>
                </div>
                
                <button
                  onClick={() => router.push('/')}
                  className={cn(
                    "text-sm font-medium transition-all duration-300 hover:scale-105",
                    "bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent hover:from-violet-500 hover:to-purple-500"
                  )}
                >
                  ← Back to MultiMind
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
