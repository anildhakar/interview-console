import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { handleApi } from "@/lib/api";
import { getDb } from "@/lib/db";
import { getCandidate, getUserById } from "@/lib/queries";
import { requireUser, ApiError } from "@/lib/auth";
import { seedRoundRatings } from "@/lib/rounds";

const schema = z.object({
  title: z.string().min(1).max(120),
  interviewer_id: z.number().int().positive().nullable().optional(),
});

// Create/assign a new round for a candidate.
export const POST = handleApi(
  async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    const me = await requireUser();
    const { id } = await ctx.params;
    const candidate = getCandidate(Number(id));
    if (!candidate) throw new ApiError(404, "Candidate not found");

    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) {
      throw new ApiError(400, parsed.error.issues[0]?.message ?? "Invalid input");
    }
    const { title, interviewer_id } = parsed.data;

    if (interviewer_id) {
      const iv = getUserById(interviewer_id);
      if (!iv || !iv.active || iv.role === "hr") {
        throw new ApiError(400, "Selected interviewer is not valid");
      }
    }

    const db = getDb();
    const next = db
      .prepare(
        "SELECT COALESCE(MAX(round_number), 0) + 1 AS n FROM rounds WHERE candidate_id = ?"
      )
      .get(candidate.id) as { n: number };

    const info = db
      .prepare(
        `INSERT INTO rounds (candidate_id, round_number, title, interviewer_id, status, created_by)
         VALUES (?, ?, ?, ?, 'pending', ?)`
      )
      .run(candidate.id, next.n, title.trim(), interviewer_id ?? null, me.id);

    const roundId = Number(info.lastInsertRowid);
    seedRoundRatings(roundId);
    return NextResponse.json({ id: roundId, round_number: next.n }, { status: 201 });
  }
);
