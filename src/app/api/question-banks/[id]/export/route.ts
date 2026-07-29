import { NextRequest } from "next/server";
import { handleApi } from "@/lib/api";
import { getBank, listQuestions } from "@/lib/queries";
import { requireUser, ApiError } from "@/lib/auth";

export const GET = handleApi(
  async (_req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    await requireUser(["admin", "interviewer"]);
    const { id } = await ctx.params;
    const bank = getBank(Number(id));
    if (!bank) throw new ApiError(404, "Bank not found");

    const questions = listQuestions(bank.id, false).map((q) => ({
      category: q.category,
      difficulty: q.difficulty,
      qtype: q.qtype,
      question: q.question,
      answer_hints: q.answer_hints ?? undefined,
      follow_ups: q.follow_ups ? safeParse(q.follow_ups) : undefined,
    }));

    const payload = {
      bank: { name: bank.name, description: bank.description ?? undefined },
      questions,
    };
    const safeName = bank.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
    return new Response(JSON.stringify(payload, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${safeName}.json"`,
      },
    });
  }
);

function safeParse(raw: string): string[] | undefined {
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v : undefined;
  } catch {
    return undefined;
  }
}
