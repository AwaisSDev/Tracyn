"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronRight, Clock, MessageSquare, X } from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/lib/workspace-context";
import type { Approval } from "@/lib/types";
import { useApprovals } from "./data";
import {
  Button,
  Card,
  Dot,
  Empty,
  ErrorText,
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
  statusTone,
  timeAgo,
  useExiting,
} from "./ui";

type Tab = "pending" | "approved" | "rejected" | "denied_timeout";

export function ApprovalsView() {
  const router = useRouter();
  const params = useSearchParams();
  const [tab, setTab] = useState<Tab>("pending");

  const pending = useApprovals("pending");
  const approved = useApprovals("approved");
  const rejected = useApprovals("rejected");
  const expired = useApprovals("denied_timeout");
  const byTab = { pending, approved, rejected, denied_timeout: expired };
  const current = byTab[tab];
  const items = current.data ?? [];

  const selectedId = params.get("id");
  const all = [...(pending.data ?? []), ...(approved.data ?? []), ...(rejected.data ?? []), ...(expired.data ?? [])];
  const selected = all.find((a) => a.id === selectedId) ?? null;

  // Opening a link to a specific approval lands on its tab.
  useEffect(() => {
    if (selected && selected.status !== tab) setTab(selected.status);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when the selection changes
  }, [selected?.id]);

  const shown = selected && selected.status === tab ? selected : null;
  // The desktop detail keeps its last request on screen while it slides out.
  const { current: panel, exiting } = useExiting(shown);

  function select(id: string | null) {
    router.replace(id ? `/approvals?id=${id}` : "/approvals", { scroll: false });
  }

  useEffect(() => {
    if (!shown) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !(e.target as HTMLElement).closest("input, textarea")) select(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- select is stable enough for this listener
  }, [shown?.id]);

  return (
    <Page wide>
      <PageHeader
        title="Approvals"
        subtitle="Risky actions stop here until someone on your team decides. Your policy decides what counts as risky."
      />

      <div className="mt-8">
        <Segmented
          label="Approval status"
          value={tab}
          onChange={(t) => {
            setTab(t);
            select(null);
          }}
          options={[
            { value: "pending", label: "Pending", count: pending.data?.length },
            { value: "approved", label: "Approved", count: approved.data?.length },
            { value: "rejected", label: "Rejected", count: rejected.data?.length },
            { value: "denied_timeout", label: "Expired", count: expired.data?.length },
          ]}
        />
      </div>

      {/* The list is full width until a request is opened; then it slides
          over and the detail comes in on the right (a sheet on small
          screens). */}
      <div
        className={cn(
          "mt-4 grid items-start transition-[grid-template-columns,column-gap] duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] motion-reduce:transition-none",
          shown ? "lg:grid-cols-[minmax(0,1fr)_480px] lg:gap-x-5" : "lg:grid-cols-[minmax(0,1fr)_0px] lg:gap-x-0"
        )}
      >
        <Card className="overflow-hidden">
          {current.isLoading && (
            <div className="space-y-2 p-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skel key={i} className="h-[76px] w-full" />
              ))}
            </div>
          )}
          {!current.isLoading && items.length === 0 && (
            <div className="p-4">
              <Empty
                title={tab === "pending" ? "You're all caught up" : "Nothing here yet"}
                body={tab === "pending" ? "New approval requests from your agents land here, and in Slack if you've connected it." : undefined}
              />
            </div>
          )}
          <ul className="divide-y divide-[var(--cd-line)]">
            {items.map((a) => (
              <li key={a.id}>
                <ApprovalRow approval={a} active={shown?.id === a.id} compact={!!shown} onClick={() => select(shown?.id === a.id ? null : a.id)} />
              </li>
            ))}
          </ul>
        </Card>

        <div className="sticky top-6 hidden min-w-0 overflow-hidden lg:block">
          {panel && (
            <Card key={panel.id} className={cn(exiting ? "cd-panel-out" : "cd-panel-in", "w-[480px] overflow-hidden")}>
              <div className="flex items-center gap-3 border-b border-[var(--cd-line)] px-6 py-4">
                <div className="min-w-0 flex-1">
                  <DetailTitle approval={panel} />
                </div>
                <button
                  type="button"
                  onClick={() => select(null)}
                  aria-label="Close"
                  className="-mr-2 rounded-[6px] p-2 text-[var(--cd-fg-3)] hover:bg-[var(--cd-hover)] hover:text-[var(--cd-ink)]"
                >
                  <X className="h-[18px] w-[18px]" />
                </button>
              </div>
              <div className="px-6 py-6">
                <ApprovalDetail approval={panel} />
              </div>
            </Card>
          )}
        </div>
      </div>

      <div className="lg:hidden">
        <SidePanel open={!!shown} onClose={() => select(null)} title={shown ? <DetailTitle approval={shown} /> : null}>
          {shown && <ApprovalDetail approval={shown} key={shown.id} />}
        </SidePanel>
      </div>
    </Page>
  );
}

function summary(a: Approval) {
  return Object.entries(a.requested_action.inputs_preview)
    .slice(0, 3)
    .map(([k, v]) => `${k.replace(/_/g, " ")} ${formatValue(v)}`)
    .join(" · ");
}

