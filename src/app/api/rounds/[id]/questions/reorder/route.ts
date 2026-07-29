import { NextRequest } from "next/server";
import { z } from "zod";
import { handleApi, jsonOk } from "@/lib/api";
import { getDb } from "@/lib/db";
import { requireUser, ApiError } from "@/lib/auth";
import { loadRoundOr404, assertCanEditRound } from "@/lib/rounds";

/**
 * Reorder the questions asked in a round.
 *
 * Send every round_question id for the round, in the order you want them.
 * `sort_order` is rewritten to match the array index.
 */
const schema = z.object({
  ordered_ids: z.array(z.number().int().positive()).min(1).max(500),
});

export const PATCH = handleApi(
  async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    const me = await requireUser();
    const { id } = await ctx.params;
    const round = loadRoundOr404(Number(id));
    assertCanEditRound(round, me);

    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) {
      throw new ApiError(400, parsed.error.issues[0]?.message ?? "Invalid input");
    }

    const db = getDb();
    const belonging = db
      .prepare("SELECT id FROM round_questions WHERE round_id = ?")
      .all(round.id) as { id: number }[];
    const allowed = new Set(belonging.map((r) => r.id));

    // Ignore anything that isn't part of this round rather than trusting input.
    const ids = parsed.data.ordered_ids.filter((qid) => allowed.has(qid));
    if (ids.length === 0) {
      throw new ApiError(400, "None of those questions belong to this round");
    }

    const update = db.prepare(
      "UPDATE round_questions SET sort_order = ? WHERE id = ? AND round_id = ?"
    );
    const tx = db.transaction(() => {
      ids.forEach((qid, index) => update.run(index, qid, round.id));
    });
    tx();

    return jsonOk({ reordered: ids.length });
  }
);
