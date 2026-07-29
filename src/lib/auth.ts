import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { getDb } from "./db";
import type { Role, User } from "./types";
import { SESSION_COOKIE } from "./constants";

export { SESSION_COOKIE };
const SESSION_DAYS = 30;

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10);
}

export function verifyPassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}

export function createSession(userId: number): { token: string; expires: Date } {
  const token = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  getDb()
    .prepare("INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)")
    .run(token, userId, expires.toISOString());
  return { token, expires };
}

export function destroySession(token: string) {
  getDb().prepare("DELETE FROM sessions WHERE token = ?").run(token);
}

export async function getCurrentUser(): Promise<User | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const db = getDb();
  const row = db
    .prepare(
      `SELECT u.id, u.username, u.display_name, u.role, u.department, u.active, u.must_change_password, u.created_at
       FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token = ? AND s.expires_at > datetime('now') AND u.active = 1`
    )
    .get(token) as User | undefined;
  return row ?? null;
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/** For API routes: returns the user or throws an ApiError (caught by handleApi). */
export async function requireUser(roles?: Role[]): Promise<User> {
  const user = await getCurrentUser();
  if (!user) throw new ApiError(401, "Not signed in");
  if (roles && !roles.includes(user.role)) {
    throw new ApiError(403, "You don't have permission to do this");
  }
  return user;
}

export function generateShareToken(): string {
  return crypto.randomBytes(24).toString("base64url");
}
