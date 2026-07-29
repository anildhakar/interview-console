import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import path from "path";
import fs from "fs";
import {
  DEFAULT_RATING_PARAMS,
  DEFAULT_ROUND_PRESETS,
} from "./types";
import seedHtml from "./seed/html.json";
import seedCss from "./seed/css.json";
import seedJavascript from "./seed/javascript.json";
import seedReact from "./seed/react.json";
import seedWebFundamentals from "./seed/web-fundamentals.json";
import seedTelephonic from "./seed/telephonic.json";

export const DATA_DIR =
  process.env.DATA_DIR || path.join(process.cwd(), "data");
export const UPLOADS_DIR = path.join(DATA_DIR, "uploads");

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE COLLATE NOCASE,
  display_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'interviewer' CHECK (role IN ('admin','interviewer','hr')),
  department TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  must_change_password INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS candidates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  current_company TEXT,
  experience_years REAL,
  applied_role TEXT,
  notes TEXT,
  hr_notes TEXT,
  resume_url TEXT,
  resume_path TEXT,
  resume_filename TEXT,
  status TEXT NOT NULL DEFAULT 'in_process' CHECK (status IN ('in_process','selected','rejected','on_hold')),
  share_token TEXT UNIQUE,
  created_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS rounds (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  candidate_id INTEGER NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  interviewer_id INTEGER REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed')),
  recommendation TEXT CHECK (recommendation IN ('strong_yes','yes','no','strong_no')),
  overall_notes TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  started_at TEXT,
  completed_at TEXT
);

CREATE TABLE IF NOT EXISTS question_banks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_seed INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bank_id INTEGER NOT NULL REFERENCES question_banks(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('easy','medium','hard')),
  qtype TEXT NOT NULL CHECK (qtype IN ('theory','practical','situational','architectural','debugging')),
  question TEXT NOT NULL,
  answer_hints TEXT,
  follow_ups TEXT,
  archived INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS round_questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  round_id INTEGER NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  question_id INTEGER REFERENCES questions(id) ON DELETE SET NULL,
  question_text TEXT NOT NULL,
  category TEXT,
  difficulty TEXT,
  qtype TEXT,
  score INTEGER CHECK (score BETWEEN 0 AND 5),
  notes TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS round_ratings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  round_id INTEGER NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  param_name TEXT NOT NULL,
  score INTEGER CHECK (score BETWEEN 0 AND 5),
  note TEXT,
  is_custom INTEGER NOT NULL DEFAULT 0,
  UNIQUE (round_id, param_name)
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS candidate_batches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token TEXT NOT NULL UNIQUE,
  title TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS candidate_batch_items (
  batch_id INTEGER NOT NULL REFERENCES candidate_batches(id) ON DELETE CASCADE,
  candidate_id INTEGER NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (batch_id, candidate_id)
);

-- Starred questions, per user.
CREATE TABLE IF NOT EXISTS question_favorites (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, question_id)
);

-- Reusable sets of questions that can be applied to a round in one go.
CREATE TABLE IF NOT EXISTS interview_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS interview_template_items (
  template_id INTEGER NOT NULL REFERENCES interview_templates(id) ON DELETE CASCADE,
  question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (template_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_user ON question_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_template_items ON interview_template_items(template_id);
CREATE INDEX IF NOT EXISTS idx_rounds_candidate ON rounds(candidate_id);
CREATE INDEX IF NOT EXISTS idx_rounds_interviewer ON rounds(interviewer_id);
CREATE INDEX IF NOT EXISTS idx_questions_bank ON questions(bank_id);
CREATE INDEX IF NOT EXISTS idx_round_questions_round ON round_questions(round_id);
CREATE INDEX IF NOT EXISTS idx_round_ratings_round ON round_ratings(round_id);
`;

/** Add columns to existing installs without dropping data. Idempotent. */
function migrate(db: Database.Database) {
  const columnMigrations: { table: string; column: string; ddl: string }[] = [
    { table: "users", column: "department", ddl: "ALTER TABLE users ADD COLUMN department TEXT" },
    { table: "candidates", column: "hr_notes", ddl: "ALTER TABLE candidates ADD COLUMN hr_notes TEXT" },
    { table: "candidates", column: "resume_url", ddl: "ALTER TABLE candidates ADD COLUMN resume_url TEXT" },
    { table: "round_ratings", column: "note", ddl: "ALTER TABLE round_ratings ADD COLUMN note TEXT" },
  ];
  for (const m of columnMigrations) {
    const cols = db.prepare(`PRAGMA table_info(${m.table})`).all() as {
      name: string;
    }[];
    if (!cols.some((c) => c.name === m.column)) {
      db.exec(m.ddl);
    }
  }
}

interface SeedQuestion {
  category: string;
  difficulty: string;
  qtype: string;
  question: string;
  answer_hints?: string;
  follow_ups?: string[];
}

/** Create a seed bank with its questions if a bank of that name doesn't exist. */
function ensureSeedBank(
  db: Database.Database,
  name: string,
  description: string,
  questions: SeedQuestion[]
) {
  const existing = db
    .prepare("SELECT id FROM question_banks WHERE name = ?")
    .get(name);
  if (existing) return;

  const bank = db
    .prepare(
      "INSERT INTO question_banks (name, description, is_seed) VALUES (?, ?, 1)"
    )
    .run(name, description);
  const insertQ = db.prepare(
    `INSERT INTO questions (bank_id, category, difficulty, qtype, question, answer_hints, follow_ups)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );
  const insertAll = db.transaction((qs: SeedQuestion[]) => {
    for (const q of qs) {
      insertQ.run(
        bank.lastInsertRowid,
        q.category,
        q.difficulty,
        q.qtype,
        q.question,
        q.answer_hints ?? null,
        q.follow_ups && q.follow_ups.length ? JSON.stringify(q.follow_ups) : null
      );
    }
  });
  insertAll(questions);
}

