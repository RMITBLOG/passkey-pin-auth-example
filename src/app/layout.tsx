import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Passkey + PIN example",
  description: "Single-owner passkey authentication with a one-time setup PIN",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
