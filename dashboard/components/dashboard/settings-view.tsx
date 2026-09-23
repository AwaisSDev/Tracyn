"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, KeyRound, MoreHorizontal, Plus } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { useWorkspace } from "@/lib/workspace-context";
import type { ApiKey } from "@/lib/types";
import { startOfMonth, useAgents, useEvents, useQuestionnaires } from "./data";
import { MembersTab } from "./members-view";
import {
  Button,
  Card,
  ErrorText,
  Modal,
  Page,
  PageHeader,
  PLAN_INFO,
  PLAN_LIMITS,
  Segmented,
  Skel,
  timeAgo,
} from "./ui";

type Tab = "account" | "members" | "keys" | "billing";

export function SettingsView() {
  const router = useRouter();
  const params = useSearchParams();
  const raw = params.get("tab");
  // The pricing page lands here as /settings?plan=<id> after sign-up, and
  // Whop returns here as /settings?billing=success&plan=<id>. Both belong
  // on the billing tab.
  const plan = params.get("plan");
  const billingReturn = params.get("billing") === "success";
  const tab: Tab = raw === "members" || raw === "keys" || raw === "billing" ? raw : plan || billingReturn ? "billing" : "account";

  return (
    <Page>
      <PageHeader title="Settings" subtitle="Your account, who's in this workspace, the keys your agents use, and your plan." />
      <div className="mt-7">
        <Segmented
          label="Settings section"
          value={tab}
          onChange={(t) => router.replace(t === "account" ? "/settings" : `/settings?tab=${t}`, { scroll: false })}
          options={[
            { value: "account", label: "Account" },
            { value: "members", label: "Members" },
            { value: "keys", label: "API keys" },
            { value: "billing", label: "Plan and billing" },
          ]}
        />
      </div>
      <div className="mt-6 space-y-4">
        {tab === "account" && <Account />}
        {tab === "members" && <MembersTab />}
        {tab === "keys" && <Keys />}
        {tab === "billing" && <Billing intent={billingReturn ? null : plan} />}
      </div>
      <PaymentSuccess />
    </Page>
  );
}

// Two-column settings row: what it is on the left, the control on the right.
function Row({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-3 px-5 py-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] md:gap-8">
      <div>
        <div className="text-[15.5px] font-medium">{title}</div>
        {hint && <p className="mt-0.5 text-[14px] leading-[1.5] text-[var(--cd-fg-2)]">{hint}</p>}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function CardFooter({ children, note }: { children: React.ReactNode; note?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-[var(--cd-line)] bg-[#fafbfd] px-5 py-3">
      <span className="text-[13.5px] text-[var(--cd-fg-3)]">{note}</span>
      <div className="flex gap-2">{children}</div>
    </div>
  );
}

const MIN_PASSWORD = 6; // same minimum as sign-up

// The signed-in person's own account, straight against Supabase Auth with
// their session: display name (user_metadata.full_name) and password.
// Deleting the account goes through the backend (routers/account.py), which
// checks the password again and cleans up owned workspaces first.
function Account() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, [supabase]);

  if (!user) return <AccountSkeleton />;

  return (
    <>
      <ProfileCard user={user} onSaved={setUser} />
      <PasswordCard email={user.email ?? ""} />
      <DeleteAccountCard email={user.email ?? ""} />
    </>
  );
}

