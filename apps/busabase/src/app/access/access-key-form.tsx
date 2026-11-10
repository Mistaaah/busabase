"use client";

import { type FormEvent, useState } from "react";

export function AccessKeyForm({ returnTo }: { returnTo: string }) {
  const [accessKey, setAccessKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/access/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ accessKey }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(result.error ?? "Could not sign in.");
        return;
      }
      setAccessKey("");
      window.location.replace(returnTo);
    } catch {
      setError("Could not reach the server. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="mt-6 space-y-4" onSubmit={submit}>
      <label className="block text-sm font-medium" htmlFor="access-key">
        Access key
      </label>
      <input
        id="access-key"
        autoComplete="current-password"
        className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onChange={(event) => setAccessKey(event.currentTarget.value)}
        required
        type="password"
        value={accessKey}
      />
      {error ? (
        <p aria-live="polite" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <button
        className="w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
        disabled={submitting}
        type="submit"
      >
        {submitting ? "Checking…" : "Continue"}
      </button>
    </form>
  );
}
