"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useQueries } from "@tanstack/react-query";
import { ArrowRight, ChevronRight } from "lucide-react";
import { api } from "@/lib/api";
import { useWorkspace } from "@/lib/workspace-context";
import type { Answer } from "@/lib/types";
import { hasLiveEvidence, startOfMonth, useAgents, useApprovals, useEvents, useQuestionnaires, useSoc2 } from "./data";
import {
  Card,
  CardTitle,
  Dot,
  Empty,
  Page,
  PLAN_LIMITS,
  Progress,
  Skel,
  Status,
  btnClass,
  formatValue,
  money,
  timeAgo,
} from "./ui";

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

export function HomeView() {
  const { workspace } = useWorkspace();
  const { data: events = [], isLoading: eventsLoading } = useEvents();
  const { data: pending = [], isLoading: pendingLoading } = useApprovals("pending");
  const { agentName, agents, isLoading: agentsLoading } = useAgents();
  const { data: questionnaires = [], isLoading: packsLoading } = useQuestionnaires();
  const { data: controls = [] } = useSoc2();

  const ready = questionnaires.filter((q) => q.status === "ready");
  const answerQueries = useQueries({
    queries: ready.map((q) => ({
      queryKey: ["answers", q.id],
      queryFn: () => api.get<Answer[]>(`/v1/workspaces/${workspace!.id}/questionnaires/${q.id}/answers`),
      enabled: !!workspace,
    })),
  });

  const month = useMemo(() => {
    const since = startOfMonth();
    const list = events.filter((e) => new Date(e.created_at).getTime() >= since);
    const spend = list.reduce((s, e) => s + (e.cost_usd ?? 0), 0);
    return { count: list.length, spend, list };
  }, [events]);

  const byAgent = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of month.list) m.set(agentName(e.agent_id), (m.get(agentName(e.agent_id)) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [month.list, agentName]);

  const outcomes = useMemo(() => {
    const c = { completed: 0, approved: 0, rejected: 0, error: 0, denied_timeout: 0 };
    for (const e of month.list) c[e.status] = (c[e.status] ?? 0) + 1;
    return c;
  }, [month.list]);

  const live = controls.filter(hasLiveEvidence).length;
  const limits = PLAN_LIMITS[workspace?.plan ?? "free"];
  const eventLimit = limits.events;

  const oldest = pending.length ? pending.reduce((a, b) => (a.requested_at < b.requested_at ? a : b)) : null;

  return (
    <div>
      <div>
        <Page className="pb-0 sm:pb-0">
          <div className="text-[14px] text-[var(--cd-fg-3)]">
            {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
          </div>
          <div className="mt-2 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-[34px] font-semibold leading-[1.1] tracking-[-0.035em] sm:text-[42px]">{greeting()}</h1>
              <p className="mt-2 text-[16.5px] text-[var(--cd-fg-2)]">
                {pendingLoading ? (
                  <span className="inline-block h-4 w-56 align-middle">
                    <Skel className="h-4 w-56" />
                  </span>
                ) : pending.length > 0 ? (
                  <span className="text-[var(--cd-ink)]">
                    {pending.length} {pending.length === 1 ? "action is" : "actions are"} waiting for approval in {workspace?.name}.
                  </span>
                ) : (
                  <>Nothing is waiting on you in {workspace?.name}. Your agents are running on policy.</>
                )}
              </p>
            </div>
            {pending.length > 0 && (
              <Link href={"/approvals"} className={btnClass("primary")}>
                Review approvals
                <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </div>

          <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat
              label="Events this month"
              loading={eventsLoading}
              value={month.count.toLocaleString()}
              foot={
                eventLimit ? (
                  <>
                    <Progress segments={[{ value: month.count, color: "var(--cd-blue)" }, { value: Math.max(eventLimit - month.count, 0), color: "transparent" }]} />
                    <span className="mt-2 block">of {eventLimit.toLocaleString()} on your plan</span>
                  </>
                ) : (
                  "Unlimited on your plan"
                )
              }
            />
            <Stat
              label="Waiting for approval"
              loading={pendingLoading}
              value={String(pending.length)}
              tone={pending.length ? "amber" : undefined}
              foot={oldest ? `Oldest asked ${timeAgo(oldest.requested_at)}` : "All clear"}
            />
            <Stat
              label="Model spend this month"
              loading={eventsLoading}
              value={money(month.spend)}
              foot={agentsLoading ? <Skel className="h-3 w-28" /> : `${agents.length} ${agents.length === 1 ? "agent" : "agents"} reporting`}
            />
            <Stat
              label="SOC 2 controls with live evidence"
              loading={!controls.length}
              value={`${live}/${controls.length}`}
              foot={
                controls.length ? (
                  <>
                    <Progress segments={[{ value: live, color: "var(--cd-green)" }, { value: controls.length - live, color: "transparent" }]} />
                    <span className="mt-2 block">{Math.round((live / controls.length) * 100)}% covered by Tracyn data</span>
                  </>
                ) : (
                  <Skel className="h-3 w-32" />
                )
              }
            />
          </div>
        </Page>
      </div>

      <Page className="pt-4 sm:pt-4">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
          <Card>
            <CardTitle
              action={
                <Link href={"/approvals"} className="text-[14px] font-medium text-[var(--cd-blue)] hover:text-[var(--cd-blue-ink)]">
                  Open inbox
                </Link>
              }
            >
              Needs your review
            </CardTitle>
            <div className="px-2 pb-2 pt-1">
              {pendingLoading && <RowSkeletons n={3} />}
              {!pendingLoading && pending.length === 0 && (
                <p className="px-3 py-8 text-center text-[15.5px] text-[var(--cd-fg-3)]">No pending approvals.</p>
              )}
              {pending.slice(0, 4).map((a) => {
                const preview = Object.entries(a.requested_action.inputs_preview).slice(0, 2);
                return (
                  <Link
                    key={a.id}
                    href={`/approvals?id=${a.id}`}
                    className="group flex items-center gap-3 rounded-[7px] px-3 py-2.5 transition-colors hover:bg-[var(--cd-hover)]"
                  >
                    <Dot tone="amber" pulse />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2">
                        <span className="truncate text-[15px] font-medium text-[var(--cd-ink)]">{a.requested_action.action_name}</span>
                        <span className="shrink-0 text-[13.5px] text-[var(--cd-fg-3)]">{a.requested_action.agent_name}</span>
                      </div>
                      <div className="truncate text-[14px] text-[var(--cd-fg-2)]">
                        {preview.map(([k, v]) => `${k.replace(/_/g, " ")} ${formatValue(v)}`).join(" · ")}
                      </div>
                    </div>
                    <span className="hidden shrink-0 text-[13.5px] text-[var(--cd-fg-3)] sm:block">{timeAgo(a.requested_at)}</span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-[var(--cd-fg-3)] opacity-0 transition-opacity group-hover:opacity-100" />
                  </Link>
                );
              })}
            </div>
          </Card>

          <Card>
            <CardTitle
              action={
                <Link href={"/questionnaires"} className="text-[14px] font-medium text-[var(--cd-blue)] hover:text-[var(--cd-blue-ink)]">
                  All packs
                </Link>
              }
            >
              Evidence packs
            </CardTitle>
            <div className="space-y-1 px-2 pb-2 pt-1">
              {packsLoading && <RowSkeletons n={2} />}
              {!packsLoading && questionnaires.length === 0 && (
                <p className="px-3 py-8 text-center text-[15.5px] text-[var(--cd-fg-3)]">No questionnaires yet.</p>
              )}
              {questionnaires.slice(0, 3).map((q) => {
                const idx = ready.findIndex((r) => r.id === q.id);
                const answers = idx >= 0 ? answerQueries[idx]?.data ?? [] : [];
                const approved = answers.filter((a) => a.status === "approved").length;
                const reviewed = answers.filter((a) => a.status === "reviewed").length;
                return (
                  <Link
                    key={q.id}
                    href={q.status === "ready" ? `/questionnaires/${q.id}` : "/questionnaires"}
                    className="block rounded-[7px] px-3 py-3 transition-colors hover:bg-[var(--cd-hover)]"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="truncate text-[15.5px] font-medium">{q.filename}</span>
                      {q.status === "ready" ? (
                        <span className="shrink-0 text-[13.5px] tabular-nums text-[var(--cd-fg-3)]">
                          {approved}/{answers.length} approved
                        </span>
                      ) : (
                        <Status status={q.status} />
                      )}
                    </div>
                    {q.status === "ready" && (
                      <Progress
                        className="mt-2.5"
                        segments={[
                          { value: approved, color: "var(--cd-green)", label: `${approved} approved` },
                          { value: reviewed, color: "var(--cd-blue)", label: `${reviewed} reviewed` },
                          { value: answers.length - approved - reviewed, color: "#dfe3ee", label: "drafts" },
                        ]}
                      />
                    )}
                  </Link>
                );
              })}
            </div>
          </Card>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
          <Card>
            <CardTitle>This month by agent</CardTitle>
            <div className="space-y-3 px-5 pb-5 pt-3">
              {eventsLoading && <RowSkeletons n={4} />}
              {!eventsLoading && byAgent.length === 0 && <p className="py-6 text-center text-[15.5px] text-[var(--cd-fg-3)]">No activity yet.</p>}
              {byAgent.map(([name, n]) => (
                <div key={name}>
                  <div className="flex items-baseline justify-between text-[15px]">
                    <span className="font-medium">{name}</span>
                    <span className="tabular-nums text-[var(--cd-fg-3)]">{n}</span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#eef0f6]">
                    <div className="h-full rounded-full bg-[var(--cd-blue)]" style={{ width: `${(n / byAgent[0][1]) * 100}%`, opacity: 0.35 + 0.65 * (n / byAgent[0][1]) }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-[var(--cd-line)] px-5 py-4">
              <div className="mb-2.5 text-[13.5px] text-[var(--cd-fg-3)]">Outcomes</div>
              <Progress
                className="h-2"
                segments={[
                  { value: outcomes.completed, color: "var(--cd-green)", label: "Completed" },
                  { value: outcomes.approved, color: "#7fd1a8", label: "Approved" },
                  { value: outcomes.rejected, color: "var(--cd-red)", label: "Rejected" },
                  { value: outcomes.error, color: "#f0a0a0", label: "Error" },
                ]}
              />
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[13.5px] text-[var(--cd-fg-2)]">
                <Legend color="var(--cd-green)" label="Completed" n={outcomes.completed} />
                <Legend color="#7fd1a8" label="Approved" n={outcomes.approved} />
                <Legend color="var(--cd-red)" label="Rejected" n={outcomes.rejected} />
                <Legend color="#f0a0a0" label="Error" n={outcomes.error} />
              </div>
            </div>
          </Card>

          <Card>
            <CardTitle
              action={
                <Link href={"/timeline"} className="text-[14px] font-medium text-[var(--cd-blue)] hover:text-[var(--cd-blue-ink)]">
                  Open timeline
                </Link>
              }
            >
              Latest activity
            </CardTitle>
            <div className="px-2 pb-2 pt-1">
              {eventsLoading && <RowSkeletons n={6} />}
              {!eventsLoading && events.length === 0 && (
                <Empty className="m-3" title="No events yet" body="Install the SDK and run an agent. Its actions show up here." />
              )}
              {events.slice(0, 7).map((e) => (
                <Link
                  key={e.id}
                  href={`/timeline?event=${e.id}`}
                  className="flex items-center gap-3 rounded-[7px] px-3 py-2 transition-colors hover:bg-[var(--cd-hover)]"
                >
                  <Status status={e.status} className="w-[104px] shrink-0" />
                  <span className="min-w-0 flex-1 truncate text-[14px] text-[var(--cd-ink)]">{e.action_name}</span>
                  <span className="hidden w-[120px] shrink-0 truncate text-[13.5px] text-[var(--cd-fg-3)] sm:block">{agentName(e.agent_id)}</span>
                  <span className="w-[64px] shrink-0 text-right text-[13.5px] text-[var(--cd-fg-3)]">{timeAgo(e.created_at)}</span>
                </Link>
              ))}
            </div>
          </Card>
        </div>
      </Page>
    </div>
  );
}

function Stat({
  label,
  value,
  foot,
  loading,
  tone,
}: {
  label: string;
  value: string;
  foot?: React.ReactNode;
  loading?: boolean;
  tone?: "amber";
}) {
  return (
    <div className="cd-card rounded-[10px] p-4 sm:p-5">
      <div className="flex items-center gap-2 text-[13.5px] text-[var(--cd-fg-2)]">
        {tone && <Dot tone={tone} pulse />}
        <span className="truncate">{label}</span>
      </div>
      {loading ? (
        <Skel className="mt-3 h-8 w-20" />
      ) : (
        <div className="mt-2 text-[30px] font-semibold tabular-nums leading-none tracking-[-0.03em] sm:text-[34px]">{value}</div>
      )}
      {foot && <div className="mt-3 text-[13.5px] text-[var(--cd-fg-3)]">{foot}</div>}
    </div>
  );
}

function Legend({ color, label, n }: { color: string; label: string; n: number }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="h-2 w-2 rounded-[3px]" style={{ background: color }} />
      {label} <span className="tabular-nums text-[var(--cd-fg-3)]">{n}</span>
    </span>
  );
}

export function RowSkeletons({ n }: { n: number }) {
  return (
    <div className="space-y-2 px-3 py-2">
      {Array.from({ length: n }).map((_, i) => (
        <Skel key={i} className="h-7 w-full" />
      ))}
    </div>
  );
}
