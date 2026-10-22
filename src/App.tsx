import { useState } from 'react';
import { Loader2, Cloud, ArrowLeft } from 'lucide-react';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import AuthPage from '@/pages/AuthPage';
import ProfileSetup from '@/pages/ProfileSetup';
import HomePage from '@/pages/HomePage';
import QuizPage from '@/pages/QuizPage';

type Page = 'home' | 'quiz' | 'progress';

function AppContent() {
  const { session, profile, loading } = useAuth();
  const [page, setPage] = useState<Page>('home');

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-sky-500/20">
          <Cloud className="w-7 h-7 text-white" />
        </div>
        <Loader2 className="w-6 h-6 text-sky-400 animate-spin" />
      </div>
    );
  }

  if (!session) {
    return <AuthPage />;
  }

  if (!profile) {
    return <ProfileSetup />;
  }

  if (page === 'quiz') {
    return (
      <QuizPage
        onNavigateHome={() => setPage('home')}
        onNavigateQuiz={() => setPage('quiz')}
        onNavigateProgress={() => setPage('progress')}
      />
    );
  }

  if (page === 'progress') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-950 via-slate-900 to-slate-950 flex flex-col">
        <header className="flex flex-wrap items-center justify-between gap-4 px-5 py-4 border-b border-white/5">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-sky-500 to-cyan-400 flex items-center justify-center">
              <Cloud className="w-5 h-5 text-white" />
            </div>
            <span className="text-white font-semibold text-sm sm:text-base">Azure Mwalimu</span>
          </div>
          <nav aria-label="Main navigation" className="flex items-center gap-1">
            <button onClick={() => setPage('home')} className="rounded-lg px-3 py-2 text-sm text-slate-400 hover:text-white transition-colors">Home</button>
            <button onClick={() => setPage('quiz')} className="rounded-lg px-3 py-2 text-sm text-slate-400 hover:text-white transition-colors">Quiz</button>
            <button aria-current="page" className="rounded-lg bg-white/10 px-3 py-2 text-sm text-white">My Progress</button>
          </nav>
        </header>
        <main className="flex flex-1 items-center justify-center px-5 py-12">
          <div className="max-w-md text-center">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-400">
              <ArrowLeft className="h-6 w-6 rotate-180" />
            </div>
            <h1 className="text-2xl font-bold text-white">Progress tracking is coming soon</h1>
            <p className="mt-3 text-slate-400">Your quiz answers are being saved. A progress dashboard will be available here soon.</p>
            <button onClick={() => setPage('quiz')} className="mt-6 rounded-xl bg-sky-500 px-5 py-3 font-semibold text-white transition-colors hover:bg-sky-400">Take a quiz</button>
          </div>
        </main>
        <footer className="border-t border-white/5 px-6 py-5 text-center">
          <p className="text-xs text-slate-600">Unofficial study tool. Not affiliated with Microsoft.</p>
        </footer>
      </div>
    );
  }

  return (
    <HomePage
      onStartQuiz={() => setPage('quiz')}
      onShowProgress={() => setPage('progress')}
      onNavigateHome={() => setPage('home')}
      onNavigateQuiz={() => setPage('quiz')}
      onNavigateProgress={() => setPage('progress')}
    />
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
