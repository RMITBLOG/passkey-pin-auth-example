import Link from "next/link";
import { redirect } from "next/navigation";
import { SignOutButton } from "@/components/SignOutButton";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export default async function HomePage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const count = await prisma.passkey.count({ where: { userId: "owner" } });
  return <main><section className="card">
    <p className="eyebrow">Signed in</p>
    <h1>Your passkey worked</h1>
    <p className="muted">This is a protected page. The browser holds a secure session cookie; the server keeps the passkey public key. No password or personal account details were entered.</p>
    <p><strong>{count} of 3</strong> passkey slots used.</p>
    <div className="stack"><Link className="button" href="/setup">Add another passkey with a new PIN</Link><SignOutButton /></div>
  </section></main>;
}
