"use client";

import { useActionState } from "react";
import { unlockSetup } from "@/app/actions/setup";
import { PasskeyButton } from "./PasskeyButton";

export function SetupPinForm() {
  const [state, action, pending] = useActionState(unlockSetup, {});
  if (state.token) return <div className="stack">
    <p role="status">PIN accepted. Save your passkey now.</p>
    <PasskeyButton token={state.token} />
    <p className="hint">This single-use registration grant expires in 10 minutes.</p>
  </div>;
  return <form action={action} className="stack">
    <label htmlFor="setup-pin">One-time setup PIN</label>
    <input id="setup-pin" name="pin" type="password" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{8}" minLength={8} maxLength={8} required />
    <p className="hint">Ask the operator for an 8-digit PIN. It expires in 30 minutes.</p>
    {state.error && <p className="error" role="alert">{state.error}</p>}
    <button className="primary" disabled={pending}>{pending ? "Checking PIN…" : "Continue"}</button>
  </form>;
}
