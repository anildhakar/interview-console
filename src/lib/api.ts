import { NextResponse } from "next/server";
import { ApiError } from "./auth";

/** Wraps an API handler so thrown ApiErrors become clean JSON responses. */
export function handleApi<T extends unknown[]>(
  fn: (...args: T) => Promise<NextResponse | Response>
) {
  return async (...args: T): Promise<NextResponse | Response> => {
    try {
      return await fn(...args);
    } catch (err) {
      if (err instanceof ApiError) {
        return NextResponse.json({ error: err.message }, { status: err.status });
      }
      console.error(err);
      return NextResponse.json(
        { error: "Something went wrong" },
        { status: 500 }
      );
    }
  };
}

export function jsonOk(data: unknown = { ok: true }, status = 200) {
  return NextResponse.json(data, { status });
}
