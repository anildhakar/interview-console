import { NextRequest, NextResponse } from "next/server";
import { handleApi } from "@/lib/api";
import { getDb } from "@/lib/db";
import { getBankByName } from "@/lib/queries";
import { requireUser, ApiError } from "@/lib/auth";
import { bankImportSchema, normalizeFollowUps } from "@/lib/bank-format";

// Import a bank from the JSON format. mode: "new" creates (fails if name exists)
// or "merge" appends questions into an existing bank of the same name.
export const POST = handleApi(async (req: NextRequest) => {
  await requireUser(["admin", "interviewer"]);

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    throw new ApiError(400, "The file is not valid JSON");
  }

  const parsed = bankImportSchema.safeParse(json);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const path = issue?.path.join(".") || "file";
    throw new ApiError(400, `Invalid format at "${path}": ${issue?.message}`);
  }

  const { bank, questions } = parsed.data;
  const url = new URL(req.url);
  const mode = url.searchParams.get("mode") === "merge" ? "merge" : "new";

  const db = getDb();
  const existing = getBankByName(bank.name.trim());

  let bankId: number;
  if (existing) {
    if (mode !== "merge") {
      throw new ApiError(
        409,
        `A bank named "${bank.name.trim()}" already exists. Choose "merge" to add these questions to it.`
      );
    }
    bankId = existing.id;
    if (bank.description) {
      db.prepare("UPDATE question_banks SET description = ? WHERE id = ?").run(
        bank.description,
        bankId
      );
    }
  } else {
    const info = db
      .prepare("INSERT INTO question_banks (name, description, is_seed) VALUES (?, ?, 0)")
      .run(bank.name.trim(), bank.description ?? null);
    bankId = Number(info.lastInsertRowid);
  }

  const insert = db.prepare(
    `INSERT INTO questions (bank_id, category, difficulty, qtype, question, answer_hints, follow_ups)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );
  const tx = db.transaction(() => {
    for (const q of questions) {
      insert.run(
        bankId,
        q.category.trim(),
        q.difficulty,
        q.qtype,
        q.question.trim(),
        q.answer_hints ?? null,
        normalizeFollowUps(q.follow_ups)
      );
    }
  });
  tx();

  return NextResponse.json({
    bank_id: bankId,
    imported: questions.length,
    merged: Boolean(existing),
  });
});
