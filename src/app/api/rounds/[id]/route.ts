import { NextRequest } from "next/server";
import { z } from "zod";
import { handleApi, jsonOk } from "@/lib/api";
import { getDb } from "@/lib/db";
import { getUserById } from "@/lib/queries";
import { requireUser, ApiError } from "@/lib/auth";
import { loadRoundOr404 } from "@/lib/rounds";

const schema = z.object({
  title: z.string().min(1).max(120).optional(),
  interviewer_id: z.number().int().positive().nullable().optional(),
  status: z.enum(["pending", "in_progress", "completed"]).optional(),
  recommendation: z
    .enum(["strong_yes", "yes", "no", "strong_no"])
    .nullable()
    .optional(),
  overall_notes: z.string().max(8000).nullable().optional(),
});

export const PATCH = handleApi(
  async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    const me = await requireUser();
    const { id } = await ctx.params;
    const round = loadRoundOr404(Number(id));

    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) {
      throw new ApiError(400, parsed.error.issues[0]?.message ?? "Invalid input");
    }
    const data = parsed.data;

    // Reassignment/title changes: admin, HR, or the current interviewer.
    const isManager =
      me.role === "admin" ||
      me.role === "hr" ||
      round.interviewer_id === me.id ||
      round.created_by === me.id;

    // Scoring content (status/recommendation/notes): only the assigned interviewer or admin,
    // and not once completed (except admin reopening).
    const editingContent =
      data.status !== undefined ||
      data.recommendation !== undefined ||
      data.overall_notes !== undefined;
    if (editingContent) {
      if (me.role === "hr") {
        throw new ApiError(403, "HR accounts can view but not score interviews");
      }
      if (me.role !== "admin" && round.interviewer_id !== me.id) {
        throw new ApiError(403, "Only the assigned interviewer can score this round");
      }
      // A completed round is read-only; the one exception is reopening it
      // (status → in_progress/pending). Content edits require reopening first.
      if (round.status === "completed" && me.role !== "admin") {
        const onlyReopening =
          data.recommendation === undefined &&
          data.overall_notes === undefined &&
          (data.status === "in_progress" || data.status === "pending");
        if (!onlyReopening) {
          throw new ApiError(
            403,
            "This round is completed. Reopen it first to make changes."
          );
        }
      }
    }

    if ((data.interviewer_id !== undefined || data.title !== undefined) && !isManager) {
      throw new ApiError(403, "You can't reassign this round");
    }

    const db = getDb();
    if (data.title !== undefined) {
      db.prepare("UPDATE rounds SET title = ? WHERE id = ?").run(
        data.title.trim(),
        round.id
      );
    }
    if (data.interviewer_id !== undefined) {
      if (data.interviewer_id !== null) {
        const iv = getUserById(data.interviewer_id);
        if (!iv || !iv.active || iv.role === "hr") {
          throw new ApiError(400, "Selected interviewer is not valid");
        }
      }
      db.prepare("UPDATE rounds SET interviewer_id = ? WHERE id = ?").run(
        data.interviewer_id,
        round.id
      );
    }
    if (data.recommendation !== undefined) {
      db.prepare("UPDATE rounds SET recommendation = ? WHERE id = ?").run(
        data.recommendation,
        round.id
      );
    }
    if (data.overall_notes !== undefined) {
      db.prepare("UPDATE rounds SET overall_notes = ? WHERE id = ?").run(
        data.overall_notes,
        round.id
      );
    }
    if (data.status !== undefined) {
      if (data.status === "in_progress") {
        // Start, or reopen a completed round: ensure started_at, clear completed_at.
        db.prepare(
          "UPDATE rounds SET status = 'in_progress', started_at = COALESCE(started_at, datetime('now')), completed_at = NULL WHERE id = ?"
        ).run(round.id);
      } else if (data.status === "completed") {
        db.prepare(
          "UPDATE rounds SET status = ?, completed_at = datetime('now'), started_at = COALESCE(started_at, datetime('now')) WHERE id = ?"
        ).run(data.status, round.id);
      } else {
        db.prepare("UPDATE rounds SET status = ? WHERE id = ?").run(
          data.status,
          round.id
        );
      }
    }
    return jsonOk();
  }
);

export const DELETE = handleApi(
  async (_req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    const me = await requireUser();
    const { id } = await ctx.params;
    const round = loadRoundOr404(Number(id));
    const canDelete =
      me.role === "admin" || me.role === "hr" || round.created_by === me.id;
    if (!canDelete) throw new ApiError(403, "You can't delete this round");
    getDb().prepare("DELETE FROM rounds WHERE id = ?").run(round.id);
    return jsonOk();
  }
);
