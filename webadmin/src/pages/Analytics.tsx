// src/pages/Analytics.tsx
import * as React from "react";
import {
  Title, Text, Grid, Paper, Group, Stack, Loader, Alert, Badge,
} from "@mantine/core";
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell,
} from "recharts";
import { getFreshIdToken } from "@/utils/token"; // ✅ central token util

const API_BASE_URL = "https://analytics-bcvrqgcc6a-as.a.run.app";

/* ---------------- Types ---------------- */
type ReportRow = {
  id: string;
  createdAt: string | number | null;
  category?: string;
  status?: string;
  sender?: string;
};

type UserRow = {
  id: string;
  email?: string;
  active?: boolean;
  lastActiveAt?: string | number | null;
};

type OverviewResp = {
  ok: boolean;
  data?: {
    reports?: ReportRow[];
    users?: UserRow[];
  };
};

type ListResp<T> = { ok: boolean; data?: T };

/* --------------- Helpers --------------- */
const fmtMonth = new Intl.DateTimeFormat("en-PH", { month: "short", year: "2-digit" });
const fmtDate = new Intl.DateTimeFormat("en-PH", { month: "short", day: "2-digit" });

// Authenticated fetch with safe JSON parsing
async function apiFetch<T = unknown>(
  path: string,
  init: RequestInit = {}
): Promise<{ ok: boolean; status: number; data: T; text: string }> {
  const token = await getFreshIdToken();
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  let data: unknown;
  try { data = text ? JSON.parse(text) : undefined; } catch { data = undefined; }
  return { ok: res.ok, status: res.status, data: data as T, text };
}

