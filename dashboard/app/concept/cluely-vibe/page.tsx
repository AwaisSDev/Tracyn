"use client";

import { useState } from "react";
import { Inter_Tight } from "next/font/google";
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
  Mail,
  Plug,
  Link2,
  BookOpen,
  Copy,
  Share2,
  Pin,
  Volume2,
  Plus,
  Mic,
  ChevronRight,
} from "lucide-react";
import { ForceLightTheme } from "@/components/force-light-theme";
import { Reveal } from "@/components/landing/reveal";
import { Badge, StatusBadge } from "@/components/ui/badge";
import "./concept.css";

// A tight, Geist-like grotesk throughout, heavy for the Notion-style hero.
const interTight = Inter_Tight({ subsets: ["latin"], variable: "--font-cv-sans", weight: ["400", "500", "600", "700"] });

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
  { when: "Sep 20, 02:22 PM", action: "restart_service", type: "internal", status: "completed" },
  { when: "Sep 20, 02:21 PM", action: "schedule_interview", type: "external", status: "completed" },
  { when: "Sep 20, 02:21 PM", action: "send_offer_reminder", type: "external", status: "completed" },
  { when: "Sep 20, 02:21 PM", action: "connectivity_check", type: "internal", status: "completed" },
  { when: "Sep 20, 02:21 PM", action: "close_ticket", type: "external", status: "completed" },
  { when: "Sep 20, 02:20 PM", action: "qualify_lead", type: "external", status: "completed" },
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
  {
    q: "Can someone quietly edit the log?",
    a: "Not without it showing. Every event stores a SHA-256 hash of its contents chained to the event before it, so changing any row breaks the chain from that point on.",
  },
];

export default function CluelyVibeConceptPage() {
  return (
    <div className={`${interTight.variable} cv`}>
      <ForceLightTheme />
      <Nav />
      <Hero />

      <section className="mx-auto max-w-6xl px-6 pt-32 sm:px-10">
        <Reveal>
          <SectionHeading lead="How Tracyn works" tail="before it acts" />
        </Reveal>
        <Reveal className="mt-14">
          <FeatureBlueCard />
        </Reveal>
        <Reveal className="mt-6">
          <FeatureApprovalsCard />
        </Reveal>
      </section>

      <section className="mx-auto max-w-6xl px-6 pt-36 sm:px-10">
        <Reveal>
          <SectionHeading
            lead="Evidence,"
            tail="not paperwork"
            sub="Security questionnaires answered from what your agents really did. Every answer cites the events behind it."
          />
        </Reveal>
        <Reveal className="mt-14">
          <ShotPanel variant="light" height={540}>
            <AppWindow active="Evidence Packs">
              <EvidenceScreen />
            </AppWindow>
          </ShotPanel>
        </Reveal>
      </section>

      <section className="mx-auto max-w-6xl px-6 pt-36 sm:px-10">
        <Reveal>
          <SectionHeading
            lead="Your audit trail,"
            tail="inside any chat"
            sub="Tracyn ships an MCP server. Ask what your agents did, clear a pending approval, or draft a questionnaire answer from Claude, ChatGPT, Grok, or any MCP client."
          />
        </Reveal>
        <Reveal className="mt-14">
          <McpFeature />
        </Reveal>
      </section>

      <section className="mx-auto max-w-6xl px-6 pt-36 sm:px-10">
        <Reveal>
          <SectionHeading lead="Trustworthy" tail="by construction" sub="The parts an auditor checks first, built in rather than bolted on." />
        </Reveal>
        <Reveal className="mt-14">
          <TrustTiles />
        </Reveal>
      </section>

      <section className="mx-auto max-w-6xl px-6 pt-36 sm:px-10">
        <Reveal>
          <BigStats />
        </Reveal>
      </section>

      <section className="mx-auto max-w-6xl px-6 pt-36 sm:px-10">
        <Reveal>
          <Faq />
        </Reveal>
      </section>

      <FinalCtaAndFooter />
    </div>
  );
}

