"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";


// ---------- formatting ----------

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const future = diff < 0;
  const s = Math.abs(diff) / 1000;
  if (s < 45) return future ? "in a moment" : "just now";
  const m = s / 60;
  const h = m / 60;
  const d = h / 24;
  const [n, unit] =
    m < 60 ? [m, "m"] : h < 24 ? [h, "h"] : d < 7 ? [d, "d"] : d < 35 ? [d / 7, "w"] : d < 365 ? [d / 30, "mo"] : [d / 365, "y"];
  const v = Math.max(1, Math.floor(n));
  return future ? `in ${v}${unit}` : `${v}${unit} ago`;
}

export function fullDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function money(n: number, digits = 2): string {
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
}

export function humanKey(k: string): string {
  const s = k.replace(/_/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function formatValue(v: unknown): string {
  if (v == null) return "-";
  if (typeof v === "number") return v.toLocaleString();
  if (typeof v === "string") return v;
  return JSON.stringify(v);
}

// ---------- status ----------

export type Tone = "green" | "amber" | "red" | "blue" | "gray";

const TONE_COLOR: Record<Tone, string> = {
  green: "var(--cd-green)",
  amber: "var(--cd-amber)",
  red: "var(--cd-red)",
  blue: "var(--cd-blue)",
  gray: "#b4b9ca",
};

export function Dot({ tone, pulse }: { tone: Tone; pulse?: boolean }) {
  return (
    <span className="relative inline-flex h-[7px] w-[7px] shrink-0">
      {pulse && (
        <span
          className="absolute inset-0 animate-ping rounded-full opacity-40 motion-reduce:hidden"
          style={{ background: TONE_COLOR[tone] }}
        />
      )}
      <span className="relative h-[7px] w-[7px] rounded-full" style={{ background: TONE_COLOR[tone] }} />
    </span>
  );
}

const STATUS: Record<string, { label: string; tone: Tone }> = {
  completed: { label: "Completed", tone: "green" },
  approved: { label: "Approved", tone: "green" },
  rejected: { label: "Rejected", tone: "red" },
  denied_timeout: { label: "Expired", tone: "gray" },
  error: { label: "Error", tone: "red" },
  pending: { label: "Pending", tone: "amber" },
  draft: { label: "Draft", tone: "gray" },
  reviewed: { label: "Reviewed", tone: "blue" },
  processing: { label: "Processing", tone: "amber" },
  ready: { label: "Ready", tone: "green" },
};

export function statusTone(status: string): Tone {
  return STATUS[status]?.tone ?? "gray";
}

export function Status({ status, className }: { status: string; className?: string }) {
  const s = STATUS[status] ?? { label: status, tone: "gray" as Tone };
  return (
    <span className={cn("inline-flex items-center gap-2 whitespace-nowrap text-[14px] text-[var(--cd-fg-2)]", className)}>
      <Dot tone={s.tone} />
      {s.label}
    </span>
  );
}

// ---------- layout ----------

export function Page({ children, wide, className }: { children: React.ReactNode; wide?: boolean; className?: string }) {
  return (
    <div className={cn("mx-auto px-4 pb-16 pt-7 sm:px-8 sm:pt-9 lg:px-10", wide ? "max-w-[1320px]" : "max-w-[1180px]", className)}>
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
  eyebrow,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  eyebrow?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        {eyebrow && <div className="mb-2 text-[14px] text-[var(--cd-fg-3)]">{eyebrow}</div>}
        <h1 className="text-[30px] font-semibold leading-[1.15] tracking-[-0.03em] text-[var(--cd-ink)] sm:text-[34px]">
          {title}
        </h1>
        {subtitle && <p className="mt-1.5 max-w-[62ch] text-[16px] leading-[1.5] text-[var(--cd-fg-2)]">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ className, children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("cd-card rounded-[10px]", className)} {...rest}>
      {children}
    </div>
  );
}

export function CardTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 px-5 pb-1 pt-4">
      <h2 className="text-[15.5px] font-semibold tracking-[-0.01em] text-[var(--cd-ink)]">{children}</h2>
      {action}
    </div>
  );
}

// ---------- buttons ----------

type BtnVariant = "primary" | "secondary" | "ghost" | "danger";

