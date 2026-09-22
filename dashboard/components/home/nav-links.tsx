"use client";

import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, ChevronDown, Plug, Terminal } from "lucide-react";

const CONTACT_URL = "mailto:mawais9171@gmail.com";

type MenuId = "product" | "resources";
type Pill = { x: number; w: number; visible: boolean; glide: boolean };

// How long the pointer can be outside the trigger + panel before the menu
// closes -- long enough to cross the gap between them without flicker.
const CLOSE_DELAY_MS = 140;

// Notion's nav: Product and Resources open large panels (feature cards;
// link columns), Docs and About are plain links. A soft pill glides under
// whichever item is hovered, and the open trigger keeps it with its
// chevron flipped. Menus open on hover or click, close on Escape or
// outside click. All motion is CSS transitions, off under
// prefers-reduced-motion (see home.css).
export function NavLinks() {
  const pathname = usePathname();
  const rootRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [open, setOpen] = useState<MenuId | null>(null);
  const [pill, setPill] = useState<Pill>({ x: 0, w: 0, visible: false, glide: false });

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(null);
    }
    function onDown(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(null);
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, []);

  useEffect(() => setOpen(null), [pathname]);

  function cancelClose() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = null;
  }
  function scheduleClose() {
    cancelClose();
    closeTimer.current = setTimeout(() => {
      setOpen(null);
      setPill((p) => ({ ...p, visible: false }));
    }, CLOSE_DELAY_MS);
  }

  function pillTo(el: HTMLElement) {
    const nav = navRef.current;
    if (!nav) return;
    const n = nav.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    setPill((p) => ({ x: r.left - n.left, w: r.width, visible: true, glide: p.visible }));
  }

  function hoverItem(el: HTMLElement, menu: MenuId | null) {
    cancelClose();
    pillTo(el);
    setOpen(menu);
  }

  // In-page links scroll smoothly on the home page; from any other page
  // "/#id" just navigates there.
  function onInPage(e: MouseEvent<HTMLAnchorElement>, href: string) {
    setOpen(null);
    if (pathname !== "/" || !href.startsWith("/#")) return;
    const target = document.getElementById(href.slice(2));
    if (!target) return;
    e.preventDefault();
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    history.replaceState(null, "", href.slice(1));
  }

  const itemClass =
    "cv-nav-link relative z-10 flex items-center gap-1 rounded-full px-3.5 py-1.5 text-[var(--cv-ink)] transition-colors duration-200 hover:text-[var(--cv-blue-bright)]";

  return (
    <div
      ref={rootRef}
      className="relative hidden md:block"
      onMouseLeave={scheduleClose}
      onMouseEnter={cancelClose}
    >
      <nav ref={navRef} aria-label="Main" className="relative flex items-center text-[15px] font-medium">
        <span
          aria-hidden
          className={`cv-nav-pill pointer-events-none absolute inset-y-0 left-0 rounded-full bg-[#eaeefc] ${
            pill.glide ? "cv-nav-pill-glide" : ""
          }`}
          style={{
            width: pill.w,
            transform: `translateX(${pill.x}px) scale(${pill.visible ? 1 : 0.9})`,
            opacity: pill.visible ? 1 : 0,
          }}
        />
        {(["product", "resources"] as const).map((id) => (
          <button
            key={id}
            type="button"
            aria-expanded={open === id}
            aria-controls={`cv-menu-${id}`}
            onMouseEnter={(e) => hoverItem(e.currentTarget, id)}
            onFocus={(e) => pillTo(e.currentTarget)}
            onClick={(e) => {
              pillTo(e.currentTarget);
              setOpen((cur) => (cur === id ? null : id));
            }}
            className={itemClass}
          >
            {id === "product" ? "Product" : "Resources"}
            <ChevronDown
              className={`cv-nav-chevron h-3.5 w-3.5 ${open === id ? "rotate-180" : ""}`}
              strokeWidth={2.25}
            />
          </button>
        ))}
        <Link
          href="/docs"
          onMouseEnter={(e) => hoverItem(e.currentTarget, null)}
          onFocus={(e) => pillTo(e.currentTarget)}
          className={itemClass}
        >
          Docs
        </Link>
        <Link
          href="/about"
          onMouseEnter={(e) => hoverItem(e.currentTarget, null)}
          onFocus={(e) => pillTo(e.currentTarget)}
          className={itemClass}
        >
          About
        </Link>
      </nav>

      <MenuPanel id="product" open={open === "product"} width={820}>
        <ProductMenu onInPage={onInPage} />
      </MenuPanel>
      <MenuPanel id="resources" open={open === "resources"} width={760}>
        <ResourcesMenu onInPage={onInPage} />
      </MenuPanel>
    </div>
  );
}

