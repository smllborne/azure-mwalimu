import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Check, Cloud, Loader2, RotateCcw, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase, type Question, type Topic } from '@/lib/supabase';

const domains = [
  'Cloud Concepts',
  'Azure Architecture & Services',
  'Azure Management & Governance',
] as const;

type QuizPageProps = {
  initialTopicIds?: string[];
  onNavigateHome: () => void;
  onNavigateQuiz: () => void;
  onNavigateProgress: () => void;
};

type TopicGroup = Topic & { topicIds: string[]; questionCount: number };
type AnswerResult = { questionId: string; selectedIndex: number; isCorrect: boolean };
type QuizStage = 'picker' | 'playing' | 'summary';

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

export default function QuizPage({ initialTopicIds, onNavigateHome, onNavigateQuiz, onNavigateProgress }: QuizPageProps) {
  const { user } = useAuth();
  const [topics, setTopics] = useState<TopicGroup[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [stage, setStage] = useState<QuizStage>('picker');
  const [quizQuestions, setQuizQuestions] = useState<Question[]>([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'failed'>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [results, setResults] = useState<AnswerResult[]>([]);
  const [isReview, setIsReview] = useState(false);
  const answerChosenRef = useRef(false);
  const saveInFlightRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function loadQuizData() {
      setLoading(true);
      setLoadError(null);
      const [topicResponse, questionResponse] = await Promise.all([
        supabase.from('topics').select('id, name, domain, weight_percent'),
        supabase
          .from('questions')
          .select('id, topic_id, question_text, options, correct_index, explanation, why_others_wrong, difficulty, african_example')
          .order('question_text'),
      ]);

      if (cancelled) return;
      if (topicResponse.error || questionResponse.error) {
        setLoadError(`We couldn't load quiz content: ${topicResponse.error?.message ?? questionResponse.error?.message ?? 'Unknown error'}`);
        setLoading(false);
        return;
      }

      const validQuestions: Question[] = [];
      for (const row of questionResponse.data ?? []) {
        const options: unknown = row.options;
        const reasons: unknown = row.why_others_wrong;
        if (
          typeof row.id === 'string' &&
          typeof row.topic_id === 'string' &&
          typeof row.question_text === 'string' &&
          isStringArray(options) &&
          options.length === 4 &&
          typeof row.correct_index === 'number' &&
          row.correct_index >= 0 &&
          row.correct_index < options.length &&
          typeof row.explanation === 'string'
        ) {
          validQuestions.push({
            id: row.id,
            topic_id: row.topic_id,
            question_text: row.question_text,
            options,
            correct_index: row.correct_index,
            explanation: row.explanation,
            why_others_wrong: isStringArray(reasons) ? reasons : null,
            difficulty: typeof row.difficulty === 'string' ? row.difficulty : 'medium',
            african_example: typeof row.african_example === 'string' ? row.african_example : null,
          });
        }
      }

      const questionCounts = new Map<string, number>();
      for (const question of validQuestions) {
        questionCounts.set(question.topic_id, (questionCounts.get(question.topic_id) ?? 0) + 1);
      }
      const groupedTopics = new Map<string, TopicGroup>();
      for (const topic of topicResponse.data ?? []) {
        const key = `${topic.domain}\u0000${topic.name}`;
        const existing = groupedTopics.get(key);
        if (existing) {
          existing.topicIds.push(topic.id);
          existing.questionCount += questionCounts.get(topic.id) ?? 0;
        } else {
          groupedTopics.set(key, {
            id: topic.id,
            topicIds: [topic.id],
            name: topic.name,
            domain: topic.domain,
            weight_percent: topic.weight_percent,
            questionCount: questionCounts.get(topic.id) ?? 0,
          });
        }
      }
      setTopics([...groupedTopics.values()].sort((a, b) => a.name.localeCompare(b.name)));
      setQuestions(validQuestions);
      if (initialTopicIds?.length) {
        const practiceQuestions = validQuestions
          .filter((question) => initialTopicIds.includes(question.topic_id))
          .sort(() => Math.random() - 0.5);
        if (practiceQuestions.length) {
          setQuizQuestions(practiceQuestions);
          setQuestionIndex(0);
          setIsReview(false);
          setStage('playing');
        } else {
          setLoadError('There are no quiz questions available for these topics yet.');
        }
      }
      setLoading(false);
    }

    void loadQuizData();
    return () => {
      cancelled = true;
    };
  }, [initialTopicIds]);

  const currentQuestion = quizQuestions[questionIndex];
  const percentage = quizQuestions.length ? Math.round((results.filter((result) => result.isCorrect).length / quizQuestions.length) * 100) : 0;
  const groupedTopics = useMemo(() => domains.map((domain) => ({
    domain,
    topics: topics.filter((topic) => topic.domain === domain),
  })), [topics]);

  function beginQuiz(topicId: string | null) {
    const picked = topicId
      ? questions.filter((question) => {
        const topic = topics.find((item) => item.id === topicId);
        return topic?.topicIds.includes(question.topic_id);
      })
      : [...questions].sort(() => Math.random() - 0.5);
    if (picked.length === 0) return;
    setQuizQuestions(picked);
    setQuestionIndex(0);
    setSelectedAnswer(null);
    setSaveStatus('idle');
    setSaveError(null);
    setResults([]);
    setIsReview(false);
    answerChosenRef.current = false;
    setStage('playing');
  }

  async function saveAnswer(question: Question, answerIndex: number) {
    if (saveInFlightRef.current || saveStatus === 'saved') return;
    if (!user) {
      setSaveStatus('failed');
      setSaveError('Your answer could not be saved because your session has expired. Please sign in again.');
      return;
    }
    saveInFlightRef.current = true;
    setSaveStatus('saving');
    setSaveError(null);
    const isCorrect = answerIndex === question.correct_index;
    try {
      const { error } = await supabase.from('attempts').insert({
        user_id: user.id,
        question_id: question.id,
        selected_index: answerIndex,
        is_correct: isCorrect,
      });
      if (error) {
        setSaveStatus('failed');
        setSaveError(`Your answer couldn't be saved: ${error.message}`);
        return;
      }
      setSaveStatus('saved');
      setResults((previous) => [...previous, { questionId: question.id, selectedIndex: answerIndex, isCorrect }]);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An unexpected error occurred.';
      setSaveStatus('failed');
      setSaveError(`Your answer couldn't be saved: ${message}`);
    } finally {
      saveInFlightRef.current = false;
    }
  }

  function selectAnswer(answerIndex: number) {
    if (!currentQuestion || answerChosenRef.current || selectedAnswer !== null || saveStatus === 'saving') return;
    answerChosenRef.current = true;
    setSelectedAnswer(answerIndex);
    void saveAnswer(currentQuestion, answerIndex);
  }

  function retrySave() {
    if (currentQuestion && selectedAnswer !== null) {
      void saveAnswer(currentQuestion, selectedAnswer);
    }
  }

  function goToNextQuestion() {
    if (saveStatus !== 'saved') return;
    if (questionIndex + 1 < quizQuestions.length) {
      setQuestionIndex(questionIndex + 1);
      setSelectedAnswer(null);
      setSaveStatus('idle');
      setSaveError(null);
      answerChosenRef.current = false;
    } else {
      setStage('summary');
    }
  }

  function reviewMistakes() {
    const incorrectIds = new Set(results.filter((result) => !result.isCorrect).map((result) => result.questionId));
    const wrongQuestions = quizQuestions.filter((question) => incorrectIds.has(question.id));
    if (!wrongQuestions.length) return;
    setQuizQuestions(wrongQuestions);
    setQuestionIndex(0);
    setSelectedAnswer(null);
    setSaveStatus('idle');
    setSaveError(null);
    setResults([]);
    setIsReview(true);
    answerChosenRef.current = false;
    setStage('playing');
  }

  const displayError = loadError;

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-950 via-slate-900 to-slate-950 flex flex-col">
      <header className="flex flex-wrap items-center justify-between gap-4 px-5 py-4 border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-sky-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-sky-500/20">
            <Cloud className="w-5 h-5 text-white" />
          </div>
          <span className="text-white font-semibold text-sm sm:text-base">Azure Mwalimu</span>
        </div>
        <nav aria-label="Main navigation" className="flex items-center gap-1">
          <button onClick={onNavigateHome} className="rounded-lg px-3 py-2 text-sm text-slate-400 hover:text-white transition-colors">Home</button>
          <button onClick={onNavigateQuiz} aria-current="page" className="rounded-lg bg-white/10 px-3 py-2 text-sm text-white">Quiz</button>
          <button onClick={onNavigateProgress} className="rounded-lg px-3 py-2 text-sm text-slate-400 hover:text-white transition-colors">My Progress</button>
        </nav>
      </header>

      <main className="w-full max-w-3xl flex-1 self-center px-4 py-8 sm:px-6 sm:py-12">
        {loading ? (
          <div className="flex min-h-64 flex-col items-center justify-center gap-4 text-slate-300">
            <Loader2 className="h-8 w-8 animate-spin text-sky-400" />
            <p>Loading your quiz…</p>
          </div>
        ) : displayError ? (
          <div role="alert" className="rounded-2xl border border-rose-400/20 bg-rose-400/10 p-6 text-rose-200">
            <h1 className="font-semibold">Quiz unavailable</h1>
            <p className="mt-2 text-sm">{displayError}</p>
          </div>
        ) : stage === 'picker' ? (
          <section className="animate-[fade-in_300ms_ease-out]">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-400">Practice</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">Choose your quiz</h1>
            <p className="mt-3 text-slate-400">Pick a topic to focus your practice, or mix questions from every domain.</p>
            <button onClick={() => beginQuiz(null)} disabled={questions.length === 0} className="mt-7 flex w-full items-center justify-between rounded-2xl border border-sky-400/30 bg-sky-400/10 p-5 text-left transition-all hover:border-sky-300/60 hover:bg-sky-400/15 disabled:cursor-not-allowed disabled:opacity-50">
              <span>
                <span className="block font-semibold text-white">Mixed quiz</span>
                <span className="mt-1 block text-sm text-slate-400">Questions from all three domains</span>
              </span>
              <span className="rounded-full bg-sky-300/10 px-3 py-1 text-sm font-medium text-sky-300">{questions.length}</span>
            </button>
            <div className="mt-8 space-y-8">
              {groupedTopics.map(({ domain, topics: domainTopics }) => (
                <section key={domain}>
                  <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{domain}</h2>
                  <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
                    {domainTopics.map((topic) => (
                      <button key={topic.id} onClick={() => beginQuiz(topic.id)} disabled={!topic.questionCount} className="flex w-full items-center justify-between gap-4 border-b border-white/5 px-4 py-4 text-left last:border-b-0 transition-colors hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-45 sm:px-5">
                        <span className="font-medium text-slate-200">{topic.name}</span>
                        <span className="shrink-0 rounded-full bg-white/5 px-3 py-1 text-xs text-slate-400">{topic.questionCount} {topic.questionCount === 1 ? 'question' : 'questions'}</span>
                      </button>
                    ))}
                    {domainTopics.length === 0 && <p className="px-4 py-4 text-sm text-slate-500">No topics available yet.</p>}
                  </div>
                </section>
              ))}
            </div>
            {questions.length === 0 && <p className="mt-6 text-sm text-amber-300">No questions are available yet. Please try again later.</p>}
          </section>
        ) : stage === 'playing' && currentQuestion ? (
          <section key={`${currentQuestion.id}-${questionIndex}`} className="animate-[fade-in_250ms_ease-out]">
            <button onClick={() => setStage('picker')} className="mb-6 inline-flex items-center gap-2 text-sm text-slate-400 transition-colors hover:text-white">
              <ArrowLeft className="h-4 w-4" /> Choose another quiz
            </button>
            <div className="mb-6 flex items-center justify-between text-sm">
              <span className="font-medium text-slate-300">{isReview ? 'Review mistakes' : 'Quiz'} · {questionIndex + 1} of {quizQuestions.length}</span>
              <span className="rounded-full bg-white/5 px-3 py-1 text-xs capitalize text-slate-400">{currentQuestion.difficulty}</span>
            </div>
            <div className="mb-8 h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-gradient-to-r from-sky-500 to-cyan-400 transition-all duration-500" style={{ width: `${((questionIndex + 1) / quizQuestions.length) * 100}%` }} />
            </div>
            <article className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 shadow-xl shadow-black/10 sm:p-8">
              <h1 className="text-xl font-semibold leading-relaxed text-white sm:text-2xl">{currentQuestion.question_text}</h1>
              <div className="mt-6 space-y-3">
                {currentQuestion.options.map((option, index) => {
                  const answered = selectedAnswer !== null;
                  const isCorrectOption = index === currentQuestion.correct_index;
                  const isSelectedWrong = index === selectedAnswer && !isCorrectOption;
                  const optionStyle = !answered
                    ? 'border-white/10 bg-white/[0.03] text-slate-200 hover:border-sky-400/50 hover:bg-sky-400/5'
                    : isCorrectOption
                      ? 'border-emerald-400/50 bg-emerald-400/10 text-emerald-100'
                      : isSelectedWrong
                        ? 'border-rose-400/50 bg-rose-400/10 text-rose-100'
                        : 'border-white/5 bg-white/[0.02] text-slate-500';
                  return (
                    <button key={option} disabled={answered || saveStatus === 'saving'} onClick={() => selectAnswer(index)} className={`flex w-full items-start gap-3 rounded-xl border p-4 text-left transition-all duration-200 ${optionStyle}`}>
                      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-semibold ${answered && isCorrectOption ? 'bg-emerald-400/20 text-emerald-300' : answered && isSelectedWrong ? 'bg-rose-400/20 text-rose-300' : 'bg-white/10 text-slate-400'}`}>
                        {answered && isCorrectOption ? <Check className="h-4 w-4" /> : answered && isSelectedWrong ? <X className="h-4 w-4" /> : String.fromCharCode(65 + index)}
                      </span>
                      <span className="pt-0.5">{option}</span>
                    </button>
                  );
                })}
              </div>
              {selectedAnswer !== null && (
                <div className="mt-6 space-y-4 border-t border-white/10 pt-5">
                  <div>
                    <h2 className="font-semibold text-white">Explanation</h2>
                    <p className="mt-2 text-sm leading-relaxed text-slate-300">{currentQuestion.explanation}</p>
                  </div>
                  {currentQuestion.why_others_wrong && (
                    <div>
                      <h2 className="font-semibold text-white">Why the other options are wrong</h2>
                      <ul className="mt-2 space-y-2 text-sm text-slate-400">
                        {currentQuestion.options.map((option, index) => index !== currentQuestion.correct_index && (
                          <li key={option}><span className="font-medium text-slate-300">{option}:</span> {currentQuestion.why_others_wrong?.[index] || 'This option does not answer the question.'}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {currentQuestion.african_example && (
                    <details className="group rounded-xl border border-sky-400/15 bg-sky-400/[0.04] p-4">
                      <summary className="cursor-pointer list-none font-medium text-sky-300 marker:hidden">
                        <span className="flex items-center justify-between">Real-life example <span className="transition-transform group-open:rotate-180">⌄</span></span>
                      </summary>
                      <p className="mt-3 text-sm leading-relaxed text-slate-300">{currentQuestion.african_example}</p>
                    </details>
                  )}
                  {saveError && (
                    <div role="alert" className="rounded-xl border border-rose-400/30 bg-rose-400/10 p-4 text-sm text-rose-200">
                      <p>{saveError}</p>
                      <button onClick={retrySave} disabled={saveStatus === 'saving'} className="mt-3 inline-flex items-center gap-2 font-semibold text-rose-100 underline underline-offset-4 disabled:opacity-60">
                        {saveStatus === 'saving' && <Loader2 className="h-4 w-4 animate-spin" />} Retry saving answer
                      </button>
                    </div>
                  )}
                  {saveStatus === 'saving' && <p role="status" className="text-sm text-sky-300">Saving your answer…</p>}
                  <button onClick={goToNextQuestion} disabled={saveStatus !== 'saved'} className="flex w-full items-center justify-center rounded-xl bg-sky-500 px-5 py-3 font-semibold text-white transition-colors hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50">
                    {questionIndex + 1 === quizQuestions.length ? 'See results' : 'Next'}
                  </button>
                </div>
              )}
            </article>
          </section>
        ) : (
          <section className="animate-[fade-in_300ms_ease-out] rounded-2xl border border-white/10 bg-white/[0.04] p-6 text-center sm:p-10">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-400">Quiz complete</p>
            <h1 className="mt-3 text-3xl font-bold text-white">Nice work!</h1>
            <p className="mt-3 text-slate-400">You scored <span className="font-semibold text-white">{results.filter((result) => result.isCorrect).length} of {quizQuestions.length}</span></p>
            <p className="mt-5 text-5xl font-bold text-sky-300">{percentage}<span className="text-2xl">%</span></p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              {results.some((result) => !result.isCorrect) && (
                <button onClick={reviewMistakes} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 px-5 py-3 font-semibold text-white transition-colors hover:bg-white/5">
                  <RotateCcw className="h-4 w-4" /> Review mistakes
                </button>
              )}
              <button onClick={() => setStage('picker')} className="rounded-xl bg-sky-500 px-5 py-3 font-semibold text-white transition-colors hover:bg-sky-400">Try another topic</button>
            </div>
          </section>
        )}
      </main>

      <footer className="border-t border-white/5 px-6 py-5 text-center">
        <p className="text-xs text-slate-600">Unofficial study tool. Not affiliated with Microsoft.</p>
      </footer>
    </div>
  );
}
