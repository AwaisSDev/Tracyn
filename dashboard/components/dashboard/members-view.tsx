"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, Crown, Link2, LockKeyhole, MoreHorizontal, RefreshCw } from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { joinPath } from "@/lib/invite";
import { useWorkspace } from "@/lib/workspace-context";
import type { InviteSettings, Member, WorkspaceRole } from "@/lib/types";
import { friendlyError, openWorkspace } from "./onboarding";
import { Button, Card, Modal, Skel, timeAgo } from "./ui";

const ROLE_LABEL: Record<WorkspaceRole, string> = { owner: "Owner", admin: "Admin", member: "Member" };

// Settings > Members: everyone in the workspace, what they can do, and (for
// owners and admins) how new people join. Permissions are enforced by the
// backend (routers/members.py); this only hides actions a role can't take.
export function MembersTab() {
  const { workspace } = useWorkspace();
  const { data: members = [], isPending } = useQuery({
    queryKey: ["members", workspace?.id],
    queryFn: () => api.get<Member[]>(`/v1/workspaces/${workspace!.id}/members`),
    enabled: !!workspace,
  });
  const me = members.find((m) => m.is_me);
  const myRole: WorkspaceRole | null = me?.role ?? (workspace?.role as WorkspaceRole | undefined) ?? null;
  const canInvite = myRole === "owner" || myRole === "admin";

  return (
    <>
      {canInvite && <InviteCard />}
      <PeopleCard members={members} loading={isPending} myRole={myRole} />
    </>
  );
}

// ---------- people ----------

type Pending =
  | { kind: "remove"; member: Member }
  | { kind: "leave"; member: Member }
  | { kind: "transfer"; member: Member }
  | null;

