'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useTheme } from '@/lib/theme-context';
import { Sparkles, Eye, EyeOff } from 'lucide-react';
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

  const { darkMode, mounted } = useTheme();
  const router = useRouter();

  useEffect(() => {
    // Check if user is authenticated and has a session
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/auth');
      }
    };
    checkSession();
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
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) throw error;
      
      setMessage('Password updated successfully! Redirecting...');
      setTimeout(() => {
        router.push('/');
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
      "min-h-screen flex items-center justify-center p-6 transition-colors duration-300",
      darkMode ? "bg-slate-900" : "bg-white"
    )}>
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-r from-violet-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className={cn(
            "text-3xl font-bold mb-2",
            darkMode ? "text-white" : "text-slate-900"
          )}>Reset Password</h1>
          <p className={cn(
            darkMode ? "text-slate-400" : "text-slate-600"
          )}>Enter your new password</p>
        </div>

        {/* Reset Password Form */}
        <div className={cn(
          "rounded-2xl p-8 backdrop-blur-xl border transition-colors duration-300",
          darkMode 
            ? "bg-slate-800/80 border-slate-700/50" 
            : "bg-white/90 border-slate-200/50"
        )}>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="password" className={cn(
                "block text-sm font-medium mb-2",
                darkMode ? "text-slate-300" : "text-slate-700"
              )}>
                New Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={cn(
                    "w-full rounded-xl px-4 py-3 pr-12 border focus:outline-none focus:ring-2 focus:ring-violet-500 transition-colors duration-300",
                    darkMode 
                      ? "bg-slate-700/50 text-white border-slate-600/50 placeholder-slate-400" 
                      : "bg-slate-50 text-slate-900 border-slate-300/50 placeholder-slate-500"
                  )}
                  placeholder="Enter your new password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className={cn(
                "block text-sm font-medium mb-2",
                darkMode ? "text-slate-300" : "text-slate-700"
              )}>
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={cn(
                    "w-full rounded-xl px-4 py-3 pr-12 border focus:outline-none focus:ring-2 focus:ring-violet-500 transition-colors duration-300",
                    darkMode 
                      ? "bg-slate-700/50 text-white border-slate-600/50 placeholder-slate-400" 
                      : "bg-slate-50 text-slate-900 border-slate-300/50 placeholder-slate-500"
                  )}
                  placeholder="Confirm your new password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {message && (
              <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4">
                <p className="text-green-400 text-sm">{message}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-violet-600 to-purple-700 text-white rounded-xl py-3 font-medium hover:from-violet-700 hover:to-purple-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {loading ? 'Updating...' : 'Update Password'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => router.push('/')}
              className={cn(
                "transition-colors",
                darkMode ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-slate-800"
              )}
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
