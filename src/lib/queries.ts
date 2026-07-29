import { getDb } from "./db";
import type {
  Candidate,
  Question,
  QuestionBank,
  Round,
  RoundQuestion,
  RoundRating,
  User,
} from "./types";

// ---------- Users ----------
export function findUserByUsername(username: string) {
  return getDb()
    .prepare("SELECT * FROM users WHERE username = ?")
    .get(username) as (User & { password_hash: string }) | undefined;
}

export function getUserById(id: number) {
  return getDb()
    .prepare(
      "SELECT id, username, display_name, role, department, active, must_change_password, created_at FROM users WHERE id = ?"
    )
    .get(id) as User | undefined;
}

export function listUsers(): User[] {
  return getDb()
    .prepare(
      "SELECT id, username, display_name, role, department, active, must_change_password, created_at FROM users ORDER BY created_at ASC"
    )
    .all() as User[];
}

/** Active users usable as interviewers (for assignment dropdowns). */
export function listAssignableUsers(): User[] {
  return getDb()
    .prepare(
      "SELECT id, username, display_name, role, department, active, must_change_password, created_at FROM users WHERE active = 1 AND role IN ('admin','interviewer') ORDER BY display_name COLLATE NOCASE"
    )
    .all() as User[];
}

// ---------- Candidates ----------
export function listCandidates(): Candidate[] {
  return getDb()
    .prepare("SELECT * FROM candidates ORDER BY created_at DESC")
    .all() as Candidate[];
}

export function getCandidate(id: number): Candidate | undefined {
  return getDb()
    .prepare("SELECT * FROM candidates WHERE id = ?")
    .get(id) as Candidate | undefined;
}

export function getCandidateByShareToken(token: string): Candidate | undefined {
  return getDb()
    .prepare("SELECT * FROM candidates WHERE share_token = ?")
    .get(token) as Candidate | undefined;
}

// ---------- Rounds ----------
export function listRoundsForCandidate(candidateId: number): Round[] {
  return getDb()
    .prepare(
      "SELECT * FROM rounds WHERE candidate_id = ? ORDER BY round_number ASC, created_at ASC"
    )
    .all(candidateId) as Round[];
}

export function getRound(id: number): Round | undefined {
  return getDb()
    .prepare("SELECT * FROM rounds WHERE id = ?")
    .get(id) as Round | undefined;
}

export function getRoundQuestions(roundId: number): RoundQuestion[] {
  return getDb()
    .prepare(
      "SELECT * FROM round_questions WHERE round_id = ? ORDER BY sort_order ASC, id ASC"
    )
    .all(roundId) as RoundQuestion[];
}

export function getRoundRatings(roundId: number): RoundRating[] {
  return getDb()
    .prepare(
      "SELECT * FROM round_ratings WHERE round_id = ? ORDER BY id ASC"
    )
    .all(roundId) as RoundRating[];
}

/** Aggregate: average of scored questions for a round (or null). */
export function roundQuestionAverage(roundId: number): number | null {
  const row = getDb()
    .prepare(
      "SELECT AVG(score) AS avg FROM round_questions WHERE round_id = ? AND score IS NOT NULL"
    )
    .get(roundId) as { avg: number | null };
  return row.avg;
}

// ---------- Question banks ----------
export function listBanks(): QuestionBank[] {
  return getDb()
    .prepare("SELECT * FROM question_banks ORDER BY is_seed DESC, name COLLATE NOCASE")
    .all() as QuestionBank[];
}

export function getBank(id: number): QuestionBank | undefined {
  return getDb()
    .prepare("SELECT * FROM question_banks WHERE id = ?")
    .get(id) as QuestionBank | undefined;
}

export function getBankByName(name: string): QuestionBank | undefined {
  return getDb()
    .prepare("SELECT * FROM question_banks WHERE name = ?")
    .get(name) as QuestionBank | undefined;
}

export function listQuestions(bankId: number, includeArchived = false): Question[] {
  const sql = includeArchived
    ? "SELECT * FROM questions WHERE bank_id = ? ORDER BY category, difficulty, id"
    : "SELECT * FROM questions WHERE bank_id = ? AND archived = 0 ORDER BY category, difficulty, id";
  return getDb().prepare(sql).all(bankId) as Question[];
}

/** Question ids the given user has starred. */
export function listFavoriteQuestionIds(userId: number): number[] {
  return (
    getDb()
      .prepare("SELECT question_id FROM question_favorites WHERE user_id = ?")
      .all(userId) as { question_id: number }[]
  ).map((r) => r.question_id);
}

export function listAllActiveQuestions(): (Question & { bank_name: string })[] {
  return getDb()
    .prepare(
      `SELECT q.*, b.name AS bank_name
       FROM questions q JOIN question_banks b ON b.id = q.bank_id
       WHERE q.archived = 0
       ORDER BY b.name, q.category, q.difficulty`
    )
    .all() as (Question & { bank_name: string })[];
}
