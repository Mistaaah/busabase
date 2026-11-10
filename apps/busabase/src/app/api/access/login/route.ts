import { NextResponse } from "next/server";
import {
  ACCESS_KEY_COOKIE,
  accessKeyMatches,
  configuredAccessKey,
  createAccessSession,
} from "~/lib/access-auth";

export const dynamic = "force-dynamic";

const isSameOriginRequest = (request: Request): boolean => {
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!origin || !host) return false;
  try {
    const parsedOrigin = new URL(origin);
    const isSecureOrigin =
      process.env.NODE_ENV !== "production" || parsedOrigin.protocol === "https:";
    return (
      isSecureOrigin &&
      parsedOrigin.host.toLowerCase() === host.split(",", 1)[0].trim().toLowerCase()
    );
  } catch {
    return false;
  }
};

export async function POST(request: Request): Promise<Response> {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "Request origin rejected." }, { status: 403 });
  }

  const accessKey = configuredAccessKey();
  if (!accessKey) {
    return NextResponse.json(
      { error: "Access is not configured on this server." },
      { status: 503, headers: { "cache-control": "no-store" } },
    );
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 4096) {
    return NextResponse.json({ error: "Request is too large." }, { status: 413 });
  }

  let candidate: unknown;
  try {
    const reader = request.body?.getReader();
    if (!reader) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 4096) {
        await reader.cancel();
        return NextResponse.json({ error: "Request is too large." }, { status: 413 });
      }
      chunks.push(value);
    }
    const bodyBytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bodyBytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    candidate = (JSON.parse(new TextDecoder().decode(bodyBytes)) as { accessKey?: unknown })
      .accessKey;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (!accessKeyMatches(candidate, accessKey)) {
    return NextResponse.json(
      { error: "That access key is not valid." },
      { status: 401, headers: { "cache-control": "no-store" } },
    );
  }

  const session = createAccessSession(accessKey);
  const response = NextResponse.json({ ok: true }, { headers: { "cache-control": "no-store" } });
  const forwardedProtocol = request.headers.get("x-forwarded-proto")?.split(",", 1)[0].trim();
  response.cookies.set(ACCESS_KEY_COOKIE, session.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" || forwardedProtocol === "https",
    sameSite: "lax",
    path: "/",
    maxAge: session.maxAge,
  });
  return response;
}
