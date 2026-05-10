"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import { getMatch } from "@/lib/api";
import type { Match } from "@/lib/api";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

const API = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000").replace(/\/+$/, "");

interface CommentaryLine {
  id: number;
  text: string;
  player: string | null;
  ts_ms: number;
}

export default function WatchPage() {
  const { matchId } = useParams<{ matchId: string }>();
  const [match, setMatch] = useState<Match | null>(null);
  const [codeA, setCodeA] = useState("# Player A");
  const [codeB, setCodeB] = useState("# Player B");
  const [commentary, setCommentary] = useState<CommentaryLine[]>([]);
  const [connected, setConnected] = useState(false);
  const commentsEndRef = useRef<HTMLDivElement>(null);
  const counterRef = useRef(0);

  useEffect(() => {
    getMatch(matchId).then(setMatch).catch(() => {});
  }, [matchId]);

  useEffect(() => {
    const es = new EventSource(`${API}/api/match/${matchId}/stream`);

    es.onopen = () => setConnected(true);
    es.onerror = () => setConnected(false);

    es.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === "code_snapshot") {
          if (msg.player === "a") setCodeA(msg.code);
          else setCodeB(msg.code);
        } else if (msg.type === "commentary") {
          setCommentary((prev) => [
            ...prev,
            { id: ++counterRef.current, text: msg.text, player: msg.player ?? null, ts_ms: msg.ts_ms },
          ]);
        }
      } catch {}
    };

    return () => es.close();
  }, [matchId]);

  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [commentary]);

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <header className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900 px-4 py-2 shrink-0">
        <div className="flex items-center gap-3">
          <span className="font-bold text-violet-400">CodeArena</span>
          <span className="text-zinc-400 text-sm">
            {match?.title ?? "Loading..."}
          </span>
          <span className="text-xs text-zinc-600">Spectator</span>
        </div>
        <span className={`text-xs font-medium ${connected ? "text-green-400" : "text-zinc-500"}`}>
          {connected ? "Live" : "Connecting..."}
        </span>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Code viewers */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {[{ label: "Player A", code: codeA }, { label: "Player B", code: codeB }].map(
            ({ label, code }) => (
              <div key={label} className="flex flex-1 flex-col overflow-hidden border-b border-zinc-800 last:border-0">
                <div className="bg-zinc-900 border-b border-zinc-800 px-3 py-1 shrink-0">
                  <span className="text-xs text-zinc-400 font-mono">{label}</span>
                </div>
                <div className="flex-1 overflow-hidden">
                  <MonacoEditor
                    height="100%"
                    language="python"
                    theme="vs-dark"
                    value={code}
                    options={{
                      fontSize: 12,
                      minimap: { enabled: false },
                      scrollBeyondLastLine: false,
                      readOnly: true,
                      fontFamily: "JetBrains Mono, monospace",
                    }}
                  />
                </div>
              </div>
            )
          )}
        </div>

        {/* Commentary feed */}
        <aside className="w-72 shrink-0 flex flex-col border-l border-zinc-800 bg-zinc-950 overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-800 shrink-0">
            <p className="text-sm font-semibold">AI Commentary</p>
            <p className="text-xs text-zinc-500 mt-0.5">Live analysis of the match</p>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {commentary.length === 0 ? (
              <p className="text-sm text-zinc-600">
                Commentary will appear here once players start coding.
              </p>
            ) : (
              commentary.map((c) => (
                <div
                  key={c.id}
                  className="rounded-xl bg-zinc-800 px-4 py-3 text-sm leading-relaxed text-zinc-100"
                >
                  {c.text}
                </div>
              ))
            )}
            <div ref={commentsEndRef} />
          </div>
        </aside>
      </div>
    </div>
  );
}
