"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createMatch, joinMatch, getMatchHistory, getMe, logout } from "@/lib/api";
import type { MatchSummary } from "@/lib/api";
import { getUserMeta, clearUserMeta } from "@/lib/auth";

export default function LobbyPage() {
  const router = useRouter();
  const [handle, setHandle] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [history, setHistory] = useState<MatchSummary[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getMe()
      .then((u) => {
        setHandle(u.handle);
        return getMatchHistory();
      })
      .then((d) => setHistory(d.matches))
      .catch(() => router.push("/"));
  }, [router]);

  async function handleCreate() {
    setLoading(true);
    setError("");
    try {
      const data = await createMatch();
      router.push(`/play/${data.match_id}`);
    } catch (e: any) {
      setError(e.message ?? "Failed to create match");
      setLoading(false);
    }
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!joinCode.trim()) return;
    setLoading(true);
    setError("");
    try {
      const data = await joinMatch(joinCode.trim().toUpperCase());
      router.push(`/play/${data.match_id}`);
    } catch (e: any) {
      setError(e.message ?? "Failed to join match");
      setLoading(false);
    }
  }

  async function handleLogout() {
    await logout().catch(() => {});
    clearUserMeta();
    router.push("/");
  }

  const diffColor = (d: string) =>
    d === "easy" ? "text-green-400" : d === "medium" ? "text-yellow-400" : "text-red-400";

  return (
    <main className="min-h-screen px-4 py-8">
      <div className="mx-auto max-w-2xl space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">
            Code<span className="text-violet-400">Arena</span>
          </h1>
          <div className="flex items-center gap-4">
            <span className="text-zinc-400 text-sm">{handle}</span>
            <button
              onClick={handleLogout}
              className="text-sm text-zinc-500 hover:text-zinc-300"
            >
              Sign out
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 space-y-3">
            <h2 className="font-semibold text-lg">Create a match</h2>
            <p className="text-zinc-400 text-sm">
              Get a 6-character code to share with a friend.
            </p>
            <button
              onClick={handleCreate}
              disabled={loading}
              className="w-full rounded-lg bg-violet-600 px-4 py-2 font-semibold text-white transition-colors hover:bg-violet-700 disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create match"}
            </button>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 space-y-3">
            <h2 className="font-semibold text-lg">Join a match</h2>
            <form onSubmit={handleJoin} className="space-y-2">
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="XXXXXX"
                maxLength={6}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 font-mono text-white placeholder-zinc-500 focus:border-violet-500 focus:outline-none tracking-widest"
              />
              <button
                type="submit"
                disabled={loading || joinCode.length !== 6}
                className="w-full rounded-lg border border-zinc-700 px-4 py-2 font-semibold text-zinc-200 transition-colors hover:border-zinc-500 hover:bg-zinc-800 disabled:opacity-40"
              >
                Join
              </button>
            </form>
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-400 text-center">{error}</p>
        )}

        {/* Match history */}
        {history.length > 0 && (
          <div className="space-y-3">
            <h2 className="font-semibold text-zinc-400 text-sm uppercase tracking-wider">
              Recent matches
            </h2>
            <div className="space-y-2">
              {history.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3"
                >
                  <div className="space-y-0.5">
                    <p className="font-medium text-sm">{m.title}</p>
                    <p className="text-xs text-zinc-500">
                      {m.player_a_handle} vs {m.player_b_handle ?? "waiting"}
                      {" · "}
                      <span className={diffColor(m.difficulty)}>{m.difficulty}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-right">
                    <span
                      className={`text-xs font-medium ${
                        m.status === "finished"
                          ? "text-zinc-400"
                          : m.status === "live"
                          ? "text-green-400"
                          : "text-yellow-400"
                      }`}
                    >
                      {m.status}
                    </span>
                    {m.status === "finished" && (
                      <a
                        href={`/replay/${m.id}`}
                        className="text-xs text-violet-400 hover:underline"
                      >
                        Replay
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
