"use client";

import Link from "next/link";
import { Check, Minus } from "lucide-react";
import { ForceLightTheme } from "@/components/force-light-theme";
import { Reveal } from "@/components/landing/reveal";
import { FinalCtaAndFooter, Faq, SiteNav } from "./home";
import { ProveArt } from "./nav-links";
import { interTight } from "./fonts";
import "./home.css";

const BOOK_A_CALL_URL = "https://cal.com/awais-siddique/30min";

// Subscribing needs an account and a workspace first (checkout runs per
// workspace, from Settings), so every paid button starts at sign-up and
// carries the chosen plan through to /settings?plan=<id>, where Settings
// highlights it and offers "Continue to checkout". Already signed in, the
// middleware skips the login form and goes straight there; a brand-new
// account gets the create-workspace screen first (app-shell.tsx).
function signUpThen(next: string) {
  return `/login?mode=signup&next=${encodeURIComponent(next)}`;
}

type Plan = {
  id: string;
  name: string;
  badge?: string;
  price: string;
  unit: string;
  blurb: string;
  cta: { label: string; href: string; style: "soft" | "primary" | "white"; external?: boolean };
  includesTitle: string;
  includes: string[];
};

// The numbers mirror backend/app/services/plan_limits.py (the limits the
// API actually enforces, monthly counts reset on the 1st, UTC) and the
// prices in app/(app)/settings/page.tsx. Keep all three in sync.
const ESSENTIALS: Plan[] = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    unit: "per workspace / month",
    blurb: "For trying Tracyn on your first agent.",
    cta: { label: "Sign up", href: signUpThen("/dashboard"), style: "soft" },
    includesTitle: "Includes:",
    includes: [
      "1 agent",
      "2,500 events / month",
      "1 security questionnaire / month",
      "Hash-chained audit timeline",
      "Human approvals and policy editor",
      "MCP server access",
      "SOC 2 control mapping",
      "Watermarked evidence exports",
    ],
  },
  {
    id: "starter",
    name: "Starter",
    price: "$49",
    unit: "per workspace / month",
    blurb: "For a team with a few agents doing real work.",
    cta: { label: "Get started", href: signUpThen("/settings?plan=starter"), style: "soft" },
    includesTitle: "Everything in Free, and:",
    includes: ["10 agents", "50,000 events / month", "10 security questionnaires / month", "Evidence exports without a watermark"],
  },
];

const PRODUCTION: Plan[] = [
  {
    id: "pro",
    name: "Pro",
    badge: "Recommended",
    price: "$99",
    unit: "per workspace / month",
    blurb: "For teams running agents in production.",
    cta: { label: "Get started", href: signUpThen("/settings?plan=pro"), style: "primary" },
    includesTitle: "Everything in Starter, and:",
    includes: ["50 agents", "250,000 events / month", "Unlimited security questionnaires"],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "Custom",
    unit: "pricing",
    blurb: "For organizations with many agents and their own terms.",
    cta: { label: "Book a call", href: BOOK_A_CALL_URL, style: "white", external: true },
    includesTitle: "Everything in Pro, and:",
    includes: ["Unlimited agents", "Pay as you go events", "Custom contracts"],
  },
];

// null = not included, true = included, string = the limit.
const COMPARE: { label: string; values: (string | boolean | null)[] }[] = [
  { label: "Agents", values: ["1", "10", "50", "Unlimited"] },
  { label: "Events / month", values: ["2,500", "50,000", "250,000", "Pay as you go"] },
  { label: "Security questionnaires / month", values: ["1", "10", "Unlimited", "Unlimited"] },
  { label: "Watermark on evidence exports", values: ["Yes", "None", "None", "None"] },
  { label: "Hash-chained audit timeline", values: [true, true, true, true] },
  { label: "Human approvals (dashboard, email, Slack)", values: [true, true, true, true] },
  { label: "Policy editor and assistant", values: [true, true, true, true] },
  { label: "MCP server", values: [true, true, true, true] },
  { label: "SOC 2 control mapping", values: [true, true, true, true] },
  { label: "Custom contracts", values: [null, null, null, true] },
];