function ApprovalRow({
  approval: a,
  active,
  compact,
  onClick,
}: {
  approval: Approval;
  active: boolean;
  compact: boolean;
  onClick: () => void;
}) {
  const pending = a.status === "pending";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={active}
      className={cn(
        "group relative flex w-full items-center gap-3 px-4 py-4 text-left transition-colors sm:gap-4 sm:px-6 sm:py-5",
        active ? "bg-[#f3f5fc]" : "hover:bg-[#f9fafc]"
      )}
    >
      {active && <span className="absolute inset-y-3 left-0 w-[3px] rounded-r-full bg-[var(--cd-blue)]" />}
      <span className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f1f3f8] sm:flex">
        <Dot tone={statusTone(a.status)} pulse={pending} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <span className="text-[16.5px] font-semibold tracking-[-0.015em] text-[var(--cd-ink)]">{a.requested_action.action_name}</span>
          <span className="text-[15px] text-[var(--cd-fg-3)]">from {a.requested_action.agent_name}</span>
        </div>
        <div className="mt-1 truncate text-[15px] text-[var(--cd-fg-2)]">{summary(a)}</div>
      </div>
      {!compact && (
        <div className="hidden w-[140px] shrink-0 text-[14.5px] text-[var(--cd-fg-2)] xl:block">
          {pending ? (
            <>
              <div className="text-[13px] text-[var(--cd-fg-3)]">Expires</div>
              {timeAgo(a.expires_at)}
            </>
          ) : a.decision_by ? (
            <>
              <div className="text-[13px] text-[var(--cd-fg-3)]">Decided by</div>
              <div className="truncate">{a.decision_by.split("@")[0]}</div>
            </>
          ) : null}
        </div>
      )}
      <div className="flex shrink-0 flex-col items-end gap-2">
        <span className="text-[14px] text-[var(--cd-fg-3)]">{timeAgo(a.requested_at)}</span>
        {pending ? (
          <span className="rounded-full bg-[#fff1d6] px-2.5 py-[2px] text-[13px] font-medium text-[#8f5400]">Needs review</span>
        ) : (
          <Status status={a.status} />
        )}
      </div>
      <ChevronRight
        className={cn(
          "hidden h-5 w-5 shrink-0 text-[var(--cd-fg-3)] transition-transform duration-200 sm:block",
          active ? "rotate-180 text-[var(--cd-blue)]" : "group-hover:translate-x-0.5"
        )}
      />
    </button>
  );
}

function DetailTitle({ approval: a }: { approval: Approval }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="truncate text-[17px] font-semibold tracking-[-0.015em]">{a.requested_action.action_name}</span>
      <Status status={a.status} />
    </div>
  );
}

function ApprovalDetail({ approval: a }: { approval: Approval }) {
  const { workspace } = useWorkspace();
  const queryClient = useQueryClient();
  const [note, setNote] = useState("");

  const decide = useMutation({
    mutationFn: (decision: "approved" | "rejected") =>
      api.post(`/v1/workspaces/${workspace!.id}/approvals/${a.id}/decide`, { decision, decision_note: note || undefined }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["approvals", workspace?.id] }),
  });

  const pending = a.status === "pending";
  const inputs = Object.entries(a.requested_action.inputs_preview);

  return (
    <div className="space-y-6">
      <p className="text-[16px] leading-[1.55] text-[var(--cd-fg-2)]">
        <span className="font-medium text-[var(--cd-ink)]">{a.requested_action.agent_name}</span> asked to run{" "}
        <span className="text-[15px] text-[var(--cd-ink)]">{a.requested_action.action_name}</span>{" "}
        {timeAgo(a.requested_at)}.
      </p>

      {inputs.length > 0 && (
        <div>
          <SectionLabel>What it wants to do</SectionLabel>
          <KeyValue rows={inputs.map(([k, v]) => [humanKey(k), <span key={k} className="font-medium">{formatValue(v)}</span>])} />
        </div>
      )}

      <div>
        <SectionLabel>Request</SectionLabel>
        <KeyValue
          rows={[
            ["Type", humanKey(a.requested_action.action_type)],
            ["Requested", fullDate(a.requested_at)],
            pending
              ? ["Expires", <span key="exp" className="inline-flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-[var(--cd-fg-3)]" />{timeAgo(a.expires_at)}</span>]
              : ["Decided", a.decided_at ? fullDate(a.decided_at) : "-"],
            ...(!pending && a.decision_by ? ([["Decided by", a.decision_by]] as [string, string][]) : []),
          ]}
        />
      </div>

      {a.decision_note && (
        <div>
          <SectionLabel>Note</SectionLabel>
          <div className="flex gap-2.5 rounded-[8px] border border-[var(--cd-line)] bg-[#fafbfd] p-3.5 text-[15.5px] leading-[1.55]">
            <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-[var(--cd-fg-3)]" />
            {a.decision_note}
          </div>
        </div>
      )}

      {pending && (
        <div className="space-y-3 border-t border-[var(--cd-line)] pt-5">
          <label htmlFor={`cd-note-${a.id}`} className="block text-[14px] font-medium">
            Note <span className="font-normal text-[var(--cd-fg-3)]">(optional, saved with the decision)</span>
          </label>
          <textarea
            id={`cd-note-${a.id}`}
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Why you approved or rejected it"
            className="cd-input"
          />
          <div className="flex gap-2">
            <Button variant="primary" className="flex-1" disabled={decide.isPending} onClick={() => decide.mutate("approved")}>
              <Check className="h-4 w-4" />
              {decide.isPending && decide.variables === "approved" ? "Approving..." : "Approve"}
            </Button>
            <Button variant="danger" className="flex-1" disabled={decide.isPending} onClick={() => decide.mutate("rejected")}>
              <X className="h-4 w-4" />
              {decide.isPending && decide.variables === "rejected" ? "Rejecting..." : "Reject"}
            </Button>
          </div>
          <ErrorText error={decide.error} />
          {workspace?.slack_channel_id && (
            <p className="text-[13.5px] text-[var(--cd-fg-3)]">Also posted to your Slack channel. Deciding in either place counts.</p>
          )}
        </div>
      )}
    </div>
  );
}
