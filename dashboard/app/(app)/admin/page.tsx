"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/utils";

interface Analytics {
  total_signups: number;
  confirmed_signups: number;
  signups_last_30_days: number;
  active_last_7_days: number;
  active_last_30_days: number;
  total_workspaces: number;
  signups_by_day: Record<string, number>;
  recent_signups: {
    email: string;
    created_at: string;
    email_confirmed_at: string | null;
    last_sign_in_at: string | null;
  }[];
}

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="text-[13px] text-muted-foreground">{label}</div>
        <div className="mt-1 text-3xl font-semibold tracking-tight">{value.toLocaleString()}</div>
      </CardContent>
    </Card>
  );
}

export default function AdminAnalyticsPage() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin-analytics"],
    queryFn: () => api.get<Analytics>("/v1/admin/analytics"),
    retry: false,
  });

  if (isError) {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
        <p className="text-sm text-error">
          {error instanceof Error ? error.message : "Couldn't load analytics."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
        <p className="text-sm text-muted-foreground">
          Founder-only. "Active" means a user's most recent sign-in fell in that window — Supabase doesn't keep a
          full login history, just the one timestamp per user.
        </p>
      </div>

      {isLoading || !data ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-lg" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <StatTile label="Total signups" value={data.total_signups} />
            <StatTile label="Confirmed" value={data.confirmed_signups} />
            <StatTile label="Signups (30d)" value={data.signups_last_30_days} />
            <StatTile label="Active (7d)" value={data.active_last_7_days} />
            <StatTile label="Active (30d)" value={data.active_last_30_days} />
            <StatTile label="Workspaces" value={data.total_workspaces} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Signups by day (last 30 days with activity)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5">
              {Object.entries(data.signups_by_day).length === 0 && (
                <p className="text-sm text-muted-foreground">No signups yet.</p>
              )}
              {Object.entries(data.signups_by_day).map(([day, count]) => {
                const max = Math.max(...Object.values(data.signups_by_day), 1);
                return (
                  <div key={day} className="flex items-center gap-3">
                    <span className="w-24 shrink-0 text-xs text-muted-foreground">{day}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${(count / max) * 100}%` }} />
                    </div>
                    <span className="w-6 shrink-0 text-right text-xs tabular-nums text-muted-foreground">{count}</span>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <Table>
              <THead>
                <TR>
                  <TH>Email</TH>
                  <TH>Signed up</TH>
                  <TH>Verified</TH>
                  <TH>Last sign-in</TH>
                </TR>
              </THead>
              <TBody>
                {data.recent_signups.map((u) => (
                  <TR key={u.email + u.created_at}>
                    <TD>{u.email}</TD>
                    <TD className="text-muted-foreground">{formatDate(u.created_at)}</TD>
                    <TD>
                      {u.email_confirmed_at ? (
                        <Badge variant="success">verified</Badge>
                      ) : (
                        <Badge variant="secondary">unverified</Badge>
                      )}
                    </TD>
                    <TD className="text-muted-foreground">
                      {u.last_sign_in_at ? formatDate(u.last_sign_in_at) : "never"}
                    </TD>
                  </TR>
                ))}
                {data.recent_signups.length === 0 && (
                  <TR>
                    <TD colSpan={4} className="py-10 text-center text-muted-foreground">
                      No signups yet.
                    </TD>
                  </TR>
                )}
              </TBody>
            </Table>
          </Card>
        </>
      )}
    </div>
  );
}
