import { NextRequest } from "next/server";
import { z } from "zod";
import { handleApi, jsonOk } from "@/lib/api";
import { getDb } from "@/lib/db";
import { requireUser, ApiError } from "@/lib/auth";
import { normalizeFollowUps } from "@/lib/bank-format";
import type { Question } from "@/lib/types";

const schema = z.object({
  category: z.string().min(1).max(80).optional(),
  difficulty: z.enum(["easy", "medium", "hard"]).optional(),
  qtype: z
    .enum(["theory", "practical", "situational", "architectural", "debugging"])
    .optional(),
  question: z.string().min(1).max(4000).optional(),
  answer_hints: z.string().max(4000).nullable().optional(),
  follow_ups: z.array(z.string().max(1000)).max(20).nullable().optional(),
  archived: z.boolean().optional(),
});

function getQuestion(id: number): Question | undefined {
  return getDb().prepare("SELECT * FROM questions WHERE id = ?").get(id) as
    | Question
    | undefined;
}

export const PATCH = handleApi(
  async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    await requireUser(["admin", "interviewer"]);
    const { id } = await ctx.params;
    const q = getQuestion(Number(id));
    if (!q) throw new ApiError(404, "Question not found");

    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) {
      throw new ApiError(400, parsed.error.issues[0]?.message ?? "Invalid input");
    }
    const d = parsed.data;
    const db = getDb();
    const sets: string[] = [];
    const vals: unknown[] = [];
    if (d.category !== undefined) { sets.push("category = ?"); vals.push(d.category.trim()); }
    if (d.difficulty !== undefined) { sets.push("difficulty = ?"); vals.push(d.difficulty); }
    if (d.qtype !== undefined) { sets.push("qtype = ?"); vals.push(d.qtype); }
    if (d.question !== undefined) { sets.push("question = ?"); vals.push(d.question.trim()); }
    if (d.answer_hints !== undefined) { sets.push("answer_hints = ?"); vals.push(d.answer_hints); }
    if (d.follow_ups !== undefined) { sets.push("follow_ups = ?"); vals.push(normalizeFollowUps(d.follow_ups)); }
    if (d.archived !== undefined) { sets.push("archived = ?"); vals.push(d.archived ? 1 : 0); }
    if (sets.length === 0) return jsonOk();

    db.prepare(`UPDATE questions SET ${sets.join(", ")} WHERE id = ?`).run(
      ...vals,
      q.id
    );
    return jsonOk();
  }
);

export const DELETE = handleApi(
  async (_req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    await requireUser(["admin", "interviewer"]);
    const { id } = await ctx.params;
    const q = getQuestion(Number(id));
    if (!q) throw new ApiError(404, "Question not found");
    // Hard-delete. round_questions keep their snapshot (question_id set null).
    getDb().prepare("DELETE FROM questions WHERE id = ?").run(q.id);
    return jsonOk();
  }
);
