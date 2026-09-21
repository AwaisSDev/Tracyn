"use client";

import { useState } from "react";
import Link from "next/link";
import { Fraunces } from "next/font/google";
import {
  ArrowRight,
  Check,
  ChevronDown,
  Github,
  History,
  CircleCheck,
  FileText,
  ShieldCheck,
  BadgeCheck,
  Settings as SettingsIcon,
  LogOut,
  Send,
  X,
  Link2,
} from "lucide-react";
import { ForceLightTheme } from "@/components/force-light-theme";
import { Reveal } from "@/components/landing/reveal";
import { Badge, StatusBadge } from "@/components/ui/badge";
import "./concept.css";

const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-serif", weight: ["400", "500"] });

const NAV_ITEMS = [
  { label: "Timeline", icon: History },
  { label: "Approvals", icon: CircleCheck },
  { label: "Evidence Packs", icon: FileText },
  { label: "Policy", icon: ShieldCheck },
  { label: "SOC 2 Mapping", icon: BadgeCheck },
  { label: "Settings", icon: SettingsIcon },
];

const TIMELINE_ROWS = [
  { when: "Sep 20, 02:23 PM", action: "send_refund", type: "external", status: "completed" },
  { when: "Sep 20, 02:23 PM", action: "close_account", type: "external", status: "completed" },
  { when: "Sep 20, 02:22 PM", action: "bulk_delete_records", type: "external", status: "pending" },
  { when: "Sep 20, 02:22 PM", action: "check_invoice_status", type: "external", status: "completed" },
  { when: "Sep 20, 02:22 PM", action: "update_ticket_status", type: "external", status: "completed" },
  { when: "Sep 20, 02:22 PM", action: "send_receipt_email", type: "external", status: "completed" },
  { when: "Sep 20, 02:22 PM", action: "lookup_order", type: "external", status: "completed" },
  { when: "Sep 20, 02:22 PM", action: "check_system_health", type: "internal", status: "completed" },
];

const FAQS = [
  {
    q: "What does Tracyn actually log?",
    a: "Every action your agent takes through the SDK: what it was, when it happened, the model and cost behind it, and whether it ran automatically or needed a human. Nothing is summarized after the fact. It's recorded as it happens.",
  },
  {
    q: "What happens when an action needs approval?",
    a: "Your policy decides, not the agent. A matching rule pauses the action and notifies a human (dashboard, email, or Slack) to approve or deny it before it runs.",
  },
  {
    q: "Is this only useful for compliance teams?",
    a: "It starts as a safety net for whoever ships the agent. The audit trail and SOC 2 mapping are what compliance teams end up using once it already exists.",
  },
  {
    q: "How is evidence generated, not just logged?",
    a: "Evidence Packs draft answers to security questionnaires straight from your real logged events, citing the exact events used. A human reviews and edits before anything is exported.",
  },
];

export default function CluelyVibeConceptPage() {
  return (
    <div className={`${fraunces.variable} cv`}>
      <ForceLightTheme />
      <ConceptBanner />
      <Nav />
      <Hero />

      <Reveal className="mx-auto max-w-6xl px-6 py-28 sm:px-10">
        <FeatureBlueCard />
      </Reveal>

      <Reveal className="mx-auto max-w-6xl px-6 pb-28 sm:px-10">
        <FeatureWhiteCard />
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
      Concept preview. A design exploration, not the live Tracyn site.{" "}
      <Link href="/" className="font-medium text-[var(--cv-fg)] underline underline-offset-2">
        See the real site
      </Link>
    </div>
  );
}

function Nav() {
  return (
    <header className="sticky top-0 z-30 bg-[#fdfdfe]/80 backdrop-blur-md">
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
        <h1 className="cv-serif text-[46px] leading-[1.05] tracking-tight sm:text-[68px]">
          It&rsquo;s not a log.
          <br />
          It&rsquo;s evidence.
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-[17px] leading-relaxed text-[var(--cv-fg-2)] sm:text-[20px]">
          Tracyn keeps a record of everything your AI agents do, asks a person before the risky parts, and turns it
          all into evidence your auditors accept.
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

      <div className="relative mx-auto mt-16 max-w-6xl rounded-[32px] bg-white/50 p-3 shadow-[0_1px_1px_rgba(26,29,43,0.04)] backdrop-blur-sm sm:p-4">
        <AppWindow active="Timeline">
          <TimelineScreen />
        </AppWindow>
      </div>
    </section>
  );
}

