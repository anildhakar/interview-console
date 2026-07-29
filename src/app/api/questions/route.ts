import { NextRequest, NextResponse } from "next/server";
import { handleApi } from "@/lib/api";
import { getDb } from "@/lib/db";
import { getBank } from "@/lib/queries";
import { requireUser, ApiError } from "@/lib/auth";
import { questionImportSchema, normalizeFollowUps } from "@/lib/bank-format";
import { z } from "zod";

const schema = questionImportSchema.extend({
  bank_id: z.number().int().positive(),
});

// Add a single question to a bank.
export const POST = handleApi(async (req: NextRequest) => {
  await requireUser(["admin", "interviewer"]);
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    throw new ApiError(400, parsed.error.issues[0]?.message ?? "Invalid input");
  }
  const q = parsed.data;
  if (!getBank(q.bank_id)) throw new ApiError(404, "Bank not found");

  const info = getDb()
    .prepare(
      `INSERT INTO questions (bank_id, category, difficulty, qtype, question, answer_hints, follow_ups)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      q.bank_id,
      q.category.trim(),
      q.difficulty,
      q.qtype,
      q.question.trim(),
      q.answer_hints ?? null,
      normalizeFollowUps(q.follow_ups)
    );
  return NextResponse.json({ id: Number(info.lastInsertRowid) }, { status: 201 });
});
