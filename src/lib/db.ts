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
import { SCHEMA } from "./schema.mjs";

export const DATA_DIR =
  process.env.DATA_DIR || path.join(process.cwd(), "data");
export const UPLOADS_DIR = path.join(DATA_DIR, "uploads");


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
