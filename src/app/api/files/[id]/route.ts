import { NextRequest } from "next/server";
import fs from "fs";
import path from "path";
import { getCandidate } from "@/lib/queries";
import { requireUser, ApiError } from "@/lib/auth";
import { handleApi } from "@/lib/api";
import { UPLOADS_DIR } from "@/lib/db";
import { resumeContentType } from "@/lib/uploads";

// Serve a candidate's resume to authenticated users only. `id` is the candidate id.
export const GET = handleApi(
  async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    await requireUser();
    const { id } = await ctx.params;
    const candidate = getCandidate(Number(id));
    if (!candidate || !candidate.resume_path) {
      throw new ApiError(404, "Resume not found");
    }
    const full = path.join(UPLOADS_DIR, path.basename(candidate.resume_path));
    if (!fs.existsSync(full)) throw new ApiError(404, "Resume file missing");

    const buf = fs.readFileSync(full);
    const filename = candidate.resume_filename || "resume";
    const inline = req.nextUrl.searchParams.get("download") !== "1";
    return new Response(new Uint8Array(buf), {
      headers: {
        "Content-Type": resumeContentType(filename),
        "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${encodeURIComponent(
          filename
        )}"`,
        "Cache-Control": "private, no-store",
      },
    });
  }
);
