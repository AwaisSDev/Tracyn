"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Link2, Plus, Users } from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { joinPath, parseInvite } from "@/lib/invite";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { ForceLightTheme } from "@/components/force-light-theme";
import { interTight } from "@/components/home/fonts";
import type { JoinPreview, Workspace } from "@/lib/types";
import { cdSans } from "./font";
import { ErrorText, Skel } from "./ui";
import "@/components/home/home.css";
import "./dash.css";

const WORKSPACE_KEY = "tracyn_workspace_id";

export async function signOut() {
  await createSupabaseBrowserClient().auth.signOut();
  // A full navigation, not router.push: middleware reads the session cookie
  // on every request, and a client-side push can race the just-cleared
  // cookie and bounce straight back into the dashboard.
  window.location.href = "/login";
}

/** Opens the dashboard on this workspace. A full navigation so the
 * workspace list is fetched fresh, new membership included. */
export function openWorkspace(id: string) {
  try {
    localStorage.setItem(WORKSPACE_KEY, id);
  } catch {
    // storage unavailable; the dashboard falls back to the first workspace
  }
  window.location.href = "/dashboard";
}

export function friendlyError(error: unknown): string | null {
  if (!error) return null;
  const message = error instanceof Error ? error.message : String(error);
  const body = message.replace(/^\d{3}[^:]*:\s*/, "");
  try {
    const parsed = JSON.parse(body) as { detail?: unknown };
    if (typeof parsed.detail === "string") return parsed.detail;
  } catch {
    // not JSON
  }
  return body || "Something went wrong. Try again.";
}

/** The full-page frame for first run and joining: logo, sign out, and a
 * centered column. */
export function OnboardingFrame({ children, back }: { children: React.ReactNode; back?: boolean }) {
  return (
    <div className={`${cdSans.variable} ${interTight.variable} cd flex min-h-screen flex-col`}>
      <ForceLightTheme />
      <header className="flex items-center gap-4 px-5 py-5 sm:px-8">
        <Link href={back ? "/dashboard" : "/"} className="flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element -- next/image's optimizer (sharp) fails on this PNG */}
          <img src="/logo.png" alt="" width={32} height={32} className="rounded-md" />
          <span className="cd-wordmark">Tracyn</span>
        </Link>
        <div className="ml-auto flex items-center gap-5">
          {back && (
            <Link href="/dashboard" className="text-[15px] font-medium text-[var(--cd-fg-2)] hover:text-[var(--cd-ink)]">
              Back to dashboard
            </Link>
          )}
          <button type="button" onClick={signOut} className="text-[15px] font-medium text-[var(--cd-fg-2)] hover:text-[var(--cd-ink)]">
            Sign out
          </button>
        </div>
      </header>
      <main className="flex flex-1 items-start justify-center px-5 pb-20 pt-[6vh] sm:items-center sm:pt-0">
        <div className="w-full max-w-[460px]">{children}</div>
      </main>
    </div>
  );
}

// ---------- first run: create or join ----------

export function FirstRun() {
  const [mode, setMode] = useState<"create" | "join">("create");
  return (
    <OnboardingFrame>
      <h1 className="text-center text-[32px] font-semibold leading-[1.15] tracking-[-0.03em]">Set up your workspace</h1>
      <p className="mt-2 text-center text-[16.5px] text-[var(--cd-fg-2)]">
        Start a new one for your team, or join one someone already made.
      </p>

      <div className="mt-8 grid grid-cols-2 gap-3" role="tablist" aria-label="Create or join">
        <Choice active={mode === "create"} onClick={() => setMode("create")} icon={<Plus className="h-5 w-5" />} title="Create a workspace" hint="You'll be the owner" />
        <Choice active={mode === "join"} onClick={() => setMode("join")} icon={<Users className="h-5 w-5" />} title="Join a workspace" hint="With a link from a teammate" />
      </div>

      <div className="cd-card mt-4 rounded-[10px] p-6">{mode === "create" ? <CreateWorkspaceForm /> : <JoinByLinkForm />}</div>
    </OnboardingFrame>
  );
}

