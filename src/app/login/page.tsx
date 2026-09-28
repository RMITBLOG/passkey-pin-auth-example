import Link from "next/link";
import { redirect } from "next/navigation";
import { PasskeyButton } from "@/components/PasskeyButton";
import { getSession } from "@/lib/session";

export default async function LoginPage() {
  if (await getSession()) redirect("/");
  return <main><section className="card">
    <p className="eyebrow">Passkey + PIN example</p>
    <h1>Sign in without a password</h1>
    <p className="muted">Use a passkey saved on this device, or choose a nearby iPhone from the Windows passkey prompt and scan its code.</p>
    <div className="stack">
      <PasskeyButton />
      <Link className="button" href="/setup">Set up a passkey with a PIN</Link>
    </div>
    <p className="note">Your iPhone must already have a passkey for this exact website before it can sign you in on Windows.</p>
  </section></main>;
}
