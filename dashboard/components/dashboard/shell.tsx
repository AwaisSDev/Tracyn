"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  House,
  History,
  CircleCheck,
  FileText,
  ShieldCheck,
  BadgeCheck,
  Settings,
  BookOpen,
  Search,
  ChevronsUpDown,
  Check,
  LogOut,
  Menu,
  Plus,
  Users,
  X,
  ArrowUpRight,
} from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/lib/workspace-context";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { ForceLightTheme } from "@/components/force-light-theme";
import type { Workspace } from "@/lib/types";
import { interTight } from "@/components/home/fonts";
import { cdSans } from "./font";
import { useApprovals } from "./data";
import { FirstRun, signOut } from "./onboarding";
import { ErrorText, PLAN_INFO, Skel } from "./ui";
import "@/components/home/home.css";
import "./dash.css";

const NAV = [
  { href: "/dashboard", label: "Home", icon: House, exact: true },
  { href: "/timeline", label: "Timeline", icon: History },
  { href: "/approvals", label: "Approvals", icon: CircleCheck },
  { href: "/questionnaires", label: "Evidence Packs", icon: FileText },
  { href: "/soc2", label: "SOC 2", icon: BadgeCheck },
  { href: "/policy", label: "Policy", icon: ShieldCheck },
];

const FOOT_NAV = [{ href: "/settings", label: "Settings", icon: Settings }];

function isActive(pathname: string, href: string, exact?: boolean) {
  return exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { workspaces, isLoading } = useWorkspace();
  const [navOpen, setNavOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => setNavOpen(false), [pathname]);

  // The drawer is a modal on phones: no page scroll behind it.
  useEffect(() => {
    document.body.style.overflow = navOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [navOpen]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
      if (e.key === "Escape") setNavOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!isLoading && workspaces.length === 0) return <FirstRun />;

  return (
    <div className={`${cdSans.variable} ${interTight.variable} cd min-h-screen`}>
      <ForceLightTheme />

      {/* phone / tablet top bar */}
      <div className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-[var(--cd-line)] bg-white/90 px-3 backdrop-blur md:hidden">
        <button
          type="button"
          onClick={() => setNavOpen(true)}
          aria-label="Open menu"
          className="rounded-[8px] p-2.5 text-[var(--cd-ink)] hover:bg-[var(--cd-hover)]"
        >
          <Menu className="h-6 w-6" />
        </button>
        <Link href="/dashboard" className="flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element -- next/image's optimizer (sharp) fails on this PNG */}
          <img src="/logo.png" alt="" width={32} height={32} className="rounded-md" />
          <span className="cd-wordmark">Tracyn</span>
        </Link>
        <button
          type="button"
          onClick={() => setPaletteOpen(true)}
          aria-label="Search"
          className="ml-auto rounded-[8px] p-2.5 text-[var(--cd-fg-2)] hover:bg-[var(--cd-hover)]"
        >
          <Search className="h-[22px] w-[22px]" />
        </button>
      </div>

      {navOpen && <div className="cd-fade-in fixed inset-0 z-40 bg-[rgba(15,18,34,0.22)] md:hidden" onClick={() => setNavOpen(false)} />}

      <Sidebar open={navOpen} onClose={() => setNavOpen(false)} onSearch={() => setPaletteOpen(true)} />

      <main className="min-w-0 md:pl-[288px]">
        {/* Pages render straight away and show their own skeletons, shaped
            like their content, until their data arrives. */}
        {children}
      </main>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}

function Sidebar({ open, onClose, onSearch }: { open: boolean; onClose: () => void; onSearch: () => void }) {
  const pathname = usePathname();
  const { data: pending = [] } = useApprovals("pending");

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-50 flex w-[300px] max-w-[86vw] -translate-x-full flex-col border-r border-[var(--cd-card-edge)] bg-[var(--cd-side)] transition-transform duration-200 md:w-[288px] md:max-w-none md:translate-x-0",
        open && "translate-x-0"
      )}
    >
      <div className="flex items-center gap-2 px-5 pb-4 pt-5">
        <Link href="/" className="flex flex-1 items-center gap-3" title="Tracyn home">
          {/* eslint-disable-next-line @next/next/no-img-element -- next/image's optimizer (sharp) fails on this PNG */}
          <img src="/logo.png" alt="" width={32} height={32} className="rounded-md" />
          <span className="cd-wordmark">Tracyn</span>
        </Link>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close menu"
          className="-mr-1.5 rounded-[8px] p-2 text-[var(--cd-fg-3)] hover:bg-[var(--cd-hover)] md:hidden"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="space-y-2.5 px-3.5">
        <WorkspaceSwitcher />
        <button
          type="button"
          onClick={onSearch}
          className="flex h-11 w-full items-center gap-2.5 rounded-[8px] border border-[var(--cd-line)] bg-white px-3.5 text-[15.5px] text-[var(--cd-fg-3)] transition-colors hover:border-[var(--cd-line-2)]"
        >
          <Search className="h-[18px] w-[18px]" />
          <span className="flex-1 text-left">Search</span>
        </button>
      </div>

      <nav className="mt-5 flex-1 space-y-1 overflow-y-auto px-3.5" aria-label="Main">
        {NAV.map((item) => (
          <NavItem key={item.href} {...item} active={isActive(pathname, item.href, item.exact)} badge={item.label === "Approvals" ? pending.length : 0} />
        ))}
      </nav>

      <div className="space-y-1 px-3.5 pb-3">
        {FOOT_NAV.map((item) => (
          <NavItem key={item.href} {...item} active={isActive(pathname, item.href)} />
        ))}
        <a
          href="/docs"
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-11 items-center gap-3.5 rounded-[8px] px-3.5 text-[16.5px] font-medium text-[var(--cd-fg-2)] transition-colors hover:bg-[var(--cd-hover)] hover:text-[var(--cd-ink)]"
        >
          <BookOpen className="h-5 w-5 text-[var(--cd-fg-3)]" strokeWidth={1.75} />
          <span className="flex-1">Docs</span>
          <ArrowUpRight className="h-4 w-4 text-[var(--cd-fg-3)]" />
        </a>
      </div>

      <Account />
    </aside>
  );
}