function Choice({
  active,
  onClick,
  icon,
  title,
  hint,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  hint: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "rounded-[10px] border bg-white p-4 text-left transition-[border-color,box-shadow]",
        active
          ? "border-[var(--cd-blue)] shadow-[0_0_0_3px_rgba(53,83,212,0.12)]"
          : "border-[var(--cd-card-edge)] hover:border-[var(--cd-line-2)]"
      )}
    >
      <span className={cn("flex h-9 w-9 items-center justify-center rounded-full", active ? "bg-[var(--cd-blue-soft)] text-[var(--cd-blue)]" : "bg-[#f1f3f8] text-[var(--cd-fg-2)]")}>
        {icon}
      </span>
      <span className="mt-3 block text-[15.5px] font-semibold">{title}</span>
      <span className="mt-0.5 block text-[13.5px] text-[var(--cd-fg-3)]">{hint}</span>
    </button>
  );
}

function CreateWorkspaceForm() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const create = useMutation({
    mutationFn: () => api.post<Workspace>("/v1/workspaces", { name: name.trim() }),
    onSuccess: (ws) => {
      try {
        localStorage.setItem(WORKSPACE_KEY, ws.id);
      } catch {
        // storage unavailable
      }
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (name.trim()) create.mutate();
      }}
      className="space-y-4"
    >
      <div>
        <label htmlFor="cd-first-workspace" className="mb-2 block text-[15px] font-medium">
          Workspace name
        </label>
        <input id="cd-first-workspace" autoFocus required value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme Inc" className="cd-input" />
      </div>
      <ErrorText error={create.error} />
      <button
        type="submit"
        disabled={!name.trim() || create.isPending}
        className="cv-btn-primary flex h-11 w-full items-center justify-center rounded-[7px] text-[16px] font-medium text-white disabled:opacity-55"
      >
        {create.isPending ? "Creating..." : "Create workspace"}
      </button>
    </form>
  );
}

/** Paste an invite link, a workspace link or a code; goes to its join page. */
export function JoinByLinkForm() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [problem, setProblem] = useState<string | null>(null);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const parsed = parseInvite(value);
        if (!parsed) return setProblem("That doesn't look like a workspace link. Paste the whole link your teammate sent.");
        router.push(joinPath(parsed.code, parsed.key));
      }}
      className="space-y-4"
    >
      <div>
        <label htmlFor="cd-join-link" className="mb-2 block text-[15px] font-medium">
          Invite link or workspace link
        </label>
        <input
          id="cd-join-link"
          autoFocus
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setProblem(null);
          }}
          placeholder="https://tracyn.online/join/..."
          className={cn("cd-input", problem && "border-[var(--cd-red)]")}
        />
        <p className="mt-2 text-[13.5px] text-[var(--cd-fg-3)]">
          An invite link joins right away. A workspace link asks for the workspace password next.
        </p>
      </div>
      {problem && <p className="text-[14px] text-[var(--cd-red)]">{problem}</p>}
      <button
        type="submit"
        disabled={!value.trim()}
        className="cv-btn-primary flex h-11 w-full items-center justify-center gap-2 rounded-[7px] text-[16px] font-medium text-white disabled:opacity-55"
      >
        Continue
        <ArrowRight className="h-4 w-4" />
      </button>
    </form>
  );
}

// ---------- /join and /join/<code> ----------

export function JoinStart() {
  return (
    <OnboardingFrame back>
      <h1 className="text-center text-[32px] font-semibold leading-[1.15] tracking-[-0.03em]">Join a workspace</h1>
      <p className="mt-2 text-center text-[16.5px] text-[var(--cd-fg-2)]">Paste the link a teammate shared with you.</p>
      <div className="cd-card mt-8 rounded-[10px] p-6">
        <JoinByLinkForm />
      </div>
    </OnboardingFrame>
  );
}

