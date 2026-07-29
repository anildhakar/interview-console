export type Role = "admin" | "interviewer" | "hr";

export type CandidateStatus = "in_process" | "selected" | "rejected" | "on_hold";

export type RoundStatus = "pending" | "in_progress" | "completed";

export type Recommendation = "strong_yes" | "yes" | "no" | "strong_no";

export type Difficulty = "easy" | "medium" | "hard";

export type QuestionType =
  | "theory"
  | "practical"
  | "situational"
  | "architectural"
  | "debugging";

export const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];

export const QUESTION_TYPES: QuestionType[] = [
  "theory",
  "practical",
  "situational",
  "architectural",
  "debugging",
];

export const RECOMMENDATIONS: { value: Recommendation; label: string }[] = [
  { value: "strong_yes", label: "Strong Yes" },
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
  { value: "strong_no", label: "Strong No" },
];

export const CANDIDATE_STATUSES: { value: CandidateStatus; label: string }[] = [
  { value: "in_process", label: "In Process" },
  { value: "selected", label: "Selected" },
  { value: "rejected", label: "Rejected" },
  { value: "on_hold", label: "On Hold" },
];

export type Department = "Human Resources" | "Developer" | "Product";

export const ACCOUNT_TYPES: { value: Department; label: string; role: Role }[] = [
  { value: "Human Resources", label: "Human Resources", role: "hr" },
  { value: "Developer", label: "Developer", role: "interviewer" },
  { value: "Product", label: "Product", role: "interviewer" },
];

export interface User {
  id: number;
  username: string;
  display_name: string;
  role: Role;
  department: string | null;
  active: number;
  must_change_password: number;
  created_at: string;
}

export interface Candidate {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  current_company: string | null;
  experience_years: number | null;
  applied_role: string | null;
  notes: string | null;
  hr_notes: string | null;
  resume_url: string | null;
  resume_path: string | null;
  resume_filename: string | null;
  status: CandidateStatus;
  share_token: string | null;
  created_by: number | null;
  created_at: string;
}

export interface Round {
  id: number;
  candidate_id: number;
  round_number: number;
  title: string;
  interviewer_id: number | null;
  status: RoundStatus;
  recommendation: Recommendation | null;
  overall_notes: string | null;
  created_by: number | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

export interface QuestionBank {
  id: number;
  name: string;
  description: string | null;
  is_seed: number;
  created_at: string;
}

export interface Question {
  id: number;
  bank_id: number;
  category: string;
  difficulty: Difficulty;
  qtype: QuestionType;
  question: string;
  answer_hints: string | null;
  follow_ups: string | null; // JSON string array
  archived: number;
  created_at: string;
}

export interface RoundQuestion {
  id: number;
  round_id: number;
  question_id: number | null;
  question_text: string;
  category: string | null;
  difficulty: string | null;
  qtype: string | null;
  score: number | null;
  notes: string | null;
  sort_order: number;
  created_at: string;
}

export interface RoundRating {
  id: number;
  round_id: number;
  param_name: string;
  score: number | null;
  note: string | null;
  is_custom: number;
}

/** A saved set of questions that can be applied to a round in one action. */
export interface InterviewTemplate {
  id: number;
  name: string;
  description: string | null;
  created_by: number | null;
  created_by_name?: string | null;
  created_at: string;
  question_count?: number;
  questions?: Pick<
    Question,
    "id" | "question" | "category" | "difficulty" | "qtype"
  >[];
}

export const DEFAULT_RATING_PARAMS = [
  "Attitude",
  "Problem Solving",
  "Communication",
  "Fundamental Knowledge",
];

export const DEFAULT_ROUND_PRESETS = ["Tech Round 1", "Tech Round 2"];
