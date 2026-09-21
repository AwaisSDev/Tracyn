"use client";

import { useState } from "react";
import Link from "next/link";
import { Fraunces } from "next/font/google";
import {
  ArrowRight,
  Check,
  ChevronDown,
  MessageCircle,
  ShieldCheck,
  FileCheck2,
  Link2,
  Github,
} from "lucide-react";
import { ForceLightTheme } from "@/components/force-light-theme";
import { Reveal } from "@/components/landing/reveal";
import { Badge, StatusBadge } from "@/components/ui/badge";
import "./concept.css";

const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-serif", weight: ["400", "500"] });

const TIMELINE_ROWS = [
  { when: "2:23 PM", action: "send_refund", type: "external", status: "completed" },
  { when: "2:23 PM", action: "close_account", type: "external", status: "completed" },
  { when: "2:22 PM", action: "bulk_delete_records", type: "external", status: "pending" },
  { when: "2:22 PM", action: "check_invoice_status", type: "external", status: "completed" },
  { when: "2:22 PM", action: "update_ticket_status", type: "external", status: "completed" },
];

const FAQS = [
  {
    q: "What does Tracyn actually log?",
    a: "Every action your agent takes through the SDK — what it was, when, the model and cost behind it, and whether it ran automatically or needed a human. Nothing is summarized after the fact; it's recorded as it happens.",
  },
  {
    q: "What happens when an action needs approval?",
    a: "Your policy decides, not the agent. A matching rule pauses the action and notifies a human (dashboard, email, or Slack) to approve or deny it before it runs.",
  },
  {
    q: "Is this only useful for compliance teams?",
    a: "It starts as a safety net for whoever ships the agent — the audit trail and SOC 2 mapping are what compliance teams end up using it for once it exists.",
  },
  {
    q: "How is evidence generated, not just logged?",
    a: "Evidence Packs draft answers to security questionnaires straight from your real logged events, citing the exact events used — a human reviews and edits before anything is exported.",
  },
];

export default function CluelyVibeConceptPage() {
  return (
    <div className={`${fraunces.variable} cv`}>
      <ForceLightTheme />
      <ConceptBanner />
      <Nav />
      <Hero />

      <Reveal className="mx-auto max-w-5xl px-6 py-28 sm:px-10">
        <FeatureCardGreen />
      </Reveal>

      <Reveal className="mx-auto max-w-5xl px-6 pb-28 sm:px-10">
        <FeatureCardWhite />
      </Reveal>

      <Reveal className="mx-auto max-w-3xl px-6 pb-28 sm:px-10">
        <StatRows />
      </Reveal>

      <Reveal className="mx-auto max-w-2xl px-6 pb-28 sm:px-10">
        <Faq />
      </Reveal>

      <FinalCta />
      <Footer />
    </div>
  );
}

function ConceptBanner() {
  return (
    <div className="border-b border-[var(--cv-line)] bg-[var(--cv-cream)] px-4 py-2 text-center text-[12.5px] text-[var(--cv-fg-2)]">
      Concept preview — a design exploration, not the live Tracyn site.{" "}
      <Link href="/" className="font-medium text-[var(--cv-fg)] underline underline-offset-2">
        See the real site
      </Link>
    </div>
  );
}

function Nav() {
  return (
    <header className="sticky top-0 z-30 border-b border-[var(--cv-line)]/0 bg-[#fdfbf6]/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4 sm:px-10">
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element -- next/image's optimizer (sharp) fails on this PNG */}
          <img src="/logo.png" alt="" width={24} height={24} className="rounded" />
          <span className="text-[15px] font-semibold tracking-tight">Tracyn</span>
        </div>
        <nav className="hidden items-center gap-8 text-[14px] text-[var(--cv-fg-2)] md:flex">
          <span>Product</span>
          <span>Evidence Packs</span>
          <span>Pricing</span>
        </nav>
        <button className="rounded-full bg-[var(--cv-fg)] px-4 py-2 text-[13px] font-medium text-white transition-transform hover:scale-[1.03] active:scale-[0.98]">
          Get started
        </button>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="cv-hero-bg relative overflow-hidden px-6 pb-24 pt-16 sm:px-10 sm:pt-24">
      <div className="mx-auto max-w-3xl text-center">
        <h1 className="cv-serif text-[40px] leading-[1.1] tracking-tight sm:text-[58px]">
          Every action your agents take.
          <br />
          Proven, not promised.
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-[16px] leading-relaxed text-[var(--cv-fg-2)] sm:text-[18px]">
          Tracyn logs every action your AI agents take, pauses the risky ones for a person, and turns the trail into
          audit-ready evidence — automatically.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <button className="flex items-center gap-1.5 rounded-full bg-[var(--cv-fg)] px-6 py-3 text-[14px] font-medium text-white shadow-lg transition-transform hover:scale-[1.03] active:scale-[0.98]">
            Get started free <ArrowRight className="h-3.5 w-3.5" />
          </button>
          <button className="flex items-center gap-1.5 rounded-full border border-[var(--cv-line)] bg-white px-6 py-3 text-[14px] font-medium text-[var(--cv-fg)] transition-colors hover:bg-[var(--cv-cream)]">
            <Github className="h-3.5 w-3.5" /> View SDK
          </button>
        </div>
      </div>

      <div className="relative mx-auto mt-16 max-w-4xl">
        <TimelineWindow />
      </div>
    </section>
  );
}

