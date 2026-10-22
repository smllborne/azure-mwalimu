/*
# Azure Mwalimu – AZ-900 Prep: Schema + RLS + Seed

## Overview
Creates four tables for an AZ-900 study app with Supabase email auth.
Users see only their own attempts and profiles; topics and questions are
shared reference content readable by all authenticated users.

## Tables

### 1. profiles
- `id` (uuid, PK, matches auth.users.id via FK)
- `display_name` (text, nullable)
- `exam_date` (date, nullable — user's target AZ-900 exam date)
- `created_at` (timestamptz, default now())

### 2. topics
- `id` (uuid, PK)
- `name` (text, not null — sub-topic name)
- `domain` (text, not null — one of 3 AZ-900 domains)
- `weight_percent` (int, not null — approximate exam weight)

### 3. questions
- `id` (uuid, PK)
- `topic_id` (uuid, FK → topics.id ON DELETE CASCADE)
- `question_text` (text, not null)
- `options` (jsonb, not null — array of answer choices)
- `correct_index` (int, not null — index into options array)
- `explanation` (text, not null — why the correct answer is right)
- `why_others_wrong` (jsonb, nullable — explanations for wrong options)
- `difficulty` (text, not null, default 'medium' — easy|medium|hard)
- `african_example` (text, nullable — real-world African context example)

### 4. attempts
- `id` (uuid, PK)
- `user_id` (uuid, not null, DEFAULT auth.uid(), FK → auth.users.id ON DELETE CASCADE)
- `question_id` (uuid, not null, FK → questions.id ON DELETE CASCADE)
- `selected_index` (int, not null)
- `is_correct` (boolean, not null)
- `created_at` (timestamptz, default now())

## Security (RLS)
All tables have RLS enabled with explicit GRANT statements.

- **profiles**: owner-scoped CRUD — id = auth.uid(). GRANT SELECT, INSERT, UPDATE, DELETE to authenticated.
- **topics**: SELECT to authenticated only (shared reference data). GRANT SELECT to authenticated.
- **questions**: SELECT to authenticated only (shared reference data). GRANT SELECT to authenticated.
- **attempts**: owner-scoped CRUD — user_id defaults to auth.uid(). GRANT SELECT, INSERT, UPDATE, DELETE to authenticated.

## Seed Data
Inserts 10 topics across the 3 AZ-900 domains with approximate exam weights.
*/

-- =========================================================
-- 1. profiles
-- =========================================================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  exam_date date,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON profiles TO authenticated;

DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "delete_own_profile" ON profiles;
CREATE POLICY "delete_own_profile" ON profiles FOR DELETE
  TO authenticated USING (auth.uid() = id);

-- =========================================================
-- 2. topics
-- =========================================================
CREATE TABLE IF NOT EXISTS topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  domain text NOT NULL CHECK (domain IN ('Cloud Concepts', 'Azure Architecture & Services', 'Azure Management & Governance')),
  weight_percent int NOT NULL DEFAULT 0
);

ALTER TABLE topics ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON topics TO authenticated;

DROP POLICY IF EXISTS "select_topics" ON topics;
CREATE POLICY "select_topics" ON topics FOR SELECT
  TO authenticated USING (true);

-- =========================================================
-- 3. questions
-- =========================================================
CREATE TABLE IF NOT EXISTS questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id uuid NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  question_text text NOT NULL,
  options jsonb NOT NULL,
  correct_index int NOT NULL,
  explanation text NOT NULL,
  why_others_wrong jsonb,
  difficulty text NOT NULL DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
  african_example text
);

ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON questions TO authenticated;

DROP POLICY IF EXISTS "select_questions" ON questions;
CREATE POLICY "select_questions" ON questions FOR SELECT
  TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_questions_topic_id ON questions(topic_id);

-- =========================================================
-- 4. attempts
-- =========================================================
CREATE TABLE IF NOT EXISTS attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  selected_index int NOT NULL,
  is_correct boolean NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE attempts ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON attempts TO authenticated;

DROP POLICY IF EXISTS "select_own_attempts" ON attempts;
CREATE POLICY "select_own_attempts" ON attempts FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_attempts" ON attempts;
CREATE POLICY "insert_own_attempts" ON attempts FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_attempts" ON attempts;
CREATE POLICY "update_own_attempts" ON attempts FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_attempts" ON attempts;
CREATE POLICY "delete_own_attempts" ON attempts FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_attempts_user_id ON attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_attempts_question_id ON attempts(question_id);

-- =========================================================
-- Seed topics from AZ-900 skills outline
-- =========================================================
INSERT INTO topics (name, domain, weight_percent) VALUES
  ('Cloud Computing Overview', 'Cloud Concepts', 10),
  ('Benefits of Cloud Computing', 'Cloud Concepts', 10),
  ('Cloud Service Types (IaaS, PaaS, SaaS)', 'Cloud Concepts', 10),
  ('Core Azure Architectural Components', 'Azure Architecture & Services', 10),
  ('Azure Compute & Networking Services', 'Azure Architecture & Services', 12),
  ('Azure Storage Services', 'Azure Architecture & Services', 10),
  ('Azure Identity, Access & Security', 'Azure Architecture & Services', 8),
  ('Cost Management in Azure', 'Azure Management & Governance', 10),
  ('Governance & Compliance', 'Azure Management & Governance', 10),
  ('Monitoring, Troubleshooting & Deployment Tools', 'Azure Management & Governance', 10)
ON CONFLICT DO NOTHING;