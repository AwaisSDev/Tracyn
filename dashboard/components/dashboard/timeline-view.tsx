"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, ChevronUp, Download, Link2, Search, ShieldCheck } from "lucide-react";
import { downloadFile } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/lib/workspace-context";
import type { AuditEvent } from "@/lib/types";
import { useAgents, useEvents } from "./data";
import {
  Button,
  Card,
  Empty,
  KeyValue,
  Page,
  PageHeader,
  SectionLabel,
  Segmented,
  SidePanel,
  Skel,
  Status,
  formatValue,
  fullDate,
  humanKey,
  money,
  timeAgo,
} from "./ui";

type Range = "24h" | "7d" | "30d" | "all";
type StatusFilter = "all" | "completed" | "approved" | "rejected" | "error";

const RANGE_MS: Record<Range, number> = { "24h": 864e5, "7d": 7 * 864e5, "30d": 30 * 864e5, all: Infinity };

export function TimelineView() {
  const { workspace } = useWorkspace();
  const router = useRouter();
  const params = useSearchParams();
  const { data: events = [], isLoading } = useEvents();
  const { agents, agentName } = useAgents();

  const [query, setQuery] = useState("");
  const [agent, setAgent] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [range, setRange] = useState<Range>("30d");
  const selectedId = params.get("event");

  const filtered = useMemo(() => {
    const now = Date.now();
    const q = query.trim().toLowerCase();
    return events.filter(
      (e) =>
        (!agent || e.agent_id === agent) &&
        (status === "all" || e.status === status) &&
        now - new Date(e.created_at).getTime() <= RANGE_MS[range] &&
        (!q || e.action_name.toLowerCase().includes(q) || e.action_type.toLowerCase().includes(q))
    );
  }, [events, agent, status, range, query]);

  // Each event stores the hash of the one before it. For every loaded event
  // whose predecessor is also loaded, check the link actually matches.
  const chain = useMemo(() => {
    const byHash = new Map(events.map((e) => [e.row_hash, e]));
    const result = new Map<string, "linked" | "unknown">();
    for (const e of events) result.set(e.id, byHash.has(e.prev_hash) ? "linked" : "unknown");
    return result;
  }, [events]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: events.length };
    for (const e of events) c[e.status] = (c[e.status] ?? 0) + 1;
    return c;
  }, [events]);

  const select = useCallback(
    (id: string | null) => {
      const next = new URLSearchParams(params.toString());
      if (id) next.set("event", id);
      else next.delete("event");
      const qs = next.toString();
      router.replace(`/timeline${qs ? `?${qs}` : ""}`, { scroll: false });
    },
    [params, router]
  );

  const selected = events.find((e) => e.id === selectedId) ?? null;
  const list = selected && filtered.some((e) => e.id === selected.id) ? filtered : events;
  const index = selected ? list.findIndex((e) => e.id === selected.id) : -1;

  useEffect(() => {
    if (!selected) return;
    function onKey(e: KeyboardEvent) {
      if ((e.target as HTMLElement).closest("input, textarea, select")) return;
      if (e.key === "ArrowDown" || e.key === "j") {
        e.preventDefault();
        if (index < list.length - 1) select(list[index + 1].id);
      }
      if (e.key === "ArrowUp" || e.key === "k") {
        e.preventDefault();
        if (index > 0) select(list[index - 1].id);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected, index, list, select]);

  const exportParams = new URLSearchParams();
  if (agent) exportParams.set("agent_id", agent);
  if (status !== "all") exportParams.set("status", status);

  return (
    <Page wide>
      <PageHeader
        title="Timeline"
        subtitle="Every action your agents take, in order. Each entry is chained to the one before it, so nothing can be edited or removed quietly."
        actions={
          <Button
            disabled={!workspace}
            onClick={() => downloadFile(`/v1/workspaces/${workspace!.id}/events/export.csv?${exportParams.toString()}`, "tracyn-events.csv")}
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        }
      />

      <div className="mt-7 flex flex-col gap-2.5 lg:flex-row lg:items-center">
        <div className="relative lg:w-[260px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--cd-fg-3)]" />
          <input
            id="cd-timeline-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search actions"
            className="cd-input !pl-9"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative">
            <select
              id="cd-timeline-agent"
              value={agent}
              onChange={(e) => setAgent(e.target.value)}
              aria-label="Agent"
              className="cd-btn-secondary h-9 cursor-pointer appearance-none rounded-[6px] pl-3 pr-8 text-[15px] font-medium text-[var(--cd-ink)] outline-none"
            >
              <option value="">All agents</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--cd-fg-3)]" />
          </div>
          <Segmented
            label="Status"
            value={status}
            onChange={setStatus}
            options={[
              { value: "all", label: "All", count: counts.all },
              { value: "completed", label: "Completed", count: counts.completed ?? 0 },
              { value: "approved", label: "Approved", count: counts.approved ?? 0 },
              { value: "rejected", label: "Rejected", count: counts.rejected ?? 0 },
              { value: "error", label: "Error", count: counts.error ?? 0 },
            ]}
          />
        </div>
        <div className="lg:ml-auto">
          <Segmented
            label="Time range"
            value={range}
            onChange={setRange}
            options={[
              { value: "24h", label: "24h" },
              { value: "7d", label: "7d" },
              { value: "30d", label: "30d" },
              { value: "all", label: "All" },
            ]}
          />
        </div>
      </div>

      <Card className="mt-4 overflow-hidden">
        {/* Phones get a stacked list instead of a table. */}
        <ul className="divide-y divide-[var(--cd-line)] sm:hidden">
          {isLoading &&
            Array.from({ length: 6 }).map((_, i) => (
              <li key={i} className="px-4 py-4">
                <Skel className="h-11 w-full" />
              </li>
            ))}
          {filtered.map((e) => (
            <li key={e.id}>
              <button
                type="button"
                onClick={() => select(e.id)}
                className={cn("flex w-full items-center gap-3 px-4 py-4 text-left", e.id === selectedId ? "bg-[var(--cd-blue-soft)]/60" : "active:bg-[#f8f9fc]")}
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[16px] font-medium text-[var(--cd-ink)]">{e.action_name}</div>
                  <div className="mt-1 flex items-center gap-2 text-[14px] text-[var(--cd-fg-3)]">
                    <span className="truncate">{agentName(e.agent_id)}</span>
                    <span>·</span>
                    <span className="shrink-0">{timeAgo(e.created_at)}</span>
                  </div>
                </div>
                <Status status={e.status} />
              </button>
            </li>
          ))}
        </ul>
        <div className="hidden overflow-x-auto sm:block">
          <table className="w-full min-w-[480px] border-collapse text-[15px]">
            <thead>
              <tr className="border-b border-[var(--cd-line)] text-left">
                <Th className="pl-5">Action</Th>
                <Th className="hidden md:table-cell">Type</Th>
                <Th>Status</Th>
                <Th className="hidden text-right lg:table-cell">Latency</Th>
                <Th className="hidden text-right lg:table-cell">Cost</Th>
                <Th className="pr-5 text-right">When</Th>
              </tr>
            </thead>
            <tbody>
              {isLoading &&
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-[var(--cd-line)] last:border-0">
                    <td className="py-3 pl-5 pr-3" colSpan={6}>
                      <Skel className="h-5 w-full" />
                    </td>
                  </tr>
                ))}
              {filtered.map((e) => (
                <tr
                  key={e.id}
                  onClick={() => select(e.id)}
                  className={cn(
                    "cursor-pointer border-b border-[var(--cd-line)] transition-colors last:border-0",
                    e.id === selectedId ? "bg-[var(--cd-blue-soft)]/60" : "hover:bg-[#f8f9fc]"
                  )}
                >
                  <td className="py-3.5 pl-6 pr-3">
                    <div className="text-[14px] font-medium text-[var(--cd-ink)]">{e.action_name}</div>
                    <div className="mt-0.5 text-[13.5px] text-[var(--cd-fg-3)]">{agentName(e.agent_id)}</div>
                  </td>
                  <td className="hidden px-3 py-3.5 text-[var(--cd-fg-2)] md:table-cell">{humanKey(e.action_type)}</td>
                  <td className="px-3 py-3.5">
                    <Status status={e.status} />
                  </td>
                  <td className="hidden px-3 py-3.5 text-right tabular-nums text-[var(--cd-fg-2)] lg:table-cell">
                    {e.latency_ms != null ? `${e.latency_ms.toLocaleString()} ms` : "-"}
                  </td>
                  <td className="hidden px-3 py-3.5 text-right tabular-nums text-[var(--cd-fg-2)] lg:table-cell">
                    {e.cost_usd != null ? money(e.cost_usd, 4) : "-"}
                  </td>
                  <td className="whitespace-nowrap py-3.5 pl-3 pr-6 text-right text-[var(--cd-fg-2)]" title={fullDate(e.created_at)}>
                    {timeAgo(e.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!isLoading && filtered.length === 0 && (
          <div className="p-4">
            <Empty
              title={events.length ? "Nothing matches these filters" : "No events yet"}
              body={events.length ? "Try a wider time range or clear the search." : "Install the SDK and run an agent. Its actions show up here."}
            />
          </div>
        )}
      </Card>
      {!isLoading && filtered.length > 0 && (
        <p className="mt-3 text-[13.5px] text-[var(--cd-fg-3)]">
          Showing {filtered.length} of {events.length} most recent events
        </p>
      )}

      <SidePanel
        open={!!selected}
        onClose={() => select(null)}
        title={selected ? <span className="text-[15.5px]">{selected.action_name}</span> : null}
        toolbar={
          selected && (
            <div className="flex items-center gap-1 text-[13.5px] text-[var(--cd-fg-3)]">
              <span className="mr-1 tabular-nums">
                {index + 1} of {list.length}
              </span>
              <IconBtn label="Previous event" disabled={index <= 0} onClick={() => select(list[index - 1].id)}>
                <ChevronUp className="h-4 w-4" />
              </IconBtn>
              <IconBtn label="Next event" disabled={index >= list.length - 1} onClick={() => select(list[index + 1].id)}>
                <ChevronDown className="h-4 w-4" />
              </IconBtn>
            </div>
          )
        }
      >
        {selected && <EventDetail event={selected} agent={agentName(selected.agent_id)} linked={chain.get(selected.id) === "linked"} />}
      </SidePanel>
    </Page>
  );
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return <th className={cn("h-11 px-3 text-[13.5px] font-medium text-[var(--cd-fg-3)]", className)}>{children}</th>;
}

function IconBtn({ label, disabled, onClick, children }: { label: string; disabled?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="rounded-[5px] p-1 text-[var(--cd-fg-2)] hover:bg-[var(--cd-hover)] disabled:opacity-35 disabled:hover:bg-transparent"
    >
      {children}
    </button>
  );
}

function EventDetail({ event, agent, linked }: { event: AuditEvent; agent: string; linked: boolean }) {
  const inputs = Object.entries(event.inputs_redacted ?? {});
  const output = event.output_redacted;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Status status={event.status} className="text-[15.5px] text-[var(--cd-ink)]" />
        <span className="text-[14px] text-[var(--cd-fg-3)]">{fullDate(event.created_at)}</span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Metric label="Latency" value={event.latency_ms != null ? `${event.latency_ms.toLocaleString()} ms` : "-"} />
        <Metric label="Cost" value={event.cost_usd != null ? money(event.cost_usd, 4) : "-"} />
        <Metric label="Model" value={event.model ?? "-"} small />
      </div>

      <div>
        <SectionLabel>Details</SectionLabel>
        <KeyValue
          rows={[
            ["Agent", agent],
            ["Type", humanKey(event.action_type)],
            ["Event ID", <span key="id" className="cd-mono text-[13.5px]">{event.id}</span>],
          ]}
        />
      </div>

      {inputs.length > 0 && (
        <div>
          <SectionLabel>Inputs</SectionLabel>
          <KeyValue rows={inputs.map(([k, v]) => [humanKey(k), formatValue(v)])} />
        </div>
      )}

      {output != null && (
        <div>
          <SectionLabel>Output</SectionLabel>
          <pre className="cd-mono max-h-56 overflow-auto whitespace-pre-wrap break-words rounded-[8px] border border-[var(--cd-line)] bg-[#fafbfd] p-3.5 text-[13.5px] leading-[1.6] text-[var(--cd-ink)]">
            {typeof output === "string" ? output : JSON.stringify(output, null, 2)}
          </pre>
        </div>
      )}

      <div>
        <SectionLabel>Integrity</SectionLabel>
        <div className="rounded-[8px] border border-[var(--cd-line)] p-3.5">
          <div className="flex items-center gap-2 text-[15px] font-medium">
            {linked ? (
              <>
                <ShieldCheck className="h-4 w-4 text-[var(--cd-green)]" />
                Chained to the previous event
              </>
            ) : (
              <>
                <Link2 className="h-4 w-4 text-[var(--cd-fg-3)]" />
                <span className="text-[var(--cd-fg-2)]">Previous event is older than this page</span>
              </>
            )}
          </div>
          <div className="mt-3 space-y-2 text-[13px]">
            <HashRow label="This entry" hash={event.row_hash} />
            <HashRow label="Previous" hash={event.prev_hash} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, small }: { label: string; value: string; small?: boolean }) {
  return (
    <div className="rounded-[8px] border border-[var(--cd-line)] px-3 py-2.5">
      <div className="text-[13px] text-[var(--cd-fg-3)]">{label}</div>
      <div className={cn("mt-1 truncate font-semibold tabular-nums tracking-[-0.01em]", small ? "text-[14px]" : "text-[16.5px]")} title={value}>
        {value}
      </div>
    </div>
  );
}

function HashRow({ label, hash }: { label: string; hash: string }) {
  return (
    <div className="grid grid-cols-[76px_minmax(0,1fr)] items-baseline gap-2">
      <span className="text-[var(--cd-fg-3)]">{label}</span>
      <span className="cd-mono truncate text-[var(--cd-fg-2)]" title={hash}>
        {hash}
      </span>
    </div>
  );
}
