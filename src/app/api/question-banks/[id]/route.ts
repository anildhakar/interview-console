import { NextRequest } from "next/server";
import { z } from "zod";
import { handleApi, jsonOk } from "@/lib/api";
import { getDb } from "@/lib/db";
import { getBank } from "@/lib/queries";
import { requireUser, ApiError } from "@/lib/auth";

const schema = z.object({
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(1000).nullable().optional(),
});

export const PATCH = handleApi(
  async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    await requireUser(["admin", "interviewer"]);
    const { id } = await ctx.params;
    const bank = getBank(Number(id));
    if (!bank) throw new ApiError(404, "Bank not found");

    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) {
      throw new ApiError(400, parsed.error.issues[0]?.message ?? "Invalid input");
    }
    const db = getDb();
    if (parsed.data.name !== undefined) {
      db.prepare("UPDATE question_banks SET name = ? WHERE id = ?").run(
        parsed.data.name.trim(),
        bank.id
      );
    }
    if (parsed.data.description !== undefined) {
      db.prepare("UPDATE question_banks SET description = ? WHERE id = ?").run(
        parsed.data.description,
        bank.id
      );
    }
    return jsonOk();
  }
);

export const DELETE = handleApi(
  async (_req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    await requireUser(["admin", "interviewer"]);
    const { id } = await ctx.params;
    const bank = getBank(Number(id));
    if (!bank) throw new ApiError(404, "Bank not found");
    if (bank.is_seed) throw new ApiError(400, "The built-in bank can't be deleted");
    getDb().prepare("DELETE FROM question_banks WHERE id = ?").run(bank.id);
    return jsonOk();
  }
);
