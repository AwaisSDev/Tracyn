"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import yaml from "js-yaml";
import { ArrowUp, Check, ChevronRight, MessageCircle, X } from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/lib/workspace-context";
import { RULE_DEFS } from "@/lib/policy-rules";
import type { Policy, PolicyDraft } from "@/lib/types";
import { Button, Card, Dot, ErrorText, Page, PageHeader, Skel, humanKey, timeAgo, usePresence } from "./ui";

interface Rule {
  match?: { action_type?: string; action_name?: string };
  require_approval?: boolean;
}

function parseRules(text: string): Rule[] | null {
  try {
    const parsed = yaml.load(text) as { rules?: Rule[] } | null;
    return parsed?.rules ?? [];
  } catch {
    return null;
  }
}

function describe(rule: Rule): { title: React.ReactNode; hint: string } {
  const m = rule.match ?? {};
  const known = RULE_DEFS.find(
    (d) => Object.keys(d.match).length === Object.keys(m).length && Object.entries(d.match).every(([k, v]) => (m as Record<string, string>)[k] === v)
  );
  if (known) return { title: known.label, hint: known.description };

  const name = m.action_name;
  let title: React.ReactNode = "Every action";
  if (name) {
    const core = name.replace(/\*/g, "");
    const code = <code className="rounded-[4px] bg-[#f1f3f9] px-1 py-[1px] text-[13.5px] font-medium">{core}</code>;
    if (name.startsWith("*") && name.endsWith("*")) title = <>Actions with {code} in the name</>;
    else if (name.endsWith("*")) title = <>Actions starting with {code}</>;
    else if (name.startsWith("*")) title = <>Actions ending with {code}</>;
    else title = <>The {code} action</>;
  } else if (m.action_type) {
    title = `Any ${humanKey(m.action_type).toLowerCase()} action`;
  }
  const hint = m.action_type && name ? `Only when the type is ${m.action_type}` : m.action_type ? `Matches type ${m.action_type}` : "Matches by action name";
  return { title, hint };
}

