import Link from 'next/link';
import { Sparkles, Home } from 'lucide-react';
import BackButton from './components/back-button';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 transition-colors duration-300 bg-white dark:bg-slate-900">
      <div className="text-center max-w-md mx-auto">
        {/* Logo */}
        <div className="w-20 h-20 bg-gradient-to-r from-violet-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Sparkles className="w-10 h-10 text-white" />
        </div>

        {/* 404 Text */}
        <h1 className="text-8xl font-bold mb-4 bg-gradient-to-r from-violet-500 to-purple-600 bg-clip-text text-transparent text-slate-900 dark:text-white">
          404
        </h1>

        <h2 className="text-2xl font-semibold mb-4 text-slate-900 dark:text-white">
          Page Not Found
        </h2>

        <p className="text-lg mb-8 text-slate-600 dark:text-slate-400">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/"
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium transition-all duration-200 hover:scale-105 bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:from-violet-600 hover:to-purple-700"
          >
            <Home className="w-5 h-5" />
            Go Home
          </Link>

          <BackButton />
        </div>
      </div>
    </div>
  );
}
