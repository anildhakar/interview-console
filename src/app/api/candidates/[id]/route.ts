import { NextRequest } from "next/server";
import { z } from "zod";
import { handleApi, jsonOk } from "@/lib/api";
import { getDb } from "@/lib/db";
import { getCandidate } from "@/lib/queries";
import { requireUser, ApiError } from "@/lib/auth";
import { deleteResume } from "@/lib/uploads";

const schema = z.object({
  name: z.string().min(1).max(120).optional(),
  email: z.string().max(200).nullable().optional(),
  phone: z.string().max(60).nullable().optional(),
  current_company: z.string().max(160).nullable().optional(),
  experience_years: z.number().min(0).max(80).nullable().optional(),
  applied_role: z.string().max(160).nullable().optional(),
  notes: z.string().max(5000).nullable().optional(),
  hr_notes: z.string().max(5000).nullable().optional(),
  resume_url: z.string().max(2000).nullable().optional(),
  status: z.enum(["in_process", "selected", "rejected", "on_hold"]).optional(),
});

export const PATCH = handleApi(
  async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    await requireUser();
    const { id } = await ctx.params;
    const candidate = getCandidate(Number(id));
    if (!candidate) throw new ApiError(404, "Candidate not found");

    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) {
      throw new ApiError(400, parsed.error.issues[0]?.message ?? "Invalid input");
    }
    const fields = parsed.data;
    const keys = Object.keys(fields) as (keyof typeof fields)[];
    if (keys.length === 0) return jsonOk();

    const setClause = keys.map((k) => `${k} = ?`).join(", ");
    const values = keys.map((k) => {
      const v = fields[k];
      return typeof v === "string" ? v.trim() : v;
    });
    getDb()
      .prepare(`UPDATE candidates SET ${setClause} WHERE id = ?`)
      .run(...values, candidate.id);
    return jsonOk();
  }
);

export const DELETE = handleApi(
  async (_req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    await requireUser(["admin", "hr"]);
    const { id } = await ctx.params;
    const candidate = getCandidate(Number(id));
    if (!candidate) throw new ApiError(404, "Candidate not found");
    deleteResume(candidate.resume_path);
    getDb().prepare("DELETE FROM candidates WHERE id = ?").run(candidate.id);
    return jsonOk();
  }
);