function Nav() {
  return (
    <header className="sticky top-0 z-30 bg-white/85 backdrop-blur-md">
      <div className="mx-auto grid max-w-7xl grid-cols-[1fr_auto_1fr] items-center px-6 py-3.5 sm:px-8">
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element -- next/image's optimizer (sharp) fails on this PNG */}
          <img src="/logo.png" alt="" width={26} height={26} className="rounded-md" />
          <span className="text-[17px] font-semibold tracking-[-0.02em] text-[var(--cv-ink)]">Tracyn</span>
        </div>
        <nav className="hidden items-center gap-7 text-[15px] font-medium text-[var(--cv-ink)] md:flex">
          <span className="flex items-center gap-1">
            Product <ChevronDown className="h-3.5 w-3.5" strokeWidth={2} />
          </span>
          <span className="flex items-center gap-1">
            Resources <ChevronDown className="h-3.5 w-3.5" strokeWidth={2} />
          </span>
          <span>Pricing</span>
          <span>Docs</span>
        </nav>
        <div className="flex items-center justify-end gap-5">
          <span className="hidden text-[15px] font-medium text-[var(--cv-ink)] sm:inline">Log in</span>
          <button className="cv-btn-primary rounded-[8px] px-4 py-2 text-[15px] font-semibold text-white">
            Get Tracyn free
          </button>
        </div>
      </div>
    </header>
  );
}

// Notion's opening: a very large, heavy sans headline with one word set
// in a soft colored pill (dot + word), a single plain line under it, a
// solid and a tinted button, and the real product sitting straight on the
// white page, cut off by a strip running the full width of the screen.
function Hero() {
  return (
    <section className="relative bg-white pt-16 sm:pt-24">
      <div className="mx-auto max-w-5xl px-6 text-center sm:px-10">
        <h1 className="text-[50px] font-bold leading-[1.22] tracking-[-0.035em] text-[var(--cv-ink)] sm:text-[84px] lg:text-[104px]">
          It&rsquo;s not a log.
          <br />
          It&rsquo;s{" "}
          {/* Notion's own pill, from its live styles, in em so it scales:
              the label drops to 0.75x the headline at a lighter weight,
              a large dot is centered in the pill, the label sits on the
              headline's baseline, and the padding is the same both sides. */}
          <span className="cv-hero-pill inline-flex items-baseline gap-[0.215em] rounded-full px-[0.5em] py-[0.143em] text-[0.75em] font-medium leading-[1.21] tracking-[-0.028em]">
            <span className="h-[0.573em] w-[0.573em] shrink-0 self-center rounded-full bg-[var(--cv-pill-dot)]" />
            <span>evidence</span>
          </span>.
        </h1>
        <p className="mx-auto mt-7 max-w-2xl text-[18px] leading-[1.5] tracking-[-0.01em] text-[var(--cv-ink)] sm:text-[21px]">
          Tracyn keeps a record of everything your AI agents do, asks a person before the risky parts, and turns it
          all into evidence your auditors accept.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <button className="cv-btn-primary rounded-[10px] px-5 py-2.5 text-[16px] font-semibold text-white">
            Get Tracyn free
          </button>
          <button className="cv-btn-soft rounded-[10px] px-5 py-2.5 text-[16px] font-semibold text-[var(--cv-blue-bright)]">
            View the SDK
          </button>
        </div>
      </div>

      <div className="mx-auto mt-16 max-w-6xl px-6 sm:px-10">
        <CroppedWindow height={500}>
          <AppWindow active="Timeline">
            <TimelineScreen />
          </AppWindow>
        </CroppedWindow>
      </div>
      <WorksWithStrip />
    </section>
  );
}

// Where Notion lists customer logos. Tracyn doesn't claim customers here;
// it lists the AI assistants its MCP server connects to (see
// mcp-server/README.md), so it reads as one category, not a mixed bag.
function WorksWithStrip() {
  const names = ["Claude", "ChatGPT", "Grok", "Kimi", "Any AI with MCP"];
  return (
    <div className="relative z-10 border-t border-[var(--cv-line)] bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-3 gap-y-2 px-6 py-5 sm:px-10">
        <span className="mr-3 text-[13px] font-medium uppercase tracking-[0.14em] text-[var(--cv-fg-3)]">Works with</span>
        {names.map((n, i) => (
          <span key={n} className="flex items-center gap-3 text-[19px] font-semibold tracking-[-0.03em] text-[#3a3f55]">
            {n}
            {i < names.length - 1 && <span className="h-1 w-1 rounded-full bg-[#b9bfd3]" />}
          </span>
        ))}
      </div>
    </div>
  );
}

// Cluely's section titles: one line, two tones. The lead is near-black
// fading to slate, the tail sits back in a quieter gray.
function SectionHeading({ lead, tail, sub }: { lead: string; tail: string; sub?: string }) {
  return (
    <div className="text-center">
      <h2 className="text-[34px] font-medium leading-[1.15] tracking-[-0.035em] sm:text-[52px]">
        <span className="cv-grad-ink">{lead}</span> <span className="text-[var(--cv-fg-3)]">{tail}</span>
      </h2>
      {sub && (
        <p className="mx-auto mt-4 max-w-xl text-[17px] leading-[1.6] text-[var(--cv-fg-2)] sm:text-[18px]">{sub}</p>
      )}
    </div>
  );
}

