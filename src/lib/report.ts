import { getDb } from "./db";
import { getCandidateByShareToken } from "./queries";
import type {
  Candidate,
  CandidateStatus,
  Recommendation,
  RoundQuestion,
  RoundRating,
  RoundStatus,
} from "./types";

export interface ReportRound {
  id: number;
  round_number: number;
  title: string;
  status: RoundStatus;
  interviewer_name: string | null;
  recommendation: Recommendation | null;
  overall_notes: string | null;
  completed_at: string | null;
  question_avg: number | null;
  rating_avg: number | null;
  questions: RoundQuestion[];
  ratings: RoundRating[];
}

export interface Report {
  candidate: {
    id: number;
    name: string;
    applied_role: string | null;
    current_company: string | null;
    experience_years: number | null;
    status: CandidateStatus;
    resume_url: string | null;
  };
  rounds: ReportRound[];
  overallQuestionAvg: number | null;
}

/** Build the full report for a candidate row. */
function buildReport(candidate: Candidate): Report {
  const db = getDb();
  const rounds = db
    .prepare(
      `SELECT r.id, r.round_number, r.title, r.status, r.recommendation,
              r.overall_notes, r.completed_at,
              iv.display_name AS interviewer_name,
              (SELECT AVG(score) FROM round_questions WHERE round_id = r.id AND score IS NOT NULL) AS question_avg,
              (SELECT AVG(score) FROM round_ratings WHERE round_id = r.id AND score IS NOT NULL) AS rating_avg
       FROM rounds r LEFT JOIN users iv ON iv.id = r.interviewer_id
       WHERE r.candidate_id = ?
       ORDER BY r.round_number ASC, r.created_at ASC`
    )
    .all(candidate.id) as Omit<ReportRound, "questions" | "ratings">[];

  const qStmt = db.prepare(
    "SELECT * FROM round_questions WHERE round_id = ? ORDER BY sort_order ASC, id ASC"
  );
  const rStmt = db.prepare(
    "SELECT * FROM round_ratings WHERE round_id = ? ORDER BY id ASC"
  );

  const fullRounds: ReportRound[] = rounds.map((r) => ({
    ...r,
    questions: qStmt.all(r.id) as RoundQuestion[],
    ratings: rStmt.all(r.id) as RoundRating[],
  }));

  const all = fullRounds.flatMap((r) =>
    r.questions.filter((q) => q.score !== null).map((q) => q.score as number)
  );
  const overallQuestionAvg =
    all.length > 0 ? all.reduce((s, n) => s + n, 0) / all.length : null;

  return {
    candidate: {
      id: candidate.id,
      name: candidate.name,
      applied_role: candidate.applied_role,
      current_company: candidate.current_company,
      experience_years: candidate.experience_years,
      status: candidate.status,
      resume_url: candidate.resume_url,
    },
    rounds: fullRounds,
    overallQuestionAvg,
  };
}

/** Single-candidate public report by share token. */
export function getReport(token: string): Report | null {
  const candidate = getCandidateByShareToken(token);
  if (!candidate) return null;
  return buildReport(candidate);
}

export interface BatchReport {
  title: string | null;
  created_at: string;
  reports: Report[];
}

/** Batch public report by batch token — all selected candidates. */
export function getBatchReport(token: string): BatchReport | null {
  const db = getDb();
  const batch = db
    .prepare("SELECT id, title, created_at FROM candidate_batches WHERE token = ?")
    .get(token) as { id: number; title: string | null; created_at: string } | undefined;
  if (!batch) return null;

  const candidates = db
    .prepare(
      `SELECT c.* FROM candidate_batch_items i
       JOIN candidates c ON c.id = i.candidate_id
       WHERE i.batch_id = ?
       ORDER BY i.sort_order ASC, c.name COLLATE NOCASE`
    )
    .all(batch.id) as Candidate[];

  return {
    title: batch.title,
    created_at: batch.created_at,
    reports: candidates.map(buildReport),
  };
}
