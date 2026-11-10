import { AccessKeyForm } from "./access-key-form";

export const dynamic = "force-dynamic";

export default async function AccessPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const returnTo = next?.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 py-12">
      <section className="w-full max-w-sm rounded-xl border bg-card p-7 shadow-sm">
        <h1 className="text-xl font-semibold">Access Busabase</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Enter the access key configured for this server.
        </p>
        <AccessKeyForm returnTo={returnTo} />
      </section>
    </main>
  );
}
