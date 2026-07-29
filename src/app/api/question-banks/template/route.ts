import { handleApi } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { BANK_TEMPLATE } from "@/lib/bank-format";

export const GET = handleApi(async () => {
  await requireUser(["admin", "interviewer"]);
  const body = JSON.stringify(BANK_TEMPLATE, null, 2);
  return new Response(body, {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": 'attachment; filename="question-bank-template.json"',
    },
  });
});
