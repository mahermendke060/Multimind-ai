'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Sparkles } from 'lucide-react';

export default function AuthForm() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const { signIn, signUp } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) throw error;
      } else {
        const { error } = await signUp(email, password, fullName);
        if (error) throw error;
        setMessage('Check your email for the confirmation link!');
      }
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-r from-violet-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">MultiMind</h1>
          <p className="text-slate-400">Sign in to continue</p>
        </div>

        {/* Auth Form */}
        <div className="bg-slate-800/80 rounded-2xl p-8 border border-slate-700/50 backdrop-blur-xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            {!isLogin && (
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-slate-300 mb-2">
                  Full Name
                </label>
                <input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-slate-700/50 text-white rounded-xl px-4 py-3 border border-slate-600/50 focus:outline-none focus:ring-2 focus:ring-violet-500 placeholder-slate-400"
                  placeholder="Enter your full name"
                  required={!isLogin}
                />
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-700/50 text-white rounded-xl px-4 py-3 border border-slate-600/50 focus:outline-none focus:ring-2 focus:ring-violet-500 placeholder-slate-400"
                placeholder="Enter your email"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-700/50 text-white rounded-xl px-4 py-3 border border-slate-600/50 focus:outline-none focus:ring-2 focus:ring-violet-500 placeholder-slate-400"
                placeholder="Enter your password"
                required
              />
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
              {loading ? 'Loading...' : isLogin ? 'Sign In' : 'Sign Up'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-slate-400 hover:text-white transition-colors"
            >
              {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