export function PolicyView() {
  const { workspace } = useWorkspace();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState("");
  const [advanced, setAdvanced] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  // The assistant opens from the round button; the rules slide over to make
  // room and slide back when it closes.
  const [chatOpen, setChatOpen] = useState(false);
  const chat = usePresence(chatOpen);

  useEffect(() => {
    if (!chatOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setChatOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [chatOpen]);

  const { data: policy, isLoading } = useQuery({
    queryKey: ["policy", workspace?.id],
    queryFn: () => api.get<Policy>(`/v1/workspaces/${workspace!.id}/policy`),
    enabled: !!workspace,
  });

  useEffect(() => {
    if (policy) setDraft(policy.rules_yaml);
  }, [policy]);

  const save = useMutation({
    mutationFn: (rules_yaml: string) => api.put(`/v1/workspaces/${workspace!.id}/policy`, { name: "default", rules_yaml }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["policy", workspace?.id] });
      setSavedAt(Date.now());
    },
    onError: (e: Error) => setError(e.message),
  });

  function persist(text: string) {
    setError(null);
    try {
      yaml.load(text);
      setDraft(text);
      save.mutate(text);
    } catch (e) {
      setError(e instanceof Error ? e.message : "That isn't valid YAML.");
    }
  }

  const rules = parseRules(draft);

  function toggle(i: number) {
    if (!rules) return;
    const next = rules.map((r, j) => (j === i ? { ...r, require_approval: !r.require_approval } : r));
    persist(yaml.dump({ rules: next }));
  }

  const dirty = policy ? draft !== policy.rules_yaml : false;
  const needsApproval = rules?.filter((r) => r.require_approval).length ?? 0;

  return (
    <Page wide>
      <PageHeader
        title="Policy"
        subtitle="Choose which actions need a person to approve them before they run. The first rule that matches an action wins."
        actions={
          // Top right, beside the title: always in view, never over the
          // content, and right above the assistant when it opens. A blue chat
          // bubble to open, a soft red cross to close.
          <div className="flex items-center gap-3">
            <span className="hidden text-[14.5px] text-[var(--cd-fg-2)] sm:inline">{chatOpen ? "Close the assistant" : "Ask the policy assistant"}</span>
            <button
              type="button"
              onClick={() => setChatOpen((o) => !o)}
              aria-label={chatOpen ? "Close the policy assistant" : "Open the policy assistant"}
              aria-expanded={chatOpen}
              className={cn(
                "flex h-14 w-14 shrink-0 items-center justify-center rounded-full transition-[background-color,box-shadow,color] duration-200",
                chatOpen
                  ? "bg-[#fdecec] text-[var(--cd-red)] shadow-[0_0_0_1.5px_#eaa9a9,0_6px_16px_-8px_rgba(214,69,69,0.45)] hover:bg-[#fbe1e1]"
                  : "cv-btn-primary text-white"
              )}
            >
              <span key={chatOpen ? "x" : "chat"} className="cd-spin-in flex">
                {chatOpen ? <X className="h-6 w-6" strokeWidth={2.25} /> : <MessageCircle className="h-6 w-6" />}
              </span>
            </button>
          </div>
        }
        eyebrow={
          policy ? (
            <span className="inline-flex items-center gap-1.5">
              {save.isPending ? "Saving..." : savedAt ? (
                <>
                  <Check className="h-3.5 w-3.5 text-[var(--cd-green)]" /> Saved
                </>
              ) : (
                `Last saved ${timeAgo(policy.updated_at)}`
              )}
            </span>
          ) : undefined
        }
      />

      <div
        className={cn(
          "mt-7 grid items-start transition-[grid-template-columns,column-gap] duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] motion-reduce:transition-none",
          chatOpen ? "lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-x-5" : "lg:grid-cols-[minmax(0,1fr)_0px] lg:gap-x-0"
        )}
      >
        <div className="min-w-0 space-y-4">
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-[var(--cd-line)] px-5 py-3">
              <span className="text-[15.5px] font-semibold">Rules</span>
              {rules && !isLoading && (
                <span className="text-[13.5px] text-[var(--cd-fg-3)]">
                  {needsApproval} of {rules.length} need approval
                </span>
              )}
            </div>
            {isLoading && (
              <div className="space-y-2 p-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skel key={i} className="h-12 w-full" />
                ))}
              </div>
            )}
            {!isLoading && rules === null && (
              <p className="px-5 py-6 text-[15px] text-[var(--cd-red)]">The policy YAML doesn&apos;t parse. Fix it in the editor below.</p>
            )}
            {!isLoading && rules?.length === 0 && (
              <p className="px-5 py-8 text-center text-[15.5px] text-[var(--cd-fg-3)]">No rules yet. Every action runs without approval.</p>
            )}
            <ul className="divide-y divide-[var(--cd-line)]">
              {rules?.map((r, i) => {
                const d = describe(r);
                return (
                  <li key={i} className="flex items-center gap-4 px-4 py-4 sm:px-6 sm:py-5">
                    <span className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f1f3f8] sm:flex">
                      <Dot tone={r.require_approval ? "amber" : "gray"} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-[16.5px] font-semibold leading-snug tracking-[-0.015em]">{d.title}</div>
                      <div className="mt-1 text-[14.5px] text-[var(--cd-fg-2)]">{d.hint}</div>
                    </div>
                    <span className={cn("hidden text-[14.5px] md:block", r.require_approval ? "text-[var(--cd-ink)]" : "text-[var(--cd-fg-3)]")}>
                      {r.require_approval ? "Needs approval" : "Runs freely"}
                    </span>
                    <Switch checked={!!r.require_approval} onChange={() => toggle(i)} disabled={save.isPending} label={`Require approval for rule ${i + 1}`} />
                  </li>
                );
              })}
            </ul>
            <div className="border-t border-[var(--cd-line)] bg-[#fafbfd] px-5 py-3 text-[13.5px] text-[var(--cd-fg-3)]">
              Anything no rule matches runs without approval.
            </div>
          </Card>

          <Card className="overflow-hidden">
            <button
              type="button"
              onClick={() => setAdvanced((o) => !o)}
              aria-expanded={advanced}
              className="flex w-full items-center gap-2 px-5 py-3.5 text-left text-[15.5px] font-medium hover:bg-[#fafbfd]"
            >
              <ChevronRight className={cn("h-4 w-4 text-[var(--cd-fg-3)] transition-transform", advanced && "rotate-90")} />
              Edit as YAML
              <span className="ml-auto text-[13.5px] font-normal text-[var(--cd-fg-3)]">For custom match rules</span>
            </button>
            {advanced && (
              <div className="space-y-3 border-t border-[var(--cd-line)] p-5">
                <textarea
                  id="cd-policy-yaml"
                  rows={14}
                  spellCheck={false}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  className="cd-input cd-mono text-[13.5px]"
                />
                <div className="flex items-center gap-2">
                  <Button variant="primary" disabled={!dirty || save.isPending} onClick={() => persist(draft)}>
                    {save.isPending ? "Saving..." : "Save policy"}
                  </Button>
                  {dirty && (
                    <Button variant="ghost" onClick={() => policy && setDraft(policy.rules_yaml)}>
                      Discard
                    </Button>
                  )}
                </div>
              </div>
            )}
          </Card>
          {error && <ErrorText error={new Error(error)} />}
        </div>

        {/* One assistant, kept mounted so the conversation survives closing
            it: docked beside the rules from lg, a sheet over the page below. */}
        {workspace && (
          <div
            className={cn(
              "fixed inset-0 z-50 flex items-end p-3 lg:sticky lg:inset-auto lg:top-6 lg:z-auto lg:block lg:min-w-0 lg:overflow-hidden lg:p-0",
              !chat.mounted && "hidden lg:hidden"
            )}
          >
            <div
              className={cn("absolute inset-0 bg-[rgba(15,18,34,0.22)] lg:hidden", chat.exiting ? "cd-fade-out" : "cd-fade-in")}
              onClick={() => setChatOpen(false)}
            />
            <div className={cn("relative w-full lg:w-[400px]", chat.exiting ? "cd-panel-out" : "cd-panel-in")}>
              <Assistant
                workspaceId={workspace.id}
                activeYaml={policy?.rules_yaml ?? ""}
                onApply={persist}
                onClose={() => setChatOpen(false)}
              />
            </div>
          </div>
        )}
      </div>

    </Page>
  );
}

