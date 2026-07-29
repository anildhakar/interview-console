import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { handleApi } from "@/lib/api";
import { getDb } from "@/lib/db";
import { requireUser, generateShareToken, ApiError } from "@/lib/auth";

const schema = z.object({
  candidate_ids: z.array(z.number().int().positive()).min(1).max(500),
  title: z.string().max(160).nullable().optional(),
});

// Create a public shareable batch of candidates.
export const POST = handleApi(async (req: NextRequest) => {
  const me = await requireUser();
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    throw new ApiError(400, parsed.error.issues[0]?.message ?? "Invalid input");
  }
  const { candidate_ids, title } = parsed.data;

  const db = getDb();
  // Keep only ids that actually exist.
  const placeholders = candidate_ids.map(() => "?").join(",");
  const valid = db
    .prepare(`SELECT id FROM candidates WHERE id IN (${placeholders})`)
    .all(...candidate_ids) as { id: number }[];
  if (valid.length === 0) throw new ApiError(400, "No valid candidates selected");
  const validIds = new Set(valid.map((v) => v.id));

  const token = generateShareToken();
  const info = db
    .prepare(
      "INSERT INTO candidate_batches (token, title, created_by) VALUES (?, ?, ?)"
    )
    .run(token, title?.trim() || null, me.id);
  const batchId = Number(info.lastInsertRowid);

  const insertItem = db.prepare(
    "INSERT OR IGNORE INTO candidate_batch_items (batch_id, candidate_id, sort_order) VALUES (?, ?, ?)"
  );
  const tx = db.transaction(() => {
    let order = 0;
    // Preserve the order the caller selected them in.
    for (const id of candidate_ids) {
      if (validIds.has(id)) insertItem.run(batchId, id, order++);
    }
  });
  tx();

  return NextResponse.json({ token, count: validIds.size });
});
