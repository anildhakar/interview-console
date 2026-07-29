import { NextRequest } from "next/server";
import { handleApi, jsonOk } from "@/lib/api";
import { getDb } from "@/lib/db";
import { requireUser, ApiError } from "@/lib/auth";

/**
 * Star / unstar a question for the signed-in user.
 * Favourites are per-user: two interviewers can star different questions.
 */

function assertQuestionExists(id: number) {
  const q = getDb().prepare("SELECT id FROM questions WHERE id = ?").get(id);
  if (!q) throw new ApiError(404, "Question not found");
}

export const POST = handleApi(
  async (_req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    const me = await requireUser();
    const { id } = await ctx.params;
    const questionId = Number(id);
    assertQuestionExists(questionId);

    getDb()
      .prepare(
        "INSERT OR IGNORE INTO question_favorites (user_id, question_id) VALUES (?, ?)"
      )
      .run(me.id, questionId);
    return jsonOk({ favorited: true });
  }
);

export const DELETE = handleApi(
  async (_req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    const me = await requireUser();
    const { id } = await ctx.params;

    getDb()
      .prepare(
        "DELETE FROM question_favorites WHERE user_id = ? AND question_id = ?"
      )
      .run(me.id, Number(id));
    return jsonOk({ favorited: false });
  }
);