function MenuPanel({ id, open, width, children }: { id: string; open: boolean; width: number; children: ReactNode }) {
  return (
    <div
      id={`cv-menu-${id}`}
      data-open={open}
      // `inert` keeps a closed panel's links out of the tab order.
      {...(open ? {} : { inert: "" as unknown as boolean })}
      className="cv-menu absolute left-1/2 top-full z-40 pt-3"
      style={{ width: `min(${width}px, calc(100vw - 48px))` }}
    >
      <div className="overflow-hidden rounded-2xl border border-[#dfe3ef] bg-white shadow-[0_24px_60px_-20px_rgba(26,29,43,0.28),0_2px_6px_rgba(26,29,43,0.05)]">
        {children}
      </div>
    </div>
  );
}

type InPage = (e: MouseEvent<HTMLAnchorElement>, href: string) => void;

const FEATURES = [
  {
    title: "Record",
    desc: "Every agent action, logged as it happens and hash-chained.",
    href: "/docs#sdk",
    tint: "bg-[#eef3ff] hover:bg-[#e6eeff]",
    art: <RecordArt />,
  },
  {
    title: "Approve",
    desc: "Risky actions wait for a person, in the dashboard or Slack.",
    href: "/#how",
    tint: "bg-[#fdf0ef] hover:bg-[#fbe8e6]",
    art: <ApproveArt />,
  },
  {
    title: "Prove",
    desc: "Questionnaire answers drafted from real events, with citations.",
    href: "/#evidence",
    tint: "bg-[#fdf6e4] hover:bg-[#fbf0d6]",
    art: <ProveArt />,
  },
];

