import type { Metadata } from "next";
import { Providers } from "@/app/providers";
import { DashboardShell } from "@/components/dashboard/shell";

// Everything behind sign-in. The previous dashboard is kept, unrouted, in
// app/_old-dashboard.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <DashboardShell>{children}</DashboardShell>
    </Providers>
  );
}
