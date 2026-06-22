export default function AuthError({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-2xl font-bold text-red-400">Sign-in failed</h1>
      <p className="text-gray-400">{searchParams.error ?? "Unknown error"}</p>
      <a href="/" className="text-bungie-blue hover:underline">
        Back to home
      </a>
    </main>
  );
}
