"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import ReactMarkdown from "react-markdown";
import { getMatch, runCode, submitCode } from "@/lib/api";
import type { Match, RunResult } from "@/lib/api";
import { createMatchSocket, type WsMessage } from "@/lib/ws";

// Monaco must be loaded client-side only
const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-zinc-500">
      Loading editor...
    </div>
  ),
});

const DEFAULT_CODE = `def solution():
    pass
`;

type TestResult = RunResult["results"][number];

export default function PlayPage() {
  const { matchId } = useParams<{ matchId: string }>();
  const router = useRouter();

  const [match, setMatch] = useState<Match | null>(null);
  const [myCode, setMyCode] = useState(DEFAULT_CODE);
  const [opponentCode, setOpponentCode] = useState("");
  const [runResult, setRunResult] = useState<RunResult | null>(null);
  const [commentary, setCommentary] = useState<string[]>([]);
  const [status, setStatus] = useState<string>("");
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [finished, setFinished] = useState(false);
  const [winnerMsg, setWinnerMsg] = useState("");
  const [error, setError] = useState("");
  const [joinCode, setJoinCode] = useState("");

  const wsRef = useRef<{ send: (m: object) => void; close: () => void } | null>(null);
  const codeRef = useRef(myCode);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const commentsEndRef = useRef<HTMLDivElement>(null);

  // Load match data
  useEffect(() => {
    getMatch(matchId)
      .then((m) => {
        setMatch(m);
        setJoinCode(m.join_code);
        setStatus(m.status);
        if (m.status === "finished") setFinished(true);
      })
      .catch(() => router.push("/lobby"));
  }, [matchId, router]);

  // Connect WebSocket
  useEffect(() => {
    if (!match) return;

    // Get session token from API
    fetch(
      `${(process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000").replace(/\/+$/, "")}/auth/token`,
      { credentials: "include" }
    )
      .then((r) => r.json())
      .then(({ token }) => {
        const ws = createMatchSocket(matchId, token, handleWsMessage, () => {
          setError("Disconnected from match. Refresh to reconnect.");
        });
        wsRef.current = ws;
      })
      .catch(() => setError("Could not establish real-time connection."));

    return () => wsRef.current?.close();
  }, [match, matchId]);

  // Scroll commentary to bottom
  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [commentary]);

  function handleWsMessage(msg: WsMessage) {
    if (msg.type === "connected") {
      setStatus(msg.status);
    } else if (msg.type === "code_snapshot") {
      if (match && msg.player !== match.player) {
        setOpponentCode(msg.code);
      }
    } else if (msg.type === "commentary") {
      setCommentary((prev) => [...prev, msg.text]);
    } else if (msg.type === "run_result") {
      // opponent run result
    } else if (msg.type === "match_event") {
      if (msg.event === "match_finished") {
        setFinished(true);
        setWinnerMsg("Match over! Check the result.");
      }
    }
  }

  function handleCodeChange(value: string | undefined) {
    const code = value ?? "";
    codeRef.current = code;
    setMyCode(code);

    // Debounce WS send: 500ms idle
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      wsRef.current?.send({ type: "code_update", code });
    }, 500);
  }

  async function handleRun() {
    if (!match) return;
    setRunning(true);
    setError("");
    try {
      const result = await runCode(matchId, codeRef.current);
      setRunResult(result);
      wsRef.current?.send({
        type: "run_result",
        tests_passed: result.tests_passed,
        tests_total: result.tests_total,
      });
    } catch (e: any) {
      setError(e.message ?? "Run failed");
    } finally {
      setRunning(false);
    }
  }

  async function handleSubmit() {
    if (!match) return;
    setSubmitting(true);
    setError("");
    try {
      const result = await submitCode(matchId, codeRef.current);
      setRunResult(result);
      if (result.all_passed) {
        setFinished(true);
        setWinnerMsg("You won! All tests passed.");
      } else {
        setError(`${result.tests_passed}/${result.tests_total} hidden tests passed.`);
      }
    } catch (e: any) {
      setError(e.message ?? "Submit failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (!match) {
    return (
      <div className="flex min-h-screen items-center justify-center text-zinc-400">
        Loading match...
      </div>
    );
  }

  const isPlayer = match.player === "a" || match.player === "b";
  const opLabel = match.player === "a" ? "Player B" : "Player A";

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      {/* Top bar */}
      <header className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900 px-4 py-2 shrink-0">
        <div className="flex items-center gap-4">
          <span className="font-bold text-violet-400">CodeArena</span>
          <span className="text-zinc-400 text-sm">{match.title}</span>
          <span
            className={`text-xs font-medium ${
              match.difficulty === "easy"
                ? "text-green-400"
                : match.difficulty === "medium"
                ? "text-yellow-400"
                : "text-red-400"
            }`}
          >
            {match.difficulty}
          </span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          {status === "lobby" && (
            <span className="text-zinc-400">
              Share code:{" "}
              <span className="font-mono font-bold text-white">{joinCode}</span>
            </span>
          )}
          <span
            className={`font-medium ${
              status === "live"
                ? "text-green-400"
                : status === "lobby"
                ? "text-yellow-400"
                : "text-zinc-400"
            }`}
          >
            {status === "lobby"
              ? "Waiting for opponent..."
              : status === "live"
              ? "Live"
              : "Finished"}
          </span>
          <a
            href={`/watch/${matchId}`}
            target="_blank"
            className="text-xs text-zinc-500 hover:text-zinc-300"
          >
            Spectator view
          </a>
        </div>
      </header>

      {/* Finished banner */}
      {finished && (
        <div className="bg-violet-900 px-4 py-2 text-center text-sm font-medium text-violet-100 shrink-0">
          {winnerMsg || "Match finished."}{" "}
          <a href={`/replay/${matchId}`} className="underline">
            View replay
          </a>
          {" · "}
          <a href="/lobby" className="underline">
            Lobby
          </a>
        </div>
      )}

      {/* Main 3-column layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Problem statement */}
        <aside className="w-72 shrink-0 overflow-y-auto border-r border-zinc-800 bg-zinc-950 p-4">
          <div className="prose prose-invert prose-sm max-w-none">
            <ReactMarkdown>{match.statement_md}</ReactMarkdown>
          </div>
        </aside>

        {/* Editors */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* My editor */}
          <div className="flex flex-1 flex-col border-b border-zinc-800 overflow-hidden">
            <div className="flex items-center justify-between px-3 py-1 bg-zinc-900 border-b border-zinc-800 shrink-0">
              <span className="text-xs text-zinc-400 font-mono">
                Player {match.player?.toUpperCase() ?? "?"} (you)
              </span>
              {isPlayer && !finished && (
                <div className="flex gap-2">
                  <button
                    onClick={handleRun}
                    disabled={running}
                    className="rounded px-3 py-1 text-xs bg-zinc-700 text-white hover:bg-zinc-600 disabled:opacity-50"
                  >
                    {running ? "Running..." : "Run"}
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={submitting || status !== "live"}
                    className="rounded px-3 py-1 text-xs bg-violet-700 text-white hover:bg-violet-600 disabled:opacity-40"
                  >
                    {submitting ? "Submitting..." : "Submit"}
                  </button>
                </div>
              )}
            </div>
            <div className="flex-1 overflow-hidden">
              <MonacoEditor
                height="100%"
                language="python"
                theme="vs-dark"
                value={myCode}
                onChange={handleCodeChange}
                options={{
                  fontSize: 13,
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  readOnly: !isPlayer || finished,
                  fontFamily: "JetBrains Mono, monospace",
                }}
              />
            </div>
          </div>

          {/* Opponent editor (read-only) */}
          <div className="flex flex-1 flex-col overflow-hidden">
            <div className="px-3 py-1 bg-zinc-900 border-b border-zinc-800 shrink-0">
              <span className="text-xs text-zinc-400 font-mono">{opLabel} (live)</span>
            </div>
            <div className="flex-1 overflow-hidden">
              <MonacoEditor
                height="100%"
                language="python"
                theme="vs-dark"
                value={opponentCode || "# Waiting for opponent..."}
                options={{
                  fontSize: 13,
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  readOnly: true,
                  fontFamily: "JetBrains Mono, monospace",
                }}
              />
            </div>
          </div>
        </div>

        {/* Right panel: test results + commentary */}
        <aside className="w-64 shrink-0 flex flex-col border-l border-zinc-800 bg-zinc-950 overflow-hidden">
          {/* Test results */}
          <div className="shrink-0 border-b border-zinc-800 p-3 space-y-2">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Test results
            </p>
            {error && <p className="text-xs text-red-400">{error}</p>}
            {runResult ? (
              <div className="space-y-1">
                <p className="text-sm font-medium">
                  {runResult.tests_passed}/{runResult.tests_total} passed
                </p>
                {runResult.results.map((r, i) => (
                  <div
                    key={i}
                    className={`rounded p-2 text-xs font-mono ${
                      r.passed
                        ? "bg-green-950 text-green-300"
                        : "bg-red-950 text-red-300"
                    }`}
                  >
                    <p>
                      {r.passed ? "PASS" : "FAIL"} · in: {r.input.slice(0, 20)}
                    </p>
                    {!r.passed && (
                      <>
                        <p>got: {r.actual || "(empty)"}</p>
                        <p>exp: {r.expected}</p>
                        {r.stderr && <p className="text-red-400">{r.stderr.slice(0, 60)}</p>}
                      </>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-zinc-600">Run your code to see results.</p>
            )}
          </div>

          {/* Commentary */}
          <div className="flex flex-col flex-1 overflow-hidden p-3 space-y-2">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider shrink-0">
              Commentary
            </p>
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {commentary.length === 0 ? (
                <p className="text-xs text-zinc-600">
                  AI commentary appears here during live matches.
                </p>
              ) : (
                commentary.map((line, i) => (
                  <div
                    key={i}
                    className="rounded-lg bg-zinc-800 px-3 py-2 text-xs leading-relaxed text-zinc-200"
                  >
                    {line}
                  </div>
                ))
              )}
              <div ref={commentsEndRef} />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
