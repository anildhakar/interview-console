#!/usr/bin/env node
/**
 * Admin management CLI for Interview Console.
 *
 *   node scripts/admin.mjs
 *
 * Interactive menu to:
 *   - see whether an admin already exists
 *   - create a new admin account
 *   - promote an existing user to admin
 *   - reset an admin's password
 *
 * The app also auto-creates a default admin (username: admin / password: admin123)
 * on first run, which you're prompted to change at first login. Use this script
 * when you'd rather set the admin up explicitly, or to recover access.
 *
 * Honors DATA_DIR (defaults to ./data), the same as the app.
 */
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import path from "path";
import fs from "fs";
import readline from "readline";

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "app.db");

const CTRL_C = String.fromCharCode(3);
const BACKSPACE = String.fromCharCode(127);

// Minimal users-table DDL (matches the app). No-op if the app already created it.
const USERS_DDL = `
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
);`;

function openDb() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const db = new Database(DB_PATH);
  db.exec(USERS_DDL);
  const cols = db.prepare("PRAGMA table_info(users)").all();
  if (!cols.some((c) => c.name === "department")) {
    db.exec("ALTER TABLE users ADD COLUMN department TEXT");
  }
  return db;
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((res) => rl.question(q, (a) => res(a.trim())));

// Muted password input (no echo). Falls back to visible input on non-TTY.
function askHidden(q) {
  const stdin = process.stdin;
  if (!stdin.isTTY) return ask(q);
  return new Promise((res) => {
    process.stdout.write(q);
    let buf = "";
    const onData = (char) => {
      const s = char.toString();
      if (s === "\n" || s === "\r" || s === "") {
        stdin.setRawMode(false);
        stdin.removeListener("data", onData);
        process.stdout.write("\n");
        rl.resume();
        res(buf);
      } else if (s === CTRL_C) {
        process.stdout.write("\n");
        process.exit(1);
      } else if (s === BACKSPACE || s === "\b") {
        buf = buf.slice(0, -1);
      } else {
        buf += s;
      }
    };
    stdin.setRawMode(true);
    rl.pause();
    stdin.resume();
    stdin.on("data", onData);
  });
}

async function readPassword() {
  while (true) {
    const p1 = await askHidden("New password (min 6 chars): ");
    if (p1.length < 6) {
      console.log("  Too short, try again.");
      continue;
    }
    const p2 = await askHidden("Confirm password: ");
    if (p1 !== p2) {
      console.log("  Passwords didn't match, try again.");
      continue;
    }
    return p1;
  }
}

async function main() {
  const db = openDb();
  const admins = db
    .prepare("SELECT username, display_name, active FROM users WHERE role = 'admin' ORDER BY id")
    .all();

  console.log("\n=== Interview Console — Admin setup ===");
  console.log(`Database: ${DB_PATH}\n`);
  if (admins.length === 0) {
    console.log("No admin accounts exist yet.");
  } else {
    console.log("Existing admin account(s):");
    for (const a of admins) {
      console.log(`  - ${a.username} (${a.display_name})${a.active ? "" : " [inactive]"}`);
    }
  }

  const done = (msg) => {
    console.log("\n" + msg + "\n");
    rl.close();
  };

  console.log("\nWhat would you like to do?");
  console.log("  1) Create a new admin account");
  console.log("  2) Promote an existing user to admin");
  console.log("  3) Reset an admin's password");
  console.log("  4) List all users");
  console.log("  5) Quit");
  const choice = await ask("\nChoice [1-5]: ");

  if (choice === "1") {
    const username = await ask("Username: ");
    if (!username) return done("Username is required.");
    if (db.prepare("SELECT 1 FROM users WHERE username = ?").get(username)) {
      return done(`User "${username}" already exists. Use option 2 to promote them.`);
    }
    const name = (await ask("Full name: ")) || username;
    const pw = await readPassword();
    db.prepare(
      `INSERT INTO users (username, display_name, password_hash, role, must_change_password)
       VALUES (?, ?, ?, 'admin', 0)`
    ).run(username, name, bcrypt.hashSync(pw, 10));
    return done(`Admin "${username}" created. You can log in now.`);
  }

  if (choice === "2") {
    const username = await ask("Username to promote to admin: ");
    const user = db.prepare("SELECT username FROM users WHERE username = ?").get(username);
    if (!user) return done(`No user named "${username}".`);
    db.prepare("UPDATE users SET role = 'admin', active = 1 WHERE username = ?").run(username);
    return done(`"${username}" is now an admin.`);
  }

  if (choice === "3") {
    const username = await ask("Admin username to reset: ");
    const user = db
      .prepare("SELECT id FROM users WHERE username = ? AND role = 'admin'")
      .get(username);
    if (!user) return done(`No admin named "${username}".`);
    const pw = await readPassword();
    db.prepare(
      "UPDATE users SET password_hash = ?, must_change_password = 0, active = 1 WHERE username = ?"
    ).run(bcrypt.hashSync(pw, 10), username);
    try {
      db.prepare("DELETE FROM sessions WHERE user_id = ?").run(user.id);
    } catch {
      /* sessions table may not exist yet */
    }
    return done(`Password reset for "${username}".`);
  }

  if (choice === "4") {
    const users = db
      .prepare(
        "SELECT username, display_name, role, department, active FROM users ORDER BY role, username"
      )
      .all();
    console.log("\nUsers:");
    for (const u of users) {
      console.log(
        `  - ${u.username} — ${u.display_name} [${u.role}${u.department ? ", " + u.department : ""}]${u.active ? "" : " (inactive)"}`
      );
    }
    return rl.close();
  }

  rl.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
