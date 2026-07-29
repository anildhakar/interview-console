import { NextRequest, NextResponse } from "next/server";
import { handleApi } from "@/lib/api";
import { getDb } from "@/lib/db";
import { getCandidateSummaries } from "@/lib/pipeline";
import { requireUser, ApiError } from "@/lib/auth";
import { saveResume } from "@/lib/uploads";

export const GET = handleApi(async () => {
  await requireUser();
  return NextResponse.json({ candidates: getCandidateSummaries() });
});

function str(v: FormDataEntryValue | null): string | null {
  if (v === null) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

export const POST = handleApi(async (req: NextRequest) => {
  const me = await requireUser(); // any signed-in user (incl. HR) can add candidates
  const form = await req.formData();

  const name = str(form.get("name"));
  if (!name) throw new ApiError(400, "Candidate name is required");

  const expRaw = str(form.get("experience_years"));
  const experience = expRaw !== null ? Number(expRaw) : null;
  if (experience !== null && (isNaN(experience) || experience < 0)) {
    throw new ApiError(400, "Experience must be a number");
  }

  let resume: { storedName: string; originalName: string } | null = null;
  const file = form.get("resume");
  if (file instanceof File && file.size > 0) {
    resume = await saveResume(file);
  }

  const info = getDb()
    .prepare(
      `INSERT INTO candidates
       (name, email, phone, current_company, experience_years, applied_role, notes, hr_notes, resume_url, resume_path, resume_filename, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      name,
      str(form.get("email")),
      str(form.get("phone")),
      str(form.get("current_company")),
      experience,
      str(form.get("applied_role")),
      str(form.get("notes")),
      str(form.get("hr_notes")),
      str(form.get("resume_url")),
      resume?.storedName ?? null,
      resume?.originalName ?? null,
      me.id
    );

  return NextResponse.json({ id: Number(info.lastInsertRowid) }, { status: 201 });
});
