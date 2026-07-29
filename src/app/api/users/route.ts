import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { handleApi } from "@/lib/api";
import { getDb } from "@/lib/db";
import { listUsers, findUserByUsername } from "@/lib/queries";
import { requireUser, hashPassword, ApiError } from "@/lib/auth";

export const GET = handleApi(async () => {
  await requireUser(["admin"]);
  return NextResponse.json({ users: listUsers() });
});

const createSchema = z.object({
  username: z
    .string()
    .min(3)
    .max(40)
    .regex(/^[a-zA-Z0-9_.-]+$/, "Use letters, numbers, . _ - only"),
  display_name: z.string().min(1).max(80),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["admin", "interviewer", "hr"]),
  department: z.enum(["Human Resources", "Developer", "Product"]).nullable().optional(),
});

export const POST = handleApi(async (req: NextRequest) => {
  await requireUser(["admin"]);
  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) {
    throw new ApiError(400, parsed.error.issues[0]?.message ?? "Invalid input");
  }
  const { username, display_name, password, role, department } = parsed.data;
  if (findUserByUsername(username.trim())) {
    throw new ApiError(409, "That username is already taken");
  }
  const info = getDb()
    .prepare(
      `INSERT INTO users (username, display_name, password_hash, role, department, must_change_password)
       VALUES (?, ?, ?, ?, ?, 1)`
    )
    .run(username.trim(), display_name.trim(), hashPassword(password), role, department ?? null);
  return NextResponse.json({ id: Number(info.lastInsertRowid) }, { status: 201 });
});
