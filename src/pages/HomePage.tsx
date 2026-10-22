import { Cloud, Play, ChartBar, MessageCircle, LogOut, Calendar } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function HomePage() {
  const { profile, signOut } = useAuth();

  const daysUntilExam = (() => {
    if (!profile?.exam_date) return null;
    const target = new Date(profile.exam_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  })();

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-950 via-slate-900 to-slate-950 flex flex-col">
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-sky-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-sky-500/20">
            <Cloud className="w-5 h-5 text-white" />
          </div>
          <span className="text-white font-semibold text-sm sm:text-base">Azure Mwalimu</span>
        </div>
        <button
          onClick={signOut}
          className="flex items-center gap-2 text-slate-400 hover:text-white text-sm font-medium transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Sign Out</span>
        </button>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="text-center max-w-lg mx-auto mb-10">
          {profile?.display_name && (
            <p className="text-sky-400/80 text-sm font-medium mb-2">Welcome back, {profile.display_name}</p>
          )}
          <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight mb-3">Azure Mwalimu</h1>
          <p className="text-slate-400 text-lg">Unofficial AZ-900 Prep</p>

          {daysUntilExam !== null && (
            <div className="inline-flex items-center gap-2 mt-5 px-4 py-2 bg-sky-500/10 border border-sky-500/20 rounded-full">
              <Calendar className="w-4 h-4 text-sky-400" />
              <span className="text-sky-300 text-sm font-medium">
                {daysUntilExam > 0
                  ? `${daysUntilExam} days until your exam`
                  : daysUntilExam === 0
                    ? 'Your exam is today — good luck!'
                    : 'Exam day has passed — keep studying!'}
              </span>
            </div>
          )}
        </div>

        <div className="w-full max-w-md space-y-4">
          <button className="group w-full p-5 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl text-left hover:bg-white/10 hover:border-sky-500/30 transition-all flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-500/20 to-cyan-500/20 border border-sky-500/20 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
              <Play className="w-6 h-6 text-sky-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-white font-semibold text-base">Start Quiz</h3>
              <p className="text-slate-500 text-sm mt-0.5">Test your knowledge with practice questions</p>
            </div>
          </button>

          <button className="group w-full p-5 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl text-left hover:bg-white/10 hover:border-sky-500/30 transition-all flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/20 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
              <ChartBar className="w-6 h-6 text-emerald-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-white font-semibold text-base">My Progress</h3>
              <p className="text-slate-500 text-sm mt-0.5">Track your scores and identify weak areas</p>
            </div>
          </button>

          <button className="group w-full p-5 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl text-left hover:bg-white/10 hover:border-sky-500/30 transition-all flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/20 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
              <MessageCircle className="w-6 h-6 text-amber-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-white font-semibold text-base">Ask Mwalimu</h3>
              <p className="text-slate-500 text-sm mt-0.5">Get explanations for tricky cloud concepts</p>
            </div>
          </button>
        </div>
      </main>

      <footer className="px-6 py-5 border-t border-white/5 text-center">
        <p className="text-slate-600 text-xs">Unofficial study tool. Not affiliated with Microsoft.</p>
      </footer>
    </div>
  );
}
