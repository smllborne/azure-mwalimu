import { Suspense, lazy, useState } from 'react';
import { Loader2, Cloud } from 'lucide-react';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import AuthPage from '@/pages/AuthPage';
import ProfileSetup from '@/pages/ProfileSetup';
import HomePage from '@/pages/HomePage';
import QuizPage from '@/pages/QuizPage';
const ProgressPage = lazy(() => import('@/pages/ProgressPage'));

type Page = 'home' | 'quiz' | 'progress';

function AppContent() {
  const { session, profile, loading } = useAuth();
  const [page, setPage] = useState<Page>('home');
  const [quizTopicIds, setQuizTopicIds] = useState<string[] | undefined>();

  function navigateToQuiz() {
    setQuizTopicIds(undefined);
    setPage('quiz');
  }

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
        initialTopicIds={quizTopicIds}
        onNavigateHome={() => setPage('home')}
        onNavigateQuiz={navigateToQuiz}
        onNavigateProgress={() => setPage('progress')}
      />
    );
  }

  if (page === 'progress') {
    return (
      <Suspense fallback={
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4 text-slate-300">
          <Loader2 className="h-8 w-8 animate-spin text-sky-400" />
          <p>Loading your readiness dashboard…</p>
        </div>
      }>
        <ProgressPage
          onNavigateHome={() => setPage('home')}
          onNavigateQuiz={navigateToQuiz}
          onNavigateProgress={() => setPage('progress')}
          onTakeFirstQuiz={navigateToQuiz}
          onPracticeTopics={(topicIds) => {
            setQuizTopicIds(topicIds);
            setPage('quiz');
          }}
        />
      </Suspense>
    );
  }

  return (
    <HomePage
      onStartQuiz={navigateToQuiz}
      onShowProgress={() => setPage('progress')}
      onNavigateHome={() => setPage('home')}
      onNavigateQuiz={navigateToQuiz}
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
