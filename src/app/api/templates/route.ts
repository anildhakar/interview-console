import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { handleApi } from "@/lib/api";
import { getDb } from "@/lib/db";
import { requireUser, ApiError } from "@/lib/auth";
import type { InterviewTemplate } from "@/lib/types";

/**
 * Interview templates — a saved set of questions that can be applied to a round
 * in one action, so a recurring interview format doesn't have to be rebuilt by
 * hand every time.
 */

// GET /api/templates → every template with its questions
export const GET = handleApi(async () => {
  await requireUser();
  const db = getDb();

  const templates = db
    .prepare(
      `SELECT t.id, t.name, t.description, t.created_by, t.created_at,
              u.display_name AS created_by_name,
              (SELECT COUNT(*) FROM interview_template_items WHERE template_id = t.id) AS question_count
         FROM interview_templates t
         LEFT JOIN users u ON u.id = t.created_by
        ORDER BY t.name COLLATE NOCASE`
    )
    .all() as InterviewTemplate[];

  const itemStmt = db.prepare(
    `SELECT q.id, q.question, q.category, q.difficulty, q.qtype, i.sort_order
       FROM interview_template_items i
       JOIN questions q ON q.id = i.question_id
      WHERE i.template_id = ?
      ORDER BY i.sort_order ASC`
  );

  return NextResponse.json({
    templates: templates.map((t) => ({ ...t, questions: itemStmt.all(t.id) })),
  });
});

const createSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(1000).nullable().optional(),
  question_ids: z.array(z.number().int().positive()).min(1).max(200),
});

// POST /api/templates → create a template from a list of question ids
export const POST = handleApi(async (req: NextRequest) => {
  const me = await requireUser(["admin", "interviewer"]);
  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) {
    throw new ApiError(400, parsed.error.issues[0]?.message ?? "Invalid input");
  }
  const { name, description, question_ids } = parsed.data;

  const db = getDb();
  const placeholders = question_ids.map(() => "?").join(",");
  const valid = db
    .prepare(`SELECT id FROM questions WHERE id IN (${placeholders})`)
    .all(...question_ids) as { id: number }[];
  if (valid.length === 0) throw new ApiError(400, "No valid questions selected");
  const validIds = new Set(valid.map((v) => v.id));

  const info = db
    .prepare(
      "INSERT INTO interview_templates (name, description, created_by) VALUES (?, ?, ?)"
    )
    .run(name.trim(), description?.trim() || null, me.id);
  const templateId = Number(info.lastInsertRowid);

  const addItem = db.prepare(
    "INSERT OR IGNORE INTO interview_template_items (template_id, question_id, sort_order) VALUES (?, ?, ?)"
  );
  const tx = db.transaction(() => {
    let order = 0;
    // Preserve the order the caller passed them in.
    for (const qid of question_ids) {
      if (validIds.has(qid)) addItem.run(templateId, qid, order++);
    }
  });
  tx();

  return NextResponse.json(
    { id: templateId, question_count: validIds.size },
    { status: 201 }
  );
});