function TimelineWindow() {
  return (
    <div className="cv-window overflow-hidden rounded-2xl border border-[var(--cv-line)] bg-white">
      <div className="flex items-center gap-1.5 border-b border-[var(--cv-line)] bg-[var(--cv-cream)] px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-[#e6b8b0]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#e8d9a8]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#b9d9b4]" />
        <span className="ml-3 text-[12px] text-[var(--cv-fg-2)]">app.tracyn.online/dashboard</span>
      </div>
      <div className="flex">
        <div className="hidden w-40 shrink-0 border-r border-[var(--cv-line)] bg-[var(--cv-cream)] p-4 sm:block">
          <div className="mb-4 flex items-center gap-1.5">
            {/* eslint-disable-next-line @next/next/no-img-element -- next/image's optimizer (sharp) fails on this PNG */}
            <img src="/logo.png" alt="" width={16} height={16} className="rounded" />
            <span className="text-[12px] font-semibold">Tracyn</span>
          </div>
          <div className="space-y-1 text-[12.5px] text-[var(--cv-fg-2)]">
            <div className="rounded-md bg-white px-2.5 py-1.5 font-medium text-[var(--cv-fg)] shadow-sm">Timeline</div>
            <div className="px-2.5 py-1.5">Approvals</div>
            <div className="px-2.5 py-1.5">Evidence Packs</div>
            <div className="px-2.5 py-1.5">Policy</div>
            <div className="px-2.5 py-1.5">SOC 2 Mapping</div>
          </div>
        </div>
        <div className="flex-1 overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-[var(--cv-line)] text-[12px] text-[var(--cv-fg-2)]">
                <th className="px-4 py-2.5 font-medium">When</th>
                <th className="px-4 py-2.5 font-medium">Agent action</th>
                <th className="px-4 py-2.5 font-medium">Type</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {TIMELINE_ROWS.map((row, i) => (
                <tr key={i} className="border-b border-[var(--cv-line)] last:border-0">
                  <td className="px-4 py-3 text-[var(--cv-fg-2)]">{row.when}</td>
                  <td className="px-4 py-3 font-medium text-[var(--cv-fg)]">{row.action}</td>
                  <td className="px-4 py-3 text-[var(--cv-fg-2)]">{row.type}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={row.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function FeatureCardGreen() {
  return (
    <div className="cv-glow-card overflow-hidden rounded-[28px] px-8 py-14 text-white sm:px-16">
      <div className="mx-auto max-w-lg text-center">
        <h2 className="text-[28px] font-semibold leading-tight tracking-tight sm:text-[34px]">
          Tracyn <span className="cv-pill mx-1 rounded-full px-2.5 py-0.5 text-[24px] sm:text-[28px]">nudges</span>{" "}
          until the policy is right
        </h2>
        <p className="mx-auto mt-4 max-w-sm text-[15px] leading-relaxed text-white/80">
          Describe what should need approval in plain English. Push back, refine, and apply — it's a conversation,
          not a one-shot form.
        </p>
      </div>
      <div className="mx-auto mt-10 max-w-sm">
        <PolicyChatWindow />
      </div>
    </div>
  );
}

function PolicyChatWindow() {
  return (
    <div className="cv-window overflow-hidden rounded-2xl bg-white text-[var(--cv-fg)]">
      <div className="flex items-center gap-2 border-b border-[var(--cv-line)] px-4 py-3">
        <MessageCircle className="h-4 w-4 text-[var(--cv-green)]" />
        <span className="text-[13px] font-semibold">Policy assistant</span>
      </div>
      <div className="space-y-2.5 p-4">
        <div className="flex justify-end">
          <div className="max-w-[85%] rounded-2xl bg-[var(--cv-fg)] px-3 py-2 text-[12.5px] text-white">
            Require approval for send_refund and charge_card
          </div>
        </div>
        <div className="flex justify-start">
          <div className="w-[92%] space-y-2">
            <div className="rounded-2xl bg-[var(--cv-cream)] px-3 py-2 text-[12.5px]">
              Added specific rules for send_refund and charge_card.
            </div>
            <div className="rounded-lg border border-[var(--cv-line)] bg-white p-2 font-mono text-[11px] leading-relaxed">
              <div className="rounded bg-[var(--cv-green-soft)] px-1 text-[var(--cv-green)]">
                + action_name: &quot;*refund*&quot;
              </div>
              <div className="rounded bg-[var(--cv-green-soft)] px-1 text-[var(--cv-green)]">
                + action_name: &quot;*card*&quot;
              </div>
            </div>
          </div>
        </div>
        <div className="flex justify-end">
          <div className="max-w-[85%] rounded-2xl bg-[var(--cv-fg)] px-3 py-2 text-[12.5px] text-white">
            Actually don&apos;t include the card one
          </div>
        </div>
        <div className="flex justify-start">
          <div className="rounded-2xl bg-[var(--cv-cream)] px-3 py-2 text-[12.5px]">Removed the card rule. ✓</div>
        </div>
      </div>
    </div>
  );
}

function FeatureCardWhite() {
  return (
    <div className="grid items-center gap-10 rounded-[28px] border border-[var(--cv-line)] bg-white p-8 sm:grid-cols-2 sm:p-14">
      <div>
        <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--cv-green-soft)]">
          <FileCheck2 className="h-[18px] w-[18px] text-[var(--cv-green)]" />
        </div>
        <h2 className="text-[26px] font-semibold leading-tight tracking-tight">Every action becomes real evidence</h2>
        <p className="mt-3 text-[15px] leading-relaxed text-[var(--cv-fg-2)]">
          Evidence Packs turn your logged actions into drafted answers for security questionnaires — grounded in
          real events, cited by id, never invented.
        </p>
      </div>
      <div className="cv-window overflow-hidden rounded-2xl border border-[var(--cv-line)] bg-white">
        <div className="border-b border-[var(--cv-line)] px-4 py-3 text-[13px] font-medium">
          Does the system log every agent action?
        </div>
        <div className="space-y-2 p-4 text-[12.5px] leading-relaxed text-[var(--cv-fg-2)]">
          <p>
            Yes — every action is recorded with a tamper-evident, chained hash as it happens, not reconstructed
            after the fact.
          </p>
          <div className="flex flex-wrap gap-1.5 pt-1">
            <Badge variant="secondary">evt_a91f</Badge>
            <Badge variant="secondary">evt_28ce</Badge>
            <Badge variant="secondary">evt_7d10</Badge>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatRows() {
  const rows = [
    { icon: Link2, label: "Chained, tamper-evident", desc: "Every event links to the last by hash — edit one and the chain visibly breaks." },
    { icon: ShieldCheck, label: "One policy, two outcomes", desc: "An action either runs automatically or waits for a person. Nothing in between to misconfigure." },
    { icon: ShieldCheck, label: "SOC 2, auto-mapped", desc: "Controls are mapped to what your workspace actually did, not a static template." },
  ];
  return (
    <div className="divide-y divide-[var(--cv-line)]">
      {rows.map((r, i) => (
        <div key={i} className="flex items-start gap-4 py-7">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--cv-green-soft)]">
            <r.icon className="h-[18px] w-[18px] text-[var(--cv-green)]" />
          </div>
          <div>
            <p className="text-[19px] font-semibold tracking-tight">{r.label}</p>
            <p className="mt-1 text-[14px] leading-relaxed text-[var(--cv-fg-2)]">{r.desc}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function Faq() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  return (
    <div>
      <h2 className="mb-6 text-center text-[26px] font-semibold tracking-tight">Frequently asked questions</h2>
      <div className="divide-y divide-[var(--cv-line)] rounded-xl border border-[var(--cv-line)] bg-white">
        {FAQS.map((f, i) => {
          const open = openIndex === i;
          return (
            <div key={i}>
              <button
                onClick={() => setOpenIndex(open ? null : i)}
                className="flex w-full items-center justify-between px-5 py-4 text-left text-[14.5px] font-medium"
              >
                {f.q}
                <ChevronDown className={`h-4 w-4 shrink-0 text-[var(--cv-fg-2)] transition-transform ${open ? "rotate-180" : ""}`} />
              </button>
              {open && <p className="px-5 pb-4 text-[13.5px] leading-relaxed text-[var(--cv-fg-2)]">{f.a}</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FinalCta() {
  return (
    <section className="cv-final-bg px-6 py-24 text-center sm:px-10">
      <h2 className="cv-serif mx-auto max-w-md text-[32px] leading-tight sm:text-[40px]">
        Start logging in five minutes.
      </h2>
      <p className="mt-3 text-[15px] text-[var(--cv-fg-2)]">No credit card. Free plan built for trying it out.</p>
      <button className="mt-7 flex items-center gap-1.5 rounded-full bg-[var(--cv-fg)] px-6 py-3 text-[14px] font-medium text-white shadow-lg transition-transform hover:scale-[1.03] active:scale-[0.98] mx-auto">
        <Check className="h-3.5 w-3.5" /> Get started free
      </button>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-[var(--cv-line)] px-6 py-10 sm:px-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-[13px] text-[var(--cv-fg-2)] sm:flex-row">
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element -- next/image's optimizer (sharp) fails on this PNG */}
          <img src="/logo.png" alt="" width={18} height={18} className="rounded" />
          <span className="font-medium text-[var(--cv-fg)]">Tracyn</span>
        </div>
        <p>Design concept only — not connected to your account.</p>
        <Link href="/" className="underline underline-offset-2">
          Back to the real site
        </Link>
      </div>
    </footer>
  );
}
