"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export function PasskeyButton({ token }: { token?: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function run() {
    if (busy) return;
    setError("");
    if (!window.isSecureContext || !window.PublicKeyCredential) {
      setError("Passkeys need a supported browser and HTTPS, or localhost for local development.");
      return;
    }
    setBusy(true);
    try {
      const name = /iPhone/i.test(navigator.userAgent) ? "iPhone" : /iPad/i.test(navigator.userAgent) ? "iPad" : "Computer";
      const result = token
        ? await authClient.passkey.addPasskey({ name, context: token, createSession: true })
        : await authClient.signIn.passkey();
      if (result.error) { setError("Passkey verification did not finish. Try again and confirm on your device."); return; }
      window.location.assign("/");
    } catch { setError("Could not complete the passkey prompt. Check your connection and try again."); }
    finally { setBusy(false); }
  }
  return <div className="stack">
    <button className="primary" type="button" disabled={busy} onClick={() => void run()}>
      {busy ? "Confirm on your device…" : token ? "Create passkey" : "Sign in with passkey"}
    </button>
    {error && <p className="error" role="alert">{error}</p>}
  </div>;
}
