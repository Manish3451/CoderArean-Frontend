"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { verifyToken, completeAuth } from "@/lib/api";
import { saveUserMeta } from "@/lib/auth";

function VerifyInner() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token") ?? "";

  const [state, setState] = useState<"checking" | "valid" | "completing" | "error">(
    "checking"
  );
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      setState("error");
      setError("No token in URL.");
      return;
    }
    verifyToken(token)
      .then((data) => {
        setEmail(data.email);
        setState("valid");
      })
      .catch((e) => {
        setState("error");
        setError(e.message ?? "Link invalid or expired.");
      });
  }, [token]);

  async function handleContinue() {
    setState("completing");
    try {
      const data = await completeAuth(token);
      saveUserMeta(data.handle, data.is_guest);
      router.push("/lobby");
    } catch (e: any) {
      setState("error");
      setError(e.message ?? "Failed to complete sign-in.");
    }
  }

  if (state === "checking") {
    return <StatusPage message="Verifying your link..." />;
  }

  if (state === "error") {
    return (
      <StatusPage message="">
        <p className="text-red-400 font-medium">{error}</p>
        <a href="/auth/request" className="text-violet-400 underline text-sm">
          Request a new link
        </a>
      </StatusPage>
    );
  }

  if (state === "completing") {
    return <StatusPage message="Signing you in..." />;
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6 text-center">
        <h1 className="text-2xl font-bold">Continue on this device?</h1>
        <p className="text-zinc-400">
          Signing in as <span className="text-white">{email}</span>
        </p>
        <button
          onClick={handleContinue}
          className="w-full rounded-lg bg-violet-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-violet-700"
        >
          Yes, sign me in
        </button>
        <p className="text-xs text-zinc-500">
          If you opened this link on the wrong device, close this tab.
        </p>
      </div>
    </main>
  );
}

function StatusPage({
  message,
  children,
}: {
  message: string;
  children?: React.ReactNode;
}) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      {message && <p className="text-zinc-300">{message}</p>}
      {children}
    </main>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<StatusPage message="Loading..." />}>
      <VerifyInner />
    </Suspense>
  );
}
