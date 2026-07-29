import { NextRequest } from "next/server";
import { handleApi, jsonOk } from "@/lib/api";
import { getDb } from "@/lib/db";
import { getCandidate } from "@/lib/queries";
import { requireUser, ApiError } from "@/lib/auth";
import { saveResume, deleteResume } from "@/lib/uploads";

export const POST = handleApi(
  async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    await requireUser();
    const { id } = await ctx.params;
    const candidate = getCandidate(Number(id));
    if (!candidate) throw new ApiError(404, "Candidate not found");

    const form = await req.formData();
    const file = form.get("resume");
    if (!(file instanceof File) || file.size === 0) {
      throw new ApiError(400, "No file provided");
    }
    const stored = await saveResume(file);
    deleteResume(candidate.resume_path);
    getDb()
      .prepare(
        "UPDATE candidates SET resume_path = ?, resume_filename = ? WHERE id = ?"
      )
      .run(stored.storedName, stored.originalName, candidate.id);
    return jsonOk({ filename: stored.originalName });
  }
);

export const DELETE = handleApi(
  async (_req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    await requireUser();
    const { id } = await ctx.params;
    const candidate = getCandidate(Number(id));
    if (!candidate) throw new ApiError(404, "Candidate not found");
    deleteResume(candidate.resume_path);
    getDb()
      .prepare(
        "UPDATE candidates SET resume_path = NULL, resume_filename = NULL WHERE id = ?"
      )
      .run(candidate.id);
    return jsonOk();
  }
);
