"use client";

import Link from "next/link";
import { ForceLightTheme } from "@/components/force-light-theme";
import { interTight } from "./fonts";
import "./home.css";

// The sign-in, sign-up and verify-code screens in the marketing site's
// look: same font, the soft blue hero wash, a slim top bar with the logo
// back home, a heavy centered headline, and one clean white card.
export function AuthShell({
  title,
  subtitle,
  children,
  below,
}: {
  title: string;
  subtitle: React.ReactNode;
  children: React.ReactNode;
  below?: React.ReactNode;
}) {
  return (
    <div className={`${interTight.variable} cv cv-hero-bg flex min-h-screen flex-col`}>
      <ForceLightTheme />
      <header className="mx-auto flex w-full max-w-7xl items-center px-5 py-4 sm:px-8">
        <Link href="/" className="flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element -- next/image's optimizer (sharp) fails on this PNG */}
          <img src="/logo.png" alt="" width={32} height={32} className="rounded-md" />
          <span className="text-[20px] font-semibold tracking-[-0.025em] text-[var(--cv-ink)]">Tracyn</span>
        </Link>
      </header>

      <main className="flex flex-1 items-center justify-center px-5 pb-16 pt-6 sm:pt-10">
        <div className="w-full max-w-[400px]">
          <div className="text-center">
            <h1 className="text-[32px] font-bold leading-[1.1] tracking-[-0.035em] text-[var(--cv-ink)] sm:text-[38px]">
              {title}
            </h1>
            <p className="mx-auto mt-3 max-w-[34ch] text-[16px] leading-[1.5] text-[var(--cv-fg-2)]">{subtitle}</p>
          </div>
          <div className="mt-8 rounded-[20px] border border-[#dfe3ef] bg-white p-6 shadow-[0_24px_60px_-28px_rgba(26,29,43,0.3),0_1px_2px_rgba(26,29,43,0.04)] sm:p-7">
            {children}
          </div>
          {below && <div className="mt-5 text-center">{below}</div>}
        </div>
      </main>

      <footer className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 px-5 pb-6 text-[13px] text-[var(--cv-fg-3)]">
        <span>&copy; {new Date().getFullYear()} Tracyn</span>
        <Link href="/privacy" className="transition-colors hover:text-[var(--cv-ink)]">
          Privacy
        </Link>
        <Link href="/terms" className="transition-colors hover:text-[var(--cv-ink)]">
          Terms
        </Link>
      </footer>
    </div>
  );
}

// Field and button styles shared by the three auth screens.
export const authInputClass =
  "h-11 w-full rounded-[10px] border border-[#d5dbea] bg-white px-3.5 text-[15px] text-[var(--cv-ink)] outline-none transition-[border-color,box-shadow] placeholder:text-[#a3a9bd] focus:border-[var(--cv-blue-bright)] focus:shadow-[0_0_0_4px_rgba(53,83,212,0.12)]";

export const authButtonClass =
  "cv-btn-primary flex h-11 w-full items-center justify-center rounded-[10px] text-[15px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60";

export const authLinkClass =
  "text-[14px] font-medium text-[var(--cv-blue-bright)] transition-colors hover:text-[#2b45b8]";
