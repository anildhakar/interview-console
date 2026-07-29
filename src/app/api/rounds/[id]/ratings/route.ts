import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { handleApi, jsonOk } from "@/lib/api";
import { getDb } from "@/lib/db";
import { requireUser, ApiError } from "@/lib/auth";
import { loadRoundOr404, assertCanEditRound } from "@/lib/rounds";

// Set a rating param's score and/or note (upsert by name).
const putSchema = z.object({
  param_name: z.string().min(1).max(80),
  score: z.number().int().min(0).max(5).nullable().optional(),
  note: z.string().max(2000).nullable().optional(),
});

export const PUT = handleApi(
  async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    const me = await requireUser();
    const { id } = await ctx.params;
    const round = loadRoundOr404(Number(id));
    assertCanEditRound(round, me);

    const parsed = putSchema.safeParse(await req.json());
    if (!parsed.success) {
      throw new ApiError(400, parsed.error.issues[0]?.message ?? "Invalid input");
    }
    const db = getDb();
    if (parsed.data.score !== undefined) {
      db.prepare(
        "UPDATE round_ratings SET score = ? WHERE round_id = ? AND param_name = ?"
      ).run(parsed.data.score, round.id, parsed.data.param_name);
    }
    if (parsed.data.note !== undefined) {
      db.prepare(
        "UPDATE round_ratings SET note = ? WHERE round_id = ? AND param_name = ?"
      ).run(parsed.data.note, round.id, parsed.data.param_name);
    }
    return jsonOk();
  }
);

// Add a custom rating param.
const postSchema = z.object({ param_name: z.string().min(1).max(80) });

export const POST = handleApi(
  async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    const me = await requireUser();
    const { id } = await ctx.params;
    const round = loadRoundOr404(Number(id));
    assertCanEditRound(round, me);

    const parsed = postSchema.safeParse(await req.json());
    if (!parsed.success) {
      throw new ApiError(400, parsed.error.issues[0]?.message ?? "Invalid input");
    }
    const name = parsed.data.param_name.trim();
    try {
      const info = getDb()
        .prepare(
          "INSERT INTO round_ratings (round_id, param_name, is_custom) VALUES (?, ?, 1)"
        )
        .run(round.id, name);
      return NextResponse.json({ id: Number(info.lastInsertRowid) }, { status: 201 });
    } catch {
      throw new ApiError(409, "That parameter already exists");
    }
  }
);

// Remove a custom rating param.
const delSchema = z.object({ param_name: z.string().min(1).max(80) });

export const DELETE = handleApi(
  async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    const me = await requireUser();
    const { id } = await ctx.params;
    const round = loadRoundOr404(Number(id));
    assertCanEditRound(round, me);

    const parsed = delSchema.safeParse(await req.json());
    if (!parsed.success) {
      throw new ApiError(400, parsed.error.issues[0]?.message ?? "Invalid input");
    }
    getDb()
      .prepare(
        "DELETE FROM round_ratings WHERE round_id = ? AND param_name = ? AND is_custom = 1"
      )
      .run(round.id, parsed.data.param_name.trim());
    return jsonOk();
  }
);