function ProfileCard({ user, onSaved }: { user: User; onSaved: (u: User) => void }) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const original = (user.user_metadata?.full_name as string | undefined) ?? "";
  const [name, setName] = useState(original);
  const [saved, setSaved] = useState(false);

  const save = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.auth.updateUser({ data: { full_name: name.trim() } });
      if (error) throw error;
      return data.user;
    },
    onSuccess: (u) => {
      if (u) onSaved(u);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  const dirty = name.trim() !== original;

  return (
    <Card className="overflow-hidden">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (dirty) save.mutate();
        }}
      >
        <div className="divide-y divide-[var(--cd-line)]">
          <Row title="Name" hint="Shown in the sidebar and on decisions you make.">
            <input id="cd-account-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" autoComplete="name" className="cd-input" />
          </Row>
          <Row title="Email" hint="The address you sign in with.">
            <div className="flex h-[42px] items-center text-[15.5px] text-[var(--cd-fg-2)]">{user.email}</div>
          </Row>
        </div>
        <CardFooter note={save.error ? <ErrorText error={save.error} /> : saved ? "Saved" : undefined}>
          <button
            type="submit"
            disabled={!dirty || save.isPending}
            className="cv-btn-primary inline-flex h-9 items-center rounded-[6px] px-3.5 text-[14.5px] font-medium text-white disabled:cursor-not-allowed disabled:opacity-55"
          >
            {save.isPending ? "Saving..." : "Save"}
          </button>
        </CardFooter>
      </form>
    </Card>
  );
}

function PasswordCard({ email }: { email: string }) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const change = useMutation({
    mutationFn: async () => {
      // Confirm it's really them before changing anything: the current
      // password has to sign in.
      const check = await supabase.auth.signInWithPassword({ email, password: current });
      if (check.error) throw new Error("Your current password isn't right.");
      const { error } = await supabase.auth.updateUser({ password: next });
      if (error) throw error;
    },
    onSuccess: () => {
      setCurrent("");
      setNext("");
      setConfirm("");
      setDone(true);
      setTimeout(() => setDone(false), 3000);
    },
  });

  function submit() {
    setProblem(null);
    if (next.length < MIN_PASSWORD) return setProblem(`Use at least ${MIN_PASSWORD} characters.`);
    if (next !== confirm) return setProblem("The new passwords don't match.");
    if (next === current) return setProblem("Pick a password different from your current one.");
    change.mutate();
  }

  const ready = current && next && confirm;

  return (
    <Card className="overflow-hidden">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (ready) submit();
        }}
      >
        <div className="divide-y divide-[var(--cd-line)]">
          <Row title="Password" hint="Enter your current password, then the new one twice.">
            <div className="space-y-2.5">
              <input
                id="cd-password-current"
                type="password"
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                placeholder="Current password"
                autoComplete="current-password"
                className="cd-input"
              />
              <input
                id="cd-password-new"
                type="password"
                value={next}
                onChange={(e) => {
                  setNext(e.target.value);
                  setProblem(null);
                }}
                placeholder="New password"
                autoComplete="new-password"
                className="cd-input"
              />
              <input
                id="cd-password-confirm"
                type="password"
                value={confirm}
                onChange={(e) => {
                  setConfirm(e.target.value);
                  setProblem(null);
                }}
                placeholder="Confirm new password"
                autoComplete="new-password"
                className={cn("cd-input", problem === "The new passwords don't match." && "border-[var(--cd-red)]")}
              />
            </div>
          </Row>
        </div>
        <CardFooter
          note={
            problem ? (
              <span className="text-[var(--cd-red)]">{problem}</span>
            ) : change.error ? (
              <ErrorText error={change.error} />
            ) : done ? (
              "Password changed"
            ) : undefined
          }
        >
          <button
            type="submit"
            disabled={!ready || change.isPending}
            className="cv-btn-primary inline-flex h-9 items-center rounded-[6px] px-3.5 text-[14.5px] font-medium text-white disabled:cursor-not-allowed disabled:opacity-55"
          >
            {change.isPending ? "Changing..." : "Change password"}
          </button>
        </CardFooter>
      </form>
    </Card>
  );
}

