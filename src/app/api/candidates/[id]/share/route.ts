import { NextRequest, NextResponse } from "next/server";
import { handleApi } from "@/lib/api";
import { getDb } from "@/lib/db";
import { getCandidate } from "@/lib/queries";
import { requireUser, generateShareToken, ApiError } from "@/lib/auth";

// Generate (or return existing) a public share token.
export const POST = handleApi(
  async (_req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    await requireUser();
    const { id } = await ctx.params;
    const candidate = getCandidate(Number(id));
    if (!candidate) throw new ApiError(404, "Candidate not found");

    let token = candidate.share_token;
    if (!token) {
      token = generateShareToken();
      getDb()
        .prepare("UPDATE candidates SET share_token = ? WHERE id = ?")
        .run(token, candidate.id);
    }
    return NextResponse.json({ share_token: token });
  }
);

// Revoke the share token.
export const DELETE = handleApi(
  async (_req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    await requireUser();
    const { id } = await ctx.params;
    const candidate = getCandidate(Number(id));
    if (!candidate) throw new ApiError(404, "Candidate not found");
    getDb()
      .prepare("UPDATE candidates SET share_token = NULL WHERE id = ?")
      .run(candidate.id);
    return NextResponse.json({ ok: true });
  }
);