function Switch({ checked, onChange, disabled, label }: { checked: boolean; onChange: () => void; disabled?: boolean; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      className={cn(
        "relative h-[26px] w-[46px] shrink-0 rounded-full transition-colors disabled:opacity-60",
        checked ? "bg-[var(--cd-blue)]" : "bg-[#d5dae8]"
      )}
    >
      <span
        className={cn(
          "absolute left-0 top-[2px] h-[22px] w-[22px] rounded-full bg-white shadow-[0_1px_2px_rgba(15,18,34,0.25)] transition-transform",
          checked ? "translate-x-[22px]" : "translate-x-[2px]"
        )}
      />
    </button>
  );
}

interface Msg {
  id: number;
  role: "user" | "assistant";
  text: string;
  yaml?: string | null;
}

const SUGGESTIONS = ["Require approval for refunds over $100", "Let internal actions run freely", "Approve anything that emails a customer"];

function Assistant({
  workspaceId,
  activeYaml,
  onApply,
  onClose,
}: {
  workspaceId: string;
  activeYaml: string;
  onApply: (yaml: string) => void;
  onClose: () => void;
}) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [pendingYaml, setPendingYaml] = useState<string | null>(null);
  const [prevExplanation, setPrevExplanation] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const nextId = useRef(0);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = useMutation({
    mutationFn: (instruction: string) =>
      api.post<PolicyDraft>(`/v1/workspaces/${workspaceId}/policy/draft`, {
        instruction,
        base_yaml: pendingYaml,
        previous_explanation: prevExplanation,
      }),
    onSuccess: (r) => {
      setMessages((m) => [...m, { id: nextId.current++, role: "assistant", text: r.explanation, yaml: r.proposed_yaml }]);
      setPrevExplanation(r.explanation);
      if (r.proposed_yaml) setPendingYaml(r.proposed_yaml);
    },
  });

  function submit(text: string) {
    const t = text.trim();
    if (!t || send.isPending) return;
    setMessages((m) => [...m, { id: nextId.current++, role: "user", text: t }]);
    setInput("");
    send.mutate(t);
  }

  return (
    // Rounded and tinted so it reads as its own surface, not another white card.
    <div className="flex h-[min(620px,calc(100dvh-24px))] flex-col overflow-hidden rounded-[16px] border-[1.5px] border-[#c3cbe2] bg-[#f5f7fc] shadow-[0_18px_40px_-18px_rgba(15,18,34,0.3),0_2px_6px_-2px_rgba(15,18,34,0.08)] lg:h-[min(620px,calc(100vh-48px))]">
      <div className="flex items-center gap-2.5 border-b border-[#dfe4f2] px-4 py-3.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-[var(--cd-blue)] shadow-[0_0_0_1px_#dfe4f2]">
          <MessageCircle className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[16px] font-semibold leading-tight">Policy assistant</div>
          <div className="text-[13px] text-[var(--cd-fg-3)]">Plain English in, rules out</div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close the assistant"
          className="-mr-1.5 rounded-full p-2 text-[var(--cd-fg-3)] hover:bg-white hover:text-[var(--cd-ink)]"
        >
          <X className="h-[18px] w-[18px]" />
        </button>
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <p className="max-w-[26ch] text-[15px] text-[var(--cd-fg-2)]">Describe the rule you want. You&apos;ll see the change before anything is saved.</p>
            <div className="mt-4 flex flex-col items-center gap-1.5">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => submit(s)}
                  className="rounded-full border border-[#dfe4f2] bg-white px-3.5 py-1.5 text-[14px] text-[var(--cd-fg-2)] transition-colors hover:border-[var(--cd-line-2)] hover:text-[var(--cd-ink)]"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m) =>
          m.role === "user" ? (
            <div key={m.id} className="ml-auto w-fit max-w-[85%] rounded-[14px] rounded-br-[4px] bg-white px-3.5 py-2 text-[15px] shadow-[0_0_0_1px_#dfe4f2]">
              {m.text}
            </div>
          ) : (
            <div key={m.id} className="space-y-2">
              <p className="text-[15px] leading-[1.55] text-[var(--cd-ink)]">{m.text}</p>
              {m.yaml && (
                <div className="overflow-hidden rounded-[12px] border border-[#dfe4f2] bg-white">
                  <pre className="cd-mono max-h-40 overflow-auto p-3 text-[12.5px] leading-[1.55]">{m.yaml}</pre>
                  <div className="flex items-center justify-between border-t border-[var(--cd-line)] px-3 py-2">
                    <span className="text-[13px] text-[var(--cd-fg-3)]">{m.yaml === activeYaml ? "This is your current policy" : "Proposed policy"}</span>
                    <Button size="sm" variant="primary" disabled={m.yaml === activeYaml} onClick={() => m.yaml && onApply(m.yaml)}>
                      Apply
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )
        )}
        {send.isPending && <p className="text-[14px] text-[var(--cd-fg-3)]">Thinking...</p>}
        {send.isError && <ErrorText error={send.error} />}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(input);
        }}
        className="border-t border-[#dfe4f2] p-3"
      >
        <div className="flex items-center gap-2 rounded-full border border-[#d8def0] bg-white py-1.5 pl-4 pr-1.5 focus-within:border-[var(--cd-blue)] focus-within:shadow-[0_0_0_3px_rgba(53,83,212,0.12)]">
          <input
            id="cd-policy-ask"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask for a rule..."
            className="min-w-0 flex-1 bg-transparent text-[15.5px] outline-none placeholder:text-[#a3a9bd]"
          />
          <button
            type="submit"
            aria-label="Send"
            disabled={!input.trim() || send.isPending}
            className="cv-btn-primary flex h-8 w-8 items-center justify-center rounded-full text-white disabled:opacity-40"
          >
            <ArrowUp className="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