export function btnClass(variant: BtnVariant = "secondary", size: "sm" | "md" = "md") {
  return cn(
    "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-[6px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-55",
    size === "sm" ? "h-9 px-3.5 text-[14.5px]" : "h-10 px-4 text-[15.5px]",
    variant === "primary" && "cv-btn-primary text-white",
    variant === "secondary" && "cd-btn-secondary text-[var(--cd-ink)]",
    variant === "ghost" && "text-[var(--cd-fg-2)] hover:bg-[var(--cd-hover)] hover:text-[var(--cd-ink)]",
    variant === "danger" && "cd-btn-secondary text-[var(--cd-red)]"
  );
}

export function Button({
  variant,
  size,
  className,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: "sm" | "md" }) {
  return <button type="button" className={cn(btnClass(variant, size), className)} {...rest} />;
}

// ---------- tabs ----------

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: string; count?: number }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div role="tablist" aria-label={label} className="cd-noscroll inline-flex max-w-full gap-0.5 overflow-x-auto rounded-[7px] bg-[#e7eaf2] p-[3px]">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "inline-flex h-[34px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[5px] px-2.5 sm:px-3.5 text-[14px] font-medium transition-[background-color,color,box-shadow]",
              active
                ? "bg-white text-[var(--cd-ink)] shadow-[0_0_0_1px_rgba(15,18,34,0.06),0_1px_2px_rgba(15,18,34,0.08)]"
                : "text-[var(--cd-fg-2)] hover:text-[var(--cd-ink)]"
            )}
          >
            {o.label}
            {o.count != null && (
              <span className={cn("tabular-nums text-[13px]", active ? "text-[var(--cd-fg-2)]" : "text-[var(--cd-fg-3)]")}>
                {o.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ---------- side panel ----------

export const EXIT_MS = 220;

/** Keeps the last non-null value around for EXIT_MS after it goes null, so
 * a panel can play its closing animation before it unmounts. */
export function useExiting<T>(value: T | null): { current: T | null; exiting: boolean } {
  const [kept, setKept] = useState<T | null>(value);
  const [exiting, setExiting] = useState(false);
  useEffect(() => {
    if (value != null) {
      setKept(value);
      setExiting(false);
      return;
    }
    setExiting(true);
    const t = setTimeout(() => {
      setKept(null);
      setExiting(false);
    }, EXIT_MS);
    return () => clearTimeout(t);
  }, [value]);
  return { current: value ?? kept, exiting: value == null && kept != null && exiting };
}

/** Same idea for a plain open flag: stays mounted through the exit. */
export function usePresence(open: boolean): { mounted: boolean; exiting: boolean } {
  const [mounted, setMounted] = useState(open);
  const [exiting, setExiting] = useState(false);
  useEffect(() => {
    if (open) {
      setMounted(true);
      setExiting(false);
      return;
    }
    setExiting(true);
    const t = setTimeout(() => {
      setMounted(false);
      setExiting(false);
    }, EXIT_MS);
    return () => clearTimeout(t);
  }, [open]);
  return { mounted: open || mounted, exiting: !open && mounted && exiting };
}

export function SidePanel({
  open,
  onClose,
  title,
  children,
  footer,
  toolbar,
}: {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  toolbar?: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Hold the last contents while the sheet slides out: the caller usually
  // renders nothing inside once it closes.
  const last = useRef({ title, children, footer, toolbar });
  if (open) last.current = { title, children, footer, toolbar };
  const { mounted, exiting } = usePresence(open);
  if (!mounted) return null;
  const c = last.current;
  return (
    <div className={cn("fixed inset-0 z-50", exiting && "pointer-events-none")}>
      <div className={cn("absolute inset-0 bg-[rgba(15,18,34,0.12)]", exiting ? "cd-fade-out" : "cd-fade-in")} onClick={onClose} />
      <aside
        role="dialog"
        aria-modal="true"
        className={cn(
          exiting ? "cd-panel-out" : "cd-panel-in",
          "cd-float absolute inset-y-0 right-0 flex w-full flex-col bg-white sm:inset-y-2 sm:right-2 sm:w-[460px] sm:rounded-[10px]"
        )}
      >
        <div className="flex items-center gap-2 border-b border-[var(--cd-line)] px-5 py-3.5">
          <div className="min-w-0 flex-1 text-[16.5px] font-semibold tracking-[-0.01em]">{c.title}</div>
          {c.toolbar}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-1.5 rounded-[6px] p-1.5 text-[var(--cd-fg-3)] hover:bg-[var(--cd-hover)] hover:text-[var(--cd-ink)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">{c.children}</div>
        {c.footer && <div className="border-t border-[var(--cd-line)] px-5 py-3.5">{c.footer}</div>}
      </aside>
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const last = useRef({ title, children });
  if (open) last.current = { title, children };
  const { mounted, exiting } = usePresence(open);
  if (!mounted) return null;
  return (
    <div className={cn("fixed inset-0 z-50 flex items-start justify-center px-4 pt-[12vh]", exiting && "pointer-events-none")}>
      <div className={cn("absolute inset-0 bg-[rgba(15,18,34,0.18)]", exiting ? "cd-fade-out" : "cd-fade-in")} onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(exiting ? "cd-fade-out" : "cd-pop-in", "cd-float relative w-full max-w-[480px] rounded-[10px] bg-white p-6")}
      >
        <h2 className="text-[19px] font-semibold tracking-[-0.015em]">{last.current.title}</h2>
        <div className="mt-3">{last.current.children}</div>
      </div>
    </div>
  );
}

// ---------- misc ----------

export function KeyValue({ rows }: { rows: [string, React.ReactNode][] }) {
  return (
    <dl className="divide-y divide-[var(--cd-line)] rounded-[8px] border border-[var(--cd-line)] bg-[#fbfbfd]">
      {rows.map(([k, v]) => (
        <div key={k} className="grid grid-cols-[132px_minmax(0,1fr)] gap-3 px-4 py-3 text-[15px]">
          <dt className="text-[var(--cd-fg-3)]">{k}</dt>
          <dd className="min-w-0 break-words text-[var(--cd-ink)]">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div className="mb-2 text-[13px] font-medium uppercase tracking-[0.06em] text-[var(--cd-fg-3)]">{children}</div>;
}

export function Skel({ className, style }: { className?: string; style?: React.CSSProperties }) {
  // A span (display: block) so it's valid anywhere, headings and paragraphs included.
  return <span aria-hidden className={cn("block cd-skel rounded-[4px]", className)} style={style} />;
}

export function Empty({
  title,
  body,
  action,
  className,
}: {
  title: string;
  body?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center px-6 py-14 text-center", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element -- next/image's optimizer (sharp) fails on this PNG */}
      <img src="/logo.png" alt="" width={28} height={28} className="rounded-md opacity-90" />
      <p className="mt-4 text-[17.5px] font-semibold tracking-[-0.015em]">{title}</p>
      {body && <p className="mt-1 max-w-[42ch] text-[15.5px] text-[var(--cd-fg-2)]">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Progress({
  segments,
  className,
}: {
  segments: { value: number; color: string; label?: string }[];
  className?: string;
}) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  return (
    <div className={cn("flex h-1.5 w-full gap-[2px] overflow-hidden rounded-full bg-[#eef0f6]", className)}>
      {segments
        .filter((s) => s.value > 0)
        .map((s, i) => (
          <div
            key={i}
            title={s.label}
            className="h-full first:rounded-l-full last:rounded-r-full"
            style={{ width: `${(s.value / total) * 100}%`, background: s.color }}
          />
        ))}
    </div>
  );
}

export function ErrorText({ error }: { error: unknown }) {
  if (!error) return null;
  const msg = error instanceof Error ? error.message : "Something went wrong. Try again.";
  return <p className="text-[14px] text-[var(--cd-red)]">{msg}</p>;
}

export const PLAN_LIMITS: Record<string, { events: number | null; agents: number | null; questionnaires: number | null }> = {
  free: { events: 2_500, agents: 1, questionnaires: 1 },
  starter: { events: 50_000, agents: 10, questionnaires: 10 },
  pro: { events: 250_000, agents: 50, questionnaires: null },
  enterprise: { events: null, agents: null, questionnaires: null },
};

export const PLAN_INFO: Record<string, { name: string; price: string }> = {
  free: { name: "Free", price: "$0" },
  starter: { name: "Starter", price: "$49/mo" },
  pro: { name: "Pro", price: "$99/mo" },
  enterprise: { name: "Enterprise", price: "Custom" },
};
