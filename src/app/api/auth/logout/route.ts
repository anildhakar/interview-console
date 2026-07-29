import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { handleApi } from "@/lib/api";
import { SESSION_COOKIE, destroySession } from "@/lib/auth";

export const POST = handleApi(async () => {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) destroySession(token);
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(SESSION_COOKIE);
  return res;
});
