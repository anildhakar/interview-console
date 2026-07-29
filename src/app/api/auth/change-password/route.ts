import { NextRequest } from "next/server";
import { z } from "zod";
import { handleApi, jsonOk } from "@/lib/api";
import { getDb } from "@/lib/db";
import { findUserByUsername } from "@/lib/queries";
import { requireUser, hashPassword, verifyPassword, ApiError } from "@/lib/auth";

const schema = z.object({
  current_password: z.string().min(1),
  new_password: z.string().min(6, "New password must be at least 6 characters"),
});

export const POST = handleApi(async (req: NextRequest) => {
  const me = await requireUser();
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    throw new ApiError(400, parsed.error.issues[0]?.message ?? "Invalid input");
  }
  const full = findUserByUsername(me.username)!;
  if (!verifyPassword(parsed.data.current_password, full.password_hash)) {
    throw new ApiError(400, "Current password is incorrect");
  }
  getDb()
    .prepare(
      "UPDATE users SET password_hash = ?, must_change_password = 0 WHERE id = ?"
    )
    .run(hashPassword(parsed.data.new_password), me.id);
  return jsonOk();
});
