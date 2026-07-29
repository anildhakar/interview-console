import { cn } from "@/lib/utils";
import type {
  CandidateStatus,
  Difficulty,
  QuestionType,
  Recommendation,
  RoundStatus,
} from "@/lib/types";

const STATUS_STYLES: Record<CandidateStatus, string> = {
  in_process: "bg-chart-1/15 text-chart-1 border-chart-1/30",
  selected: "bg-success/15 text-success border-success/30",
  rejected: "bg-destructive/15 text-destructive border-destructive/30",
  on_hold: "bg-warning/15 text-warning border-warning/30",
};
const STATUS_LABELS: Record<CandidateStatus, string> = {
  in_process: "In Process",
  selected: "Selected",
  rejected: "Rejected",
  on_hold: "On Hold",
};

export function StatusBadge({ status }: { status: CandidateStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
        STATUS_STYLES[status]
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

const ROUND_STATUS_STYLES: Record<RoundStatus, string> = {
  pending: "bg-muted text-muted-foreground border-border",
  in_progress: "bg-chart-1/15 text-chart-1 border-chart-1/30",
  completed: "bg-success/15 text-success border-success/30",
};
const ROUND_STATUS_LABELS: Record<RoundStatus, string> = {
  pending: "Pending",
  in_progress: "In Progress",
  completed: "Completed",
};

export function RoundStatusBadge({ status }: { status: RoundStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
        ROUND_STATUS_STYLES[status]
      )}
    >
      {ROUND_STATUS_LABELS[status]}
    </span>
  );
}

const REC_STYLES: Record<Recommendation, string> = {
  strong_yes: "bg-success/15 text-success border-success/30",
  yes: "bg-success/10 text-success border-success/20",
  no: "bg-destructive/10 text-destructive border-destructive/20",
  strong_no: "bg-destructive/15 text-destructive border-destructive/30",
};
const REC_LABELS: Record<Recommendation, string> = {
  strong_yes: "Strong Yes",
  yes: "Yes",
  no: "No",
  strong_no: "Strong No",
};

export function RecommendationBadge({ value }: { value: Recommendation }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
        REC_STYLES[value]
      )}
    >
      {REC_LABELS[value]}
    </span>
  );
}

const DIFF_STYLES: Record<Difficulty, string> = {
  easy: "bg-success/15 text-success",
  medium: "bg-warning/15 text-warning",
  hard: "bg-destructive/15 text-destructive",
};

export function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        DIFF_STYLES[difficulty]
      )}
    >
      {difficulty}
    </span>
  );
}

export function TypeBadge({ qtype }: { qtype: QuestionType | string }) {
  return (
    <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium capitalize bg-secondary text-secondary-foreground">
      {qtype}
    </span>
  );
}

/** Color-graded 0–5 score chip. */
export function ScoreChip({ score }: { score: number | null }) {
  if (score === null || score === undefined) {
    return (
      <span className="inline-flex h-6 min-w-6 items-center justify-center rounded px-1 text-xs text-muted-foreground">
        —
      </span>
    );
  }
  const tone =
    score >= 4
      ? "bg-success/15 text-success"
      : score >= 2.5
        ? "bg-warning/15 text-warning"
        : "bg-destructive/15 text-destructive";
  return (
    <span
      className={cn(
        "inline-flex h-6 min-w-9 items-center justify-center rounded px-1.5 text-xs font-semibold tabular-nums",
        tone
      )}
    >
      {Number.isInteger(score) ? score : score.toFixed(1)}
    </span>
  );
}
