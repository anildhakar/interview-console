import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getCandidate, listAssignableUsers } from "@/lib/queries";
import { getDb, getSettingJson } from "@/lib/db";
import { DEFAULT_ROUND_PRESETS } from "@/lib/types";
import { CandidateDetail } from "@/components/candidates/candidate-detail";
import type { RoundSummary } from "@/lib/pipeline";

export default async function CandidateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = (await getCurrentUser())!;
  const { id } = await params;
  const candidate = getCandidate(Number(id));
  if (!candidate) notFound();

  const rounds = getDb()
    .prepare(
      `SELECT r.id, r.round_number, r.title, r.status, r.interviewer_id,
              r.recommendation, r.overall_notes, r.completed_at,
              iv.display_name AS interviewer_name,
              (SELECT AVG(score) FROM round_questions WHERE round_id = r.id AND score IS NOT NULL) AS question_avg,
              (SELECT COUNT(*) FROM round_questions WHERE round_id = r.id) AS question_count,
              (SELECT AVG(score) FROM round_ratings WHERE round_id = r.id AND score IS NOT NULL) AS rating_avg
       FROM rounds r
       LEFT JOIN users iv ON iv.id = r.interviewer_id
       WHERE r.candidate_id = ?
       ORDER BY r.round_number ASC, r.created_at ASC`
    )
    .all(candidate.id) as (RoundSummary & {
    overall_notes: string | null;
    completed_at: string | null;
  })[];

  const interviewers = listAssignableUsers();
  const roundPresets = getSettingJson<string[]>(
    "round_presets",
    DEFAULT_ROUND_PRESETS
  );

  return (
    <CandidateDetail
      candidate={candidate}
      rounds={rounds}
      interviewers={interviewers.map((u) => ({
        id: u.id,
        display_name: u.display_name,
      }))}
      roundPresets={roundPresets}
      currentUser={{ id: user.id, role: user.role }}
    />
  );
}
