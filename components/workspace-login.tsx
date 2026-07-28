"use client";

import { KeyRound, LogIn, LogOut, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function WorkspaceLogin() {
  const router = useRouter();
  const [actorId, setActorId] = useState("");
  const [token, setToken] = useState("");
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const signIn = async (event: React.FormEvent) => {
    event.preventDefault();
    setWorking(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ actorId, token }),
      });
      const payload = (await response.json()) as {
        error?: { message?: string };
      };
      if (!response.ok) {
        throw new Error(payload.error?.message ?? "Workspace sign-in failed.");
      }
      setToken("");
      setMessage("Signed in. Your workspace session lasts up to 12 hours.");
      router.push("/");
      router.refresh();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Workspace sign-in failed.",
      );
    } finally {
      setWorking(false);
    }
  };

  const signOut = async () => {
    setWorking(true);
    setError("");
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setMessage("Workspace session cleared.");
      router.refresh();
    } finally {
      setWorking(false);
    }
  };

  return (
    <section className="surface workspace-login" aria-labelledby="workspace-login-title">
      <div className="workspace-login__security">
        <ShieldCheck aria-hidden="true" size={28} />
        <div>
          <span className="meta-label">Workspace authorization</span>
          <h2 id="workspace-login-title">Use your assigned Q Intelligence token</h2>
          <p>
            The token is exchanged for an HTTP-only, SameSite session cookie. It
            is not placed in browser storage.
          </p>
        </div>
      </div>
      <form onSubmit={signIn}>
        <label className="field">
          <span>Actor ID</span>
          <input
            value={actorId}
            onChange={(event) => setActorId(event.target.value)}
            placeholder="your-name@quemedia.ca"
            autoComplete="username"
            required
          />
        </label>
        <label className="field">
          <span>Workspace token</span>
          <input
            type="password"
            value={token}
            onChange={(event) => setToken(event.target.value)}
            autoComplete="current-password"
            required
          />
        </label>
        {error ? <p className="field-error" role="alert">{error}</p> : null}
        {message ? <p className="field-success" role="status">{message}</p> : null}
        <button
          className="button button--primary"
          type="submit"
          disabled={working}
        >
          <LogIn aria-hidden="true" size={16} />
          {working ? "Working…" : "Sign in"}
        </button>
      </form>
      <div className="workspace-login__footer">
        <KeyRound aria-hidden="true" size={17} />
        <p>
          An administrator assigns viewer, researcher, sender, or admin tokens
          through the deployment secret manager.
        </p>
        <button
          className="text-button"
          type="button"
          onClick={signOut}
          disabled={working}
        >
          <LogOut aria-hidden="true" size={15} />
          Clear current session
        </button>
      </div>
    </section>
  );
}