function PeopleCard({ members, loading, myRole }: { members: Member[]; loading: boolean; myRole: WorkspaceRole | null }) {
  const { workspace, workspaces } = useWorkspace();
  const queryClient = useQueryClient();
  const [menu, setMenu] = useState<string | null>(null);
  const [pending, setPending] = useState<Pending>(null);

  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [menu]);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["members", workspace?.id] });
    queryClient.invalidateQueries({ queryKey: ["workspaces"] });
  };

  const setRole = useMutation({
    mutationFn: (v: { userId: string; role: "admin" | "member" }) =>
      api.patch(`/v1/workspaces/${workspace!.id}/members/${v.userId}`, { role: v.role }),
    onSettled: refresh,
  });

  const confirm = useMutation({
    mutationFn: async (p: NonNullable<Pending>) => {
      if (p.kind === "transfer") return api.post(`/v1/workspaces/${workspace!.id}/transfer`, { user_id: p.member.user_id });
      return api.delete(`/v1/workspaces/${workspace!.id}/members/${p.member.user_id}`);
    },
    onSuccess: (_d, p) => {
      if (p.kind === "leave") {
        const next = workspaces.find((w) => w.id !== workspace?.id);
        if (next) openWorkspace(next.id);
        else window.location.href = "/dashboard";
        return;
      }
      setPending(null);
      refresh();
    },
  });

  function actionsFor(m: Member): { label: string; run: () => void }[] {
    if (m.is_me) return [];
    const list: { label: string; run: () => void }[] = [];
    if (myRole === "owner" && m.role !== "owner") {
      list.push(
        m.role === "admin"
          ? { label: "Make member", run: () => setRole.mutate({ userId: m.user_id, role: "member" }) }
          : { label: "Make admin", run: () => setRole.mutate({ userId: m.user_id, role: "admin" }) }
      );
      list.push({ label: "Make owner", run: () => setPending({ kind: "transfer", member: m }) });
    }
    return list;
  }

  function canRemove(m: Member) {
    return !m.is_me && ((myRole === "owner" && m.role !== "owner") || (myRole === "admin" && m.role === "member"));
  }

  const counts = members.reduce<Record<string, number>>((c, m) => ({ ...c, [m.role]: (c[m.role] ?? 0) + 1 }), {});

  return (
    <>
      {/* No overflow-hidden here: the row menus need to extend past the card. */}
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-4">
          <div>
            <div className="text-[15.5px] font-semibold">People in {workspace?.name}</div>
            <p className="mt-0.5 text-[14px] text-[var(--cd-fg-2)]">
              The owner and admins manage who can join. Everyone sees the same events, approvals and evidence.
            </p>
          </div>
          {loading ? (
            <Skel className="h-[14px] w-40" />
          ) : (
            <span className="text-[14px] text-[var(--cd-fg-3)]">
              {members.length} {members.length === 1 ? "person" : "people"} · {counts.admin ?? 0} {counts.admin === 1 ? "admin" : "admins"}
            </span>
          )}
        </div>

        <ul className="divide-y divide-[var(--cd-line)] border-t border-[var(--cd-line)]">
          {loading &&
            Array.from({ length: 3 }).map((_, i) => (
              <li key={i} className="flex items-center gap-3.5 px-5 py-4">
                <Skel className="h-10 w-10 shrink-0 rounded-full" />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <Skel className="h-[15.5px] w-36" />
                  <Skel className="h-[13.5px] w-48" />
                </div>
                <Skel className="h-[24px] w-[70px] rounded-full" />
                <Skel className="h-7 w-7 rounded-[6px]" />
              </li>
            ))}
          {members.map((m) => {
            const actions = actionsFor(m);
            const label = m.name ?? m.email ?? "Unknown user";
            return (
              <li key={m.user_id} className="flex items-center gap-3.5 px-5 py-4">
                <span
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[15px] font-semibold",
                    m.role === "owner" ? "bg-[radial-gradient(115%_115%_at_10%_17%,#3553d4_0%,#1c2f9e_100%)] text-white" : "bg-[#e3e7f3] text-[var(--cd-fg-2)]"
                  )}
                >
                  {label.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-[15.5px] font-medium">{label}</span>
                    {m.is_me && <span className="shrink-0 rounded-full bg-[#f1f3f9] px-2 py-[1px] text-[12px] font-medium text-[var(--cd-fg-2)]">You</span>}
                  </div>
                  <div className="truncate text-[13.5px] text-[var(--cd-fg-3)]">
                    {m.name && m.email ? `${m.email} · ` : ""}
                    {m.joined_at ? `joined ${timeAgo(m.joined_at)}` : ""}
                  </div>
                  {m.is_me && m.role === "owner" && members.length > 1 && (
                    <div className="mt-0.5 text-[13px] text-[var(--cd-fg-3)]">To leave, make someone else the owner first.</div>
                  )}
                </div>
                <RolePill role={m.role} />
                {m.is_me && m.role !== "owner" && (
                  <Button size="sm" variant="danger" onClick={() => setPending({ kind: "leave", member: m })}>
                    Leave
                  </Button>
                )}
                {canRemove(m) && (
                  <Button size="sm" variant="danger" onClick={() => setPending({ kind: "remove", member: m })}>
                    Remove
                  </Button>
                )}
                <div className="relative w-8 shrink-0">
                  {actions.length > 0 && (
                    <button
                      type="button"
                      aria-label={`Options for ${label}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenu(menu === m.user_id ? null : m.user_id);
                      }}
                      className="rounded-[6px] p-1.5 text-[var(--cd-fg-3)] hover:bg-[var(--cd-hover)] hover:text-[var(--cd-ink)]"
                    >
                      <MoreHorizontal className="h-[18px] w-[18px]" />
                    </button>
                  )}
                  {menu === m.user_id && (
                    <div className="cd-pop-in cd-float absolute right-0 top-[calc(100%+4px)] z-10 w-52 rounded-[8px] bg-white p-1">
                      {actions.map((a) => (
                        <button
                          key={a.label}
                          type="button"
                          onClick={a.run}
                          className="flex h-9 w-full items-center rounded-[6px] px-3 text-left text-[14.5px] text-[var(--cd-ink)] hover:bg-[var(--cd-hover)]"
                        >
                          {a.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
        {setRole.error && <p className="rounded-b-[10px] border-t border-[var(--cd-line)] px-5 py-3 text-[14px] text-[var(--cd-red)]">{friendlyError(setRole.error)}</p>}
      </Card>

      <Modal
        open={!!pending}
        onClose={() => {
          if (confirm.isPending) return;
          setPending(null);
          confirm.reset();
        }}
        title={
          pending?.kind === "transfer"
            ? `Make ${who(pending.member)} the owner?`
            : pending?.kind === "leave"
              ? `Leave ${workspace?.name}?`
              : pending
                ? `Remove ${who(pending.member)}?`
                : ""
        }
      >
        <p className="text-[15px] leading-[1.55] text-[var(--cd-fg-2)]">
          {pending?.kind === "transfer" &&
            `${who(pending.member)} gets full control of ${workspace?.name}, including billing and who can join. You stay on as an admin.`}
          {pending?.kind === "leave" && "You'll lose access to its events, approvals and evidence packs until someone invites you again."}
          {pending?.kind === "remove" && `They'll lose access to ${workspace?.name} straight away. You can invite them back later.`}
        </p>
        {confirm.error && <p className="mt-3 text-[14px] text-[var(--cd-red)]">{friendlyError(confirm.error)}</p>}
        <div className="mt-6 flex justify-end gap-2">
          <Button
            disabled={confirm.isPending}
            onClick={() => {
              setPending(null);
              confirm.reset();
            }}
          >
            Cancel
          </Button>
          {pending?.kind === "transfer" ? (
            <Button variant="primary" disabled={confirm.isPending} onClick={() => pending && confirm.mutate(pending)}>
              <Crown className="h-4 w-4" />
              {confirm.isPending ? "Transferring..." : "Make owner"}
            </Button>
          ) : (
            <button
              type="button"
              disabled={confirm.isPending}
              onClick={() => pending && confirm.mutate(pending)}
              className="inline-flex h-10 items-center rounded-[6px] bg-[var(--cd-red)] px-4 text-[15px] font-medium text-white shadow-[0_0_0_1px_#b83535] hover:brightness-105 disabled:opacity-55"
            >
              {confirm.isPending ? "Working..." : pending?.kind === "leave" ? "Leave workspace" : "Remove"}
            </button>
          )}
        </div>
      </Modal>
    </>
  );
}

function who(m: Member) {
  return m.name ?? m.email ?? "this person";
}

function RolePill({ role }: { role: WorkspaceRole }) {
  return (
    <span
      className={cn(
        "hidden shrink-0 items-center gap-1 rounded-full px-2.5 py-[3px] text-[12.5px] font-medium sm:inline-flex",
        role === "owner" && "bg-[var(--cd-blue-soft)] text-[var(--cd-blue-ink)]",
        role === "admin" && "bg-[#eef0f6] text-[var(--cd-ink)]",
        role === "member" && "text-[var(--cd-fg-3)] shadow-[inset_0_0_0_1px_var(--cd-line-2)]"
      )}
    >
      {role === "owner" && <Crown className="h-3 w-3" />}
      {ROLE_LABEL[role]}
    </span>
  );
}

// ---------- invites ----------

function InviteCard() {
  const { workspace } = useWorkspace();
  const queryClient = useQueryClient();
  const key = ["invite", workspace?.id];
  const { data: invite, isPending } = useQuery({
    queryKey: key,
    queryFn: () => api.get<InviteSettings>(`/v1/workspaces/${workspace!.id}/invite`),
    enabled: !!workspace,
  });
  const set = (data: InviteSettings) => queryClient.setQueryData(key, data);

  const link = useMutation({
    mutationFn: (enabled: boolean) => api.post<InviteSettings>(`/v1/workspaces/${workspace!.id}/invite/link`, { enabled }),
    onSuccess: set,
  });
  const resetCode = useMutation({
    mutationFn: () => api.post<InviteSettings>(`/v1/workspaces/${workspace!.id}/invite/code`),
    onSuccess: set,
  });

  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const inviteUrl = invite?.link_token ? origin + joinPath(invite.join_code, invite.link_token) : null;
  const plainUrl = invite ? origin + joinPath(invite.join_code) : null;

  return (
    <Card className="overflow-hidden">
      <div className="px-5 pb-1 pt-4">
        <div className="text-[15.5px] font-semibold">Invite people</div>
        <p className="mt-0.5 text-[14px] text-[var(--cd-fg-2)]">New people join as members. Share whichever way suits you; turn either off any time.</p>
      </div>

      <div className="divide-y divide-[var(--cd-line)]">
        {/* One-click invite link */}
        <div className="px-5 py-5">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f1f3f8] text-[var(--cd-fg-2)]">
              <Link2 className="h-[18px] w-[18px]" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-[15px] font-medium">Invite link</div>
                  <div className="text-[13.5px] text-[var(--cd-fg-3)]">Anyone with this link joins in one click, no password needed.</div>
                </div>
                {isPending ? (
                  <Skel className="h-9 w-24 rounded-[6px]" />
                ) : inviteUrl ? (
                  <Button size="sm" variant="ghost" disabled={link.isPending} onClick={() => link.mutate(false)}>
                    Turn off
                  </Button>
                ) : (
                  <Button size="sm" disabled={link.isPending} onClick={() => link.mutate(true)}>
                    {link.isPending ? "Creating..." : "Create link"}
                  </Button>
                )}
              </div>
              {inviteUrl && (
                <>
                  <CopyField value={inviteUrl} id="cd-invite-url" />
                  <button
                    type="button"
                    disabled={link.isPending}
                    onClick={() => link.mutate(true)}
                    className="mt-2 inline-flex items-center gap-1.5 text-[13.5px] font-medium text-[var(--cd-fg-2)] hover:text-[var(--cd-ink)] disabled:opacity-55"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Reset link (the current one stops working)
                  </button>
                </>
              )}
              {link.error && <p className="mt-2 text-[14px] text-[var(--cd-red)]">{friendlyError(link.error)}</p>}
            </div>
          </div>
        </div>

        {/* Workspace link + password */}
        <div className="px-5 py-5">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f1f3f8] text-[var(--cd-fg-2)]">
              <LockKeyhole className="h-[18px] w-[18px]" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[15px] font-medium">Workspace link with a password</div>
              <div className="text-[13.5px] text-[var(--cd-fg-3)]">People open this link and type the workspace password to join.</div>
              {isPending ? (
                <Skel className="mt-3 h-[42px] w-full rounded-[7px]" />
              ) : (
                <>
                  {plainUrl && <CopyField value={plainUrl} id="cd-plain-url" />}
                  {invite && <PasswordControl hasPassword={invite.has_password} onSaved={set} />}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--cd-line)] bg-[#fafbfd] px-5 py-3">
        <span className="text-[13.5px] text-[var(--cd-fg-3)]">Link shared somewhere it shouldn&apos;t be? A new workspace link stops both old links.</span>
        <Button size="sm" variant="ghost" disabled={resetCode.isPending || isPending} onClick={() => resetCode.mutate()}>
          {resetCode.isPending ? "Resetting..." : "New workspace link"}
        </Button>
      </div>
    </Card>
  );
}

function PasswordControl({ hasPassword, onSaved }: { hasPassword: boolean; onSaved: (d: InviteSettings) => void }) {
  const { workspace } = useWorkspace();
  const [editing, setEditing] = useState(!hasPassword);
  const [value, setValue] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => setEditing(!hasPassword), [hasPassword]);

  const save = useMutation({
    mutationFn: (password: string | null) => api.put<InviteSettings>(`/v1/workspaces/${workspace!.id}/invite/password`, { password }),
    onSuccess: (d) => {
      onSaved(d);
      setValue("");
      setEditing(!d.has_password);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  if (hasPassword && !editing) {
    return (
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <span className="inline-flex items-center gap-1.5 text-[14px] text-[var(--cd-green)]">
          <Check className="h-4 w-4" />
          {saved ? "Password saved" : "Password is set"}
        </span>
        <Button size="sm" onClick={() => setEditing(true)}>
          Change password
        </Button>
        <Button size="sm" variant="ghost" disabled={save.isPending} onClick={() => save.mutate(null)}>
          Turn off
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (value.length >= 6) save.mutate(value);
      }}
      className="mt-3"
    >
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          id="cd-workspace-password"
          type="password"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={hasPassword ? "New workspace password" : "Set a workspace password"}
          autoComplete="new-password"
          className="cd-input"
        />
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={value.length < 6 || save.isPending}
            className="cv-btn-primary inline-flex h-[42px] shrink-0 items-center rounded-[6px] px-4 text-[14.5px] font-medium text-white disabled:opacity-55"
          >
            {save.isPending ? "Saving..." : "Save"}
          </button>
          {hasPassword && (
            <Button className="h-[42px]" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          )}
        </div>
      </div>
      <p className="mt-2 text-[13px] text-[var(--cd-fg-3)]">
        {hasPassword ? "Changing it doesn't remove anyone already in." : "At least 6 characters. Until you set one, this link can't be used to join."}
      </p>
      {save.error && <p className="mt-2 text-[14px] text-[var(--cd-red)]">{friendlyError(save.error)}</p>}
    </form>
  );
}

function CopyField({ value, id }: { value: string; id: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="mt-3 flex items-center gap-2 rounded-[7px] border border-[var(--cd-line-2)] bg-[#fafbfd] py-1.5 pl-3.5 pr-1.5">
      <input id={id} readOnly value={value} onFocus={(e) => e.currentTarget.select()} className="min-w-0 flex-1 truncate bg-transparent text-[14px] text-[var(--cd-ink)] outline-none" />
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1600);
          } catch {
            (document.getElementById(id) as HTMLInputElement | null)?.select();
          }
        }}
        className="cd-btn-secondary inline-flex h-8 shrink-0 items-center gap-1.5 rounded-[6px] px-3 text-[13.5px] font-medium"
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
