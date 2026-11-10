import { NextResponse } from "next/server";
import { ACCESS_KEY_COOKIE } from "~/lib/access-auth";

export const dynamic = "force-dynamic";

export function POST(): Response {
  const response = NextResponse.json({ ok: true }, { headers: { "cache-control": "no-store" } });
  response.cookies.set(ACCESS_KEY_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
