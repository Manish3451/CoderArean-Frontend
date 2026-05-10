"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createGuest } from "@/lib/api";
import { saveUserMeta } from "@/lib/auth";

export default function GuestButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleGuest() {
    setLoading(true);
    setError("");
    try {
      const data = await createGuest();
      saveUserMeta(data.handle, true);
      router.push("/lobby");
    } catch (e: any) {
      setError(e.message ?? "Failed to create guest session");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        onClick={handleGuest}
        disabled={loading}
        className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-6 py-3 font-semibold text-zinc-200 transition-colors hover:border-zinc-500 hover:bg-zinc-800 disabled:opacity-50"
      >
        {loading ? "Creating guest session..." : "Play as Guest"}
      </button>
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
    </div>
  );
}
