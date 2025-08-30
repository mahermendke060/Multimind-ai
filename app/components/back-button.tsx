'use client';

import { ArrowLeft } from 'lucide-react';

export default function BackButton() {
  return (
    <button
      onClick={() => window.history.back()}
      className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium transition-all duration-200 hover:scale-105 border-2 border-slate-300 text-slate-600 hover:border-slate-400 hover:text-slate-700 dark:border-slate-600 dark:text-slate-300 dark:hover:border-slate-500 dark:hover:text-white"
    >
      <ArrowLeft className="w-5 h-5" />
      Go Back
    </button>
  );
}
