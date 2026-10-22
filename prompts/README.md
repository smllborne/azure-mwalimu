# Prompt summaries

This folder records concise summaries of the project prompts used during development. These are summaries, not verbatim transcripts.

## Planning and scoping

- Review the 1MillionDevs AZ-900 hackathon brief and judging criteria, then choose one project to build within the time left.
- Decide on a Quiz Builder plus Readiness Tracker core, with African-context explanations stored per question instead of a live chatbot, to reduce demo risk.
- Produce a step-by-step build plan covering setup, schema, prompts, quiz flow, dashboard, polish, README, demo and pitch.

## Application setup

- Scaffold the Vite + React + Supabase project, including the `prompts/` folder and README.
- Resolve the Vite startup error caused by missing project dependencies.

## Database schema

- Design Supabase tables for topics, questions and attempts, including question options, correct answer, explanations, difficulty and an African-example field.
- Add row-level security so learners can only read and write their own attempts while questions are readable by all.
- Seed topics from the public AZ-900 skills outline, grouped by exam domain with approximate weightings.

## Authentication and profile

- Add sign-in and a learner profile, including an exam date used by the countdown on the dashboard.
- Keep the flow low-friction so a learner can start practising quickly.

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

## Question accuracy review

- Re-check each generated question against current Azure documentation: confirm exactly one correct answer, flag outdated or ambiguous wording, check that distractors are plausible, and return a corrected version.
- Manually review flagged items before inserting them into the database.

## Documentation and submission (add once done)

- Write the README: problem, screenshots, features, stack, local setup, schema, the unofficial-tool disclaimer and a "How AI was used" section linking to this folder.
- Draft the pitch deck and demo script covering problem, solution, target users and scalability to other certifications.