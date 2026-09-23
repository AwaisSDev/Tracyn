import type { Metadata } from "next";
import { Providers } from "@/app/providers";

// Joining a shared workspace. Outside the dashboard's own layout so it works
// for a brand-new account with no workspace yet.
export const metadata: Metadata = {
  title: "Join a workspace",
  robots: { index: false, follow: false },
};

export default function JoinLayout({ children }: { children: React.ReactNode }) {
  return <Providers>{children}</Providers>;
}