// The real-product screenshot frame, straight from Cluely's own: a large
// rounded panel, the app window sitting inset from the top and sides and
// running right off the panel's bottom edge. On a light panel the window
// gets a thin gray bezel so it separates from the pale background; on the
// navy one the contrast already does that. The panel's
// overflow does the cut, so the bottom is a clean straight line with the
// window's top corners still rounded.
function ShotPanel({
  variant,
  height,
  children,
}: {
  variant: "navy" | "light";
  height: number;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`overflow-hidden rounded-[28px] px-5 pt-12 sm:px-10 sm:pt-16 lg:px-16 lg:pt-20 ${
        variant === "navy" ? "cv-panel-navy" : "cv-panel-light"
      }`}
    >
      <div
        className={`mx-auto overflow-hidden ${variant === "navy" ? "rounded-t-[10px]" : "cv-bezel"}`}
        style={{ height }}
      >
        {children}
      </div>
    </div>
  );
}

// Cluely's own screenshots never show a full page top-to-bottom -- they
// show a large, real slice of the product, cropped at a fixed height, so
// it reads as "here's the real thing" rather than a small isolated
// widget. A hard crop (no fade overlay) keeps every visible pixel of the
// real screenshot crisp, right up to the cut.
function CroppedWindow({ height, children }: { height: number; children: React.ReactNode }) {
  return (
    <div className="relative overflow-hidden rounded-t-[10px]" style={{ height }}>
      {children}
    </div>
  );
}

// A faithful, full-scale recreation of the real dashboard chrome (see
// components/nav/sidebar.tsx and app-shell.tsx) -- same nav items, same
// icons, same order. Sets its own text color so it never inherits white
// from a dark card it sits on.
function AppWindow({ active, children }: { active: string; children: React.ReactNode }) {
  return (
    <div className="cv-window overflow-hidden rounded-t-[10px] border border-[var(--cv-line)] bg-white text-[var(--cv-fg)]">
      <div className="flex items-center gap-1.5 border-b border-[var(--cv-line)] bg-[var(--cv-cream)] px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
        <span className="mx-auto -translate-x-6 rounded-md bg-white px-16 py-0.5 text-[11.5px] text-[var(--cv-fg-2)] shadow-[0_0_0_1px_var(--cv-line)]">
          app.tracyn.online
        </span>
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
        <table className="w-full whitespace-nowrap text-left text-[13px]">
          <thead>
            <tr className="border-b border-[var(--cv-line)] text-[12px] text-[var(--cv-fg-2)]">
              <th className="px-6 py-2.5 font-medium">When</th>
              <th className="px-6 py-2.5 font-medium">Agent action</th>
              <th className="hidden px-6 py-2.5 font-medium lg:table-cell">Type</th>
              <th className="px-6 py-2.5 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {TIMELINE_ROWS.map((row, i) => (
              <tr key={i} className="border-b border-[var(--cv-line)] last:border-0">
                <td className="px-6 py-3 text-[var(--cv-fg-2)]">{row.when}</td>
                <td className="px-6 py-3 font-medium text-[var(--cv-fg)]">{row.action}</td>
                <td className="hidden px-6 py-3 text-[var(--cv-fg-2)] lg:table-cell">{row.type}</td>
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
    <div className="cv-glow-card overflow-hidden rounded-[24px] text-white">
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
      <div className="mt-10 px-6 pb-6 sm:px-10 sm:pb-0">
        <CroppedWindow height={385}>
          <AppWindow active="Policy">
            <PolicyScreen />
          </AppWindow>
        </CroppedWindow>
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
              <Toggle on={r.on} />
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1.5 border-t border-[var(--cv-line)] px-6 py-4 text-[13px] font-medium text-[var(--cv-fg-2)]">
        <ChevronDown className="h-3.5 w-3.5 -rotate-90" />
        Advanced: edit the underlying rules as code
      </div>

      {/* A smaller, lighter footprint than the real widget's 380px --
          this is meant to peek in from the corner, not dominate the
          screenshot. Still keeps the real hardcoded Notion-green diff
          colors (see components/ui/badge.tsx's "success" variant). */}
      <div className="absolute bottom-4 right-4 flex w-[260px] max-w-[calc(100%-2rem)] flex-col overflow-hidden rounded-lg border border-[var(--cv-line)] bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[var(--cv-line)] px-3 py-2">
          <p className="text-[12px] font-semibold text-[var(--cv-fg)]">Policy assistant</p>
          <X className="h-3.5 w-3.5 text-[var(--cv-fg-2)]" />
        </div>
        <div className="space-y-2 p-2.5">
          <div className="flex justify-end">
            <div className="max-w-[90%] rounded-xl bg-[var(--cv-fg)] px-2.5 py-1.5 text-[11px] leading-relaxed text-white">
              Require approval for send_refund and charge_card
            </div>
          </div>
          <div className="overflow-hidden rounded-lg border border-[var(--cv-line)]">
            <pre className="px-2 py-1.5 font-mono text-[10px] leading-relaxed">
              <div className="rounded bg-[#DBEDDB] px-1 text-[#2F5D3A]">+ action_name: &quot;*refund*&quot;</div>
              <div className="rounded bg-[#DBEDDB] px-1 text-[#2F5D3A]">+ action_name: &quot;*card*&quot;</div>
            </pre>
            <div className="flex justify-end gap-1.5 border-t border-[var(--cv-line)] bg-[var(--cv-cream)]/60 px-2 py-1">
              <span className="rounded border border-[var(--cv-line)] bg-white px-2 py-0.5 text-[10px] font-medium text-[var(--cv-fg)]">
                Discard
              </span>
              <span className="flex items-center gap-1 rounded bg-[var(--cv-fg)] px-2 py-0.5 text-[10px] font-medium text-white">
                <Check className="h-2.5 w-2.5" /> Apply
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 border-t border-[var(--cv-line)] p-2">
          <div className="flex-1 rounded-md border border-[var(--cv-line)] px-2 py-1 text-[11px] text-[var(--cv-fg-2)]">
            Describe a policy change...
          </div>
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[var(--cv-fg)]">
            <Send className="h-3 w-3 text-white" />
          </span>
        </div>
      </div>
    </div>
  );
}

