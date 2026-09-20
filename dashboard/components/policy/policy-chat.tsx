"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { MessageCircle, X, Send, Check } from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { diffLines } from "@/lib/diff-lines";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { PolicyDraft } from "@/lib/types";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  proposedYaml?: string | null;
  // The policy this proposal would replace -- needed to render its diff
  // even after later turns move `pendingYaml` on.
  baseYaml?: string;
}

// A back-and-forth chat, not a one-shot form: each unapplied proposal is
// sent back as the next turn's `base_yaml` (see routers/policies.py) so
// "no, don't include the card one" reads as a correction of what was just
// proposed instead of restarting from the real saved policy every time.
export function PolicyChat({
  workspaceId,
  activeYaml,
  onApply,
}: {
  workspaceId: string;
  activeYaml: string;
  onApply: (yaml: string) => void;
}) {
  const draftPath = `/v1/workspaces/${workspaceId}/policy/draft`;
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pendingYaml, setPendingYaml] = useState<string | null>(null);
  const [previousExplanation, setPreviousExplanation] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  const send = useMutation({
    mutationFn: (instruction: string) =>
      api.post<PolicyDraft>(draftPath, { instruction, base_yaml: pendingYaml, previous_explanation: previousExplanation }),
    onSuccess: (result) => {
      const baseYaml = pendingYaml ?? activeYaml;
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: result.explanation,
          proposedYaml: result.proposed_yaml,
          baseYaml,
        },
      ]);
      setPreviousExplanation(result.explanation);
      if (result.proposed_yaml) setPendingYaml(result.proposed_yaml);
    },
    onError: (e: Error) => {
      setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "assistant", content: e.message }]);
    },
  });

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 active:scale-95"
        aria-label="Open policy assistant"
      >
        {open ? <X className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
      </button>

      {open && (
        <div className="fixed bottom-24 right-6 z-40 flex h-[520px] w-[380px] max-w-[calc(100vw-3rem)] flex-col overflow-hidden rounded-xl border border-border bg-card shadow-xl">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div>
              <p className="text-sm font-semibold">Policy assistant</p>
              <p className="text-[12px] text-muted-foreground">Describe what should need approval</p>
            </div>
            <button onClick={() => setOpen(false)} className="rounded p-1 text-muted-foreground hover:bg-muted">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-3 py-3">
            {messages.length === 0 && (
              <p className="px-2 py-4 text-center text-[13px] text-muted-foreground">
                Try something like &quot;require approval before deleting a customer account&quot;.
              </p>
            )}
            {messages.map((m, i) => {
              const isLatestPendingProposal =
                m.role === "assistant" && m.proposedYaml != null && m.proposedYaml === pendingYaml && i === messages.length - 1;
              return (
                <div key={m.id} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                  <div className={cn("max-w-[88%] space-y-2", m.role === "user" ? "" : "w-[88%]")}>
                    <div
                      className={cn(
                        "rounded-2xl px-3 py-2 text-[13px] leading-relaxed",
                        m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                      )}
                    >
                      {m.content}
                    </div>
                    {m.proposedYaml != null && m.baseYaml !== undefined && (
                      <div className="overflow-hidden rounded-lg border border-border">
                        <pre className="max-h-40 overflow-y-auto px-2.5 py-2 font-mono text-[11px] leading-relaxed">
                          {diffLines(m.baseYaml, m.proposedYaml).map((line, li) => (
                            <div
                              key={li}
                              className={cn(
                                "px-1",
                                line.type === "add" && "bg-[#DBEDDB] text-[#2F5D3A] dark:bg-[#1F3D2B] dark:text-[#8FCBA3]",
                                line.type === "remove" && "bg-error/15 text-error line-through"
                              )}
                            >
                              {line.type === "add" ? "+ " : line.type === "remove" ? "- " : "  "}
                              {line.text}
                            </div>
                          ))}
                        </pre>
                        {isLatestPendingProposal && (
                          <div className="flex justify-end gap-2 border-t border-border bg-muted/40 px-2.5 py-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setPendingYaml(null);
                                setPreviousExplanation(null);
                              }}
                            >
                              Discard
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => {
                                onApply(m.proposedYaml!);
                                setMessages((prev) => [
                                  ...prev,
                                  { id: crypto.randomUUID(), role: "assistant", content: "Applied to your live policy." },
                                ]);
                                setPendingYaml(null);
                                setPreviousExplanation(null);
                              }}
                            >
                              <Check className="h-3.5 w-3.5" /> Apply
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {send.isPending && (
              <div className="flex justify-start">
                <div className="rounded-2xl bg-muted px-3 py-2 text-[13px] text-muted-foreground">Thinking...</div>
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              const instruction = input.trim();
              if (!instruction || send.isPending) return;
              setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "user", content: instruction }]);
              setInput("");
              send.mutate(instruction);
            }}
            className="flex items-center gap-2 border-t border-border p-2.5"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Describe a policy change..."
              disabled={send.isPending}
              className="flex-1"
            />
            <Button type="submit" size="icon" disabled={!input.trim() || send.isPending}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      )}
    </>
  );
}
