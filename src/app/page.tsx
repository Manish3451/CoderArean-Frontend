import Link from "next/link";
import GuestButton from "@/components/GuestButton";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-md space-y-8 text-center">
        <div className="space-y-2">
          <h1 className="text-5xl font-bold tracking-tight text-white">
            Code<span className="text-violet-400">Arena</span>
          </h1>
          <p className="text-zinc-400 text-lg">
            Head-to-head coding matches with live AI commentary.
          </p>
        </div>

        <div className="space-y-3 pt-4">
          <Link
            href="/auth/request"
            className="block w-full rounded-lg bg-violet-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-violet-700"
          >
            Sign in with email
          </Link>
          <GuestButton />
        </div>

        <p className="text-xs text-zinc-600">
          No password required. Guest accounts are temporary.
        </p>
      </div>
    </main>
  );
}
