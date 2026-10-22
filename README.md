# Azure Mwalimu

Azure Mwalimu is an unofficial, mobile-first AZ-900 study app built with React, TypeScript, Vite, and Supabase. It includes account/profile setup, topic-based quizzes, saved answer attempts, and a readiness dashboard.

> Unofficial study tool. Not affiliated with Microsoft.

## Getting started

### Requirements

- Node.js and npm
- A Supabase project

### Install and run

```powershell
npm install
npm run dev
```

### Configure Supabase

Create a `.env` file in the project root with your project's URL and anon key:

```env
VITE_SUPABASE_URL=your-supabase-project-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

Do not commit `.env` or share its values. Restart the Vite development server after changing environment variables.

### Apply database migrations

The SQL migrations in `supabase/migrations` create the app schema, seed AZ-900 topics, and add sample questions. With the Supabase CLI installed and the project linked, apply pending migrations with:

```powershell
npx supabase@latest login
npx supabase@latest link --project-ref YOUR_PROJECT_REF
npx supabase@latest db push
```

Alternatively, run the migration SQL in the Supabase SQL Editor. The quiz requires the schema and sample-question migrations to have been applied.

## Available scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite development server |
| `npm run build` | Create a production build |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Check application TypeScript types |

## App features

- Supabase authentication and learner profile setup
- Topic and mixed AZ-900 quizzes with answer explanations
- Per-answer attempt saving and mistake review
- Readiness score, topic progress, and domain chart
- Targeted practice from the learner's weakest topics
- Exam countdown from the profile exam date

## Project layout

- `src/pages/` — Home, quiz, profile, authentication, and progress screens
- `src/context/` — Authentication context
- `src/lib/` — Supabase client and application types
- `supabase/migrations/` — Database schema and sample content migrations
- `prompts/` — Summaries of the project prompts used

