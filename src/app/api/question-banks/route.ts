import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { handleApi } from "@/lib/api";
import { getDb } from "@/lib/db";
import { listBanks, getBankByName } from "@/lib/queries";
import { requireUser, ApiError } from "@/lib/auth";

export const GET = handleApi(async () => {
  await requireUser();
  return NextResponse.json({ banks: listBanks() });
});

const schema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(1000).optional().nullable(),
});

// Create an empty bank.
export const POST = handleApi(async (req: NextRequest) => {
  await requireUser(["admin", "interviewer"]);
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    throw new ApiError(400, parsed.error.issues[0]?.message ?? "Invalid input");
  }
  if (getBankByName(parsed.data.name.trim())) {
    throw new ApiError(409, "A bank with that name already exists");
  }
  const info = getDb()
    .prepare("INSERT INTO question_banks (name, description, is_seed) VALUES (?, ?, 0)")
    .run(parsed.data.name.trim(), parsed.data.description ?? null);
  return NextResponse.json({ id: Number(info.lastInsertRowid) }, { status: 201 });
});