function seed(db: Database.Database) {
  const userCount = db
    .prepare("SELECT COUNT(*) AS c FROM users")
    .get() as { c: number };
  if (userCount.c === 0) {
    db.prepare(
      `INSERT INTO users (username, display_name, password_hash, role, must_change_password)
       VALUES ('admin', 'Admin', ?, 'admin', 1)`
    ).run(bcrypt.hashSync("admin123", 10));
  }

  const setSetting = db.prepare(
    "INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)"
  );
  setSetting.run("rating_params", JSON.stringify(DEFAULT_RATING_PARAMS));
  setSetting.run("round_presets", JSON.stringify(DEFAULT_ROUND_PRESETS));
  setSetting.run("default_theme", "graphite");

  // Built-in banks — added if missing, so existing installs pick up new ones.
  ensureSeedBank(
    db,
    "Frontend Core",
    "Built-in bank covering HTML, CSS, JavaScript, React and Web Fundamentals across easy/medium/hard levels.",
    [
      ...(seedHtml as SeedQuestion[]),
      ...(seedCss as SeedQuestion[]),
      ...(seedJavascript as SeedQuestion[]),
      ...(seedReact as SeedQuestion[]),
      ...(seedWebFundamentals as SeedQuestion[]),
    ]
  );
  ensureSeedBank(
    db,
    "Telephonic Screening",
    "Questions for phone screens: background, technical screening, collaboration, ownership and culture fit.",
    seedTelephonic as SeedQuestion[]
  );

  // One-time: add a "Telephonic Round" preset to the round presets.
  const flag = db
    .prepare("SELECT value FROM settings WHERE key = 'telephonic_preset_added'")
    .get() as { value: string } | undefined;
  if (!flag) {
    const row = db
      .prepare("SELECT value FROM settings WHERE key = 'round_presets'")
      .get() as { value: string } | undefined;
    let presets: string[] = DEFAULT_ROUND_PRESETS;
    try {
      if (row) presets = JSON.parse(row.value);
    } catch {
      /* keep default */
    }
    if (!presets.includes("Telephonic Round")) {
      presets = ["Telephonic Round", ...presets];
    }
    db.prepare(
      "INSERT INTO settings (key, value) VALUES ('round_presets', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
    ).run(JSON.stringify(presets));
    db.prepare(
      "INSERT OR IGNORE INTO settings (key, value) VALUES ('telephonic_preset_added', '1')"
    ).run();
  }
}

function createDb(): Database.Database {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  const db = new Database(path.join(DATA_DIR, "app.db"));
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(SCHEMA);
  migrate(db);
  seed(db);
  return db;
}

// Cache on globalThis so Next.js dev-mode HMR doesn't open a new handle per reload.
const globalForDb = globalThis as unknown as { __icDb?: Database.Database };

export function getDb(): Database.Database {
  if (!globalForDb.__icDb) {
    globalForDb.__icDb = createDb();
  }
  return globalForDb.__icDb;
}

export function getSetting(key: string): string | null {
  const row = getDb()
    .prepare("SELECT value FROM settings WHERE key = ?")
    .get(key) as { value: string } | undefined;
  return row?.value ?? null;
}

export function getSettingJson<T>(key: string, fallback: T): T {
  const raw = getSetting(key);
  if (raw === null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function setSetting(key: string, value: string) {
  getDb()
    .prepare(
      "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
    )
    .run(key, value);
}
