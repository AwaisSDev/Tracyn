"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ForceLightTheme } from "@/components/force-light-theme";
import { Badge } from "@/components/ui/badge";
import { SiteNav } from "./home";
import { interTight } from "./fonts";
import "./home.css";

// The 404 in the home page's own language: the Notion-style pill and
// heavy headline, and the missing URL shown as a Timeline row, since
// "we checked the log" is the one thing Tracyn would say here.
export function NotFoundView() {
  const pathname = usePathname() || "/";
  return (
    <div className={`${interTight.variable} cv flex min-h-screen flex-col`}>
      <ForceLightTheme />
      <SiteNav />

      <main className="cv-hero-bg flex flex-1 flex-col items-center px-6 pb-24 pt-16 text-center sm:px-10 sm:pt-24">
        <span className="cv-hero-pill inline-flex items-baseline gap-[0.215em] rounded-full px-[0.5em] py-[0.143em] text-[22px] font-medium leading-[1.21] tracking-[-0.028em] text-[var(--cv-ink)] sm:text-[26px]">
          <span className="h-[0.573em] w-[0.573em] shrink-0 self-center rounded-full bg-[var(--cv-pill-dot)]" />
          <span>404</span>
        </span>

        <h1 className="mt-7 max-w-3xl text-[40px] font-bold leading-[1.1] tracking-[-0.035em] text-[var(--cv-ink)] sm:text-[64px]">
          This page isn&rsquo;t in the log.
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-[17px] leading-[1.55] text-[var(--cv-fg-2)] sm:text-[19px]">
          We checked every event. Nothing on Tracyn lives at this address, so it may have moved or never existed.
        </p>

        <div className="mt-10 w-full max-w-lg overflow-hidden rounded-xl border border-[var(--cv-line)] bg-white text-left shadow-[0_20px_40px_-24px_rgba(26,29,43,0.3)]">
          <div className="grid grid-cols-[1fr_auto] gap-4 border-b border-[var(--cv-line)] px-4 py-2.5 text-[12px] font-medium text-[var(--cv-fg-2)]">
            <span>Requested page</span>
            <span>Status</span>
          </div>
          <div className="grid grid-cols-[1fr_auto] items-center gap-4 px-4 py-3.5">
            <span className="min-w-0 truncate font-mono text-[13px] text-[var(--cv-fg)]">GET {pathname}</span>
            <Badge variant="destructive">not found</Badge>
          </div>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/"
            className="cv-btn-primary inline-flex items-center gap-1.5 rounded-[10px] px-5 py-2.5 text-[16px] font-semibold text-white"
          >
            <ArrowLeft className="h-4 w-4" /> Back to home
          </Link>
          <Link
            href="/docs"
            className="cv-btn-soft rounded-[10px] px-5 py-2.5 text-[16px] font-semibold text-[var(--cv-blue-bright)]"
          >
            Read the docs
          </Link>
        </div>
      </main>

      <footer className="border-t border-[var(--cv-line)] px-6 py-6 text-center text-[13.5px] text-[var(--cv-fg-3)] sm:px-10">
        &copy; {new Date().getFullYear()} Tracyn. All rights reserved.
      </footer>
    </div>
  );
}