function DeleteAccountCard({ email }: { email: string }) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");

  const remove = useMutation({
    mutationFn: () => api.post("/v1/account/delete", { password }),
    onSuccess: async () => {
      await supabase.auth.signOut();
      try {
        localStorage.removeItem("tracyn_workspace_id");
      } catch {
        // storage unavailable; nothing to clear
      }
      // Full navigation so middleware sees the cleared session.
      window.location.href = "/";
    },
  });

  // The API error text is "403 Forbidden: {detail}"; show just the detail.
  const errorText = remove.error instanceof Error ? friendlyApiError(remove.error.message) : null;

  return (
    <>
      <Card className="overflow-hidden border-[#efc4c4]">
        <div className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1">
            <div className="text-[15.5px] font-semibold text-[var(--cd-red)]">Delete account</div>
            <p className="mt-1 text-[14px] leading-[1.5] text-[var(--cd-fg-2)]">
              Permanently deletes {email}. Workspaces only you are in are erased with all their data, audit log included.
              A workspace with other members passes to one of them.
            </p>
          </div>
          <Button variant="danger" onClick={() => setOpen(true)}>
            Delete account
          </Button>
        </div>
      </Card>

      <Modal
        open={open}
        onClose={() => {
          if (remove.isPending) return;
          setOpen(false);
          setPassword("");
          remove.reset();
        }}
        title="Delete your account?"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (password) remove.mutate();
          }}
        >
          <div className="space-y-2 text-[14.5px] leading-[1.55] text-[var(--cd-fg-2)]">
            <p>This can&apos;t be undone. It will:</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>erase every workspace only you are in, with its events, approvals, evidence packs and keys</li>
              <li>cancel any paid plan on those workspaces</li>
              <li>hand workspaces you share to another member</li>
              <li>sign you out and remove {email}</li>
            </ul>
          </div>
          <label htmlFor="cd-delete-password" className="mb-2 mt-5 block text-[14.5px] font-medium">
            Enter your password to confirm
          </label>
          <input
            id="cd-delete-password"
            type="password"
            autoFocus
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (remove.isError) remove.reset();
            }}
            autoComplete="current-password"
            className="cd-input"
          />
          {errorText && <p className="mt-2 text-[14px] text-[var(--cd-red)]">{errorText}</p>}
          <div className="mt-6 flex justify-end gap-2">
            <Button
              disabled={remove.isPending}
              onClick={() => {
                setOpen(false);
                setPassword("");
                remove.reset();
              }}
            >
              Cancel
            </Button>
            <button
              type="submit"
              disabled={!password || remove.isPending}
              className="inline-flex h-10 items-center rounded-[6px] bg-[var(--cd-red)] px-4 text-[15px] font-medium text-white shadow-[0_0_0_1px_#b83535] hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-55"
            >
              {remove.isPending ? "Deleting..." : "Delete my account"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}

function friendlyApiError(message: string): string {
  const body = message.replace(/^\d{3}[^:]*:\s*/, "");
  try {
    const parsed = JSON.parse(body) as { detail?: unknown };
    if (typeof parsed.detail === "string") return parsed.detail;
  } catch {
    // not JSON; fall through
  }
  return body || "Something went wrong. Try again.";
}

