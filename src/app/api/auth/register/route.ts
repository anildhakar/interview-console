import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { handleApi } from "@/lib/api";
import { getDb } from "@/lib/db";
import { findUserByUsername } from "@/lib/queries";
import {
  SESSION_COOKIE,
  createSession,
  hashPassword,
  ApiError,
} from "@/lib/auth";

const schema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(40)
    .regex(/^[a-zA-Z0-9_.-]+$/, "Use letters, numbers, . _ - only"),
  display_name: z.string().min(1, "Name is required").max(80),
  password: z.string().min(6, "Password must be at least 6 characters"),
  department: z.enum(["Human Resources", "Developer", "Product"]),
});

export const POST = handleApi(async (req: NextRequest) => {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    throw new ApiError(400, parsed.error.issues[0]?.message ?? "Invalid input");
  }
  const { username, display_name, password, department } = parsed.data;

  if (findUserByUsername(username.trim())) {
    throw new ApiError(409, "That username is already taken");
  }

  // HR staff get the hr role; developers and product folks are interviewers.
  const role = department === "Human Resources" ? "hr" : "interviewer";

  const info = getDb()
    .prepare(
      `INSERT INTO users (username, display_name, password_hash, role, department, must_change_password)
       VALUES (?, ?, ?, ?, ?, 0)`
    )
    .run(username.trim(), display_name.trim(), hashPassword(password), role, department);

  const userId = Number(info.lastInsertRowid);
  const { token, expires } = createSession(userId);
  const res = NextResponse.json({
    user: {
      id: userId,
      username: username.trim(),
      display_name: display_name.trim(),
      role,
      must_change_password: 0,
    },
  });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    expires,
    secure: process.env.NODE_ENV === "production" && process.env.HTTPS === "true",
  });
  return res;
});
