"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export function SignOutButton() {
  const [busy, setBusy] = useState(false);
  return <button className="secondary" disabled={busy} onClick={async () => {
    setBusy(true);
    try { await authClient.signOut(); window.location.assign("/login"); }
    finally { setBusy(false); }
  }}>{busy ? "Signing out…" : "Sign out"}</button>;
}