function Keys() {
  const { workspace } = useWorkspace();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [reviewer, setReviewer] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState<"key" | "env" | null>(null);
  const [menu, setMenu] = useState<string | null>(null);
  const [confirmRevoke, setConfirmRevoke] = useState<ApiKey | null>(null);

  const { data: keys = [], isPending } = useQuery({
    queryKey: ["api-keys", workspace?.id],
    queryFn: () => api.get<ApiKey[]>(`/v1/workspaces/${workspace!.id}/api-keys`),
    enabled: !!workspace,
  });

  const create = useMutation({
    mutationFn: () => api.post<{ full_key: string }>(`/v1/workspaces/${workspace!.id}/api-keys`, { name, can_review: reviewer }),
    onSuccess: (res) => {
      setNewKey(res.full_key);
      setName("");
      setReviewer(false);
      setCreating(false);
      queryClient.invalidateQueries({ queryKey: ["api-keys", workspace?.id] });
    },
  });

  const revoke = useMutation({
    mutationFn: (id: string) => api.delete(`/v1/workspaces/${workspace!.id}/api-keys/${id}`),
    onSuccess: () => {
      setConfirmRevoke(null);
      queryClient.invalidateQueries({ queryKey: ["api-keys", workspace?.id] });
    },
  });

  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [menu]);

  async function copy(text: string, which: "key" | "env") {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(which);
      setTimeout(() => setCopied(null), 1600);
    } catch {
      setCopied(null);
    }
  }

  const active = keys.filter((k) => !k.revoked_at);
  const revoked = keys.filter((k) => k.revoked_at);
  const env = newKey ? `TRACYN_API_KEY=${newKey}` : "";

  return (
    <>
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-5 py-4">
          <div>
            <div className="text-[15.5px] font-semibold">API keys</div>
            <p className="mt-0.5 text-[14px] text-[var(--cd-fg-2)]">Agents log events with an agent key. Reviewer keys can also approve, for the MCP connector.</p>
          </div>
          {!creating && (
            <Button size="sm" onClick={() => setCreating(true)}>
              <Plus className="h-3.5 w-3.5" />
              New key
            </Button>
          )}
        </div>

        {creating && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (name.trim()) create.mutate();
            }}
            className="cd-pop-in flex flex-col gap-3 border-t border-[var(--cd-line)] bg-[#fafbfd] px-5 py-4 sm:flex-row sm:items-center"
          >
            <input
              id="cd-key-name"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Key name, e.g. Production agents"
              className="cd-input sm:max-w-[280px]"
            />
            <label className="flex items-center gap-2 text-[15px] text-[var(--cd-fg-2)]">
              <input id="cd-key-reviewer" type="checkbox" checked={reviewer} onChange={(e) => setReviewer(e.target.checked)} className="h-4 w-4 accent-[#3553d4]" />
              Can approve (reviewer)
            </label>
            <div className="flex gap-2 sm:ml-auto">
              <Button variant="ghost" size="sm" onClick={() => setCreating(false)}>
                Cancel
              </Button>
              <button type="submit" disabled={!name.trim() || create.isPending} className={cn("cv-btn-primary inline-flex h-8 items-center rounded-[6px] px-3 text-[14px] font-medium text-white disabled:opacity-55")}>
                {create.isPending ? "Creating..." : "Create key"}
              </button>
            </div>
          </form>
        )}
        {create.error && (
          <div className="px-5 pb-3">
            <ErrorText error={create.error} />
          </div>
        )}

        {/* Phones get one stacked row per key instead of the table. */}
        <ul className="divide-y divide-[var(--cd-line)] border-t border-[var(--cd-line)] sm:hidden">
          {active.map((k) => (
            <li key={k.id} className="flex items-center gap-3 px-5 py-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-[16px] font-medium">{k.name}</span>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2 py-[2px] text-[12.5px] font-medium",
                      k.can_review ? "bg-[var(--cd-blue-soft)] text-[var(--cd-blue-ink)]" : "bg-[#f1f3f9] text-[var(--cd-fg-2)]"
                    )}
                  >
                    {k.can_review ? "Reviewer" : "Agent"}
                  </span>
                </div>
                <div className="mt-1 text-[14px] text-[var(--cd-fg-3)]">
                  <span className="cd-mono">{k.key_prefix}••••</span> · {k.last_used_at ? `used ${timeAgo(k.last_used_at)}` : "never used"}
                </div>
              </div>
              <Button size="sm" variant="danger" onClick={() => setConfirmRevoke(k)}>
                Revoke
              </Button>
            </li>
          ))}
          {isPending &&
            Array.from({ length: 2 }).map((_, i) => (
              <li key={i} className="flex items-center gap-3 px-5 py-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Skel className="h-4 w-32" />
                    <Skel className="h-[20px] w-16 rounded-full" />
                  </div>
                  <Skel className="mt-2 h-[14px] w-44" />
                </div>
                <Skel className="h-9 w-[74px] rounded-[6px]" />
              </li>
            ))}
          {!isPending && active.length === 0 && <li className="px-5 py-8 text-center text-[15px] text-[var(--cd-fg-3)]">No active keys. Create one to start logging.</li>}
        </ul>
        <div className="hidden overflow-x-auto border-t border-[var(--cd-line)] sm:block">
          <table className="w-full min-w-[520px] text-[15px]">
            <thead>
              <tr className="border-b border-[var(--cd-line)] text-left text-[13px] text-[var(--cd-fg-3)]">
                <th className="h-10 pl-5 pr-3 font-medium">Name</th>
                <th className="px-3 font-medium">Key</th>
                <th className="px-3 font-medium">Access</th>
                <th className="hidden px-3 font-medium md:table-cell">Created</th>
                <th className="whitespace-nowrap px-3 font-medium">Last used</th>
                <th className="w-12 pr-5" />
              </tr>
            </thead>
            <tbody>
              {isPending &&
                Array.from({ length: 2 }).map((_, i) => (
                  <tr key={i} className="border-b border-[var(--cd-line)] last:border-0">
                    <td className="py-3.5 pl-5 pr-3">
                      <Skel className="h-[15px] w-36" />
                    </td>
                    <td className="px-3">
                      <Skel className="h-[13.5px] w-32" />
                    </td>
                    <td className="px-3">
                      <Skel className="h-[22px] w-[72px] rounded-full" />
                    </td>
                    <td className="hidden px-3 md:table-cell">
                      <Skel className="h-[15px] w-16" />
                    </td>
                    <td className="px-3">
                      <Skel className="h-[15px] w-16" />
                    </td>
                    <td className="pr-5">
                      <Skel className="ml-auto h-6 w-6 rounded-[6px]" />
                    </td>
                  </tr>
                ))}
              {active.map((k) => (
                <tr key={k.id} className="border-b border-[var(--cd-line)] last:border-0">
                  <td className="py-3 pl-5 pr-3 font-medium">
                    <span className="inline-flex items-center gap-2">
                      <KeyRound className="h-3.5 w-3.5 text-[var(--cd-fg-3)]" />
                      {k.name}
                    </span>
                  </td>
                  <td className="cd-mono px-3 text-[13.5px] text-[var(--cd-fg-2)]">{k.key_prefix}••••</td>
                  <td className="px-3">
                    <span
                      className={cn(
                        "rounded-full px-2 py-[2px] text-[13px] font-medium",
                        k.can_review ? "bg-[var(--cd-blue-soft)] text-[var(--cd-blue-ink)]" : "bg-[#f1f3f9] text-[var(--cd-fg-2)]"
                      )}
                    >
                      {k.can_review ? "Reviewer" : "Agent"}
                    </span>
                  </td>
                  <td className="hidden whitespace-nowrap px-3 text-[var(--cd-fg-2)] md:table-cell">{timeAgo(k.created_at)}</td>
                  <td className="whitespace-nowrap px-3 text-[var(--cd-fg-2)]">{k.last_used_at ? timeAgo(k.last_used_at) : "Never"}</td>
                  <td className="relative pr-5 text-right">
                    <button
                      type="button"
                      aria-label={`Actions for ${k.name}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenu(menu === k.id ? null : k.id);
                      }}
                      className="rounded-[5px] p-1 text-[var(--cd-fg-3)] hover:bg-[var(--cd-hover)] hover:text-[var(--cd-ink)]"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                    {menu === k.id && (
                      <div className="cd-pop-in cd-float absolute right-5 top-[calc(100%-6px)] z-10 w-40 rounded-[7px] bg-white p-1 text-left">
                        <button
                          type="button"
                          onClick={() => setConfirmRevoke(k)}
                          className="flex h-8 w-full items-center rounded-[5px] px-2.5 text-[15px] text-[var(--cd-red)] hover:bg-[#fdf1f1]"
                        >
                          Revoke key
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {!isPending && active.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-[var(--cd-fg-3)]">
                    No active keys. Create one to start logging.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {revoked.length > 0 && (
          <div className="border-t border-[var(--cd-line)] px-5 py-3 text-[13.5px] text-[var(--cd-fg-3)]">
            {revoked.length} revoked {revoked.length === 1 ? "key" : "keys"} hidden
          </div>
        )}
      </Card>

      <Modal open={!!newKey} onClose={() => setNewKey(null)} title="Save your new key">
        <p className="text-[15.5px] text-[var(--cd-fg-2)]">This is the only time the full key is shown. Store it somewhere safe, like your secrets manager.</p>
        <div className="mt-4 flex items-center gap-2 rounded-[7px] border border-[var(--cd-line)] bg-[#fafbfd] p-2 pl-3">
          <code className="cd-mono min-w-0 flex-1 truncate text-[13.5px]">{newKey}</code>
          <Button size="sm" onClick={() => newKey && copy(newKey, "key")}>
            {copied === "key" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied === "key" ? "Copied" : "Copy"}
          </Button>
        </div>
        <div className="mt-4 text-[13.5px] font-medium text-[var(--cd-fg-3)]">Paste into your .env</div>
        <div className="mt-1.5 flex items-center gap-2 rounded-[7px] bg-[#0f1222] p-2 pl-3">
          <code className="cd-mono min-w-0 flex-1 truncate text-[13.5px] text-[#dfe5ff]">{env}</code>
          <button
            type="button"
            onClick={() => copy(env, "env")}
            className="inline-flex h-7 items-center gap-1.5 rounded-[5px] bg-white/10 px-2.5 text-[13.5px] font-medium text-white hover:bg-white/15"
          >
            {copied === "env" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied === "env" ? "Copied" : "Copy"}
          </button>
        </div>
        <div className="mt-6 flex justify-end">
          <Button variant="primary" onClick={() => setNewKey(null)}>
            Done
          </Button>
        </div>
      </Modal>

      <Modal open={!!confirmRevoke} onClose={() => setConfirmRevoke(null)} title={`Revoke "${confirmRevoke?.name}"?`}>
        <p className="text-[15.5px] text-[var(--cd-fg-2)]">Anything using this key stops working right away. This can&apos;t be undone.</p>
        <ErrorText error={revoke.error} />
        <div className="mt-6 flex justify-end gap-2">
          <Button onClick={() => setConfirmRevoke(null)}>Cancel</Button>
          <button
            type="button"
            disabled={revoke.isPending}
            onClick={() => confirmRevoke && revoke.mutate(confirmRevoke.id)}
            className="inline-flex h-9 items-center rounded-[6px] bg-[var(--cd-red)] px-3.5 text-[15.5px] font-medium text-white shadow-[0_0_0_1px_#b83535] hover:brightness-105 disabled:opacity-55"
          >
            {revoke.isPending ? "Revoking..." : "Revoke key"}
          </button>
        </div>
      </Modal>
    </>
  );
}

const PLANS = [
  { id: "starter", blurb: "10 agents · 50k events a month · 10 evidence packs" },
  { id: "pro", blurb: "50 agents · 250k events a month · unlimited evidence packs" },
  { id: "enterprise", blurb: "Unlimited agents · custom contract and retention" },
] as const;

const PLAN_IDS = ["starter", "pro", "enterprise"];

function PaymentSuccess() {
  const { workspace } = useWorkspace();
  const router = useRouter();
  const params = useSearchParams();
  const [plan, setPlan] = useState<string | null>(null);

  useEffect(() => {
    if (params.get("billing") !== "success") return;
    setPlan(params.get("plan"));
    // Drop the query so a refresh doesn't show this again.
    router.replace("/settings?tab=billing", { scroll: false });
  }, [params, router]);

  // Whop's webhook that flips the plan can land a few seconds after the
  // redirect, so poll briefly until the workspace shows the new plan.
  const confirmed = !!plan && workspace?.plan === plan;
  const { data: polled } = useQuery({
    queryKey: ["workspaces", "billing-poll"],
    queryFn: () => api.get<{ plan: string }[]>("/v1/workspaces"),
    enabled: !!plan && !confirmed,
    refetchInterval: 2000,
  });
  const active = confirmed || polled?.some((w) => w.plan === plan);
  const name = plan && PLAN_IDS.includes(plan) ? PLAN_INFO[plan].name : plan;

  return (
    <Modal open={!!plan} onClose={() => setPlan(null)} title="Payment successful">
      <div className="flex items-center gap-3 rounded-[8px] border border-[var(--cd-line)] bg-[#fafbfd] p-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#e3f5ec] text-[var(--cd-green)]">
          <Check className="h-5 w-5" />
        </span>
        <p className={cn("text-[15.5px]", !active && "animate-pulse text-[var(--cd-fg-2)]")}>
          {active ? `You're on the ${name} plan now.` : `Activating your ${name} plan...`}
        </p>
      </div>
      <div className="mt-6 flex justify-end">
        <Button variant="primary" onClick={() => setPlan(null)}>
          Done
        </Button>
      </div>
    </Modal>
  );
}

function Billing({ intent }: { intent: string | null }) {
  const { workspace } = useWorkspace();
  const { data: events = [], isPending: eventsPending } = useEvents();
  const { agents, isPending: agentsPending } = useAgents();
  const { data: questionnaires = [], isPending: packsPending } = useQuestionnaires();
  const plan = workspace?.plan ?? "free";
  const limits = PLAN_LIMITS[plan];

  const since = startOfMonth();
  const monthEvents = events.filter((e) => new Date(e.created_at).getTime() >= since).length;
  const monthPacks = questionnaires.filter((q) => new Date(q.created_at).getTime() >= since).length;

  const checkout = useMutation({
    mutationFn: (p: string) => api.post<{ checkout_url: string }>(`/v1/workspaces/${workspace!.id}/billing/checkout`, { plan: p }),
    onSuccess: (res) => {
      window.location.href = res.checkout_url;
    },
  });

  const picked = intent && intent !== "enterprise" && PLANS.some((p) => p.id === intent) ? intent : null;

  return (
    <>
      {picked && (
        <Card className="flex flex-col gap-3 border-[var(--cd-blue)] p-5 sm:flex-row sm:items-center">
          <p className="flex-1 text-[15.5px]">
            {plan === picked ? (
              <>
                {workspace?.name} is already on <span className="font-semibold">{PLAN_INFO[picked].name}</span>.
              </>
            ) : (
              <>
                You picked <span className="font-semibold">{PLAN_INFO[picked].name}</span> ({PLAN_INFO[picked].price}) for{" "}
                <span className="font-semibold">{workspace?.name}</span>.
              </>
            )}
          </p>
          {plan !== picked && (
            <Button variant="primary" disabled={checkout.isPending} onClick={() => checkout.mutate(picked)}>
              {checkout.isPending ? "Loading..." : "Continue to checkout"}
            </Button>
          )}
        </Card>
      )}
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-start justify-between gap-4 px-5 py-5">
          <div>
            <div className="text-[13.5px] text-[var(--cd-fg-3)]">Current plan</div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-[25px] font-semibold tracking-[-0.025em]">{PLAN_INFO[plan].name}</span>
              <span className="text-[15.5px] text-[var(--cd-fg-2)]">{PLAN_INFO[plan].price}</span>
            </div>
          </div>
          <span className="text-[13.5px] text-[var(--cd-fg-3)]">
            Usage resets {new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
          </span>
        </div>
        <div className="grid gap-5 border-t border-[var(--cd-line)] px-5 py-5 sm:grid-cols-3">
          <Usage label="Events this month" used={monthEvents} limit={limits.events} loading={eventsPending} />
          <Usage label="Agents" used={agents.length} limit={limits.agents} loading={agentsPending} />
          <Usage label="Evidence packs this month" used={monthPacks} limit={limits.questionnaires} loading={packsPending} />
        </div>
      </Card>

      <Card className="divide-y divide-[var(--cd-line)] overflow-hidden">
        <div className="px-5 py-4 text-[15.5px] font-semibold">Plans</div>
        {PLANS.map((p) => {
          const current = plan === p.id;
          return (
            <div key={p.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-[16px] font-medium">{PLAN_INFO[p.id].name}</span>
                  <span className="text-[15px] text-[var(--cd-fg-2)]">{PLAN_INFO[p.id].price}</span>
                  {p.id === "pro" && (
                    <span className="rounded-full bg-[var(--cd-blue-soft)] px-2 py-[1px] text-[12.5px] font-medium text-[var(--cd-blue-ink)]">Recommended</span>
                  )}
                </div>
                <p className="mt-0.5 text-[14px] text-[var(--cd-fg-2)]">{p.blurb}</p>
              </div>
              {current ? (
                <span className="text-[14px] font-medium text-[var(--cd-fg-3)]">Current plan</span>
              ) : p.id === "enterprise" ? (
                <a href="https://cal.com/awais-siddique/30min" target="_blank" rel="noopener noreferrer" className="cd-btn-secondary inline-flex h-8 items-center rounded-[6px] px-3 text-[14px] font-medium">
                  Book a call
                </a>
              ) : (
                <Button size="sm" variant={p.id === "pro" ? "primary" : "secondary"} disabled={checkout.isPending} onClick={() => checkout.mutate(p.id)}>
                  {checkout.isPending && checkout.variables === p.id ? "Loading..." : `Upgrade to ${PLAN_INFO[p.id].name}`}
                </Button>
              )}
            </div>
          );
        })}
        {checkout.error && (
          <div className="px-5 py-3">
            <ErrorText error={checkout.error} />
          </div>
        )}
      </Card>
    </>
  );
}

function Usage({ label, used, limit, loading }: { label: string; used: number; limit: number | null; loading?: boolean }) {
  const over = limit != null && used > limit;
  const pct = limit ? Math.min(100, (used / limit) * 100) : 0;
  if (loading) {
    return (
      <div>
        <div className="text-[13.5px] text-[var(--cd-fg-2)]">{label}</div>
        <div className="mt-2 flex items-end gap-1.5">
          <Skel className="h-[22px] w-12" />
          <Skel className="mb-0.5 h-[14px] w-14" />
        </div>
        <Skel className="mt-2.5 h-1.5 w-full rounded-full" />
      </div>
    );
  }
  return (
    <div>
      <div className="text-[13.5px] text-[var(--cd-fg-2)]">{label}</div>
      <div className="mt-1.5 flex items-baseline gap-1.5">
        <span className="text-[22px] font-semibold tabular-nums tracking-[-0.02em]">{used.toLocaleString()}</span>
        <span className="text-[14px] tabular-nums text-[var(--cd-fg-3)]">/ {limit == null ? "Unlimited" : limit.toLocaleString()}</span>
      </div>
      <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-[#eef0f6]">
        <div
          className="h-full rounded-full"
          style={{ width: `${limit == null ? 0 : Math.max(pct, used > 0 ? 2 : 0)}%`, background: over ? "var(--cd-amber)" : "var(--cd-blue)" }}
        />
      </div>
      {over && <p className="mt-1.5 text-[13px] text-[#9a5b00]">Over your plan limit</p>}
    </div>
  );
}

// Same cards and rows as the Account tab, so nothing shifts when it loads.
function AccountSkeleton() {
  const row = (lines: number) => (
    <div className="grid gap-3 px-5 py-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] md:gap-8">
      <div className="space-y-2">
        <Skel className="h-[15px] w-24" />
        <Skel className="h-[13px] w-52 max-w-full" />
      </div>
      <div className="space-y-2.5">
        {Array.from({ length: lines }).map((_, i) => (
          <Skel key={i} className="h-[42px] w-full rounded-[7px]" />
        ))}
      </div>
    </div>
  );
  const footer = (w: number) => (
    <div className="flex justify-end border-t border-[var(--cd-line)] bg-[#fafbfd] px-5 py-3">
      <Skel className="h-9 rounded-[6px]" style={{ width: w }} />
    </div>
  );
  return (
    <>
      <Card className="overflow-hidden">
        <div className="divide-y divide-[var(--cd-line)]">
          {row(1)}
          {row(1)}
        </div>
        {footer(64)}
      </Card>
      <Card className="overflow-hidden">
        {row(3)}
        {footer(150)}
      </Card>
      <Card className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1 space-y-2">
          <Skel className="h-4 w-32" />
          <Skel className="h-[14px] w-full" />
          <Skel className="h-[14px] w-3/4" />
        </div>
        <Skel className="h-10 w-36 rounded-[6px]" />
      </Card>
    </>
  );
}
