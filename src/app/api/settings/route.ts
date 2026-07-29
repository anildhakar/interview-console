import { NextRequest } from "next/server";
import { z } from "zod";
import { handleApi, jsonOk } from "@/lib/api";
import { setSetting } from "@/lib/db";
import { requireUser, ApiError } from "@/lib/auth";
import { THEME_IDS } from "@/lib/themes";

const schema = z.object({
  rating_params: z.array(z.string().min(1).max(80)).min(1).max(20).optional(),
  round_presets: z.array(z.string().min(1).max(120)).min(1).max(20).optional(),
  default_theme: z.enum(THEME_IDS as [string, ...string[]]).optional(),
});

export const PUT = handleApi(async (req: NextRequest) => {
  await requireUser(["admin"]);
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    throw new ApiError(400, parsed.error.issues[0]?.message ?? "Invalid input");
  }
  const d = parsed.data;
  if (d.rating_params) {
    setSetting("rating_params", JSON.stringify(dedupe(d.rating_params)));
  }
  if (d.round_presets) {
    setSetting("round_presets", JSON.stringify(dedupe(d.round_presets)));
  }
  if (d.default_theme) {
    setSetting("default_theme", d.default_theme);
  }
  return jsonOk();
});

function dedupe(arr: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of arr) {
    const v = raw.trim();
    if (!v || seen.has(v.toLowerCase())) continue;
    seen.add(v.toLowerCase());
    out.push(v);
  }
  return out;
}
