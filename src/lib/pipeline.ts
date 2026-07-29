import { getDb } from "./db";
import type { CandidateStatus, Recommendation, RoundStatus } from "./types";

export interface RoundSummary {
  id: number;
  round_number: number;
  title: string;
  status: RoundStatus;
  interviewer_id: number | null;
  interviewer_name: string | null;
  recommendation: Recommendation | null;
  question_avg: number | null;
  question_count: number;
  rating_avg: number | null;
}

export interface CandidateSummary {
  id: number;
  name: string;
  applied_role: string | null;
  current_company: string | null;
  experience_years: number | null;
  status: CandidateStatus;
  has_resume: number;
  share_token: string | null;
  created_by: number | null;
  created_by_name: string | null;
  created_at: string;
  rounds: RoundSummary[];
}

/** All candidates with their rounds + aggregates, for dashboard and list views. */
export function getCandidateSummaries(): CandidateSummary[] {
  const db = getDb();
  const candidates = db
    .prepare(
      `SELECT c.id, c.name, c.applied_role, c.current_company, c.experience_years,
              c.status, c.share_token, c.created_by, c.created_at,
              (c.resume_path IS NOT NULL) AS has_resume,
              u.display_name AS created_by_name
       FROM candidates c
       LEFT JOIN users u ON u.id = c.created_by
       ORDER BY c.created_at DESC`
    )
    .all() as Omit<CandidateSummary, "rounds">[];

  const roundStmt = db.prepare(
    `SELECT r.id, r.candidate_id, r.round_number, r.title, r.status,
            r.interviewer_id, r.recommendation,
            iv.display_name AS interviewer_name,
            (SELECT AVG(score) FROM round_questions WHERE round_id = r.id AND score IS NOT NULL) AS question_avg,
            (SELECT COUNT(*) FROM round_questions WHERE round_id = r.id) AS question_count,
            (SELECT AVG(score) FROM round_ratings WHERE round_id = r.id AND score IS NOT NULL) AS rating_avg
     FROM rounds r
     LEFT JOIN users iv ON iv.id = r.interviewer_id
     WHERE r.candidate_id = ?
     ORDER BY r.round_number ASC, r.created_at ASC`
  );

  return candidates.map((c) => ({
    ...c,
    rounds: roundStmt.all(c.id) as RoundSummary[],
  }));
}

export interface PipelineStats {
  total: number;
  selected: number;
  rejected: number;
  in_process: number;
  on_hold: number;
  rounds_in_progress: number;
  rounds_pending: number;
}

export function getPipelineStats(): PipelineStats {
  const db = getDb();
  const c = db
    .prepare(
      `SELECT
         COUNT(*) AS total,
         SUM(status = 'selected') AS selected,
         SUM(status = 'rejected') AS rejected,
         SUM(status = 'in_process') AS in_process,
         SUM(status = 'on_hold') AS on_hold
       FROM candidates`
    )
    .get() as Record<string, number | null>;
  const r = db
    .prepare(
      `SELECT
         SUM(status = 'in_progress') AS rounds_in_progress,
         SUM(status = 'pending') AS rounds_pending
       FROM rounds`
    )
    .get() as Record<string, number | null>;
  return {
    total: c.total ?? 0,
    selected: c.selected ?? 0,
    rejected: c.rejected ?? 0,
    in_process: c.in_process ?? 0,
    on_hold: c.on_hold ?? 0,
    rounds_in_progress: r.rounds_in_progress ?? 0,
    rounds_pending: r.rounds_pending ?? 0,
  };
}
