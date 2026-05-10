// Strip trailing slash so both `https://api.example.com` and `https://api.example.com/`
// produce the same URL when concatenated with a path that starts with `/`.
const API = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000").replace(/\/+$/, "");

async function req<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail ?? `HTTP ${res.status}`);
  }
  return res.json();
}

// Auth
export const requestMagicLink = (email: string) =>
  req("/auth/request", { method: "POST", body: JSON.stringify({ email }) });

export const verifyToken = (token: string) =>
  req<{ valid: boolean; email: string; intent: string }>(
    `/auth/verify?token=${token}`
  );

export const completeAuth = (token: string) =>
  req<{ ok: boolean; handle: string; is_guest: boolean }>(
    `/auth/complete?token=${token}`,
    { method: "POST" }
  );

export const createGuest = () =>
  req<{ ok: boolean; handle: string; is_guest: boolean }>("/auth/guest", {
    method: "POST",
  });

export const getMe = () =>
  req<{ user_id: string; handle: string; email: string | null; is_guest: boolean }>(
    "/auth/me"
  );

export const logout = () => req("/auth/logout", { method: "POST" });

// Match
export const createMatch = () =>
  req<{ match_id: string; join_code: string; problem: Problem }>("/api/match/create", {
    method: "POST",
  });

export const joinMatch = (joinCode: string) =>
  req<{ match_id: string; join_code: string; problem: Problem }>(
    `/api/match/${joinCode}/join`,
    { method: "POST" }
  );

export const getMatch = (matchId: string) =>
  req<Match>(`/api/match/${matchId}`);

export const runCode = (matchId: string, code: string) =>
  req<RunResult>(`/api/match/${matchId}/run`, {
    method: "POST",
    body: JSON.stringify({ code }),
  });

export const submitCode = (matchId: string, code: string) =>
  req<RunResult & { all_passed: boolean }>(`/api/match/${matchId}/submit`, {
    method: "POST",
    body: JSON.stringify({ code }),
  });

export const getMatchHistory = () =>
  req<{ matches: MatchSummary[] }>("/api/match/history");

export const getReplay = (matchId: string) =>
  req<{ snapshots: Snapshot[]; commentary: Commentary[] }>(
    `/api/match/${matchId}/replay`
  );

// Types
export interface Problem {
  slug: string;
  title: string;
  difficulty: "easy" | "medium" | "hard";
  statement_md: string;
  test_cases: TestCase[];
}

export interface TestCase {
  input: string;
  expected: string;
}

export interface Match {
  id: string;
  join_code: string;
  status: "lobby" | "live" | "finished";
  player: "a" | "b" | "spectator";
  player_a_id: string;
  player_b_id: string | null;
  winner_id: string | null;
  slug: string;
  title: string;
  difficulty: string;
  statement_md: string;
  test_cases: TestCase[];
}

export interface RunResult {
  tests_passed: number;
  tests_total: number;
  results: {
    input: string;
    expected: string;
    actual: string;
    passed: boolean;
    stderr: string;
  }[];
}

export interface MatchSummary {
  id: string;
  join_code: string;
  status: string;
  started_at: string | null;
  finished_at: string | null;
  winner_id: string | null;
  title: string;
  difficulty: string;
  player_a_handle: string;
  player_b_handle: string | null;
}

export interface Snapshot {
  id: number;
  match_id: string;
  player: "a" | "b";
  code: string;
  ts_ms: number;
}

export interface Commentary {
  id: number;
  match_id: string;
  ts_ms: number;
  text: string;
}