// A faithful, full-scale recreation of the real dashboard chrome (see
// components/nav/sidebar.tsx and app-shell.tsx) -- same nav items, same
// icons, same order -- not a cropped or shrunk widget. Always framed by a
// padded, differently-colored panel in its caller (never flush against a
// card's own edge), so its rounded corners never collide with a parent's.
function AppWindow({ active, children }: { active: string; children: React.ReactNode }) {
  return (
    <div className="cv-window overflow-hidden rounded-2xl border border-[var(--cv-line)] bg-white">
      <div className="flex items-center gap-1.5 border-b border-[var(--cv-line)] bg-[var(--cv-cream)] px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-[#e6b8b0]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#e8d9a8]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#b4c7ef]" />
        <span className="ml-3 text-[12px] text-[var(--cv-fg-2)]">app.tracyn.online</span>
      </div>
      <div className="flex">
        <div className="hidden w-[220px] shrink-0 flex-col border-r border-[var(--cv-line)] bg-[var(--cv-cream)] p-3 sm:flex">
          <div className="mb-3 flex items-center gap-2 px-1.5 py-1">
            {/* eslint-disable-next-line @next/next/no-img-element -- next/image's optimizer (sharp) fails on this PNG */}
            <img src="/logo.png" alt="" width={18} height={18} className="rounded" />
            <span className="text-[13px] font-semibold">Tracyn</span>
          </div>
          <div className="mb-3 flex items-center gap-2 rounded-md bg-white px-2.5 py-2 shadow-sm">
            <span className="flex h-5 w-5 items-center justify-center rounded bg-[var(--cv-blue)] text-[10px] font-semibold text-white">
              A
            </span>
            <span className="text-[12.5px] font-medium">Acme Agents</span>
          </div>
          <div className="flex-1 space-y-0.5 text-[13px] text-[var(--cv-fg-2)]">
            {NAV_ITEMS.map((item) => {
              const isActive = item.label === active;
              return (
                <div
                  key={item.label}
                  className={`flex items-center gap-2 rounded-md px-2.5 py-1.5 ${
                    isActive ? "bg-white font-medium text-[var(--cv-fg)] shadow-sm" : ""
                  }`}
                >
                  <item.icon className="h-[15px] w-[15px]" strokeWidth={1.75} />
                  {item.label}
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-2 px-2.5 py-1.5 text-[12.5px] text-[var(--cv-fg-2)]">
            <LogOut className="h-[14px] w-[14px]" strokeWidth={1.75} />
            Sign out
          </div>
        </div>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}

function TimelineScreen() {
  return (
    <div className="relative">
      <div className="flex items-center justify-between border-b border-[var(--cv-line)] px-6 py-4">
        <h3 className="text-[17px] font-semibold tracking-tight">Timeline</h3>
        <span className="rounded-md bg-[var(--cv-fg)] px-3 py-1.5 text-[12px] font-medium text-white">Export CSV</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-[13px]">
          <thead>
            <tr className="border-b border-[var(--cv-line)] text-[12px] text-[var(--cv-fg-2)]">
              <th className="px-6 py-2.5 font-medium">When</th>
              <th className="px-6 py-2.5 font-medium">Agent action</th>
              <th className="px-6 py-2.5 font-medium">Type</th>
              <th className="px-6 py-2.5 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {TIMELINE_ROWS.map((row, i) => (
              <tr key={i} className="border-b border-[var(--cv-line)] last:border-0">
                <td className="px-6 py-3 text-[var(--cv-fg-2)]">{row.when}</td>
                <td className="px-6 py-3 font-medium text-[var(--cv-fg)]">{row.action}</td>
                <td className="px-6 py-3 text-[var(--cv-fg-2)]">{row.type}</td>
                <td className="px-6 py-3">
                  <StatusBadge status={row.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FeatureBlueCard() {
  return (
    <div className="cv-glow-card overflow-hidden rounded-[28px] text-white">
      <div className="mx-auto max-w-lg px-6 pt-16 text-center sm:px-10">
        <h2 className="text-[32px] font-semibold leading-tight tracking-tight sm:text-[40px]">
          Tracyn <span className="cv-pill mx-1 rounded-full px-2.5 py-0.5 text-[28px] sm:text-[34px]">nudges</span>{" "}
          until the policy is right
        </h2>
        <p className="mx-auto mt-4 max-w-sm text-[16px] leading-relaxed text-white/80">
          Describe what should need approval in plain English. Push back, refine, and apply. It's a conversation,
          not a one-shot form.
        </p>
      </div>
      <div className="mt-10 rounded-t-[28px] bg-[#1b1f3d] p-4 sm:p-6">
        <AppWindow active="Policy">
          <PolicyScreen />
        </AppWindow>
      </div>
    </div>
  );
}

function PolicyScreen() {
  const rows = [
    { label: "Deleting stored data", state: "Runs automatically", on: false },
    { label: "Reading or accessing stored data", state: "Runs automatically", on: false },
    { label: "Sending things outside your system", state: "Needs approval", on: true },
    { label: "Internal, background actions", state: "Runs automatically", on: false },
  ];
  return (
    <div className="relative">
      <div className="border-b border-[var(--cv-line)] px-6 py-4">
        <h3 className="text-[17px] font-semibold tracking-tight text-[var(--cv-fg)]">Policy</h3>
        <p className="mt-0.5 text-[12.5px] text-[var(--cv-fg-2)]">
          Choose which kinds of things your AI agent needs a person's okay for.
        </p>
      </div>
      <div className="divide-y divide-[var(--cv-line)] px-6 py-2 text-[var(--cv-fg)]">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between py-3.5">
            <span className="text-[14px] font-medium">{r.label}</span>
            <div className="flex items-center gap-2.5">
              <span className="text-[13px] text-[var(--cv-fg-2)]">{r.state}</span>
              <span
                className={`inline-flex h-5 w-9 items-center rounded-full px-0.5 ${
                  r.on ? "justify-end bg-[var(--cv-blue)]" : "justify-start bg-[var(--cv-line)]"
                }`}
              >
                <span className="h-4 w-4 rounded-full bg-white shadow" />
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Pixel-matched to the real components/policy/policy-chat.tsx widget:
          same 380px width, same bubble/diff styling, including the diff's
          hardcoded Notion-style green (it isn't theme blue in the real
          app either -- see components/ui/badge.tsx's "success" variant). */}
      <div className="absolute bottom-6 right-6 flex w-[380px] max-w-[calc(100%-3rem)] flex-col overflow-hidden rounded-xl border border-[var(--cv-line)] bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[var(--cv-line)] px-4 py-3">
          <div>
            <p className="text-[14px] font-semibold text-[var(--cv-fg)]">Policy assistant</p>
            <p className="text-[12px] text-[var(--cv-fg-2)]">Describe what should need approval</p>
          </div>
          <X className="h-4 w-4 text-[var(--cv-fg-2)]" />
        </div>
        <div className="space-y-3 p-3">
          <div className="flex justify-end">
            <div className="max-w-[85%] rounded-2xl bg-[var(--cv-fg)] px-3 py-2 text-[13px] leading-relaxed text-white">
              Require approval for send_refund and charge_card
            </div>
          </div>
          <div className="flex justify-start">
            <div className="w-[88%] space-y-2">
              <div className="rounded-2xl bg-[var(--cv-cream)] px-3 py-2 text-[13px] leading-relaxed text-[var(--cv-fg)]">
                Added specific rules for send_refund and charge_card.
              </div>
              <div className="overflow-hidden rounded-lg border border-[var(--cv-line)]">
                <pre className="px-2.5 py-2 font-mono text-[11px] leading-relaxed">
                  <div className="rounded bg-[#DBEDDB] px-1 text-[#2F5D3A]">+ action_name: &quot;*refund*&quot;</div>
                  <div className="rounded bg-[#DBEDDB] px-1 text-[#2F5D3A]">+ action_name: &quot;*card*&quot;</div>
                </pre>
                <div className="flex justify-end gap-2 border-t border-[var(--cv-line)] bg-[var(--cv-cream)]/60 px-2.5 py-1.5">
                  <span className="rounded-md border border-[var(--cv-line)] bg-white px-2.5 py-1 text-[11px] font-medium text-[var(--cv-fg)]">
                    Discard
                  </span>
                  <span className="flex items-center gap-1 rounded-md bg-[var(--cv-fg)] px-2.5 py-1 text-[11px] font-medium text-white">
                    <Check className="h-3 w-3" /> Apply
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 border-t border-[var(--cv-line)] p-2.5">
          <div className="flex-1 rounded-md border border-[var(--cv-line)] px-2.5 py-1.5 text-[13px] text-[var(--cv-fg-2)]">
            Describe a policy change...
          </div>
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[var(--cv-fg)]">
            <Send className="h-4 w-4 text-white" />
          </span>
        </div>
      </div>
    </div>
  );
}

function FeatureWhiteCard() {
  return (
    <div className="overflow-hidden rounded-[28px] border border-[var(--cv-line)] bg-white">
      <div className="mx-auto max-w-lg px-6 pt-16 text-center sm:px-10">
        <h2 className="text-[32px] font-semibold leading-tight tracking-tight sm:text-[40px]">
          Every action becomes real evidence
        </h2>
        <p className="mx-auto mt-4 max-w-sm text-[16px] leading-relaxed text-[var(--cv-fg-2)]">
          Evidence Packs turn your logged actions into drafted answers for security questionnaires, grounded in
          real events, cited by id, never invented.
        </p>
      </div>
      <div className="mt-10 rounded-t-[28px] bg-[var(--cv-cream)] p-4 sm:p-6">
        <AppWindow active="Evidence Packs">
          <EvidenceScreen />
        </AppWindow>
      </div>
    </div>
  );
}

function EvidenceScreen() {
  return (
    <div>
      <div className="border-b border-[var(--cv-line)] px-6 py-4">
        <h3 className="text-[17px] font-semibold tracking-tight">Evidence Packs</h3>
        <p className="mt-0.5 text-[12.5px] text-[var(--cv-fg-2)]">SOC2-Questionnaire-2026.csv</p>
      </div>
      <div className="p-6">
        <div className="rounded-lg border border-[var(--cv-line)] p-4">
          <p className="text-[13.5px] font-medium">Does the system log every agent action?</p>
          <p className="mt-2 text-[13px] leading-relaxed text-[var(--cv-fg-2)]">
            Yes. Every action is recorded with a tamper-evident, chained hash as it happens, not reconstructed
            after the fact.
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <Badge variant="secondary">evt_a91f</Badge>
            <Badge variant="secondary">evt_28ce</Badge>
            <Badge variant="secondary">evt_7d10</Badge>
          </div>
        </div>
        <div className="mt-4 rounded-lg border border-[var(--cv-line)] p-4">
          <p className="text-[13.5px] font-medium">How are risky actions handled before they run?</p>
          <p className="mt-2 text-[13px] leading-relaxed text-[var(--cv-fg-2)]">
            A workspace policy decides. Matching actions pause for a human approval before they execute.
          </p>
        </div>
      </div>
    </div>
  );
}

function StatRows() {
  const rows = [
    { icon: Link2, label: "Chained, tamper-evident", desc: "Every event links to the last by hash. Edit one and the chain visibly breaks." },
    { icon: ShieldCheck, label: "One policy, two outcomes", desc: "An action either runs automatically or waits for a person. Nothing in between to misconfigure." },
    { icon: BadgeCheck, label: "SOC 2, auto-mapped", desc: "Controls are mapped to what your workspace actually did, not a static template." },
  ];
  return (
    <div className="divide-y divide-[var(--cv-line)]">
      {rows.map((r, i) => (
        <div key={i} className="flex items-start gap-4 py-7">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--cv-blue-soft)]">
            <r.icon className="h-[18px] w-[18px] text-[var(--cv-blue)]" />
          </div>
          <div>
            <p className="text-[21px] font-semibold tracking-tight">{r.label}</p>
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
      <h2 className="mb-6 text-center text-[30px] font-semibold tracking-tight">Frequently asked questions</h2>
      <div className="divide-y divide-[var(--cv-line)] rounded-xl border border-[var(--cv-line)] bg-white">
        {FAQS.map((f, i) => {
          const open = openIndex === i;
          return (
            <div key={i}>
              <button
                onClick={() => setOpenIndex(open ? null : i)}
                className="flex w-full items-center justify-between px-5 py-4 text-left text-[16px] font-medium"
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
      <h2 className="cv-serif mx-auto max-w-md text-[38px] leading-tight sm:text-[46px]">
        Start logging in five minutes.
      </h2>
      <p className="mt-3 text-[16px] text-[var(--cv-fg-2)]">No credit card. Free plan built for trying it out.</p>
      <button className="mx-auto mt-7 flex items-center gap-1.5 rounded-full bg-[var(--cv-fg)] px-6 py-3 text-[14px] font-medium text-white shadow-lg transition-transform hover:scale-[1.03] active:scale-[0.98]">
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
        <p>Design concept only. Not connected to your account.</p>
        <Link href="/" className="underline underline-offset-2">
          Back to the real site
        </Link>
      </div>
    </footer>
  );
}
