import {
  ArrowUp,
  Check,
  ChevronDown,
  ChevronUp,
  CircleCheck,
  Clock,
  Download,
  FileText,
  History,
  House,
  Search,
  Settings as SettingsIcon,
  ShieldCheck,
  BadgeCheck,
  MessageCircle,
  X,
} from "lucide-react";
import { cdSans } from "@/components/dashboard/font";
import "@/components/dashboard/dash.css";

// Static, full-scale recreations of the real dashboard (components/dashboard)
// for the landing page: same sidebar, same tinted page with white cards, same
// status dots and buttons. Rendered inside the page's .cd scope so they use
// the dashboard's own tokens and font. Scaled a notch down from the live app
// so a whole screen reads inside the landing page's window frame.

const NAV = [
  { label: "Home", icon: House },
  { label: "Timeline", icon: History },
  { label: "Approvals", icon: CircleCheck, badge: 3 },
  { label: "Evidence Packs", icon: FileText },
  { label: "SOC 2", icon: BadgeCheck },
  { label: "Policy", icon: ShieldCheck },
];

type Tone = "green" | "amber" | "red" | "gray" | "blue";
const TONE: Record<Tone, string> = {
  green: "var(--cd-green)",
  amber: "var(--cd-amber)",
  red: "var(--cd-red)",
  gray: "#b4b9ca",
  blue: "var(--cd-blue)",
};

function Dot({ tone }: { tone: Tone }) {
  return <span className="h-[7px] w-[7px] shrink-0 rounded-full" style={{ background: TONE[tone] }} />;
}

function Status({ label, tone }: { label: string; tone: Tone }) {
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap text-[13px] text-[var(--cd-fg-2)]">
      <Dot tone={tone} />
      {label}
    </span>
  );
}

function Seg({ items, active }: { items: [string, number?][]; active: number }) {
  return (
    <div className="inline-flex max-w-full gap-0.5 overflow-hidden rounded-[7px] bg-[#e7eaf2] p-[3px]">
      {items.map(([label, count], i) => (
        <span
          key={label}
          className={`inline-flex h-[30px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[5px] px-2.5 text-[13px] font-medium sm:px-3 ${
            i === active
              ? "bg-white text-[var(--cd-ink)] shadow-[0_0_0_1px_rgba(15,18,34,0.06),0_1px_2px_rgba(15,18,34,0.08)]"
              : "text-[var(--cd-fg-2)]"
          }`}
        >
          {label}
          {count != null && <span className="text-[12px] tabular-nums text-[var(--cd-fg-3)]">{count}</span>}
        </span>
      ))}
    </div>
  );
}

function Header({ title, sub, action }: { title: string; sub: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div className="min-w-0">
        <h3 className="text-[24px] font-semibold leading-[1.15] tracking-[-0.03em] text-[var(--cd-ink)]">{title}</h3>
        <p className="mt-1 max-w-[52ch] text-[13.5px] leading-[1.5] text-[var(--cd-fg-2)]">{sub}</p>
      </div>
      {action}
    </div>
  );
}

function SecondaryBtn({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`cd-btn-secondary inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[6px] px-3 text-[13.5px] font-medium text-[var(--cd-ink)] ${className}`}>
      {children}
    </span>
  );
}

function PrimaryBtn({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`cv-btn-primary inline-flex h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-[6px] px-3 text-[13.5px] font-medium text-white ${className}`}>
      {children}
    </span>
  );
}

/** Browser frame + the dashboard's sidebar. At least 32px taller than its
 * crop, so the crop always cuts straight through it. */
