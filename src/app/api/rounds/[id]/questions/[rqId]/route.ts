import { NextRequest } from "next/server";
import { z } from "zod";
import { handleApi, jsonOk } from "@/lib/api";
import { getDb } from "@/lib/db";
import { requireUser, ApiError } from "@/lib/auth";
import { loadRoundOr404, assertCanEditRound } from "@/lib/rounds";

const schema = z.object({
  score: z.number().int().min(0).max(5).nullable().optional(),
  notes: z.string().max(4000).nullable().optional(),
  question_text: z.string().min(1).max(4000).optional(),
});

export const PATCH = handleApi(
  async (
    req: NextRequest,
    ctx: { params: Promise<{ id: string; rqId: string }> }
  ) => {
    const me = await requireUser();
    const { id, rqId } = await ctx.params;
    const round = loadRoundOr404(Number(id));
    assertCanEditRound(round, me);

    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) {
      throw new ApiError(400, parsed.error.issues[0]?.message ?? "Invalid input");
    }
    const data = parsed.data;
    const db = getDb();
    const row = db
      .prepare("SELECT id FROM round_questions WHERE id = ? AND round_id = ?")
      .get(Number(rqId), round.id);
    if (!row) throw new ApiError(404, "Question not found in this round");

    if (data.score !== undefined) {
      db.prepare("UPDATE round_questions SET score = ? WHERE id = ?").run(
        data.score,
        Number(rqId)
      );
    }
    if (data.notes !== undefined) {
      db.prepare("UPDATE round_questions SET notes = ? WHERE id = ?").run(
        data.notes,
        Number(rqId)
      );
    }
    if (data.question_text !== undefined) {
      db.prepare("UPDATE round_questions SET question_text = ? WHERE id = ?").run(
        data.question_text.trim(),
        Number(rqId)
      );
    }
    return jsonOk();
  }
);

export const DELETE = handleApi(
  async (
    _req: NextRequest,
    ctx: { params: Promise<{ id: string; rqId: string }> }
  ) => {
    const me = await requireUser();
    const { id, rqId } = await ctx.params;
    const round = loadRoundOr404(Number(id));
    assertCanEditRound(round, me);
    getDb()
      .prepare("DELETE FROM round_questions WHERE id = ? AND round_id = ?")
      .run(Number(rqId), round.id);
    return jsonOk();
  }
);
