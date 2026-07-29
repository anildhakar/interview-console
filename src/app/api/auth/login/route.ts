import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { handleApi } from "@/lib/api";
import { findUserByUsername } from "@/lib/queries";
import {
  SESSION_COOKIE,
  createSession,
  verifyPassword,
  ApiError,
} from "@/lib/auth";

const schema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export const POST = handleApi(async (req: NextRequest) => {
  const body = schema.safeParse(await req.json());
  if (!body.success) throw new ApiError(400, "Username and password are required");

  const user = findUserByUsername(body.data.username.trim());
  if (!user || !user.active || !verifyPassword(body.data.password, user.password_hash)) {
    throw new ApiError(401, "Invalid username or password");
  }

  const { token, expires } = createSession(user.id);
  const res = NextResponse.json({
    user: {
      id: user.id,
      username: user.username,
      display_name: user.display_name,
      role: user.role,
      must_change_password: user.must_change_password,
    },
  });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    expires,
    secure: process.env.NODE_ENV === "production" && process.env.HTTPS === "true",
  });
  return res;
});
