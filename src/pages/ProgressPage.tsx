import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Cell,
  Pie,
  PieChart,
  Tooltip,
} from 'recharts';
import { CalendarDays, ChartNoAxesColumnIncreasing, Cloud, Loader2, RotateCcw, Target } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase, type Topic } from '@/lib/supabase';

const domains = [
  'Cloud Concepts',
  'Azure Architecture & Services',
  'Azure Management & Governance',
] as const;

type ProgressPageProps = {
  onNavigateHome: () => void;
  onNavigateQuiz: () => void;
  onNavigateProgress: () => void;
  onTakeFirstQuiz: () => void;
  onPracticeTopics: (topicIds: string[]) => void;
};

type TopicProgress = Topic & {
  accuracy: number;
  attempts: number;
  questionsAnswered: number;
};

type JoinedTopic = Pick<Topic, 'id' | 'name' | 'domain' | 'weight_percent'>;
type JoinedAttempt = {
  id: string;
  question_id: string;
  is_correct: boolean;
  created_at: string;
  questions: {
    topic_id: string;
    topics: JoinedTopic | JoinedTopic[] | null;
  } | null;
};

type DomainProgress = {
  domain: string;
  accuracy: number;
  attempts: number;
  correct: number;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getJoinedTopic(value: unknown): JoinedTopic | null {
  const topic = Array.isArray(value) ? value[0] : value;
  if (
    !isObject(topic) ||
    typeof topic.id !== 'string' ||
    typeof topic.name !== 'string' ||
    typeof topic.domain !== 'string' ||
    typeof topic.weight_percent !== 'number'
  ) {
    return null;
  }
  return {
    id: topic.id,
    name: topic.name,
    domain: topic.domain,
    weight_percent: topic.weight_percent,
  };
}

function getJoinedAttempt(value: unknown): JoinedAttempt | null {
  if (
    !isObject(value) ||
    typeof value.id !== 'string' ||
    typeof value.question_id !== 'string' ||
    typeof value.is_correct !== 'boolean' ||
    typeof value.created_at !== 'string' ||
    !isObject(value.questions) ||
    typeof value.questions.topic_id !== 'string'
  ) {
    return null;
  }
  const topic = getJoinedTopic(value.questions.topics);
  if (!topic) return null;
  return {
    id: value.id,
    question_id: value.question_id,
    is_correct: value.is_correct,
    created_at: value.created_at,
    questions: { topic_id: value.questions.topic_id, topics: topic },
  };
}

function dateAtLocalMidnight(date: string): Date {
  return new Date(`${date.slice(0, 10)}T00:00:00`);
}

function getReadiness(score: number) {
  if (score < 50) return { label: 'Keep building', color: '#fb7185', className: 'text-rose-300' };
  if (score < 70) return { label: 'Getting there', color: '#fbbf24', className: 'text-amber-300' };
  if (score < 85) return { label: 'Almost ready', color: '#38bdf8', className: 'text-sky-300' };
  return { label: 'Exam ready', color: '#34d399', className: 'text-emerald-300' };
}

function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-white/10 bg-white/[0.04] p-5 shadow-xl shadow-black/10 sm:p-6 ${className}`}>{children}</section>;
}

export default function ProgressPage({
  onNavigateHome,
  onNavigateQuiz,
  onNavigateProgress,
  onTakeFirstQuiz,
  onPracticeTopics,
}: ProgressPageProps) {
  const { user, profile } = useAuth();
  const [topics, setTopics] = useState<TopicProgress[]>([]);
  const [domainProgress, setDomainProgress] = useState<DomainProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const loadProgress = useCallback(async () => {
    if (!user) {
      setError('Your session has expired. Please sign in again to view your progress.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const topicResponse = await supabase
        .from('topics')
        .select('id, name, domain, weight_percent')
        .order('domain')
        .order('name');
      if (topicResponse.error) throw new Error(topicResponse.error.message);

      const attemptCounts = new Map<string, number>();
      const topicAttemptCounts = new Map<string, { correct: number; total: number; questionIds: Set<string> }>();
      let offset = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error: attemptError } = await supabase
          .from('attempts')
          .select('id, question_id, is_correct, created_at, questions!inner(topic_id, topics!inner(id, name, domain, weight_percent))')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .order('id', { ascending: false })
          .range(offset, offset + pageSize - 1);
        if (attemptError) throw new Error(attemptError.message);

        const batch = data ?? [];
        const rows = batch.map((row) => getJoinedAttempt(row)).filter((row): row is JoinedAttempt => row !== null);
        for (const attempt of rows) {
          const counted = attemptCounts.get(attempt.question_id) ?? 0;
          if (counted >= 3 || !attempt.questions) continue;
          attemptCounts.set(attempt.question_id, counted + 1);
          const topic = getJoinedTopic(attempt.questions.topics);
          if (!topic) continue;
          const progress = topicAttemptCounts.get(topic.id) ?? { correct: 0, total: 0, questionIds: new Set<string>() };
          progress.total += 1;
          if (attempt.is_correct) progress.correct += 1;
          progress.questionIds.add(attempt.question_id);
          topicAttemptCounts.set(topic.id, progress);
        }

        hasMore = batch.length === pageSize;
        offset += pageSize;
      }

      const topicRows = (topicResponse.data ?? []) as Topic[];
      const topicProgressRows: TopicProgress[] = topicRows.map((topic) => {
        const progress = topicAttemptCounts.get(topic.id);
        return {
          ...topic,
          accuracy: progress ? (progress.correct / progress.total) * 100 : 0,
          attempts: progress?.total ?? 0,
          questionsAnswered: progress?.questionIds.size ?? 0,
        };
      });
      const byDomain = domains.map((domain) => {
        const domainTopics = topicProgressRows.filter((topic) => topic.domain === domain);
        const attempts = domainTopics.reduce((total, topic) => total + topic.attempts, 0);
        const correct = domainTopics.reduce((total, topic) => total + (topic.accuracy / 100) * topic.attempts, 0);
        return { domain, accuracy: attempts ? (correct / attempts) * 100 : 0, attempts, correct };
      });
      setTopics(topicProgressRows);
      setDomainProgress(byDomain);
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : 'An unexpected error occurred.';
      setError(`We couldn't load your readiness dashboard: ${message}`);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadProgress();
  }, [loadProgress, reloadKey]);

  const attemptedTopics = useMemo(() => topics.filter((topic) => topic.attempts > 0), [topics]);
  const readinessScore = useMemo(() => {
    const weightTotal = attemptedTopics.reduce((total, topic) => total + Math.max(topic.weight_percent, 0), 0);
    if (!weightTotal) return 0;
    return Math.round(attemptedTopics.reduce(
      (total, topic) => total + (topic.accuracy * Math.max(topic.weight_percent, 0)),
      0,
    ) / weightTotal);
  }, [attemptedTopics]);
  const readiness = getReadiness(readinessScore);
  const weakestTopics = useMemo(() => attemptedTopics
    .filter((topic) => topic.attempts >= 3)
    .sort((a, b) => a.accuracy - b.accuracy || a.name.localeCompare(b.name))
    .slice(0, 3), [attemptedTopics]);
  const examDays = useMemo(() => {
    if (!profile?.exam_date) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const examDate = dateAtLocalMidnight(profile.exam_date);
    if (Number.isNaN(examDate.getTime())) return null;
    return Math.round((examDate.getTime() - today.getTime()) / 86400000);
  }, [profile?.exam_date]);

  const totalCountedAttempts = attemptedTopics.reduce((total, topic) => total + topic.attempts, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-950 via-slate-900 to-slate-950 flex flex-col">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/5 px-5 py-4">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-cyan-400">
            <Cloud className="h-5 w-5 text-white" />
          </div>
          <span className="text-sm font-semibold text-white sm:text-base">Azure Mwalimu</span>
        </div>
        <nav aria-label="Main navigation" className="flex items-center gap-1">
          <button onClick={onNavigateHome} className="rounded-lg px-3 py-2 text-sm text-slate-400 transition-colors hover:text-white">Home</button>
          <button onClick={onNavigateQuiz} className="rounded-lg px-3 py-2 text-sm text-slate-400 transition-colors hover:text-white">Quiz</button>
          <button onClick={onNavigateProgress} aria-current="page" className="rounded-lg bg-white/10 px-3 py-2 text-sm text-white">My Progress</button>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-400">Your study overview</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">Readiness dashboard</h1>
            <p className="mt-2 text-slate-400">A snapshot of your practice, based on your recent answers.</p>
          </div>
          {examDays !== null ? (
            <div className="flex items-center gap-3 rounded-xl border border-sky-400/15 bg-sky-400/[0.06] px-4 py-3">
              <CalendarDays className="h-5 w-5 text-sky-300" />
              <div>
                <p className="text-xs text-slate-400">Exam countdown</p>
                <p className="text-sm font-semibold text-sky-200">
                  {examDays < 0 ? 'Exam date passed' : `${examDays} ${examDays === 1 ? 'day' : 'days'} to go`}
                </p>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-400">
              Add an exam date to your profile to see your countdown.
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex min-h-72 flex-col items-center justify-center gap-4 text-slate-300">
            <Loader2 className="h-8 w-8 animate-spin text-sky-400" />
            <p>Gathering your recent quiz results…</p>
          </div>
        ) : error ? (
          <Panel>
            <div role="alert" className="text-center">
              <h2 className="text-lg font-semibold text-white">Progress unavailable</h2>
              <p className="mt-2 text-sm text-rose-200">{error}</p>
              <button onClick={() => setReloadKey((key) => key + 1)} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-sky-500 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-sky-400">
                <RotateCcw className="h-4 w-4" /> Try again
              </button>
            </div>
          </Panel>
        ) : totalCountedAttempts === 0 ? (
          <Panel className="mx-auto mt-8 max-w-xl py-10 text-center sm:py-14">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-400/10 text-sky-300">
              <Target className="h-7 w-7" />
            </div>
            <h2 className="mt-5 text-2xl font-bold text-white">Your progress starts with one question</h2>
            <p className="mx-auto mt-3 max-w-md text-slate-400">Take a quiz to see your AZ-900 readiness score, topic strengths, and areas to practise.</p>
            <button onClick={onTakeFirstQuiz} className="mt-7 rounded-xl bg-sky-500 px-6 py-3 font-semibold text-white transition-colors hover:bg-sky-400">Take your first quiz</button>
          </Panel>
        ) : (
          <div className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
              <Panel>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="font-semibold text-white">Overall readiness</h2>
                    <p className="mt-1 text-xs text-slate-500">Weighted by AZ-900 topic exam coverage</p>
                  </div>
                  <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300">
                    Topics covered: {attemptedTopics.length} of {topics.length}
                  </span>
                </div>
                <div className="relative mx-auto mt-3 h-48 max-w-sm">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[{ value: readinessScore }, { value: 100 - readinessScore }]}
                        dataKey="value"
                        startAngle={180}
                        endAngle={0}
                        cx="50%"
                        cy="88%"
                        innerRadius="72%"
                        outerRadius="94%"
                        stroke="none"
                        isAnimationActive
                      >
                        <Cell fill={readiness.color} />
                        <Cell fill="rgba(148,163,184,0.16)" />
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-x-0 top-[42%] text-center">
                    <p className={`text-5xl font-bold tracking-tight ${readiness.className}`}>{readinessScore}<span className="text-2xl">%</span></p>
                    <p className={`mt-1 font-semibold ${readiness.className}`}>{readiness.label}</p>
                  </div>
                </div>
                <p className="mt-2 text-center text-xs leading-relaxed text-slate-500">
                  The real AZ-900 pass mark is 700/1000. This is an unofficial estimate, not a prediction.
                </p>
                <p className="mt-3 text-center text-xs text-slate-500">{totalCountedAttempts} recent answers counted · max 3 per question</p>
              </Panel>

              <Panel>
                <div className="mb-2">
                  <h2 className="font-semibold text-white">Accuracy by domain</h2>
                  <p className="mt-1 text-xs text-slate-500">Recent answers, up to 3 attempts per question</p>
                </div>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={domainProgress} outerRadius="72%">
                      <PolarGrid stroke="rgba(148,163,184,0.2)" />
                      <PolarAngleAxis dataKey="domain" tick={{ fill: '#cbd5e1', fontSize: 10 }} />
                      <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
                      <Radar dataKey="accuracy" name="Accuracy" stroke="#38bdf8" fill="#0ea5e9" fillOpacity={0.32} />
                      <Tooltip
                        formatter={(value) => [`${Math.round(Number(value))}%`, 'Accuracy']}
                        contentStyle={{ background: '#0f172a', border: '1px solid rgba(148,163,184,0.2)', borderRadius: 12, color: '#e2e8f0' }}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </Panel>
            </div>

            <Panel>
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-400/10 text-sky-300">
                  <ChartNoAxesColumnIncreasing className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-semibold text-white">Topic progress</h2>
                  <p className="mt-1 text-xs text-slate-500">Accuracy uses only each question’s 3 most recent answers.</p>
                </div>
              </div>
              <div className="space-y-7">
                {domains.map((domain) => {
                  const domainTopics = topics.filter((topic) => topic.domain === domain);
                  return (
                    <section key={domain}>
                      <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{domain}</h3>
                      <div className="space-y-4">
                        {domainTopics.map((topic) => (
                          <div key={topic.id}>
                            <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-sm">
                              <span className={topic.attempts ? 'font-medium text-slate-200' : 'text-slate-500'}>{topic.name}</span>
                              {topic.attempts ? (
                                <span className="text-xs text-slate-400">
                                  {Math.round(topic.accuracy)}% · {topic.questionsAnswered} {topic.questionsAnswered === 1 ? 'question' : 'questions'} answered
                                </span>
                              ) : (
                                <span className="text-xs text-slate-500">Not started</span>
                              )}
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-white/10">
                              <div
                                className={`h-full rounded-full transition-all duration-700 ${topic.accuracy < 50 ? 'bg-rose-400' : topic.accuracy < 70 ? 'bg-amber-300' : 'bg-sky-400'}`}
                                style={{ width: `${topic.accuracy}%` }}
                              />
                            </div>
                            {topic.attempts > 0 && <p className="mt-1 text-right text-[11px] text-slate-600">{topic.attempts} counted answers</p>}
                          </div>
                        ))}
                      </div>
                    </section>
                  );
                })}
              </div>
            </Panel>

            <Panel>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-300">Targeted practice</p>
                  <h2 className="mt-1 text-xl font-semibold text-white">Weakest 3 topics</h2>
                  <p className="mt-1 text-sm text-slate-400">Topics are ranked by accuracy, with at least 3 counted answers.</p>
                </div>
                {weakestTopics.length > 0 && (
                  <button
                    onClick={() => onPracticeTopics(weakestTopics.map((topic) => topic.id))}
                    className="shrink-0 rounded-xl border border-sky-400/25 bg-sky-400/10 px-5 py-3 text-sm font-semibold text-sky-200 transition-colors hover:bg-sky-400/15"
                  >
                    Practice these
                  </button>
                )}
              </div>
              {weakestTopics.length ? (
                <ol className="mt-5 space-y-3">
                  {weakestTopics.map((topic, index) => (
                    <li key={topic.id} className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-400/10 text-sm font-semibold text-amber-300">{index + 1}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium text-slate-200">{topic.name}</span>
                        <span className="text-xs text-slate-500">{topic.domain}</span>
                      </span>
                      <span className="font-semibold text-amber-200">{Math.round(topic.accuracy)}%</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="mt-5 rounded-xl border border-white/5 bg-white/[0.02] p-4 text-sm text-slate-400">
                  Answer at least 3 questions in a topic to unlock targeted practice recommendations.
                </p>
              )}
            </Panel>
          </div>
        )}
      </main>

      <footer className="border-t border-white/5 px-6 py-5 text-center">
        <p className="text-xs text-slate-600">Unofficial study tool. Not affiliated with Microsoft.</p>
      </footer>
    </div>
  );
}