function Toggle({ on }: { on: boolean }) {
  return (
    <span
      className={`inline-flex h-5 w-9 items-center rounded-full px-0.5 ${
        on ? "justify-end bg-[var(--cv-blue)]" : "justify-start bg-[var(--cv-line)]"
      }`}
    >
      <span className="h-4 w-4 rounded-full bg-white shadow" />
    </span>
  );
}

// Second of the "how it works" pair: same card shape as the blue one, in
// the light variant, the way Cluely alternates a saturated card with a
// pale one.
function FeatureApprovalsCard() {
  return (
    <div className="cv-panel-light overflow-hidden rounded-[24px] text-[var(--cv-ink)]">
      <div className="mx-auto max-w-xl px-6 pt-16 text-center sm:px-10">
        <h2 className="text-[32px] font-semibold leading-tight tracking-tight sm:text-[40px]">
          When it&rsquo;s risky, Tracyn{" "}
          <span className="mx-1 rounded-full border border-[var(--cv-blue)]/15 bg-[var(--cv-blue-soft)] px-2.5 py-0.5 text-[28px] text-[var(--cv-blue)] sm:text-[34px]">
            asks
          </span>{" "}
          first
        </h2>
        <p className="mx-auto mt-4 max-w-sm text-[16px] leading-relaxed text-[var(--cv-fg-2)]">
          A matching action pauses before it runs. Approve, edit, or reject it from the dashboard, email, or Slack.
        </p>
      </div>
      <div className="mt-10 px-6 sm:px-10">
        <div className="cv-bezel">
          <CroppedWindow height={400}>
            <AppWindow active="Approvals">
              <ApprovalsScreen />
            </AppWindow>
          </CroppedWindow>
        </div>
      </div>
    </div>
  );
}

const APPROVALS = [
  {
    agent: "support-bot",
    action: "send_refund",
    meta: "external · requested Sep 20, 02:23 PM",
    inputs: '{\n  "order_id": "ord_8123",\n  "amount": 249.00,\n  "reason": "damaged on arrival"\n}',
  },
  {
    agent: "ops-agent",
    action: "bulk_delete_records",
    meta: "external · requested Sep 20, 02:22 PM",
    inputs: '{\n  "table": "customers_archive",\n  "older_than_days": 365\n}',
  },
];

