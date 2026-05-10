"use client";

// Thin client-side auth helpers
// Session cookie is httpOnly — we can't read it here.
// We store handle/guest status in sessionStorage for UI use only.

export function saveUserMeta(handle: string, isGuest: boolean) {
  sessionStorage.setItem("handle", handle);
  sessionStorage.setItem("is_guest", isGuest ? "1" : "0");
}

export function getUserMeta(): { handle: string | null; isGuest: boolean } {
  return {
    handle: sessionStorage.getItem("handle"),
    isGuest: sessionStorage.getItem("is_guest") === "1",
  };
}

export function clearUserMeta() {
  sessionStorage.removeItem("handle");
  sessionStorage.removeItem("is_guest");
}

// Store session token in sessionStorage so WS can use it
// (WS can't read httpOnly cookies, so we pass session via query param)
export function saveSessionToken(token: string) {
  sessionStorage.setItem("session_token", token);
}

export function getSessionToken(): string | null {
  return sessionStorage.getItem("session_token");
}
