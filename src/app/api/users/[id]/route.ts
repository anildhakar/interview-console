import { NextRequest } from "next/server";
import { z } from "zod";
import { handleApi, jsonOk } from "@/lib/api";
import { getDb } from "@/lib/db";
import { getUserById } from "@/lib/queries";
import { requireUser, hashPassword, ApiError } from "@/lib/auth";

const schema = z.object({
  display_name: z.string().min(1).max(80).optional(),
  role: z.enum(["admin", "interviewer", "hr"]).optional(),
  department: z.enum(["Human Resources", "Developer", "Product"]).nullable().optional(),
  active: z.boolean().optional(),
  new_password: z.string().min(6, "Password must be at least 6 characters").optional(),
});

export const PATCH = handleApi(
  async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    const me = await requireUser(["admin"]);
    const { id } = await ctx.params;
    const userId = Number(id);
    const target = getUserById(userId);
    if (!target) throw new ApiError(404, "User not found");

    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) {
      throw new ApiError(400, parsed.error.issues[0]?.message ?? "Invalid input");
    }
    const data = parsed.data;

    // Guard: don't let an admin lock themselves out.
    if (me.id === userId && (data.active === false || data.role === "hr" || data.role === "interviewer")) {
      throw new ApiError(400, "You can't change your own role or deactivate yourself");
    }

    const db = getDb();
    if (data.display_name !== undefined) {
      db.prepare("UPDATE users SET display_name = ? WHERE id = ?").run(
        data.display_name.trim(),
        userId
      );
    }
    if (data.role !== undefined) {
      db.prepare("UPDATE users SET role = ? WHERE id = ?").run(data.role, userId);
    }
    if (data.department !== undefined) {
      db.prepare("UPDATE users SET department = ? WHERE id = ?").run(
        data.department,
        userId
      );
    }
    if (data.active !== undefined) {
      db.prepare("UPDATE users SET active = ? WHERE id = ?").run(
        data.active ? 1 : 0,
        userId
      );
      if (!data.active) {
        // Revoke sessions of a deactivated user.
        db.prepare("DELETE FROM sessions WHERE user_id = ?").run(userId);
      }
    }
    if (data.new_password !== undefined) {
      db.prepare(
        "UPDATE users SET password_hash = ?, must_change_password = 1 WHERE id = ?"
      ).run(hashPassword(data.new_password), userId);
      // Force re-login after an admin reset.
      db.prepare("DELETE FROM sessions WHERE user_id = ?").run(userId);
    }
    return jsonOk();
  }
);