// Mirrors app/(app)/approvals/page.tsx: tabs, then one card per request,
// "<agent> wants to run <action>", the inputs preview, and the three
// decision buttons.
function ApprovalsScreen() {
  return (
    <div className="px-6 py-5">
      <h3 className="text-[20px] font-semibold tracking-tight">Approvals</h3>
      <div className="mt-4 flex gap-5 border-b border-[var(--cv-line)] text-[13px] font-medium text-[var(--cv-fg-2)]">
        {["Pending", "Approved", "Rejected", "Auto-denied"].map((t, i) => (
          <span key={t} className={`pb-2 ${i === 0 ? "border-b-2 border-[var(--cv-fg)] text-[var(--cv-fg)]" : ""}`}>
            {t}
          </span>
        ))}
      </div>
      <div className="mt-4 space-y-3">
        {APPROVALS.map((a) => (
          <div key={a.action} className="flex flex-col items-start gap-3 rounded-lg border border-[var(--cv-line)] p-4 xl:flex-row xl:justify-between xl:gap-4">
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="flex flex-wrap items-center gap-1.5 text-[14px]">
                <span className="font-medium">{a.agent}</span>
                <span className="text-[var(--cv-fg-2)]">wants to run</span>
                <span className="font-medium">{a.action}</span>
                <StatusBadge status="pending" />
              </div>
              <p className="text-[12.5px] text-[var(--cv-fg-2)]">{a.meta}</p>
              <pre className="mt-1 whitespace-pre-wrap rounded-md bg-[var(--cv-cream)] p-3 font-mono text-[11.5px] leading-relaxed">
                {a.inputs}
              </pre>
            </div>
            <div className="flex shrink-0 gap-2">
              <span className="rounded-md bg-[var(--cv-fg)] px-3 py-1.5 text-[12px] font-medium text-white">Approve</span>
              <span className="rounded-md border border-[var(--cv-line)] px-3 py-1.5 text-[12px] font-medium">Edit...</span>
              <span className="rounded-md bg-[#e03e3e] px-3 py-1.5 text-[12px] font-medium text-white">Reject</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const EVIDENCE_QA = [
  {
    q: "Does the system log every agent action?",
    a: "Yes. Every action is recorded with a tamper-evident, chained hash as it happens, not reconstructed after the fact.",
    cited: ["evt_a91f", "evt_28ce", "evt_7d10"],
  },
  {
    q: "How are risky actions handled before they run?",
    a: "A workspace policy decides. Matching actions pause for a human approval before they execute.",
    cited: ["evt_5c2e"],
  },
  {
    q: "Is there an audit trail an external auditor can review?",
    a: "Yes. Every event chains to the previous one by hash, so tampering is visible, and the whole chain exports to CSV or a formatted evidence document.",
    cited: ["evt_9b41", "evt_0d17"],
  },
  {
    q: "Who reviews a drafted answer before it ships?",
    a: "A human on your team. Drafts cite the exact events they're based on and are always editable before export, nothing is submitted automatically.",
    cited: ["evt_3f88"],
  },
];

function EvidenceScreen() {
  return (
    <div>
      <div className="flex items-center justify-between border-b border-[var(--cv-line)] px-6 py-4">
        <div>
          <h3 className="text-[17px] font-semibold tracking-tight">Evidence Packs</h3>
          <p className="mt-0.5 text-[12.5px] text-[var(--cv-fg-2)]">SOC2-Questionnaire-2026.csv</p>
        </div>
        <Badge variant="success">4 of 4 answered</Badge>
      </div>
      <div className="space-y-4 p-6">
        {EVIDENCE_QA.map((item) => (
          <div key={item.q} className="rounded-lg border border-[var(--cv-line)] p-4">
            <p className="text-[13.5px] font-medium">{item.q}</p>
            <p className="mt-2 text-[13px] leading-relaxed text-[var(--cv-fg-2)]">{item.a}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {item.cited.map((id) => (
                <Badge key={id} variant="secondary">
                  {id}
                </Badge>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Cluely's "Undetectable in every way" row: a small real-UI tile, then a
// caption whose first sentence is bold and the rest recedes.
function TrustTiles() {
  const tiles = [
    {
      lead: "Tamper-evident.",
      rest: "Every event stores a SHA-256 hash chained to the one before it. Edit a row and the chain visibly breaks.",
      visual: <ChainVisual />,
    },
    {
      lead: "One policy, two outcomes.",
      rest: "An action runs automatically or waits for a person. Nothing in between to misconfigure.",
      visual: <PolicyVisual />,
    },
    {
      lead: "SOC 2, auto-mapped.",
      rest: "Controls are backed by what your workspace actually did, not a static template.",
      visual: <Soc2Visual />,
    },
  ];
  return (
    <div className="grid gap-8 md:grid-cols-3 md:gap-6">
      {tiles.map((t) => (
        <div key={t.lead}>
          <div className="cv-panel-light flex h-[250px] items-center justify-center overflow-hidden rounded-[20px] p-6">
            {t.visual}
          </div>
          <p className="mt-5 text-[17px] leading-[1.45] tracking-[-0.01em] text-[var(--cv-fg-2)]">
            <span className="font-medium text-[var(--cv-ink)]">{t.lead}</span> {t.rest}
          </p>
        </div>
      ))}
    </div>
  );
}

function ChainVisual() {
  const events = [
    { id: "evt_a91f", action: "send_refund", hash: "3f9a…c21e" },
    { id: "evt_28ce", action: "close_account", hash: "b702…9d44" },
    { id: "evt_7d10", action: "lookup_order", hash: "e18c…05af" },
  ];
  return (
    <div className="w-full max-w-[260px] space-y-0">
      {events.map((e, i) => (
        <div key={e.id}>
          <div className="rounded-lg border border-[var(--cv-line)] bg-white px-3 py-2 text-[var(--cv-fg)] shadow-[0_1px_2px_rgba(15,18,34,0.05)]">
            <div className="flex items-center justify-between text-[12px]">
              <span className="font-medium">{e.action}</span>
              <span className="text-[var(--cv-fg-3)]">{e.id}</span>
            </div>
            <p className="mt-0.5 font-mono text-[10.5px] text-[var(--cv-blue)]">sha256 {e.hash}</p>
          </div>
          {i < events.length - 1 && (
            <div className="flex justify-center py-1 text-[var(--cv-fg-3)]">
              <Link2 className="h-3.5 w-3.5" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function PolicyVisual() {
  return (
    <div className="w-full max-w-[260px] space-y-2.5">
      {[
        { label: "lookup_order", state: "Runs automatically", on: false },
        { label: "send_refund", state: "Needs approval", on: true },
      ].map((r) => (
        <div
          key={r.label}
          className="flex items-center justify-between rounded-lg border border-[var(--cv-line)] bg-white px-3 py-3 text-[var(--cv-fg)] shadow-[0_1px_2px_rgba(15,18,34,0.05)]"
        >
          <div>
            <p className="text-[12.5px] font-medium">{r.label}</p>
            <p className="text-[11px] text-[var(--cv-fg-2)]">{r.state}</p>
          </div>
          <Toggle on={r.on} />
        </div>
      ))}
    </div>
  );
}

function Soc2Visual() {
  const controls = [
    { id: "CC6.1", title: "Logical access, least privilege" },
    { id: "CC7.2", title: "Monitoring for anomalies" },
    { id: "CC8.1", title: "Change management" },
  ];
  return (
    <div className="w-full max-w-[260px] overflow-hidden rounded-lg border border-[var(--cv-line)] bg-white text-[var(--cv-fg)] shadow-[0_1px_2px_rgba(15,18,34,0.05)]">
      {controls.map((c) => (
        <div key={c.id} className="flex items-center gap-2.5 border-b border-[var(--cv-line)] px-3 py-2.5 last:border-0">
          <span className="font-mono text-[11px] font-medium text-[var(--cv-blue)]">{c.id}</span>
          <span className="min-w-0 flex-1 truncate text-[12px]">{c.title}</span>
          <Check className="h-3.5 w-3.5 shrink-0 text-[#2F5D3A]" />
        </div>
      ))}
    </div>
  );
}

// Cluely's "12+ Languages" figures, laid out three across instead of
// stacked: an oversized gradient figure over a blue-tipped hairline, a
// label, then one quiet line.
function BigStats() {
  const stats = [
    { figure: "5", unit: "min", label: "To your first logged action", desc: "Install the SDK, wrap one tool call, and it's recording." },
    { figure: "SHA-256", unit: "", label: "Chained event hashes", desc: "Each event is hashed with the one before it, so history can't be rewritten quietly." },
    { figure: "2", unit: "", label: "Outcomes per action", desc: "It runs on its own, or it waits for a person. Your policy decides which." },
  ];
  return (
    <div>
      <SectionHeading lead="Built for" tail="the audit" />
      <div className="mt-16 grid gap-12 md:grid-cols-3 md:gap-8">
        {stats.map((s) => (
          <div key={s.label} className="relative border-t border-[var(--cv-line)] pt-8">
            <span className="absolute -top-px left-0 h-[2px] w-12 bg-[var(--cv-blue)]" />
            <p className="cv-grad-ink inline-block text-[56px] font-medium leading-none tracking-[-0.045em] lg:text-[68px]">
              {s.figure}
              {s.unit && <span className="ml-1 text-[28px] tracking-[-0.02em]">{s.unit}</span>}
            </p>
            <p className="mt-5 text-[20px] font-medium tracking-[-0.02em] text-[var(--cv-ink)]">{s.label}</p>
            <p className="mt-2 text-[15.5px] leading-[1.6] text-[var(--cv-fg-2)]">{s.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

const MCP_TOOLS = [
  { name: "get_recent_actions", desc: "What your agents did, and when", icon: History },
  { name: "get_pending_approvals", desc: "Every request waiting on a person", icon: CircleCheck },
  { name: "decide_approval", desc: "Approve or reject, right in the chat", icon: ShieldCheck },
  { name: "draft_questionnaire_answers", desc: "Evidence-backed answers, cited by event", icon: FileText },
  { name: "get_compliance_summary", desc: "Your current SOC 2 posture", icon: BadgeCheck },
];

// The MCP server gets its own big navy panel: the five real tools (see
// mcp-server/README.md) on the left, and on the right a chat clearing an
// approval through them.
function McpFeature() {
  return (
    <div className="cv-panel-navy overflow-hidden rounded-[28px] text-white">
      <div className="grid gap-10 px-6 pt-12 sm:px-10 sm:pt-16 lg:grid-cols-[1fr_1.15fr] lg:gap-12 lg:px-14">
        <div className="lg:pb-14">
          <span className="cv-pill inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12.5px] font-medium">
            <Plug className="h-3.5 w-3.5" /> MCP server
          </span>
          <h3 className="mt-5 text-[30px] font-semibold leading-[1.15] tracking-[-0.03em] sm:text-[36px]">
            Five tools. Any MCP client.
          </h3>
          <p className="mt-3 max-w-md text-[16px] leading-relaxed text-white/75">
            Deciding an approval needs a reviewer key, so an agent can never approve its own request.
          </p>

          <div className="mt-8 divide-y divide-white/10 overflow-hidden rounded-xl border border-white/10 bg-white/[0.04]">
            {MCP_TOOLS.map((t) => (
              <div key={t.name} className="flex items-center gap-3.5 px-4 py-3.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.07]">
                  <t.icon className="h-[17px] w-[17px] text-[#b9c8fb]" strokeWidth={1.75} />
                </span>
                <div className="min-w-0">
                  <p className="text-[15px] font-medium leading-snug tracking-[-0.01em] text-white">{t.desc}</p>
                  <p className="mt-0.5 truncate font-mono text-[12px] tracking-normal text-white/45">{t.name}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="self-center pb-12 lg:pb-14">
          <McpChatWindow />
        </div>
      </div>
    </div>
  );
}

// A dark, desktop-chat-app style window (warm charcoal, tool calls folded
// into a "Used 1 tool" line, composer at the bottom) calling the real
// tools, with the same summary get_pending_approvals really returns.
function McpChatWindow() {
  return (
    <div className="overflow-hidden rounded-[18px] border border-[#3d3d3a] bg-[#262624] text-[#ece9e2] shadow-[0_30px_60px_-20px_rgba(0,0,0,0.6)]">
      <div className="flex items-center gap-2 px-5 py-4">
        <BookOpen className="h-4 w-4 text-[#b7b4ab]" strokeWidth={1.75} />
        <span className="text-[14px] font-semibold">Approvals check</span>
        <span className="rounded-md bg-[#3a3a37] px-1.5 py-0.5 text-[11.5px] font-medium text-[#c9c6bd]">Acme Agents</span>
      </div>

      <div className="space-y-4 px-5 pb-5 text-[14.5px] leading-[1.6]">
        <div className="flex justify-end">
          <div className="max-w-[80%] rounded-2xl bg-[#3a3a37] px-4 py-2.5">anything waiting on me?</div>
        </div>
        <div>
          <UsedTool />
          <p className="mt-2">
            One approval is waiting: ops-agent wants to run bulk_delete_records (external) with{" "}
            <span className="rounded bg-[#30302e] px-1 font-mono text-[12.5px] text-[#e2ded4]">{"{'count': 500}"}</span>,
            requested 41 minutes ago. Want me to approve or reject it?
          </p>
        </div>
        <div className="flex justify-end">
          <div className="max-w-[80%] rounded-2xl bg-[#3a3a37] px-4 py-2.5">
            Reject it. Nothing gets bulk deleted without a ticket.
          </div>
        </div>
        <div>
          <UsedTool />
          <p className="mt-2">Rejected, with your note attached. It&rsquo;s logged to the timeline as your decision.</p>
          <div className="mt-3 flex items-center gap-3.5 text-[#8f8c84]">
            <Copy className="h-[15px] w-[15px]" strokeWidth={1.75} />
            <Share2 className="h-[15px] w-[15px]" strokeWidth={1.75} />
            <Pin className="h-[15px] w-[15px]" strokeWidth={1.75} />
            <Volume2 className="h-[15px] w-[15px]" strokeWidth={1.75} />
            <span className="text-[12.5px]">just now</span>
          </div>
        </div>
      </div>

      <div className="px-4 pb-4">
        <div className="rounded-2xl border border-[#3d3d3a] bg-[#30302e] px-4 pb-3 pt-3.5">
          <p className="text-[14px] text-[#8f8c84]">Type / for commands</p>
          <div className="mt-4 flex items-center gap-3 text-[13px] text-[#b7b4ab]">
            <Plus className="h-4 w-4" strokeWidth={1.75} />
            <Mic className="h-4 w-4" strokeWidth={1.75} />
            <ChevronDown className="-ml-1.5 h-3.5 w-3.5" strokeWidth={1.75} />
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[#5fbf73]" />
              Tracyn connected
            </span>
            <span className="ml-auto">Opus 5.5</span>
            <span>High</span>
            <span className="h-4 w-4 rounded-full border-2 border-[#7ea0f5]" />
          </div>
        </div>
      </div>
    </div>
  );
}

function UsedTool() {
  return (
    <span className="inline-flex items-center gap-1 text-[13.5px] text-[#8f8c84]">
      Used 1 tool <ChevronRight className="h-3.5 w-3.5" />
    </span>
  );
}

function Faq() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  return (
    <div>
      <h2 className="text-[32px] font-medium tracking-[-0.035em] text-[var(--cv-ink)] sm:text-[40px]">
        Frequently asked questions
      </h2>
      <div className="mt-8 divide-y divide-[var(--cv-line)] border-y border-[var(--cv-line)]">
        {FAQS.map((f, i) => {
          const open = openIndex === i;
          return (
            <div key={i}>
              <button
                onClick={() => setOpenIndex(open ? null : i)}
                className="flex w-full items-center justify-between gap-6 py-5 text-left text-[17px] text-[var(--cv-ink)]"
              >
                {f.q}
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-[var(--cv-fg-3)] transition-transform duration-200 ${open ? "rotate-180" : ""}`}
                />
              </button>
              {open && <p className="max-w-3xl pb-6 text-[16px] leading-[1.65] text-[var(--cv-fg-2)]">{f.a}</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Cluely closes on one tinted band that holds both the last CTA (left
// aligned, two-tone line, dark button) and the footer's link columns.
function FinalCtaAndFooter() {
  const columns = [
    { title: "Product", links: ["Timeline", "Approvals", "Evidence Packs", "Policy", "Pricing"] },
    { title: "Resources", links: ["Docs", "SDK on GitHub", "About"] },
    { title: "Compliance", links: ["SOC 2 Mapping", "Security questionnaires", "Audit trail export"] },
    { title: "Support", links: ["Privacy Policy", "Terms of Service", "Contact us"] },
  ];
  return (
    <div className="cv-final-bg mt-36">
      <div className="mx-auto max-w-6xl px-6 pb-24 pt-28 sm:px-10">
        <h2 className="text-[26px] font-medium leading-[1.25] tracking-[-0.035em] sm:text-[32px]">
          <span className="text-[var(--cv-ink)]">Evidence that builds itself while your agents work.</span>
          <br />
          <span className="cv-grad-slate">Start logging your agent in five minutes.</span>
        </h2>
        <button className="cv-btn-dark mt-8 flex items-center gap-2 rounded-[10px] px-5 py-3 text-[14.5px] font-medium text-white">
          Get started free <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      <footer className="mx-auto max-w-6xl px-6 sm:px-10">
        <div className="border-t border-[var(--cv-line-2)] pb-10 pt-20">
          <div className="grid grid-cols-2 gap-x-8 gap-y-10 sm:grid-cols-4 lg:grid-cols-[repeat(4,minmax(0,1fr))_1.2fr]">
            {columns.map((col) => (
              <div key={col.title}>
                <p className="text-[15px] font-medium tracking-[-0.01em] text-[var(--cv-ink)]">{col.title}</p>
                <ul className="mt-4 space-y-3">
                  {col.links.map((l) => (
                    <li key={l} className="text-[15px] text-[var(--cv-fg-2)] transition-colors hover:text-[var(--cv-ink)]">
                      {l}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-14 flex items-center justify-between border-t border-[var(--cv-line-2)] pt-6">
            <p className="text-[13.5px] text-[var(--cv-fg-3)]">&copy; 2026 Tracyn. All rights reserved.</p>
            <div className="flex items-center gap-4 text-[var(--cv-ink)]">
              <Github className="h-[18px] w-[18px]" />
              <Mail className="h-[18px] w-[18px]" />
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