function NavItem({
  href,
  label,
  icon: Icon,
  active,
  badge,
}: {
  href: string;
  label: string;
  icon: typeof House;
  active: boolean;
  badge?: number;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex h-11 items-center gap-3.5 rounded-[8px] px-3.5 text-[16.5px] font-medium transition-colors",
        active
          ? "bg-white text-[var(--cd-ink)] shadow-[0_0_0_1px_var(--cd-line),0_1px_2px_rgba(15,18,34,0.05)]"
          : "text-[var(--cd-fg-2)] hover:bg-[var(--cd-hover)] hover:text-[var(--cd-ink)]"
      )}
    >
      <Icon className={cn("h-5 w-5", active ? "text-[var(--cd-ink)]" : "text-[var(--cd-fg-3)]")} strokeWidth={1.75} />
      <span className="flex-1">{label}</span>
      {!!badge && (
        <span className="min-w-[24px] rounded-full bg-white px-2 text-center text-[13px] font-semibold tabular-nums leading-[22px] text-[var(--cd-ink)] shadow-[0_0_0_1px_var(--cd-line-2)]">
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </Link>
  );
}

function WorkspaceSwitcher() {
  const { workspaces, workspace, setWorkspaceId } = useWorkspace();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const create = useMutation({
    mutationFn: () => api.post<Workspace>("/v1/workspaces", { name: name.trim() }),
    onSuccess: async (ws) => {
      await queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      setWorkspaceId(ws.id);
      setName("");
      setCreating(false);
      setOpen(false);
    },
  });

  useEffect(() => {
    if (!open) {
      setCreating(false);
      return;
    }
    function onDown(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const initial = workspace?.name.charAt(0).toUpperCase() ?? "?";
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex h-14 w-full items-center gap-3 rounded-[8px] px-2.5 text-left transition-colors hover:bg-[var(--cd-hover)]"
      >
        {workspace ? (
          <>
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[6px] bg-[radial-gradient(115%_115%_at_10%_17%,#3553d4_0%,#1c2f9e_100%)] text-[14px] font-semibold text-white">
              {initial}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[16.5px] font-normal text-[var(--cd-ink)]">{workspace.name}</span>
              <span className="block text-[13.5px] text-[var(--cd-fg-3)]">{PLAN_INFO[workspace.plan ?? "free"]?.name} plan</span>
            </span>
          </>
        ) : (
          <>
            <Skel className="h-8 w-8 shrink-0 rounded-[6px]" />
            <span className="min-w-0 flex-1 space-y-1.5">
              <Skel className="h-4 w-28" />
              <Skel className="h-3 w-16" />
            </span>
          </>
        )}
        <ChevronsUpDown className="h-4 w-4 text-[var(--cd-fg-3)]" />
      </button>
      {open && (
        <div role="menu" className="cd-pop-in cd-float absolute left-0 right-0 top-[calc(100%+4px)] z-10 rounded-[10px] bg-white p-1.5">
          <div className="px-3 pb-1 pt-1.5 text-[13px] font-medium text-[var(--cd-fg-3)]">Workspaces</div>
          {workspaces.map((w) => (
            <button
              key={w.id}
              type="button"
              role="menuitem"
              onClick={() => {
                setWorkspaceId(w.id);
                setOpen(false);
              }}
              className="flex h-10 w-full items-center gap-2 rounded-[6px] px-3 text-left text-[15.5px] hover:bg-[var(--cd-hover)]"
            >
              <span className="flex-1 truncate">{w.name}</span>
              {w.id === workspace?.id && <Check className="h-4 w-4 text-[var(--cd-blue)]" />}
            </button>
          ))}
          <div className="my-1.5 border-t border-[var(--cd-line)]" />
          {creating ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (name.trim()) create.mutate();
              }}
              className="space-y-2 p-1.5"
            >
              <input
                id="cd-new-workspace"
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Workspace name"
                className="cd-input"
              />
              <ErrorText error={create.error} />
              <button
                type="submit"
                disabled={!name.trim() || create.isPending}
                className="cv-btn-primary flex h-10 w-full items-center justify-center rounded-[7px] text-[15px] font-medium text-white disabled:opacity-55"
              >
                {create.isPending ? "Creating..." : "Create workspace"}
              </button>
            </form>
          ) : (
            <>
              <button
                type="button"
                role="menuitem"
                onClick={() => setCreating(true)}
                className="flex h-10 w-full items-center gap-2 rounded-[6px] px-3 text-left text-[15.5px] text-[var(--cd-fg-2)] hover:bg-[var(--cd-hover)]"
              >
                <Plus className="h-4 w-4" />
                New workspace
              </button>
              <Link
                href="/join"
                role="menuitem"
                className="flex h-10 w-full items-center gap-2 rounded-[6px] px-3 text-left text-[15.5px] text-[var(--cd-fg-2)] hover:bg-[var(--cd-hover)]"
              >
                <Users className="h-4 w-4" />
                Join a workspace
              </Link>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Account() {
  const [who, setWho] = useState<{ email: string | null; name: string | null }>({ email: null, name: null });
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const read = (u: { email?: string; user_metadata?: { full_name?: string } } | null | undefined) =>
      setWho({ email: u?.email ?? null, name: u?.user_metadata?.full_name?.trim() || null });
    supabase.auth.getSession().then(({ data }) => read(data.session?.user));
    // Picks up a name change from Settings right away.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => read(session?.user));
    return () => sub.subscription.unsubscribe();
  }, []);

  const label = who.name ?? who.email;
  return (
    <div className="flex items-center gap-3 border-t border-[var(--cd-line)] px-5 py-4">
      {label ? (
        <>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#e3e7f3] text-[14px] font-semibold text-[var(--cd-fg-2)]">
            {label.charAt(0).toUpperCase()}
          </span>
          <Link href="/settings" className="min-w-0 flex-1" title={who.email ?? undefined}>
            <span className="block truncate text-[15px] text-[var(--cd-ink)]">{label}</span>
            {who.name && <span className="block truncate text-[13px] text-[var(--cd-fg-3)]">{who.email}</span>}
          </Link>
        </>
      ) : (
        <>
          <Skel className="h-9 w-9 shrink-0 rounded-full" />
          <span className="min-w-0 flex-1 space-y-1.5">
            <Skel className="h-4 w-24" />
            <Skel className="h-3 w-36" />
          </span>
        </>
      )}
      <button
        type="button"
        onClick={signOut}
        aria-label="Sign out"
        title="Sign out"
        className="rounded-[8px] p-2 text-[var(--cd-fg-3)] hover:bg-[var(--cd-hover)] hover:text-[var(--cd-ink)]"
      >
        <LogOut className="h-5 w-5" strokeWidth={1.75} />
      </button>
    </div>
  );
}

function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);

  const items = useMemo(() => {
    const all = [
      ...NAV.map((n) => ({ label: n.label, hint: "Go to", href: n.href, icon: n.icon })),
      { label: "Settings", hint: "Go to", href: "/settings", icon: Settings },
      { label: "Members and invites", hint: "Settings", href: "/settings?tab=members", icon: Users },
      { label: "Join a workspace", hint: "Open", href: "/join", icon: Users },
      { label: "API keys", hint: "Settings", href: "/settings?tab=keys", icon: Settings },
      { label: "Plan and billing", hint: "Settings", href: "/settings?tab=billing", icon: Settings },
      { label: "Pending approvals", hint: "Approvals", href: "/approvals", icon: CircleCheck },
      { label: "Documentation", hint: "Open", href: "/docs", icon: BookOpen },
    ];
    const q = query.trim().toLowerCase();
    return q ? all.filter((i) => i.label.toLowerCase().includes(q) || i.hint.toLowerCase().includes(q)) : all;
  }, [query]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setIndex(0);
    }
  }, [open]);
  useEffect(() => setIndex(0), [query]);

  if (!open) return null;

  function go(href: string) {
    onClose();
    router.push(href);
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center px-3 pt-[10vh] sm:px-4 sm:pt-[14vh]">
      <div className="cd-fade-in absolute inset-0 bg-[rgba(15,18,34,0.18)]" onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-label="Search" className="cd-pop-in cd-float relative w-full max-w-[560px] overflow-hidden rounded-[12px] bg-white">
        <div className="flex items-center gap-3 border-b border-[var(--cd-line)] px-4">
          <Search className="h-5 w-5 text-[var(--cd-fg-3)]" />
          <input
            id="cd-palette-input"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") onClose();
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setIndex((i) => Math.min(i + 1, items.length - 1));
              }
              if (e.key === "ArrowUp") {
                e.preventDefault();
                setIndex((i) => Math.max(i - 1, 0));
              }
              if (e.key === "Enter" && items[index]) go(items[index].href);
            }}
            placeholder="Jump to a page..."
            className="h-14 flex-1 bg-transparent text-[17px] outline-none placeholder:text-[#a3a9bd]"
          />
        </div>
        <div className="max-h-[360px] overflow-y-auto p-1.5">
          {items.length === 0 && <p className="px-3 py-6 text-center text-[15px] text-[var(--cd-fg-3)]">Nothing matches that.</p>}
          {items.map((item, i) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                type="button"
                onMouseEnter={() => setIndex(i)}
                onClick={() => go(item.href)}
                className={cn(
                  "flex h-12 w-full items-center gap-3 rounded-[7px] px-3 text-left text-[16px]",
                  i === index ? "bg-[var(--cd-hover)] text-[var(--cd-ink)]" : "text-[var(--cd-fg-2)]"
                )}
              >
                <Icon className="h-5 w-5 text-[var(--cd-fg-3)]" strokeWidth={1.75} />
                <span className="flex-1">{item.label}</span>
                <span className="text-[13.5px] text-[var(--cd-fg-3)]">{item.hint}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