const PRICING_FAQS = [
  {
    q: "Is pricing per user or per workspace?",
    a: "Per workspace. Everyone on a workspace shares its plan, and each workspace is billed on its own.",
  },
  {
    q: "What counts as an event?",
    a: "Every agent action the SDK records is one event: a tool call, its inputs and outcome, and whether it needed approval.",
  },
  {
    q: "What happens when I hit a limit?",
    a: "New events stop being recorded until the next month or until you upgrade. Everything already logged stays. The same goes for adding agents and uploading questionnaires past your plan's limit.",
  },
  {
    q: "When do monthly limits reset?",
    a: "On the first day of each month, UTC.",
  },
  {
    q: "How do I upgrade?",
    a: "Create an account, create a workspace, then pick a plan in Settings. Checkout is handled securely by Whop. If you switch plans later, the old plan is canceled, so you're never billed for two.",
  },
  {
    q: "What if my subscription ends?",
    a: "The workspace moves back to the Free plan. Your logged history stays; the Free limits apply from then on.",
  },
];

export function Pricing() {
  return (
    <div className={`${interTight.variable} cv`}>
      <ForceLightTheme />
      <SiteNav />

      <section className="mx-auto max-w-6xl px-5 pt-14 sm:px-10 sm:pt-20">
        <h1 className="max-w-3xl text-[40px] font-bold leading-[1.08] tracking-[-0.035em] text-[var(--cv-ink)] sm:text-[64px]">
          Start free. Pay when your agents do.
        </h1>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <p className="max-w-xl text-[17px] leading-[1.55] text-[var(--cv-fg-2)] sm:text-[19px]">
            One plan per workspace, priced by how many agents it runs and how much they do.
          </p>
          <p className="shrink-0 text-[14px] text-[var(--cv-fg-3)]">Prices in USD, billed monthly</p>
        </div>
      </section>

      <section className="mx-auto mt-10 grid max-w-6xl gap-4 px-4 sm:mt-14 sm:px-10 lg:grid-cols-2">
        <PlanGroup title="Everything you need to start logging." plans={ESSENTIALS} tone="white" />
        <PlanGroup title="For agents in production." plans={PRODUCTION} tone="tint" art={<ProveArt />} />
      </section>

      <section className="mx-auto max-w-6xl px-4 pt-20 sm:px-10 sm:pt-28">
        <Reveal>
          <HowItWorks />
        </Reveal>
      </section>

      <section className="mx-auto hidden max-w-6xl px-10 pt-28 md:block">
        <Reveal>
          <CompareTable />
        </Reveal>
      </section>

      <section className="mx-auto max-w-6xl px-4 pt-20 sm:px-10 sm:pt-28">
        <Reveal>
          <Faq items={PRICING_FAQS} />
        </Reveal>
      </section>

      <FinalCtaAndFooter />
    </div>
  );
}

// Notion's pricing layout: two big group cards, each holding two plans
// side by side, the second tinted and carrying an illustration. The
// illustration is taken out of flow and both titles reserve two lines, so
// the plan rows line up across the two cards.
function PlanGroup({
  title,
  plans,
  tone,
  art,
}: {
  title: string;
  plans: Plan[];
  tone: "white" | "tint";
  art?: React.ReactNode;
}) {
  return (
    <div
      className={`relative rounded-[22px] border p-6 sm:p-8 ${
        tone === "tint" ? "border-[#d7e0f7] bg-[#eef3ff]" : "border-[#dfe3ef] bg-white"
      }`}
    >
      <h2 className="max-w-[16ch] text-[26px] font-semibold leading-[1.15] tracking-[-0.03em] text-[var(--cv-ink)] sm:min-h-[2.3em] sm:text-[30px]">
        {title}
      </h2>
      {art && <div className="pointer-events-none absolute right-5 top-5 hidden origin-top-right scale-[0.8] sm:block">{art}</div>}
      <div className="mt-8 grid gap-10 sm:grid-cols-2 sm:gap-6">
        {plans.map((p) => (
          <PlanColumn key={p.id} plan={p} />
        ))}
      </div>
    </div>
  );
}

