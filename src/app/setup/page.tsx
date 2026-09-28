import Link from "next/link";
import { SetupPinForm } from "@/components/SetupPinForm";

export default function SetupPage() {
  return <main><section className="card">
    <p className="eyebrow">First-time setup</p>
    <h1>Save a passkey</h1>
    <p className="muted">Open this page on your iPhone or Windows computer. Enter the one-time PIN, then confirm with Face ID, Touch ID or your device PIN.</p>
    <div className="stack"><SetupPinForm /><Link href="/login">Already set up? Sign in</Link></div>
  </section></main>;
}
