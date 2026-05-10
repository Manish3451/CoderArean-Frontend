const WS_BASE =
  (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000")
    .replace(/\/+$/, "")
    .replace(/^http/, "ws");

export type WsMessage =
  | { type: "connected"; player: string; match_id: string; status: string }
  | { type: "code_snapshot"; player: string; code: string; ts_ms: number }
  | { type: "commentary"; text: string; player: string; ts_ms: number; event_type: string | null }
  | { type: "run_result"; player: string; tests_passed: number; tests_total: number }
  | { type: "match_event"; event: string; player?: string }
  | { type: "pong" };

export function createMatchSocket(
  matchId: string,
  sessionToken: string,
  onMessage: (msg: WsMessage) => void,
  onClose?: () => void
): { send: (msg: object) => void; close: () => void } {
  const url = `${WS_BASE}/ws/match/${matchId}?token=${sessionToken}`;
  const ws = new WebSocket(url);

  ws.onmessage = (e) => {
    try {
      onMessage(JSON.parse(e.data));
    } catch {}
  };

  ws.onclose = () => onClose?.();

  // Ping every 20s to keep connection alive
  const ping = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "ping" }));
    }
  }, 20_000);

  return {
    send: (msg) => {
      if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
    },
    close: () => {
      clearInterval(ping);
      ws.close();
    },
  };
}