function PlanColumn({ plan }: { plan: Plan }) {
  const ctaClass = {
    soft: "cv-btn-soft text-[var(--cv-blue-bright)]",
    primary: "cv-btn-primary text-white",
    // Outline via an inset shadow, not a border, so this button is the same
    // height as the others and the "Includes" lists stay aligned.
    white: "bg-white text-[var(--cv-blue-bright)] shadow-[inset_0_0_0_1px_#d7e0f7,0_1px_2px_rgba(26,29,43,0.05)] hover:bg-[#f7f9ff]",
  }[plan.cta.style];
  const ctaBase = `flex w-full items-center justify-center rounded-[10px] px-4 py-2.5 text-[15px] font-semibold transition-colors ${ctaClass}`;

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2">
        <h3 className="text-[21px] font-semibold tracking-[-0.02em] text-[var(--cv-ink)]">{plan.name}</h3>
        {plan.badge && (
          <span className="rounded-md bg-[var(--cv-blue-bright)]/10 px-1.5 py-0.5 text-[12px] font-semibold text-[var(--cv-blue-bright)]">
            {plan.badge}
          </span>
        )}
      </div>
      <p className="mt-2 flex items-baseline gap-1.5">
        <span className="text-[26px] font-semibold tracking-[-0.03em] text-[var(--cv-ink)]">{plan.price}</span>
        <span className="text-[14px] text-[var(--cv-fg-2)]">{plan.unit}</span>
      </p>
      <p className="mt-2 min-h-[48px] text-[15.5px] leading-[1.5] text-[var(--cv-fg-2)]">{plan.blurb}</p>
      <div className="mt-4">
        {plan.cta.external ? (
          <a href={plan.cta.href} target="_blank" rel="noopener noreferrer" className={ctaBase}>
            {plan.cta.label}
          </a>
        ) : (
          <Link href={plan.cta.href} className={ctaBase}>
            {plan.cta.label}
          </Link>
        )}
      </div>
      <p className="mt-6 text-[14px] font-semibold text-[var(--cv-ink)]">{plan.includesTitle}</p>
      <ul className="mt-2.5 space-y-2">
        {plan.includes.map((item) => (
          <li key={item} className="flex items-start gap-2 text-[14.5px] leading-[1.45] text-[var(--cv-ink)]">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-[var(--cv-fg-2)]" strokeWidth={2} />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function HowItWorks() {
  // Same three tints (and matching accents) as the Product menu's cards.
  const steps = [
    {
      n: "1",
      title: "Create your account",
      body: "Sign up with your email and confirm the code we send.",
      card: "border-[#c9d6f7] bg-[#e6edff]",
      badge: "bg-[#3553d4]",
    },
    {
      n: "2",
      title: "Create a workspace",
      body: "Give it a name. Every new workspace starts on the Free plan.",
      card: "border-[#f0cdc9] bg-[#fce8e6]",
      badge: "bg-[#d4483f]",
    },
    {
      n: "3",
      title: "Pick a plan",
      body: "Upgrade from Settings. Checkout is handled securely by Whop.",
      card: "border-[#ecd9a4] bg-[#fcf1d6]",
      badge: "bg-[#c98a06]",
    },
  ];
  return (
    <div>
      <h2 className="text-[26px] font-medium tracking-[-0.03em] text-[var(--cv-ink)] sm:text-[32px]">How upgrading works</h2>
      <div className="mt-8 grid gap-3 md:grid-cols-3 md:gap-5">
        {steps.map((s) => (
          <div key={s.n} className={`rounded-[20px] border p-6 ${s.card}`}>
            <span
              className={`flex h-8 w-8 items-center justify-center rounded-full text-[14px] font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_1px_2px_rgba(26,29,43,0.2)] ${s.badge}`}
            >
              {s.n}
            </span>
            <p className="mt-4 text-[18px] font-medium tracking-[-0.02em] text-[var(--cv-ink)]">{s.title}</p>
            <p className="mt-1.5 text-[15px] leading-[1.55] text-[var(--cv-fg-2)]">{s.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function CompareTable() {
  const heads = ["Free", "Starter", "Pro", "Enterprise"];
  return (
    <div>
      <h2 className="text-[32px] font-medium tracking-[-0.03em] text-[var(--cv-ink)]">Compare plans</h2>
      <div className="mt-8 overflow-hidden rounded-[20px] border border-[#dfe3ef]">
        <table className="w-full text-left text-[14.5px]">
          <thead>
            <tr className="border-b border-[#dfe3ef] bg-[#f6f8fd]">
              <th className="w-[34%] px-6 py-4 font-medium text-[var(--cv-fg-2)]">Features</th>
              {heads.map((h) => (
                <th key={h} className="px-4 py-4 text-[16px] font-semibold tracking-[-0.01em] text-[var(--cv-ink)]">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {COMPARE.map((row) => (
              <tr key={row.label} className="border-b border-[#e8ebf4] last:border-0">
                <td className="px-6 py-3.5 text-[var(--cv-ink)]">{row.label}</td>
                {row.values.map((v, i) => (
                  <td key={i} className="px-4 py-3.5 text-[var(--cv-fg-2)]">
                    {v === true ? (
                      <Check className="h-4 w-4 text-[var(--cv-blue-bright)]" strokeWidth={2.25} aria-label="Included" />
                    ) : v === null ? (
                      <Minus className="h-4 w-4 text-[#c3c9da]" aria-label="Not included" />
                    ) : (
                      v
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
