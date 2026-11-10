import { describe, expect, it } from "vitest";
import {
  ACCESS_SESSION_MAX_AGE_SECONDS,
  accessKeyMatches,
  accessSessionIsValid,
  bearerAccessKeyMatches,
  createAccessSession,
} from "~/lib/access-auth";

describe("self-hosted access key authentication", () => {
  const key = "a-test-access-key-with-enough-entropy";
  const now = Date.UTC(2026, 10, 10, 12, 0, 0);

  it("matches a configured key without accepting an empty or different key", () => {
    expect(accessKeyMatches(key, key)).toBe(true);
    expect(accessKeyMatches("", key)).toBe(false);
    expect(accessKeyMatches("wrong", key)).toBe(false);
    expect(accessKeyMatches(undefined, key)).toBe(false);
  });

  it("accepts only bearer authorization with the configured key", () => {
    expect(bearerAccessKeyMatches(`Bearer ${key}`, key)).toBe(true);
    expect(bearerAccessKeyMatches(`bearer ${key}`, key)).toBe(true);
    expect(bearerAccessKeyMatches(`Basic ${key}`, key)).toBe(false);
    expect(bearerAccessKeyMatches("Bearer wrong", key)).toBe(false);
  });

  it("creates a signed browser session that expires after seven days", () => {
    const session = createAccessSession(key, now);
    expect(session.maxAge).toBe(ACCESS_SESSION_MAX_AGE_SECONDS);
    expect(accessSessionIsValid(session.token, key, now)).toBe(true);
    expect(accessSessionIsValid(session.token, "another-key", now)).toBe(false);
    expect(
      accessSessionIsValid(session.token, key, now + (ACCESS_SESSION_MAX_AGE_SECONDS + 1) * 1000),
    ).toBe(false);
  });

  it("rejects malformed and tampered browser sessions", () => {
    const session = createAccessSession(key, now);
    const tampered = `${session.token.slice(0, -1)}x`;
    expect(accessSessionIsValid(undefined, key, now)).toBe(false);
    expect(accessSessionIsValid("not-a-session", key, now)).toBe(false);
    expect(accessSessionIsValid(tampered, key, now)).toBe(false);
  });
});