function toDate(x: string | number | Date | null | undefined): Date | null {
  if (!x) return null;
  const d = x instanceof Date ? x : new Date(x);
  return Number.isNaN(d.getTime()) ? null : d;
}
function startOfWeek(d = new Date()): Date {
  const copy = new Date(d);
  const day = copy.getDay();
  const diff = (day + 6) % 7; // Monday = 0
  copy.setDate(copy.getDate() - diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
}
function startOfMonth(d = new Date()): Date {
  const copy = new Date(d);
  copy.setDate(1);
  copy.setHours(0, 0, 0, 0);
  return copy;
}
function monthKey(d: Date): string {
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}`;
}
function lastNMonths(n: number): { key: string; label: string; date: Date }[] {
  const arr: { key: string; label: string; date: Date }[] = [];
  const now = startOfMonth(new Date());
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setMonth(now.getMonth() - i);
    arr.push({ key: monthKey(d), label: fmtMonth.format(d), date: d });
  }
  return arr;
}

/* --------------- Component -------------- */
export default function Analytics() {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string>("");

  const [reports, setReports] = React.useState<ReportRow[]>([]);
  const [users, setUsers] = React.useState<UserRow[]>([]);

  // Derived
  const now = React.useMemo(() => new Date(), []);
  const weekStart = startOfWeek(now);
  const monthStart = startOfMonth(now);

  const reportsThisWeek = React.useMemo(
    () =>
      reports.filter((r) => {
        const d = toDate(r.createdAt);
        return d && d >= weekStart;
      }).length,
    [reports, weekStart]
  );

  const reportsThisMonth = React.useMemo(
    () =>
      reports.filter((r) => {
        const d = toDate(r.createdAt);
        return d && d >= monthStart;
      }).length,
    [monthStart, reports]
  );

  const activeUsers = React.useMemo(() => {
    const THIRTY_DAYS = 1000 * 60 * 60 * 24 * 30;
    const nowTs = now.getTime();
    if (users.some((u) => typeof u.active === "boolean")) {
      return users.filter((u) => u.active).length;
    }
    if (users.some((u) => u.lastActiveAt)) {
      return users.filter((u) => {
        const d = toDate(u.lastActiveAt);
        return d && nowTs - d.getTime() <= THIRTY_DAYS;
      }).length;
    }
    return users.length;
  }, [now, users]);

  // Category split
  const byCategory = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const r of reports) {
      const k = (r.category || "Uncategorized").trim();
      map.set(k, (map.get(k) || 0) + 1);
    }
    return Array.from(map, ([name, value]) => ({ name, value })).sort(
      (a, b) => b.value - a.value
    );
  }, [reports]);

  // Weekly trend (last 8 weeks, Monday labels)
  const weekly = React.useMemo(() => {
    const buckets: { label: string; start: Date; value: number }[] = [];
    const cursor = startOfWeek(now);
    for (let i = 7; i >= 0; i--) {
      const d = new Date(cursor);
      d.setDate(cursor.getDate() - 7 * i);
      buckets.push({ label: fmtDate.format(d), start: d, value: 0 });
    }
    for (const r of reports) {
      const d = toDate(r.createdAt);
      if (!d) continue;
      for (let i = 0; i < buckets.length; i++) {
        const start = buckets[i].start;
        const end = new Date(start);
        end.setDate(end.getDate() + 7);
        if (d >= start && d < end) {
          buckets[i].value++;
          break;
        }
      }
    }
    return buckets.map((b) => ({ label: b.label, count: b.value }));
  }, [now, reports]);

  // Monthly totals (last 12 months)
  const monthly = React.useMemo(() => {
    const months = lastNMonths(12);
    const acc = new Map(months.map((m) => [m.key, 0]));
    for (const r of reports) {
      const d = toDate(r.createdAt);
      if (!d) continue;
      const key = monthKey(d);
      if (acc.has(key)) acc.set(key, (acc.get(key) || 0) + 1);
    }
    return months.map((m) => ({ label: m.label, count: acc.get(m.key) || 0 }));
  }, [reports]);

  // Interpretations
  const topCategory = byCategory[0]?.name ?? "—";
  const topCategoryPct =
    byCategory.length > 0 ? Math.round((byCategory[0].value / reports.length) * 100) : 0;

  const lastWeek = weekly[weekly.length - 2]?.count ?? 0;
  const thisWeek = weekly[weekly.length - 1]?.count ?? 0;
  const wowDelta = thisWeek - lastWeek;
  const wowPct =
    lastWeek > 0 ? Math.round(((thisWeek - lastWeek) / lastWeek) * 100) : thisWeek > 0 ? 100 : 0;

  // Load data
  React.useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError("");

        let rep: ReportRow[] = [];
        let usr: UserRow[] = [];

        // Prefer consolidated overview
        const o = await apiFetch<OverviewResp>("/overview");
        if (o.ok && o.data?.ok) {
          rep = o.data.data?.reports ?? [];
          usr = o.data.data?.users ?? [];
        }

        // Fallbacks
        if (rep.length === 0) {
          const from = new Date();
          from.setMonth(from.getMonth() - 13);
          const r = await apiFetch<ListResp<ReportRow[]>>(`/reports?limit=2000&from=${from.toISOString()}`);
          if (r.ok && r.data?.ok) rep = r.data.data ?? [];
        }

        if (usr.length === 0) {
          const u = await apiFetch<ListResp<UserRow[]>>(`/users?limit=2000`);
          if (u.ok) {
            usr = u.data?.data ?? (Array.isArray(u.data) ? (u.data as UserRow[]) : []);
          }
        }

        setReports(rep);
        setUsers(usr);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <>
      <Title order={3} mt="md">Analytics</Title>
      <Text c="dimmed" mb="lg">Light analytics to visualize scam report trends.</Text>

      {error && (
        <Alert color="red" variant="light" title="Failed to load" mb="md">
          {error}
        </Alert>
      )}

      {loading ? (
        <Group justify="center" mt="lg"><Loader /></Group>
      ) : (
        <Stack gap="lg">
          {/* Stat Cards */}
          <Grid>
            <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
              <Paper withBorder radius="lg" p="md">
                <Text size="sm" c="dimmed">Reports (This Week)</Text>
                <Text fw={700} fz="28px">{reportsThisWeek}</Text>
                <Group gap="xs">
                  <Badge variant="light" color={wowDelta >= 0 ? "green" : "red"}>
                    {wowDelta >= 0 ? "▲" : "▼"} {Math.abs(wowPct)}% WoW
                  </Badge>
                  <Text size="xs" c="dimmed">vs last week ({lastWeek})</Text>
                </Group>
              </Paper>
            </Grid.Col>

            <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
              <Paper withBorder radius="lg" p="md">
                <Text size="sm" c="dimmed">Reports (This Month)</Text>
                <Text fw={700} fz="28px">{reportsThisMonth}</Text>
                <Text size="xs" c="dimmed">{fmtMonth.format(monthStart)} to date</Text>
              </Paper>
            </Grid.Col>

            <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
              <Paper withBorder radius="lg" p="md">
                <Text size="sm" c="dimmed">Active Users</Text>
                <Text fw={700} fz="28px">{activeUsers}</Text>
                <Text size="xs" c="dimmed">Active ≈ current month</Text>
              </Paper>
            </Grid.Col>

            <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
              <Paper withBorder radius="lg" p="md">
                <Text size="sm" c="dimmed">Top Category</Text>
                <Text fw={700} fz="28px">{topCategory}</Text>
                <Text size="xs" c="dimmed">{topCategoryPct}% of total</Text>
              </Paper>
            </Grid.Col>
          </Grid>

          {/* Weekly Trend */}
          <Paper withBorder radius="lg" p="md">
            <Group justify="space-between" mb="sm">
              <Text fw={600}>Weekly Trend (last 8 weeks)</Text>
              <Text size="xs" c="dimmed">Mon–Sun buckets</Text>
            </Group>
            <div style={{ width: "100%", height: 260 }}>
              <ResponsiveContainer>
                <LineChart data={weekly}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="count" name="Reports" />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <Text size="sm" c="dimmed" mt="xs">
              {thisWeek >= lastWeek
                ? `Reports increased by ${Math.abs(wowPct)}% week-over-week.`
                : `Reports decreased by ${Math.abs(wowPct)}% week-over-week.`}
            </Text>
          </Paper>

          {/* Monthly totals + Category split */}
          <Grid>
            <Grid.Col span={{ base: 12, md: 7 }}>
              <Paper withBorder radius="lg" p="md">
                <Group justify="space-between" mb="sm">
                  <Text fw={600}>Monthly Totals (last 12 months)</Text>
                  <Text size="xs" c="dimmed">Counts per month</Text>
                </Group>
                <div style={{ width: "100%", height: 280 }}>
                  <ResponsiveContainer>
                    <BarChart data={monthly}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="label" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="count" name="Reports" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <Text size="sm" c="dimmed" mt="xs">
                  Use this to spot seasonality and month-on-month spikes or dips.
                </Text>
              </Paper>
            </Grid.Col>

            <Grid.Col span={{ base: 12, md: 5 }}>
              <Paper withBorder radius="lg" p="md">
                <Group justify="space-between" mb="sm">
                  <Text fw={600}>Reports by Category</Text>
                  <Text size="xs" c="dimmed">Share of total</Text>
                </Group>
                <div style={{ width: "100%", height: 280 }}>
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={byCategory} dataKey="value" nameKey="name" outerRadius={110} label>
                        {byCategory.map((_, i) => (<Cell key={i} />))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <Text size="sm" c="dimmed" mt="xs">
                  {byCategory.length
                    ? `Dominant category is “${topCategory}” at ~${topCategoryPct}% of all reports. Consider targeted education and takedowns for this vector.`
                    : "No category data found yet."}
                </Text>
              </Paper>
            </Grid.Col>
          </Grid>

          {/* Recommendations */}
          <Paper withBorder radius="lg" p="md">
            <Text fw={600} mb="xs">Recommendations</Text>
            <ul style={{ margin: 0, paddingLeft: "1.2rem" }}>
              <li>
                Focus moderation and outreach on <b>{topCategory}</b> (top driver at ~{topCategoryPct}%).
                Publish a monthly PSA addressing the most common patterns.
              </li>
              <li>
                If weekly trend shows spikes (▲), consider enabling push notifications for emerging scams
                and fast-track verification for trending categories.
              </li>
              <li>
                Track <b>report velocity</b> (reports/day). If velocity {'>'} baseline, raise analyst capacity
                and auto-flag duplicates.
              </li>
              <li>
                For categories with high growth month-over-month, spin up <b>keyword filters</b> + <b>hotline tips</b>.
              </li>
              <li>
                If active users are low, run an in-app campaign to encourage reporting with simple, 1-tap flows.
              </li>
            </ul>
          </Paper>
        </Stack>
      )}
    </>
  );
}
