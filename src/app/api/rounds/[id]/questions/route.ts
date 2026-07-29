import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { handleApi } from "@/lib/api";
import { getDb } from "@/lib/db";
import { requireUser, ApiError } from "@/lib/auth";
import { loadRoundOr404, assertCanEditRound } from "@/lib/rounds";
import type { Question } from "@/lib/types";

const schema = z.object({
  question_id: z.number().int().positive().nullable().optional(),
  question_text: z.string().max(4000).optional(),
  category: z.string().max(80).nullable().optional(),
  difficulty: z.string().max(20).nullable().optional(),
  qtype: z.string().max(30).nullable().optional(),
});

// Add an asked question to a round (snapshot from bank, or ad-hoc).
export const POST = handleApi(
  async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    const me = await requireUser();
    const { id } = await ctx.params;
    const round = loadRoundOr404(Number(id));
    assertCanEditRound(round, me);

    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) {
      throw new ApiError(400, parsed.error.issues[0]?.message ?? "Invalid input");
    }
    const data = parsed.data;
    const db = getDb();

    let text = data.question_text?.trim() ?? "";
    let category = data.category ?? null;
    let difficulty = data.difficulty ?? null;
    let qtype = data.qtype ?? null;
    const questionId = data.question_id ?? null;

    if (questionId) {
      const q = db
        .prepare("SELECT * FROM questions WHERE id = ?")
        .get(questionId) as Question | undefined;
      if (!q) throw new ApiError(404, "Question not found");
      // Prevent adding the same bank question twice to one round.
      const existing = db
        .prepare(
          "SELECT id FROM round_questions WHERE round_id = ? AND question_id = ?"
        )
        .get(round.id, questionId);
      if (existing) {
        return NextResponse.json({ id: (existing as { id: number }).id, duplicate: true });
      }
      text = q.question;
      category = q.category;
      difficulty = q.difficulty;
      qtype = q.qtype;
    }

    if (!text) throw new ApiError(400, "Question text is required");

    const order = db
      .prepare(
        "SELECT COALESCE(MAX(sort_order), -1) + 1 AS n FROM round_questions WHERE round_id = ?"
      )
      .get(round.id) as { n: number };

    const info = db
      .prepare(
        `INSERT INTO round_questions
         (round_id, question_id, question_text, category, difficulty, qtype, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(round.id, questionId, text, category, difficulty, qtype, order.n);

    return NextResponse.json({ id: Number(info.lastInsertRowid) }, { status: 201 });
  }
);
