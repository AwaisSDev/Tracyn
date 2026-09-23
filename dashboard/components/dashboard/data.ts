"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useWorkspace } from "@/lib/workspace-context";
import type { Agent, Approval, AuditEvent, Questionnaire, Soc2ControlOut } from "@/lib/types";

// Shared queries for the dashboard pages, all scoped to the selected
// workspace. Pages that need the same data share one cached fetch.

export function useAgents() {
  const { workspace } = useWorkspace();
  const q = useQuery({
    queryKey: ["agents", workspace?.id],
    queryFn: () => api.get<Agent[]>(`/v1/workspaces/${workspace!.id}/agents`),
    enabled: !!workspace,
  });
  const byId = useMemo(() => new Map((q.data ?? []).map((a) => [a.id, a.name])), [q.data]);
  return { ...q, agents: q.data ?? [], agentName: (id: string | null) => (id ? byId.get(id) ?? "Unknown agent" : "No agent") };
}

// The events endpoint pages at 200 max; the dashboard reads the latest page.
export function useEvents() {
  const { workspace } = useWorkspace();
  return useQuery({
    queryKey: ["events-latest", workspace?.id],
    queryFn: () => api.get<AuditEvent[]>(`/v1/workspaces/${workspace!.id}/events?limit=200`),
    enabled: !!workspace,
    refetchInterval: 15_000,
  });
}

export function useApprovals(status: "pending" | "approved" | "rejected" | "denied_timeout") {
  const { workspace } = useWorkspace();
  return useQuery({
    queryKey: ["approvals", workspace?.id, status],
    queryFn: () => api.get<Approval[]>(`/v1/workspaces/${workspace!.id}/approvals?status=${status}`),
    enabled: !!workspace,
    refetchInterval: status === "pending" ? 10_000 : false,
  });
}

export function useQuestionnaires() {
  const { workspace } = useWorkspace();
  return useQuery({
    queryKey: ["questionnaires", workspace?.id],
    queryFn: () => api.get<Questionnaire[]>(`/v1/workspaces/${workspace!.id}/questionnaires`),
    enabled: !!workspace,
    refetchInterval: (q) => (q.state.data?.some((x) => x.status === "processing") ? 5_000 : false),
  });
}

export function useSoc2() {
  const { workspace } = useWorkspace();
  return useQuery({
    queryKey: ["soc2-controls", workspace?.id],
    queryFn: () => api.get<Soc2ControlOut[]>(`/v1/workspaces/${workspace!.id}/soc2/controls`),
    enabled: !!workspace,
  });
}

/** The backend falls back to the static evidence note verbatim for a control
 * it has no live data for, so "differs from the note" means Tracyn is
 * producing real evidence for it right now. */
export function hasLiveEvidence(c: Soc2ControlOut): boolean {
  return c.live_evidence.trim() !== c.evidence_note.trim();
}

export function startOfMonth(): number {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
}