export function AppWindow({ active, children }: { active: string; children: React.ReactNode }) {
  return (
    <div
      className={`${cdSans.variable} cd cv-window flex min-h-[calc(100%+32px)] flex-col overflow-hidden rounded-t-[10px] border border-[var(--cd-line)] text-[var(--cd-ink)]`}
    >
      <div className="flex items-center gap-1.5 border-b border-[var(--cd-line)] bg-white px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
        <span className="mx-auto truncate rounded-[5px] bg-[var(--cd-bg)] px-5 py-0.5 text-[11.5px] text-[var(--cd-fg-2)] sm:-translate-x-6 sm:px-16">
          app.tracyn.online
        </span>
      </div>
      <div className="flex flex-1">
        <div className="hidden w-[228px] shrink-0 flex-col border-r border-[var(--cd-card-edge)] bg-[var(--cd-side)] sm:flex">
          <div className="flex items-center gap-2.5 px-4 pb-3 pt-4">
            {/* eslint-disable-next-line @next/next/no-img-element -- next/image's optimizer (sharp) fails on this PNG */}
            <img src="/logo.png" alt="" width={24} height={24} className="rounded-[5px]" />
            <span className="cd-wordmark" style={{ fontSize: 17 }}>Tracyn</span>
          </div>
          <div className="space-y-2 px-3">
            <div className="flex items-center gap-2.5 rounded-[7px] px-2 py-2">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[5px] bg-[radial-gradient(115%_115%_at_10%_17%,#3553d4_0%,#1c2f9e_100%)] text-[12px] font-semibold text-white">
                A
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px]">Acme Agents</span>
                <span className="block text-[11.5px] text-[var(--cd-fg-3)]">Starter plan</span>
              </span>
            </div>
            <div className="flex h-9 items-center gap-2 rounded-[7px] border border-[var(--cd-line)] bg-white px-3 text-[13.5px] text-[var(--cd-fg-3)]">
              <Search className="h-4 w-4" />
              Search
            </div>
          </div>
          <div className="mt-4 space-y-0.5 px-3">
            {NAV.map((item) => {
              const on = item.label === active;
              return (
                <div
                  key={item.label}
                  className={`flex h-9 items-center gap-3 rounded-[7px] px-3 text-[14px] font-medium ${
                    on ? "bg-white text-[var(--cd-ink)] shadow-[0_0_0_1px_var(--cd-line),0_1px_2px_rgba(15,18,34,0.05)]" : "text-[var(--cd-fg-2)]"
                  }`}
                >
                  <item.icon className={`h-[17px] w-[17px] ${on ? "text-[var(--cd-ink)]" : "text-[var(--cd-fg-3)]"}`} strokeWidth={1.75} />
                  <span className="flex-1">{item.label}</span>
                  {item.badge && (
                    <span className="min-w-[20px] rounded-full bg-white px-1.5 text-center text-[11.5px] font-semibold leading-[18px] shadow-[0_0_0_1px_var(--cd-line-2)]">
                      {item.badge}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          {/* Settings sits right under the main links rather than pinned to the
              window's bottom, where the crop would slice through it. */}
          <div className="mt-4 space-y-0.5 border-t border-[var(--cd-line)] px-3 pt-4">
            <div className="flex h-9 items-center gap-3 rounded-[7px] px-3 text-[14px] font-medium text-[var(--cd-fg-2)]">
              <SettingsIcon className="h-[17px] w-[17px] text-[var(--cd-fg-3)]" strokeWidth={1.75} />
              Settings
            </div>
          </div>
        </div>
        <div className="min-w-0 flex-1 bg-[var(--cd-bg)]">{children}</div>
      </div>
    </div>
  );
}

// ---------- Timeline ----------

const TIMELINE_ROWS: { action: string; agent: string; type: string; status: [string, Tone]; ms: string; when: string }[] = [
  { action: "send_refund", agent: "support-bot", type: "External", status: ["Approved", "green"], ms: "1,180 ms", when: "just now" },
  { action: "lookup_order", agent: "support-bot", type: "Internal", status: ["Completed", "green"], ms: "240 ms", when: "1m ago" },
  { action: "bulk_delete_records", agent: "ops-agent", type: "External", status: ["Rejected", "red"], ms: "2,410 ms", when: "3m ago" },
  { action: "update_crm_record", agent: "sales-agent", type: "External", status: ["Completed", "green"], ms: "610 ms", when: "4m ago" },
  { action: "charge_card", agent: "billing-agent", type: "External", status: ["Approved", "green"], ms: "890 ms", when: "6m ago" },
  { action: "summarize_ticket", agent: "support-bot", type: "Internal", status: ["Completed", "green"], ms: "1,420 ms", when: "8m ago" },
  { action: "screen_resume", agent: "recruiting-agent", type: "Internal", status: ["Completed", "green"], ms: "3,050 ms", when: "11m ago" },
  { action: "draft_reply", agent: "support-bot", type: "External", status: ["Error", "red"], ms: "1,320 ms", when: "12m ago" },
  { action: "sync_inventory", agent: "ops-agent", type: "Internal", status: ["Completed", "green"], ms: "730 ms", when: "15m ago" },
  { action: "send_receipt_email", agent: "billing-agent", type: "External", status: ["Completed", "green"], ms: "520 ms", when: "17m ago" },
  { action: "schedule_interview", agent: "recruiting-agent", type: "External", status: ["Completed", "green"], ms: "680 ms", when: "20m ago" },
  { action: "close_ticket", agent: "support-bot", type: "External", status: ["Completed", "green"], ms: "310 ms", when: "22m ago" },
];

export function TimelineScreen() {
  return (
    <div className="px-4 pb-6 pt-6 sm:px-7 sm:pt-7">
      <Header
        title="Timeline"
        sub="Every action your agents take, each chained to the one before it."
        action={
          <SecondaryBtn className="hidden sm:inline-flex">
            <Download className="h-4 w-4" />
            Export CSV
          </SecondaryBtn>
        }
      />
      <div className="mt-5 flex items-center gap-2.5">
        <div className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-[7px] border border-[var(--cd-line-2)] bg-white px-3 text-[13.5px] text-[#a3a9bd] lg:max-w-[240px]">
          <Search className="h-4 w-4 shrink-0 text-[var(--cd-fg-3)]" />
          Search actions
        </div>
        <SecondaryBtn className="hidden md:inline-flex">
          All agents <ChevronDown className="h-3.5 w-3.5 text-[var(--cd-fg-3)]" />
        </SecondaryBtn>
        <div className="hidden lg:block">
          <Seg items={[["All", 36], ["Completed", 31], ["Approved", 3], ["Rejected", 1], ["Error", 1]]} active={0} />
        </div>
      </div>
      <div className="cd-card mt-4 overflow-hidden rounded-[10px]">
        <table className="w-full text-left text-[13.5px]">
          <thead>
            <tr className="border-b border-[var(--cd-line)] text-[12px] text-[var(--cd-fg-3)]">
              <th className="h-10 pl-4 pr-3 font-medium sm:pl-5">Action</th>
              <th className="hidden px-3 font-medium md:table-cell">Type</th>
              <th className="px-3 font-medium">Status</th>
              <th className="hidden px-3 text-right font-medium lg:table-cell">Latency</th>
              <th className="hidden pl-3 pr-5 text-right font-medium sm:table-cell">When</th>
            </tr>
          </thead>
          <tbody>
            {TIMELINE_ROWS.map((r, i) => (
              <tr key={i} className="border-b border-[var(--cd-line)] last:border-0">
                <td className="py-3 pl-4 pr-3 sm:pl-5">
                  <div className="font-medium">{r.action}</div>
                  <div className="mt-0.5 text-[12.5px] text-[var(--cd-fg-3)]">{r.agent}</div>
                </td>
                <td className="hidden px-3 text-[var(--cd-fg-2)] md:table-cell">{r.type}</td>
                <td className="px-3">
                  <Status label={r.status[0]} tone={r.status[1]} />
                </td>
                <td className="hidden px-3 text-right tabular-nums text-[var(--cd-fg-2)] lg:table-cell">{r.ms}</td>
                <td className="hidden whitespace-nowrap pl-3 pr-5 text-right text-[var(--cd-fg-2)] sm:table-cell">{r.when}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------- Policy ----------

function Code({ children }: { children: React.ReactNode }) {
  return <code className="rounded-[4px] bg-[#f1f3f9] px-1 py-[1px] text-[12.5px] font-medium">{children}</code>;
}

export function Switch({ on }: { on: boolean }) {
  return (
    <span className={`relative h-[20px] w-[34px] shrink-0 rounded-full ${on ? "bg-[var(--cd-blue)]" : "bg-[#d5dae8]"}`}>
      <span
        className={`absolute left-0 top-[2px] h-4 w-4 rounded-full bg-white shadow-[0_1px_2px_rgba(15,18,34,0.25)] ${on ? "translate-x-[16px]" : "translate-x-[2px]"}`}
      />
    </span>
  );
}

export function PolicyScreen() {
  // Below lg only the assistant shows, to keep the screenshot short; from lg
  // the rules sit beside it, squeezed over the way the real page does when
  // the assistant is open.
  const rules: { title: React.ReactNode; hint: string; on: boolean }[] = [
    { title: <>Actions with <Code>refund</Code> in the name</>, hint: "Matches by action name", on: true },
    { title: <>The <Code>charge_card</Code> action</>, hint: "Matches by action name", on: true },
    { title: <>Actions starting with <Code>bulk_delete</Code></>, hint: "Matches by action name", on: true },
    { title: "Internal, background actions", hint: "Nothing leaves your system", on: false },
  ];
  return (
    <div className="px-4 pb-6 pt-6 sm:px-7 sm:pt-7">
      <Header
        title="Policy"
        sub="Choose which actions need a person to approve them."
        action={
          <span className="hidden shrink-0 items-center gap-2.5 lg:flex">
            <span className="text-[13px] text-[var(--cd-fg-2)]">Close the assistant</span>
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#fdecec] text-[var(--cd-red)] shadow-[0_0_0_1.5px_#eaa9a9]">
              <X className="h-5 w-5" strokeWidth={2.25} />
            </span>
          </span>
        }
      />
      <div className="mt-5 grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_290px]">
        <div className="cd-card hidden overflow-hidden rounded-[10px] lg:block">
          <div className="flex items-center justify-between border-b border-[var(--cd-line)] px-4 py-3">
            <span className="text-[14px] font-semibold">Rules</span>
            <span className="text-[12.5px] text-[var(--cd-fg-3)]">3 of 4 need approval</span>
          </div>
          <div className="divide-y divide-[var(--cd-line)]">
            {rules.map((r, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f1f3f8]">
                  <Dot tone={r.on ? "amber" : "gray"} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[14px] font-semibold leading-snug tracking-[-0.015em]">{r.title}</div>
                  <div className="mt-0.5 text-[12.5px] text-[var(--cd-fg-2)]">{r.hint}</div>
                </div>
                <Switch on={r.on} />
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col overflow-hidden rounded-[14px] border-[1.5px] border-[#c3cbe2] bg-[#f5f7fc] shadow-[0_14px_30px_-16px_rgba(15,18,34,0.3)]">
          <div className="flex items-center gap-2.5 border-b border-[#dfe4f2] px-3.5 py-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-[var(--cd-blue)] shadow-[0_0_0_1px_#dfe4f2]">
              <MessageCircle className="h-3.5 w-3.5" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[13.5px] font-semibold leading-tight">Policy assistant</div>
              <div className="text-[11.5px] text-[var(--cd-fg-3)]">Plain English in, rules out</div>
            </div>
            <X className="h-4 w-4 text-[var(--cd-fg-3)]" />
          </div>
          <div className="space-y-2.5 p-3.5">
            <div className="ml-auto w-fit max-w-[88%] rounded-[12px] rounded-br-[3px] bg-white px-3 py-2 text-[13px] shadow-[0_0_0_1px_#dfe4f2]">
              Require approval for refunds and card charges
            </div>
            <p className="text-[13px] leading-[1.5]">Added two rules. Both pause for a person before they run.</p>
            <div className="overflow-hidden rounded-[10px] border border-[#dfe4f2] bg-white">
              <pre className="cd-mono px-3 py-2 text-[11px] leading-[1.6]">
                <div className="text-[var(--cd-green)]">+ action_name: &quot;*refund*&quot;</div>
                <div className="text-[var(--cd-green)]">+ action_name: charge_card</div>
              </pre>
              <div className="flex items-center justify-between border-t border-[#dfe4f2] px-3 py-2">
                <span className="text-[12px] text-[var(--cd-fg-3)]">Proposed policy</span>
                <PrimaryBtn className="h-[26px] px-5 text-[12.5px]">Apply</PrimaryBtn>
              </div>
            </div>
          </div>
          <div className="border-t border-[#dfe4f2] p-2.5">
            <div className="flex items-center gap-2 rounded-full border border-[#d8def0] bg-white py-1.5 pl-3.5 pr-1.5 text-[13px] text-[#a3a9bd]">
              <span className="flex-1">Ask for a rule...</span>
              <span className="cv-btn-primary flex h-7 w-7 items-center justify-center rounded-full text-white">
                <ArrowUp className="h-3.5 w-3.5" />
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- Approvals ----------

const REQUESTS = [
  { action: "send_refund", agent: "support-bot", summary: "amount 249 · order ord_8123", when: "2m ago" },
  { action: "charge_card", agent: "billing-agent", summary: "amount 3,200 · invoice inv_2304", when: "9m ago" },
  { action: "bulk_delete_records", agent: "ops-agent", summary: "count 12,040 · table sessions", when: "14m ago" },
];

export function ApprovalsScreen() {
  return (
    <div className="px-4 pb-6 pt-6 sm:px-7 sm:pt-7">
      <Header title="Approvals" sub="Risky actions wait here until your team decides." />
      <div className="mt-5">
        <Seg items={[["Pending", 3], ["Approved", 12], ["Rejected", 2]]} active={0} />
      </div>
      <div className="mt-4 grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_330px]">
        <div className="cd-card hidden overflow-hidden rounded-[10px] lg:block">
          {REQUESTS.map((r, i) => (
            <div
              key={r.action}
              className={`relative flex items-start gap-2.5 border-b border-[var(--cd-line)] px-4 py-3.5 last:border-0 ${i === 0 ? "bg-[#f3f5fc]" : ""}`}
            >
              {i === 0 && <span className="absolute inset-y-3 left-0 w-[3px] rounded-r-full bg-[var(--cd-blue)]" />}
              <span className="mt-[7px]">
                <Dot tone="amber" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-[14.5px] font-semibold tracking-[-0.015em]">{r.action}</span>
                  <span className="shrink-0 text-[12px] text-[var(--cd-fg-3)]">{r.when}</span>
                </div>
                <div className="truncate text-[13px] text-[var(--cd-fg-3)]">from {r.agent}</div>
                <div className="mt-1.5 truncate text-[13px] text-[var(--cd-fg-2)]">{r.summary}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="cd-card overflow-hidden rounded-[10px]">
          <div className="flex items-center gap-2.5 border-b border-[var(--cd-line)] px-5 py-3.5">
            <span className="text-[15px] font-semibold">send_refund</span>
            <Status label="Pending" tone="amber" />
            <X className="ml-auto h-4 w-4 text-[var(--cd-fg-3)]" />
          </div>
          <div className="space-y-4 px-5 py-4">
            <div className="divide-y divide-[var(--cd-line)] rounded-[7px] border border-[var(--cd-line)] bg-[#fbfbfd] text-[13.5px]">
              {[
                ["Amount", "249.00"],
                ["Order id", "ord_8123"],
                ["Reason", "damaged on arrival"],
              ].map(([k, v], i) => (
                <div key={k} className={`grid-cols-[96px_minmax(0,1fr)] gap-3 px-3.5 py-2.5 ${i === 2 ? "hidden sm:grid" : "grid"}`}>
                  <span className="text-[var(--cd-fg-3)]">{k}</span>
                  <span className="font-medium">{v}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-1.5 text-[13px] text-[var(--cd-fg-3)]">
              <Clock className="h-3.5 w-3.5" /> Expires in 28m
            </div>
            <div className="flex gap-2">
              <PrimaryBtn className="flex-1">
                <Check className="h-4 w-4" /> Approve
              </PrimaryBtn>
              <span className="cd-btn-secondary inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-[6px] text-[13.5px] font-medium text-[var(--cd-red)]">
                <X className="h-4 w-4" /> Reject
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- Evidence ----------

const QUESTIONS: [string, Tone][] = [
  ["Does the system log every AI agent action?", "green"],
  ["How are high-risk actions controlled before they run?", "blue"],
  ["Can you show a risky action being blocked?", "gray"],
  ["Is there an audit trail an auditor can review?", "gray"],
  ["Who approves actions that touch customer money?", "gray"],
];

const CITED = [
  { action: "send_refund", meta: "support-bot · approved", hash: "3f9ac21e7b04d5e1a9c2" },
  { action: "charge_card", meta: "billing-agent · approved", hash: "b7029d44c1e8a0f35b67" },
  { action: "bulk_delete_records", meta: "ops-agent · rejected", hash: "e18c05af93d2b7c4e610" },
];

export function EvidenceScreen() {
  return (
    <div className="px-4 pb-6 pt-6 sm:px-7 sm:pt-7">
      <div className="text-[12.5px] text-[var(--cd-fg-3)]">Evidence Packs</div>
      <div className="mt-1.5 flex items-end justify-between gap-4">
        <div className="min-w-0">
          <h3 className="truncate text-[22px] font-semibold tracking-[-0.03em]">SOC2-Questionnaire-2026.csv</h3>
          <div className="mt-2 flex items-center gap-3 text-[13px] text-[var(--cd-fg-2)]">
            <span className="flex h-1.5 w-32 gap-[2px] overflow-hidden rounded-full bg-[#eef0f6]">
              <span className="h-full w-[20%] bg-[var(--cd-green)]" />
              <span className="h-full w-[20%] bg-[var(--cd-blue)]" />
            </span>
            1 of 5 answers approved
          </div>
        </div>
        <PrimaryBtn className="hidden sm:inline-flex">Approve all</PrimaryBtn>
      </div>

      <div className="mt-5 grid items-start gap-4 lg:grid-cols-[210px_minmax(0,1fr)]">
        <div className="cd-card hidden overflow-hidden rounded-[10px] lg:block">
          <div className="border-b border-[var(--cd-line)] px-4 py-2.5 text-[12.5px] font-medium text-[var(--cd-fg-3)]">5 questions</div>
          <div className="p-1.5">
            {QUESTIONS.map(([q, tone], i) => (
              <div key={q} className={`flex items-start gap-2 rounded-[6px] px-2.5 py-2 ${i === 1 ? "bg-white shadow-[0_0_0_1px_var(--cd-line)]" : ""}`}>
                <span className="mt-[1px] w-4 shrink-0 text-right text-[11.5px] tabular-nums text-[var(--cd-fg-3)]">{i + 1}</span>
                <span className="line-clamp-2 min-w-0 flex-1 text-[12.5px] leading-[1.45]">{q}</span>
                <span className="mt-[5px]">
                  <Dot tone={tone} />
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="cd-card overflow-hidden rounded-[10px]">
          <div className="flex items-center justify-between border-b border-[var(--cd-line)] px-5 py-2.5">
            <span className="text-[12.5px] text-[var(--cd-fg-3)]">Question 2 of 5</span>
            <span className="flex items-center gap-2.5">
              <Status label="Reviewed" tone="blue" />
              <span className="flex text-[var(--cd-fg-2)]">
                <ChevronUp className="h-4 w-4" />
                <ChevronDown className="h-4 w-4" />
              </span>
            </span>
          </div>
          <div className="space-y-3.5 px-5 py-4">
            <h4 className="text-[16px] font-semibold leading-[1.35] tracking-[-0.02em]">How are high-risk actions controlled before they run?</h4>
            <div className="rounded-[7px] border border-[var(--cd-line-2)] bg-white px-3.5 py-3 text-[13.5px] leading-[1.6]">
              A workspace policy decides which actions are risky. Matching actions pause and wait for a person to approve or
              reject them in Tracyn or Slack. Anything not approved within 30 minutes is denied automatically.
            </div>
            <div>
              <div className="mb-2 text-[11.5px] font-medium uppercase tracking-[0.06em] text-[var(--cd-fg-3)]">Evidence cited (3)</div>
              <div className="grid gap-2 sm:grid-cols-3">
                {CITED.map((c, i) => (
                  <div key={c.action} className={`rounded-[7px] border border-[var(--cd-line)] bg-[#fbfbfd] p-2.5 ${i > 1 ? "hidden sm:block" : ""}`}>
                    <div className="truncate text-[12.5px] font-medium">{c.action}</div>
                    <div className="mt-0.5 truncate text-[11.5px] text-[var(--cd-fg-3)]">{c.meta}</div>
                    <div className="mt-1.5 flex items-center gap-1 text-[10.5px] text-[var(--cd-fg-3)]">
                      <ShieldCheck className="h-3 w-3 shrink-0 text-[var(--cd-green)]" />
                      <span className="cd-mono truncate">{c.hash}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <PrimaryBtn>Approve answer</PrimaryBtn>
              <SecondaryBtn className="hidden min-[400px]:inline-flex">Save as reviewed</SecondaryBtn>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
