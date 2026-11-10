import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const ACCESS_KEY_COOKIE = "busabase_access_session";
export const ACCESS_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

const sessionSignature = (payload: string, accessKey: string): Buffer =>
  createHmac("sha256", accessKey).update(payload).digest();

const timingSafeStringEqual = (left: string, right: string): boolean => {
  const leftBytes = Buffer.from(left);
  const rightBytes = Buffer.from(right);
  return leftBytes.length === rightBytes.length && timingSafeEqual(leftBytes, rightBytes);
};

export const configuredAccessKey = (): string | null => {
  const accessKey = process.env.BUSABASE_ACCESS_KEY?.trim();
  return accessKey && Buffer.byteLength(accessKey) >= 32 ? accessKey : null;
};

export const accessKeyMatches = (candidate: unknown, accessKey: string): boolean =>
  typeof candidate === "string" &&
  candidate.length > 0 &&
  timingSafeStringEqual(candidate, accessKey);

export const createAccessSession = (
  accessKey: string,
  now = Date.now(),
): { token: string; maxAge: number } => {
  const expiresAt = Math.floor(now / 1000) + ACCESS_SESSION_MAX_AGE_SECONDS;
  const payload = `v1.${expiresAt}.${randomBytes(24).toString("base64url")}`;
  const signature = sessionSignature(payload, accessKey).toString("base64url");
  return { token: `${payload}.${signature}`, maxAge: ACCESS_SESSION_MAX_AGE_SECONDS };
};

export const accessSessionIsValid = (
  token: string | undefined,
  accessKey: string,
  now = Date.now(),
): boolean => {
  if (!token) return false;
  const [version, expiresAtText, nonce, signatureText, extra] = token.split(".");
  if (version !== "v1" || !expiresAtText || !nonce || !signatureText || extra !== undefined) {
    return false;
  }
  if (!/^[A-Za-z0-9_-]{32}$/.test(nonce) || !/^[A-Za-z0-9_-]{43}$/.test(signatureText)) {
    return false;
  }

  const expiresAt = Number(expiresAtText);
  if (
    !Number.isSafeInteger(expiresAt) ||
    expiresAt <= Math.floor(now / 1000) ||
    expiresAt > Math.floor(now / 1000) + ACCESS_SESSION_MAX_AGE_SECONDS
  ) {
    return false;
  }

  const payload = `${version}.${expiresAtText}.${nonce}`;
  const expected = sessionSignature(payload, accessKey);
  let supplied: Buffer;
  try {
    supplied = Buffer.from(signatureText, "base64url");
  } catch {
    return false;
  }
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
};

export const bearerAccessKeyMatches = (
  authorization: string | null,
  accessKey: string,
): boolean => {
  if (!authorization) return false;
  const match = /^Bearer\s+(.+)$/i.exec(authorization);
  return match ? accessKeyMatches(match[1], accessKey) : false;
};