export function JoinView({ code, inviteKey }: { code: string; inviteKey: string | null }) {
  const [password, setPassword] = useState("");

  const preview = useQuery({
    queryKey: ["join-preview", code, inviteKey],
    queryFn: () => api.get<JoinPreview>(`/v1/join/${encodeURIComponent(code)}${inviteKey ? `?key=${encodeURIComponent(inviteKey)}` : ""}`),
    retry: false,
  });

  const join = useMutation({
    mutationFn: (body: { key?: string; password?: string }) => api.post<Workspace>(`/v1/join/${encodeURIComponent(code)}`, body),
    onSuccess: (ws) => openWorkspace(ws.id),
  });

  const p = preview.data;
  const error = friendlyError(join.error);

  return (
    <OnboardingFrame back>
      <div className="cd-card rounded-[10px] p-7 text-center">
        {preview.isPending ? (
          <>
            <Skel className="mx-auto h-14 w-14 rounded-full" />
            <Skel className="mx-auto mt-5 h-[15px] w-40" />
            <Skel className="mx-auto mt-3 h-[28px] w-56" />
            <Skel className="mx-auto mt-3 h-[15px] w-32" />
            <Skel className="mt-7 h-11 w-full rounded-[7px]" />
          </>
        ) : preview.isError ? (
          <>
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#fdecec] text-[var(--cd-red)]">
              <Link2 className="h-6 w-6" />
            </span>
            <h1 className="mt-5 text-[22px] font-semibold tracking-[-0.02em]">This link doesn&apos;t work</h1>
            <p className="mt-2 text-[15.5px] text-[var(--cd-fg-2)]">{friendlyError(preview.error)}</p>
            <Link href="/join" className="cd-btn-secondary mt-6 inline-flex h-10 items-center rounded-[6px] px-4 text-[15px] font-medium">
              Paste a different link
            </Link>
          </>
        ) : p ? (
          <>
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-[12px] bg-[radial-gradient(115%_115%_at_10%_17%,#3553d4_0%,#1c2f9e_100%)] text-[24px] font-semibold text-white">
              {p.workspace_name.charAt(0).toUpperCase()}
            </span>
            <p className="mt-5 text-[15px] text-[var(--cd-fg-3)]">{p.already_member ? "You're already in" : "You're invited to join"}</p>
            <h1 className="mt-1 text-[26px] font-semibold tracking-[-0.025em]">{p.workspace_name}</h1>
            <p className="mt-1 text-[14.5px] text-[var(--cd-fg-3)]">
              {p.member_count} {p.member_count === 1 ? "member" : "members"}
            </p>

            {p.already_member ? (
              <button
                type="button"
                onClick={() => openWorkspace(p.workspace_id)}
                className="cv-btn-primary mt-7 flex h-11 w-full items-center justify-center rounded-[7px] text-[16px] font-medium text-white"
              >
                Open workspace
              </button>
            ) : p.key_valid ? (
              <>
                <button
                  type="button"
                  disabled={join.isPending}
                  onClick={() => join.mutate({ key: inviteKey ?? undefined })}
                  className="cv-btn-primary mt-7 flex h-11 w-full items-center justify-center rounded-[7px] text-[16px] font-medium text-white disabled:opacity-55"
                >
                  {join.isPending ? "Joining..." : `Join ${p.workspace_name}`}
                </button>
                {error && <p className="mt-3 text-[14px] text-[var(--cd-red)]">{error}</p>}
              </>
            ) : p.accepts_password ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (password) join.mutate({ password });
                }}
                className="mt-7 text-left"
              >
                {inviteKey && (
                  <p className="mb-4 rounded-[7px] bg-[#fff4de] px-3.5 py-2.5 text-[14px] text-[#8f5400]">
                    This invite link has been reset. You can still join with the workspace password.
                  </p>
                )}
                <label htmlFor="cd-join-password" className="mb-2 block text-[15px] font-medium">
                  Workspace password
                </label>
                <input
                  id="cd-join-password"
                  type="password"
                  autoFocus
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (join.isError) join.reset();
                  }}
                  placeholder="Ask your workspace admin for it"
                  autoComplete="off"
                  className={cn("cd-input", error && "border-[var(--cd-red)]")}
                />
                {error && <p className="mt-2 text-[14px] text-[var(--cd-red)]">{error}</p>}
                <button
                  type="submit"
                  disabled={!password || join.isPending}
                  className="cv-btn-primary mt-5 flex h-11 w-full items-center justify-center rounded-[7px] text-[16px] font-medium text-white disabled:opacity-55"
                >
                  {join.isPending ? "Joining..." : "Join workspace"}
                </button>
              </form>
            ) : (
              <p className="mt-6 rounded-[7px] bg-[#f5f6fa] px-4 py-3 text-[15px] text-[var(--cd-fg-2)]">
                {inviteKey
                  ? "This invite link has been reset. Ask a workspace admin for a new one."
                  : "This workspace isn't accepting new members right now. Ask a workspace admin for an invite link."}
              </p>
            )}
          </>
        ) : null}
      </div>
    </OnboardingFrame>
  );
}
