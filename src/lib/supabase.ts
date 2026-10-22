import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

export type Profile = {
  id: string;
  display_name: string | null;
  exam_date: string | null;
};

export type Topic = {
  id: string;
  name: string;
  domain: string;
  weight_percent: number;
};

export type Question = {
  id: string;
  topic_id: string;
  question_text: string;
  options: string[];
  correct_index: number;
  explanation: string;
  why_others_wrong: string[] | null;
  difficulty: string;
  african_example: string | null;
};

export type Attempt = {
  id: string;
  user_id: string;
  question_id: string;
  selected_index: number;
  is_correct: boolean;
  created_at: string;
};
