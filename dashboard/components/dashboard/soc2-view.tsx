"use client";

import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { downloadFile } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/lib/workspace-context";
import type { Soc2ControlOut } from "@/lib/types";
import { hasLiveEvidence, useSoc2 } from "./data";
import { Button, Card, Dot, Page, PageHeader, Progress, Segmented, Skel } from "./ui";

// Trust Services Criteria families, keyed by the control ID prefix.
const FAMILIES: Record<string, string> = {
  CC1: "Control environment",
  CC2: "Communication",
  CC3: "Risk assessment",
  CC4: "Monitoring",
  CC5: "Control activities",
  CC6: "Logical access",
  CC7: "System operations",
  CC8: "Change management",
  CC9: "Risk mitigation",
  A1: "Availability",
  PI1: "Processing integrity",
  C1: "Confidentiality",
  P1: "Privacy",
};

function familyOf(id: string) {
  return id.split(".")[0];
}

type Filter = "all" | "live" | "guidance";

export function Soc2View() {
  const { workspace } = useWorkspace();
  const { data: controls = [], isLoading } = useSoc2();
  const [filter, setFilter] = useState<Filter>("all");
  const [focus, setFocus] = useState<string | null>(null);

  // Common criteria (CC) first, then the optional categories, in the order
  // FAMILIES lists them.
  const sorted = useMemo(() => {
    const order = Object.keys(FAMILIES);
    const rank = (id: string) => (order.indexOf(familyOf(id)) + 1 || order.length + 1);
    return [...controls].sort(
      (a, b) => rank(a.control_id) - rank(b.control_id) || a.control_id.localeCompare(b.control_id, undefined, { numeric: true })
    );
  }, [controls]);
  const families = useMemo(() => {
    const m = new Map<string, Soc2ControlOut[]>();
    for (const c of sorted) m.set(familyOf(c.control_id), [...(m.get(familyOf(c.control_id)) ?? []), c]);
    return [...m.entries()];
  }, [sorted]);

  const live = controls.filter(hasLiveEvidence).length;
  const pct = controls.length ? Math.round((live / controls.length) * 100) : 0;
  const shown = sorted.filter(
    (c) =>
      (filter === "all" || (filter === "live") === hasLiveEvidence(c)) && (!focus || familyOf(c.control_id) === focus)
  );

  return (
    <Page>
      <PageHeader
        title="SOC 2"
        subtitle="Which SOC 2 controls your Tracyn data already speaks to. A head start for the auditor conversation, not a certification."
        actions={
          <Button
            disabled={!workspace}
            onClick={() => downloadFile(`/v1/workspaces/${workspace!.id}/soc2/export.csv`, "tracyn-soc2-mapping.csv")}
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        }
      />

      <Card className="mt-7 p-5 sm:p-6">
        {isLoading ? (
          <Skel className="h-24 w-full" />
        ) : (
          <div className="grid gap-6 md:grid-cols-[220px_minmax(0,1fr)] md:gap-10">
            <div>
              <div className="text-[13.5px] text-[var(--cd-fg-2)]">Covered by live evidence</div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-[52px] font-semibold leading-none tracking-[-0.04em] tabular-nums">{pct}%</span>
                <span className="text-[14px] text-[var(--cd-fg-3)] tabular-nums">
                  {live} of {controls.length}
                </span>
              </div>
              <Progress
                className="mt-4"
                segments={[
                  { value: live, color: "var(--cd-green)" },
                  { value: controls.length - live, color: "transparent" },
                ]}
              />
              <div className="mt-4 space-y-1.5 text-[13.5px] text-[var(--cd-fg-2)]">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-[3px] bg-[var(--cd-green)]" /> Live evidence from your workspace
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-[3px] border border-[#cfd5e5] bg-[#eef0f6]" /> Guidance only, for now
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {families.map(([fam, list]) => {
                const n = list.filter(hasLiveEvidence).length;
                const active = focus === fam;
                return (
                  <button
                    key={fam}
                    type="button"
                    onClick={() => setFocus(active ? null : fam)}
                    aria-pressed={active}
                    className={cn(
                      "rounded-[8px] border p-3 text-left transition-colors",
                      active ? "border-[var(--cd-blue)] bg-[var(--cd-blue-soft)]/50" : "border-[var(--cd-line)] hover:border-[var(--cd-line-2)] hover:bg-[#fafbfd]"
                    )}
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-[12.5px] text-[var(--cd-fg-3)]">{fam}</span>
                      <span className="text-[12.5px] tabular-nums text-[var(--cd-fg-3)]">
                        {n}/{list.length}
                      </span>
                    </div>
                    <div className="mt-0.5 truncate text-[14px] font-medium">{FAMILIES[fam] ?? fam}</div>
                    <div className="mt-2.5 flex flex-wrap gap-1">
                      {list.map((c) => (
                        <span
                          key={c.control_id}
                          title={`${c.control_id} ${c.title}`}
                          className={cn(
                            "h-3.5 w-3.5 rounded-[4px]",
                            hasLiveEvidence(c) ? "bg-[var(--cd-green)]" : "border border-[#cfd5e5] bg-[#eef0f6]"
                          )}
                        />
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </Card>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-[17.5px] font-semibold tracking-[-0.015em]">Controls</h2>
          {focus && (
            <button
              type="button"
              onClick={() => setFocus(null)}
              className="rounded-full bg-[var(--cd-blue-soft)] px-2.5 py-[2px] text-[13px] font-medium text-[var(--cd-blue-ink)]"
            >
              {FAMILIES[focus] ?? focus} ✕
            </button>
          )}
        </div>
        <Segmented
          label="Evidence filter"
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: "All", count: controls.length },
            { value: "live", label: "Live", count: live },
            { value: "guidance", label: "Guidance", count: controls.length - live },
          ]}
        />
      </div>

      <Card className="mt-3 divide-y divide-[var(--cd-line)] overflow-hidden">
        {isLoading && (
          <div className="space-y-2 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skel key={i} className="h-16 w-full" />
            ))}
          </div>
        )}
        {shown.map((c) => {
          const isLive = hasLiveEvidence(c);
          return (
            <div key={c.control_id} className="grid gap-3 px-5 py-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] md:gap-8">
              <div className="flex gap-3">
                <span className="mt-[2px] h-fit shrink-0 rounded-[4px] bg-[#f1f3f9] px-1.5 py-0.5 text-[12.5px] font-medium text-[var(--cd-fg-2)]">
                  {c.control_id}
                </span>
                <div className="min-w-0">
                  <div className="text-[15.5px] font-medium leading-snug">{c.title}</div>
                  <p className="mt-0.5 text-[14px] leading-[1.5] text-[var(--cd-fg-2)]">{c.description}</p>
                </div>
              </div>
              <div className="flex gap-2.5 md:pt-[1px]">
                <span className="mt-[7px]">
                  <Dot tone={isLive ? "green" : "gray"} />
                </span>
                <div className="min-w-0">
                  <p className={cn("text-[15px] leading-[1.5]", isLive ? "text-[var(--cd-ink)]" : "text-[var(--cd-fg-2)]")}>{c.live_evidence}</p>
                  <p className="mt-1 text-[12.5px] text-[var(--cd-fg-3)]">{c.evidence_type}</p>
                </div>
              </div>
            </div>
          );
        })}
        {!isLoading && shown.length === 0 && (
          <p className="px-5 py-10 text-center text-[15.5px] text-[var(--cd-fg-3)]">No controls match.</p>
        )}
      </Card>
    </Page>
  );
}