function ProductMenu({ onInPage }: { onInPage: InPage }) {
  return (
    <div>
      <div className="flex items-center justify-between px-6 pb-3 pt-5">
        <p className="text-[13px] font-medium text-[var(--cv-fg-2)]">Features</p>
        <Link
          href="/docs"
          className="group flex items-center gap-1 text-[13px] font-medium text-[var(--cv-blue-bright)]"
        >
          Read the docs <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
      <div className="grid grid-cols-3 gap-3 px-4 pb-4">
        {FEATURES.map((f, i) => (
          // The staggered rise lives on this wrapper, so its delay never
          // slows the card's own hover color change.
          <div key={f.title} className="cv-menu-rise" style={{ "--d": `${60 + i * 45}ms` } as React.CSSProperties}>
          <MenuLink
            href={f.href}
            onInPage={onInPage}
            className={`group block h-full rounded-xl border border-black/[0.04] p-5 transition-colors ${f.tint}`}
          >
            <div className="flex h-[110px] items-center justify-center">
              <div className="transition-transform duration-300 ease-out group-hover:-translate-y-1 group-hover:scale-[1.03]">
                {f.art}
              </div>
            </div>
            <p className="mt-4 text-[20px] font-semibold tracking-[-0.02em] text-[var(--cv-ink)]">{f.title}</p>
            <p className="mt-1 text-[14px] leading-[1.45] text-[var(--cv-fg-2)]">{f.desc}</p>
          </MenuLink>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between border-t border-[#e8ebf4] bg-[#f8f9fd] px-6 py-3.5 text-[13.5px] text-[var(--cv-fg-2)]">
        <MenuLink href="/#mcp" onInPage={onInPage} className="group flex items-center gap-2">
          <Plug className="h-4 w-4 text-[var(--cv-fg-2)]" strokeWidth={1.75} />
          MCP server for Claude, ChatGPT and Grok.
          <span className="flex items-center gap-1 font-medium text-[var(--cv-blue-bright)]">
            See how <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </span>
        </MenuLink>
        <MenuLink href="/docs#sdk" onInPage={onInPage} className="group flex items-center gap-2">
          <Terminal className="h-4 w-4 text-[var(--cv-fg-2)]" strokeWidth={1.75} />
          Install the
          <span className="flex items-center gap-1 font-medium text-[var(--cv-blue-bright)]">
            Python SDK <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </span>
        </MenuLink>
      </div>
    </div>
  );
}

const RESOURCE_COLUMNS = [
  {
    title: "Start here",
    big: true,
    links: [
      { label: "Quickstart", href: "/docs" },
      { label: "Install the SDK", href: "/docs#sdk" },
      { label: "Connect MCP", href: "/docs#mcp" },
    ],
  },
  {
    title: "Guides",
    links: [
      { label: "Writing a policy", href: "/docs#policy" },
      { label: "Approvals in Slack", href: "/docs#slack" },
      { label: "Security questionnaires", href: "/docs#questionnaires" },
      { label: "SOC 2 mapping", href: "/docs#soc2" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Contact us", href: CONTACT_URL },
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms of Service", href: "/terms" },
    ],
  },
];

function ResourcesMenu({ onInPage }: { onInPage: InPage }) {
  return (
    <div className="grid grid-cols-[1.2fr_1fr_1fr] gap-6 px-6 py-6">
      {RESOURCE_COLUMNS.map((col) => (
        <div key={col.title}>
          <p className="text-[13px] font-medium text-[var(--cv-fg-2)]">{col.title}</p>
          <ul className={`mt-3 ${col.big ? "space-y-1.5" : "space-y-2"}`}>
            {col.links.map((l) => (
              <li key={l.label}>
                <MenuLink
                  href={l.href}
                  onInPage={onInPage}
                  className={`group inline-flex items-center gap-1.5 text-[var(--cv-ink)] transition-colors hover:text-[var(--cv-blue-bright)] ${
                    col.big ? "text-[21px] font-semibold tracking-[-0.025em]" : "text-[14.5px]"
                  }`}
                >
                  {l.label}
                  <ArrowRight
                    className={`-translate-x-1 opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100 ${
                      col.big ? "h-4 w-4" : "h-3.5 w-3.5"
                    }`}
                  />
                </MenuLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function MenuLink({
  href,
  onInPage,
  className,
  style,
  children,
}: {
  href: string;
  onInPage: InPage;
  className?: string;
  style?: React.CSSProperties;
  children: ReactNode;
}) {
  if (href.startsWith("/#")) {
    return (
      <a href={href} onClick={(e) => onInPage(e, href)} className={className} style={style}>
        {children}
      </a>
    );
  }
  if (href.startsWith("/")) {
    return (
      <Link href={href} className={className} style={style}>
        {children}
      </Link>
    );
  }
  const external = href.startsWith("http");
  return (
    <a
      href={href}
      className={className}
      style={style}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    >
      {children}
    </a>
  );
}

/* ---------- menu illustrations: Notion-style line art in our palette ---------- */

const INK = "#1a1d2b";

function RecordArt() {
  return (
    <svg width="150" height="100" viewBox="0 0 150 100" fill="none" aria-hidden>
      <rect x="18" y="14" width="118" height="76" rx="6" fill="#fff" stroke={INK} strokeWidth="2.5" />
      <path d="M18 28h118" stroke={INK} strokeWidth="2.5" />
      <circle cx="27" cy="21" r="2" fill={INK} />
      <circle cx="34" cy="21" r="2" fill={INK} />
      <circle cx="41" cy="21" r="2" fill={INK} />
      {[40, 56, 72].map((y, i) => (
        <g key={y}>
          <circle cx="32" cy={y} r="4.5" fill={i === 1 ? "#f5c451" : "#8fb0f7"} stroke={INK} strokeWidth="2" />
          <path d={`M44 ${y}h${i === 1 ? 52 : 70}`} stroke={INK} strokeWidth="2.5" strokeLinecap="round" />
          <rect x="106" y={y - 4} width="20" height="8" rx="4" fill={i === 1 ? "#fbe7b3" : "#d5ecd6"} stroke={INK} strokeWidth="1.8" />
        </g>
      ))}
      <rect x="4" y="4" width="26" height="26" rx="4" fill="#fff" stroke={INK} strokeWidth="2.5" />
      <path d="M17 10v14M10 17h14" stroke={INK} strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

function ApproveArt() {
  return (
    <svg width="150" height="100" viewBox="0 0 150 100" fill="none" aria-hidden>
      <rect x="14" y="10" width="112" height="72" rx="6" fill="#fff" stroke={INK} strokeWidth="2.5" />
      <path d="M26 26h46" stroke={INK} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M26 38h72" stroke={INK} strokeWidth="2" strokeLinecap="round" opacity="0.35" />
      <rect x="26" y="48" width="62" height="18" rx="3" fill="#f2f4fb" stroke={INK} strokeWidth="1.8" />
      <path d="M32 55h30M32 60h20" stroke={INK} strokeWidth="1.6" strokeLinecap="round" opacity="0.5" />
      <rect x="96" y="48" width="20" height="18" rx="3" fill="#e8615b" stroke={INK} strokeWidth="2" />
      <path d="M102 53l8 8M110 53l-8 8" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="122" cy="74" r="20" fill="#3553d4" stroke={INK} strokeWidth="2.5" />
      <path d="M112 74l7 7 13-14" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ProveArt() {
  return (
    <svg width="150" height="100" viewBox="0 0 150 100" fill="none" aria-hidden>
      <rect x="40" y="16" width="62" height="78" rx="5" fill="#fff" stroke={INK} strokeWidth="2.5" transform="rotate(-6 71 55)" />
      <rect x="30" y="8" width="62" height="80" rx="5" fill="#fff" stroke={INK} strokeWidth="2.5" />
      <path d="M40 24h32M40 34h42M40 44h36M40 54h40" stroke={INK} strokeWidth="2.2" strokeLinecap="round" />
      <rect x="40" y="64" width="18" height="8" rx="4" fill="#dde6fb" stroke={INK} strokeWidth="1.6" />
      <rect x="61" y="64" width="18" height="8" rx="4" fill="#dde6fb" stroke={INK} strokeWidth="1.6" />
      <path
        d="M112 40l18 7v13c0 11-8 19-18 23-10-4-18-12-18-23V47l18-7z"
        fill="#f5c451"
        stroke={INK}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path d="M104 61l6 6 11-12" stroke={INK} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
