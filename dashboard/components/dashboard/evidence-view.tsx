"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, ChevronUp, Download, FileSpreadsheet, FileText, ShieldCheck, Upload } from "lucide-react";
import { api, downloadFile } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/lib/workspace-context";
import type { Answer, AuditEvent } from "@/lib/types";
import { useAgents, useQuestionnaires } from "./data";
import {
  Button,
  Card,
  Dot,
  Empty,
  ErrorText,
  Page,
  PageHeader,
  Progress,
  SectionLabel,
  Skel,
  Status,
  statusTone,
  timeAgo,
} from "./ui";

// ---------- list ----------

export function EvidenceListView() {
  const { workspace } = useWorkspace();
  const queryClient = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const { data: questionnaires = [], isLoading } = useQuestionnaires();

  const ready = questionnaires.filter((q) => q.status === "ready");
  const answerQueries = useQueries({
    queries: ready.map((q) => ({
      queryKey: ["answers", q.id],
      queryFn: () => api.get<Answer[]>(`/v1/workspaces/${workspace!.id}/questionnaires/${q.id}/answers`),
      enabled: !!workspace,
    })),
  });

  const upload = useMutation({
    mutationFn: (file: File) => {
      const form = new FormData();
      form.append("file", file);
      return api.postForm(`/v1/workspaces/${workspace!.id}/questionnaires`, form);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["questionnaires", workspace?.id] }),
  });

  return (
    <Page>
      <PageHeader
        title="Evidence Packs"
        subtitle="Upload a security questionnaire. Tracyn drafts each answer from your logs and cites the exact events behind it. You review, then export."
        actions={
          <>
            <input
              ref={fileInput}
              id="cd-upload"
              type="file"
              accept=".pdf,.csv,.xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) upload.mutate(file);
                e.target.value = "";
              }}
            />
            <Button variant="primary" disabled={upload.isPending || !workspace} onClick={() => fileInput.current?.click()}>
              <Upload className="h-4 w-4" />
              {upload.isPending ? "Uploading..." : "Upload questionnaire"}
            </Button>
          </>
        }
      />
      <div className="mt-3">
        <ErrorText error={upload.error} />
      </div>

      <div className="mt-6 space-y-3">
        {isLoading && Array.from({ length: 2 }).map((_, i) => <Skel key={i} className="h-[92px] w-full rounded-[9px]" />)}
        {!isLoading && questionnaires.length === 0 && (
          <Card>
            <Empty
              title="No evidence packs yet"
              body="Upload a PDF, CSV or Excel questionnaire and the first draft is ready in a minute or two."
              action={
                <Button variant="primary" onClick={() => fileInput.current?.click()}>
                  Upload questionnaire
                </Button>
              }
            />
          </Card>
        )}
        {questionnaires.map((q) => {
          const idx = ready.findIndex((r) => r.id === q.id);
          const answers = idx >= 0 ? answerQueries[idx]?.data ?? [] : [];
          const approved = answers.filter((a) => a.status === "approved").length;
          const reviewed = answers.filter((a) => a.status === "reviewed").length;
          const drafts = answers.length - approved - reviewed;
          const Icon = q.file_type === "pdf" ? FileText : FileSpreadsheet;
          const body = (
            <Card className={cn("flex items-center gap-4 p-4 sm:p-5", q.status === "ready" && "transition-colors hover:border-[var(--cd-line-2)] hover:bg-[#fcfcfe]")}>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[7px] bg-[var(--cd-blue-soft)] text-[var(--cd-blue)]">
                <Icon className="h-5 w-5" strokeWidth={1.75} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                  <span className="truncate text-[16.5px] font-medium">{q.filename}</span>
                  <span className="text-[13.5px] text-[var(--cd-fg-3)]">Uploaded {timeAgo(q.created_at)}</span>
                </div>
                {q.status === "ready" ? (
                  <div className="mt-2.5 flex items-center gap-3">
                    <Progress
                      className="max-w-[320px]"
                      segments={[
                        { value: approved, color: "var(--cd-green)", label: `${approved} approved` },
                        { value: reviewed, color: "var(--cd-blue)", label: `${reviewed} reviewed` },
                        { value: drafts, color: "#dfe3ee", label: `${drafts} drafts` },
                      ]}
                    />
                    <span className="shrink-0 text-[13.5px] tabular-nums text-[var(--cd-fg-2)]">
                      {approved} of {answers.length} approved
                    </span>
                  </div>
                ) : q.status === "error" ? (
                  <p className="mt-1 text-[14px] text-[var(--cd-red)]">{q.error_message ?? "Couldn't read this file."}</p>
                ) : (
                  <p className="mt-1 text-[14px] text-[var(--cd-fg-2)]">Drafting answers from your logs...</p>
                )}
              </div>
              {q.status === "ready" ? (
                <span className="hidden items-center gap-1 text-[15px] font-medium text-[var(--cd-blue)] sm:inline-flex">
                  Review <ChevronRight className="h-4 w-4" />
                </span>
              ) : (
                <Status status={q.status} />
              )}
            </Card>
          );
          return q.status === "ready" ? (
            <Link key={q.id} href={`/questionnaires/${q.id}`} className="block rounded-[9px]">
              {body}
            </Link>
          ) : (
            <div key={q.id}>{body}</div>
          );
        })}
      </div>
    </Page>
  );
}

