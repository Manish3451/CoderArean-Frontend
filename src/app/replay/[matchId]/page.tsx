"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import { getReplay } from "@/lib/api";
import type { Snapshot, Commentary } from "@/lib/api";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

export default function ReplayPage() {
  const { matchId } = useParams<{ matchId: string }>();
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [commentary, setCommentary] = useState<Commentary[]>([]);
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    getReplay(matchId).then((d) => {
      setSnapshots(d.snapshots);
      setCommentary(d.commentary);
    });
  }, [matchId]);

  useEffect(() => {
    if (playing) {
      intervalRef.current = setInterval(() => {
        setIdx((i) => {
          if (i >= snapshots.length - 1) {
            setPlaying(false);
            return i;
          }
          return i + 1;
        });
      }, 800);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [playing, snapshots.length]);

  const current = snapshots[idx];
  const currentTs = current?.ts_ms ?? 0;

  // Commentary visible up to current timestamp
  const visibleCommentary = commentary.filter((c) => c.ts_ms <= currentTs);

  const codeA = snapshots
    .slice(0, idx + 1)
    .filter((s) => s.player === "a")
    .at(-1)?.code ?? "";

  const codeB = snapshots
    .slice(0, idx + 1)
    .filter((s) => s.player === "b")
    .at(-1)?.code ?? "";

  const totalMs =
    snapshots.length > 1
      ? snapshots[snapshots.length - 1].ts_ms - snapshots[0].ts_ms
      : 1;

  const progressPct =
    snapshots.length > 1
      ? ((currentTs - snapshots[0].ts_ms) / totalMs) * 100
      : 0;

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <header className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900 px-4 py-2 shrink-0">
        <div className="flex items-center gap-3">
          <a href="/lobby" className="text-sm text-zinc-500 hover:text-zinc-300">
            Back
          </a>
          <span className="font-bold text-violet-400">Replay</span>
        </div>
        <span className="text-xs text-zinc-500">
          {idx + 1} / {snapshots.length} snapshots
        </span>
      </header>

      {/* Scrubber */}
      <div className="flex items-center gap-3 border-b border-zinc-800 bg-zinc-900 px-4 py-2 shrink-0">
        <button
          onClick={() => setPlaying((p) => !p)}
          className="rounded px-3 py-1 text-xs bg-zinc-700 hover:bg-zinc-600 text-white"
        >
          {playing ? "Pause" : "Play"}
        </button>
        <input
          type="range"
          min={0}
          max={snapshots.length - 1}
          value={idx}
          onChange={(e) => {
            setPlaying(false);
            setIdx(Number(e.target.value));
          }}
          className="flex-1 accent-violet-500"
        />
        <span className="text-xs text-zinc-500 w-24 text-right font-mono">
          {((currentTs - (snapshots[0]?.ts_ms ?? 0)) / 1000).toFixed(1)}s
        </span>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Editors */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {[
            { label: "Player A", code: codeA },
            { label: "Player B", code: codeB },
          ].map(({ label, code }) => (
            <div key={label} className="flex flex-1 flex-col border-b border-zinc-800 last:border-0 overflow-hidden">
              <div className="bg-zinc-900 border-b border-zinc-800 px-3 py-1 shrink-0">
                <span className="text-xs text-zinc-400 font-mono">{label}</span>
              </div>
              <div className="flex-1 overflow-hidden">
                <MonacoEditor
                  height="100%"
                  language="python"
                  theme="vs-dark"
                  value={code || "# No code yet"}
                  options={{
                    fontSize: 12,
                    minimap: { enabled: false },
                    readOnly: true,
                    fontFamily: "JetBrains Mono, monospace",
                    scrollBeyondLastLine: false,
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Commentary timeline */}
        <aside className="w-72 shrink-0 flex flex-col border-l border-zinc-800 bg-zinc-950 overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-800 shrink-0">
            <p className="text-sm font-semibold">Commentary</p>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {visibleCommentary.length === 0 ? (
              <p className="text-sm text-zinc-600">No commentary yet at this point.</p>
            ) : (
              visibleCommentary.map((c) => (
                <div key={c.id} className="rounded-xl bg-zinc-800 px-4 py-3 text-sm leading-relaxed text-zinc-100">
                  <p className="text-xs text-zinc-500 mb-1">
                    {((c.ts_ms - (snapshots[0]?.ts_ms ?? 0)) / 1000).toFixed(1)}s
                  </p>
                  {c.text}
                </div>
              ))
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
