# Prompt summaries

This folder records concise summaries of the project prompts used during development. These are summaries, not verbatim transcripts.

## Application setup

- Resolve the Vite startup error caused by missing project dependencies.

## Quiz experience

- Preserve the working authentication and profile flows.
- Seed six original AZ-900 questions, two per exam domain, linked to existing topics and fully populated with choices, answer explanations, difficulty, and African examples.
- Build topic and mixed quiz selection, one-question-at-a-time answering, feedback, answer persistence, score summary, mistake review, and navigation.
- Keep the interface mobile-first and retain the Microsoft non-affiliation footer.

## Database and migration troubleshooting

- Investigate why the quiz reports that no questions are available.
- Explain how to use the Supabase CLI when it is not installed as a global command.

## Readiness dashboard

- Use the logged-in learner's attempts joined with questions and topics.
- Count only each question's three most recent attempts; calculate topic accuracy and a normalized, topic-weighted readiness score.
- Show score bands, topic coverage, domain radar chart, topic progress, weakest-topic practice, exam countdown, loading/error states, and an empty state.
- Use Recharts and reuse the existing quiz flow for targeted practice.

## Home page

- Remove the Ask Mwalimu chat-buddy card while keeping quiz and progress navigation.

## AZ-900 study content prompt

- Create original questions based only on the public Microsoft Learn AZ-900 skills outline, without reproducing real exam or braindump content.
- The selected database topic was **Cloud Computing Overview**. The requested first batch was to identify 20 distinct skills/concepts and write five questions for skills 1–5, using varied formats and difficulty, with African scenarios and a strict JSON-array output format.