// ---------- one pack ----------

export function EvidenceDetailView({ id }: { id: string }) {
  const { workspace } = useWorkspace();
  const queryClient = useQueryClient();
  const { data: questionnaires = [] } = useQuestionnaires();
  const pack = questionnaires.find((q) => q.id === id);

  const { data: answers = [], isLoading } = useQuery({
    queryKey: ["answers", id],
    queryFn: () => api.get<Answer[]>(`/v1/workspaces/${workspace!.id}/questionnaires/${id}/answers`),
    enabled: !!workspace,
  });

  const [index, setIndex] = useState(0);
  const current = answers[index];

  const approved = answers.filter((a) => a.status === "approved").length;
  const reviewed = answers.filter((a) => a.status === "reviewed").length;

  const approveAll = useMutation({
    mutationFn: async () => {
      for (const a of answers.filter((x) => x.status !== "approved")) {
        await api.patch(`/v1/workspaces/${workspace!.id}/answers/${a.id}`, {
          final_answer: a.final_answer ?? a.draft_answer ?? "",
          status: "approved",
        });
      }
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["answers", id] }),
  });

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.target as HTMLElement).closest("input, textarea, select")) return;
      if (e.key === "ArrowDown" || e.key === "j") setIndex((i) => Math.min(i + 1, answers.length - 1));
      if (e.key === "ArrowUp" || e.key === "k") setIndex((i) => Math.max(i - 1, 0));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [answers.length]);

  return (
    <Page wide>
      <PageHeader
        eyebrow={
          <Link href={"/questionnaires"} className="hover:text-[var(--cd-ink)]">
            Evidence Packs
          </Link>
        }
        title={pack?.filename ?? "Evidence pack"}
        subtitle={
          answers.length ? (
            <span className="flex items-center gap-3">
              <Progress
                className="w-40"
                segments={[
                  { value: approved, color: "var(--cd-green)" },
                  { value: reviewed, color: "var(--cd-blue)" },
                  { value: answers.length - approved - reviewed, color: "#dfe3ee" },
                ]}
              />
              <span className="tabular-nums">
                {approved} of {answers.length} answers approved
              </span>
            </span>
          ) : undefined
        }
        actions={
          <>
            <Button
              onClick={() => downloadFile(`/v1/workspaces/${workspace!.id}/questionnaires/${id}/export.csv`, "evidence-pack.csv")}
              disabled={!workspace}
            >
              <Download className="h-4 w-4" />
              CSV
            </Button>
            <Button
              onClick={() => downloadFile(`/v1/workspaces/${workspace!.id}/questionnaires/${id}/export.docx`, "evidence-pack.docx")}
              disabled={!workspace}
            >
              <Download className="h-4 w-4" />
              Word
            </Button>
            <Button
              variant="primary"
              disabled={!answers.length || approved === answers.length || approveAll.isPending}
              onClick={() => approveAll.mutate()}
            >
              {approveAll.isPending ? "Approving..." : approved === answers.length && answers.length ? "All approved" : "Approve all"}
            </Button>
          </>
        }
      />
      <div className="mt-2">
        <ErrorText error={approveAll.error} />
      </div>

      {isLoading ? (
        <div className="mt-7 grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
          <Skel className="h-80 rounded-[9px]" />
          <Skel className="h-80 rounded-[9px]" />
        </div>
      ) : !answers.length ? (
        <Card className="mt-7"><Empty title="No answers in this pack" body="The questionnaire didn't contain any questions Tracyn could read." /></Card>
      ) : (
        <div className="mt-7 grid items-start gap-4 lg:grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[280px_minmax(0,1fr)_320px]">
          <Card className="overflow-hidden lg:sticky lg:top-6">
            <div className="border-b border-[var(--cd-line)] px-4 py-3 text-[13.5px] font-medium text-[var(--cd-fg-3)]">
              {answers.length} questions
            </div>
            <ol className="max-h-[260px] overflow-y-auto p-1.5 lg:max-h-[calc(100vh-180px)]">
              {answers.map((a, i) => (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => setIndex(i)}
                    className={cn(
                      "flex w-full items-start gap-2.5 rounded-[6px] px-2.5 py-2 text-left transition-colors",
                      i === index ? "bg-[var(--cd-active)]" : "hover:bg-[var(--cd-hover)]"
                    )}
                  >
                    <span className="mt-[1px] w-5 shrink-0 text-right text-[13px] tabular-nums text-[var(--cd-fg-3)]">{i + 1}</span>
                    <span className="line-clamp-2 min-w-0 flex-1 text-[14px] leading-[1.45] text-[var(--cd-ink)]">{a.question_text}</span>
                    <span className="mt-[5px]">
                      <Dot tone={statusTone(a.status)} />
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          </Card>

          {current && (
            <>
              <AnswerEditor
                key={current.id}
                answer={current}
                index={index}
                total={answers.length}
                onPrev={() => setIndex((i) => Math.max(i - 1, 0))}
                onNext={() => setIndex((i) => Math.min(i + 1, answers.length - 1))}
                questionnaireId={id}
              />
              <div className="lg:col-start-2 xl:col-start-auto">
                <Citations ids={current.evidence_event_ids} />
              </div>
            </>
          )}
        </div>
      )}
    </Page>
  );
}

function AnswerEditor({
  answer,
  index,
  total,
  onPrev,
  onNext,
  questionnaireId,
}: {
  answer: Answer;
  index: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
  questionnaireId: string;
}) {
  const { workspace } = useWorkspace();
  const queryClient = useQueryClient();
  const original = answer.final_answer ?? answer.draft_answer ?? "";
  const [text, setText] = useState(original);
  const dirty = text !== original;

  const save = useMutation({
    mutationFn: (status: "reviewed" | "approved") =>
      api.patch(`/v1/workspaces/${workspace!.id}/answers/${answer.id}`, { final_answer: text, status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["answers", questionnaireId] }),
  });

  return (
    <Card>
      <div className="flex items-center justify-between gap-3 border-b border-[var(--cd-line)] px-5 py-3">
        <span className="text-[13.5px] tabular-nums text-[var(--cd-fg-3)]">
          Question {index + 1} of {total}
        </span>
        <div className="flex items-center gap-3">
          <Status status={answer.status} />
          <div className="flex">
            <button
              type="button"
              aria-label="Previous question"
              disabled={index === 0}
              onClick={onPrev}
              className="rounded-[5px] p-1 text-[var(--cd-fg-2)] hover:bg-[var(--cd-hover)] disabled:opacity-35"
            >
              <ChevronUp className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="Next question"
              disabled={index === total - 1}
              onClick={onNext}
              className="rounded-[5px] p-1 text-[var(--cd-fg-2)] hover:bg-[var(--cd-hover)] disabled:opacity-35"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
      <div className="space-y-4 px-5 py-5">
        <h2 className="text-[20px] font-semibold leading-[1.35] tracking-[-0.02em] text-balance">{answer.question_text}</h2>
        <div>
          <label htmlFor={`cd-answer-${answer.id}`} className="mb-2 flex items-center justify-between text-[13.5px] text-[var(--cd-fg-3)]">
            <span>{answer.final_answer ? "Your answer" : "Drafted from your logs"}</span>
            {dirty && <span className="text-[var(--cd-amber)]">Unsaved changes</span>}
          </label>
          <textarea
            id={`cd-answer-${answer.id}`}
            rows={8}
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="cd-input text-[16px]"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="primary" disabled={save.isPending || (answer.status === "approved" && !dirty)} onClick={() => save.mutate("approved")}>
            {save.isPending && save.variables === "approved" ? "Approving..." : answer.status === "approved" && !dirty ? "Approved" : "Approve answer"}
          </Button>
          <Button disabled={save.isPending} onClick={() => save.mutate("reviewed")}>
            {save.isPending && save.variables === "reviewed" ? "Saving..." : "Save as reviewed"}
          </Button>
          {dirty && (
            <Button variant="ghost" onClick={() => setText(original)}>
              Discard
            </Button>
          )}
        </div>
        <ErrorText error={save.error} />
      </div>
    </Card>
  );
}

function Citations({ ids }: { ids: string[] }) {
  const { workspace } = useWorkspace();
  const { agentName } = useAgents();
  const results = useQueries({
    queries: ids.map((eid) => ({
      queryKey: ["event", eid],
      queryFn: () => api.get<AuditEvent>(`/v1/workspaces/${workspace!.id}/events/${eid}`),
      enabled: !!workspace,
      staleTime: Infinity,
    })),
  });
  const events = useMemo(() => results.map((r) => r.data).filter(Boolean) as AuditEvent[], [results]);
  const loading = results.some((r) => r.isLoading);

  return (
    <div>
      <SectionLabel>Evidence cited ({ids.length})</SectionLabel>
      {ids.length === 0 && (
        <Card className="px-4 py-6 text-center text-[15px] text-[var(--cd-fg-3)]">This answer doesn&apos;t cite any events.</Card>
      )}
      <div className="space-y-2">
        {loading && ids.map((i) => <Skel key={i} className="h-[92px] w-full rounded-[8px]" />)}
        {events.map((e) => (
          <Link
            key={e.id}
            href={`/timeline?event=${e.id}`}
            className="cd-card block rounded-[9px] p-4 transition-colors hover:border-[var(--cd-line-2)]"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-[14px] font-medium">{e.action_name}</span>
              <Status status={e.status} className="text-[13px]" />
            </div>
            <div className="mt-1 text-[13.5px] text-[var(--cd-fg-3)]">
              {agentName(e.agent_id)} · {timeAgo(e.created_at)}
            </div>
            <div className="mt-2.5 flex items-center gap-1.5 text-[12.5px] text-[var(--cd-fg-3)]">
              <ShieldCheck className="h-3.5 w-3.5 text-[var(--cd-green)]" />
              <span className="cd-mono truncate">{e.row_hash.slice(0, 24)}…</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
