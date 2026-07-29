import { getDb, getSettingJson } from "./db";
import { getRound } from "./queries";
import { ApiError } from "./auth";
import type { Round, User } from "./types";
import { DEFAULT_RATING_PARAMS } from "./types";

/** Seed a new round's rating rows from the configured default parameters. */
export function seedRoundRatings(roundId: number) {
  const params = getSettingJson<string[]>("rating_params", DEFAULT_RATING_PARAMS);
  const stmt = getDb().prepare(
    "INSERT OR IGNORE INTO round_ratings (round_id, param_name, is_custom) VALUES (?, ?, 0)"
  );
  const tx = getDb().transaction(() => {
    for (const p of params) stmt.run(roundId, p);
  });
  tx();
}

/** A round can be edited by an admin or the assigned interviewer, while not completed. */
export function assertCanEditRound(round: Round, user: User): void {
  if (round.status === "completed") {
    throw new ApiError(403, "This round is completed and read-only");
  }
  if (user.role === "admin") return;
  if (user.role === "hr") {
    throw new ApiError(403, "HR accounts can view but not score interviews");
  }
  if (round.interviewer_id !== user.id) {
    throw new ApiError(403, "Only the assigned interviewer can edit this round");
  }
}

export function loadRoundOr404(id: number): Round {
  const round = getRound(id);
  if (!round) throw new ApiError(404, "Round not found");
  return round;
}
