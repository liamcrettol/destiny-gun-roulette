import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import SignInButton from "@/components/SignInButton";

export default async function Home() {
  const session = await auth();
  if (session?.userId) redirect("/dashboard");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-8">
      <div className="text-center">
        <h1 className="text-5xl font-bold tracking-tight text-white mb-2">
          Gun Roulette
        </h1>
        <p className="text-gray-400 text-lg max-w-md">
          Randomly assign Destiny 2 loadouts to your whole fireteam and auto-equip
          them between rounds.
        </p>
      </div>

      <div className="flex flex-col items-center gap-4 w-full max-w-sm">
        <SignInButton />
        <p className="text-xs text-gray-500 text-center">
          Signing in grants Gun Roulette permission to read your inventory and
          equip items on your behalf. All friends must sign in separately.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4 mt-8 max-w-2xl text-center">
        {[
          { icon: "🎲", title: "Random Rolls", desc: "Pick weapons every member owns" },
          { icon: "⚡", title: "Auto-Equip", desc: "One click applies loadouts for everyone" },
          { icon: "👑", title: "Captain System", desc: "Rotating pick order, no arguments" },
        ].map((f) => (
          <div key={f.title} className="bg-bungie-surface rounded-lg p-4 border border-bungie-border">
            <div className="text-3xl mb-2">{f.icon}</div>
            <div className="font-semibold text-white">{f.title}</div>
            <div className="text-xs text-gray-400 mt-1">{f.desc}</div>
          </div>
        ))}
      </div>
    </main>
  );
}
