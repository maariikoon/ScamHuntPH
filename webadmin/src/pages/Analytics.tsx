// src/pages/Analytics.tsx
import * as React from "react";
import {
  Title, Text, Grid, Paper, Group, Stack, Loader, Alert, Badge,
  Select, TextInput, Button, Chip, useComputedColorScheme, rem,
} from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell,
} from "recharts";
import { getFreshIdToken } from "@/utils/token";
import { Filter as IconFilter } from "lucide-react";
import dayjs from "dayjs";

/* ---------------- Config ---------------- */
const API_BASE_URL = "https://analytics-bcvrqgcc6a-as.a.run.app";
const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#6366F1", "#8B5CF6", "#EC4899", "#14B8A6"];

/* ---------------- Types ---------------- */
type ReportRow = {
  id: string;
  createdAt: string | number | null;
  category?: string;
  status?: string;
  region?: string;
  senderId?: string;
};

type UserRow = {
  id: string;
  active?: boolean;
  lastActiveAt?: string | number | null;
};

/* ---------------- Helpers ---------------- */
async function apiFetch<T>(path: string, init: RequestInit = {}) {
  const token = await getFreshIdToken();
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...(init.headers || {}) },
  });
  const text = await res.text();
  let data: unknown;
  try { data = text ? JSON.parse(text) : undefined; } catch { data = undefined; }
  return { ok: res.ok, status: res.status, data: data as T, text };
}

const fmtMonth = new Intl.DateTimeFormat("en-PH", { month: "short", year: "2-digit" });
const fmtDate  = new Intl.DateTimeFormat("en-PH", { month: "short", day: "2-digit" });

function toDate(x: string | number | Date | null | undefined): Date | null {
  if (!x) return null;
  const d = x instanceof Date ? x : new Date(x);
  return Number.isNaN(d.getTime()) ? null : d;
}
function startOfWeek(d = new Date()): Date {
  const copy = new Date(d);
  const diff = (copy.getDay() + 6) % 7;
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
function lastNMonths(n: number) {
  const arr: { key: string; label: string; date: Date }[] = [];
  const now = startOfMonth(new Date());
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setMonth(now.getMonth() - i);
    arr.push({ key: monthKey(d), label: fmtMonth.format(d), date: d });
  }
  return arr;
}
function uniqueReportersSince(reports: ReportRow[], since: Date) {
  const set = new Set<string>();
  for (const r of reports) {
    const d = toDate(r.createdAt);
    if (d && d >= since && r.senderId) set.add(r.senderId);
  }
  return set.size;
}

/* ---------------- Component ---------------- */
export default function Analytics() {
  const scheme = useComputedColorScheme("light");
  const isDark = scheme === "dark";

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string>("");

  const [reports, setReports] = React.useState<ReportRow[]>([]);
  const [users, setUsers] = React.useState<UserRow[]>([]);

  // Filter controls
  const [dateRange, setDateRange] = React.useState<[Date | null, Date | null]>([null, null]);
  const [category, setCategory] = React.useState<string | null>(null);
  const [region, setRegion] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState<string | null>("All");
  const [query, setQuery] = React.useState("");

  // Load data once
  React.useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError("");
        const o = await apiFetch<{ reports: ReportRow[]; users: UserRow[] }>("/overview");
        if (o.ok && o.data) {
          setReports(o.data.reports ?? []);
          setUsers(o.data.users ?? []);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Build options
  const categoryOptions = React.useMemo(
    () => Array.from(new Set(reports.map(r => (r.category || "Uncategorized").trim()))).sort()
      .map(v => ({ value: v, label: v })),
    [reports]
  );
  const regionOptions = React.useMemo(
    () => Array.from(new Set(reports.map(r => (r.region || "Unspecified").trim()))).sort()
      .map(v => ({ value: v, label: v })),
    [reports]
  );

  // Apply filters
  const filtered = React.useMemo(() => {
    const [from, to] = dateRange;
    return reports.filter(r => {
      const d = toDate(r.createdAt);
      if (from && (!d || d < dayjs(from).startOf("day").toDate())) return false;
      if (to && (!d || d > dayjs(to).endOf("day").toDate())) return false;

      if (category && (r.category || "Uncategorized").trim() !== category) return false;
      if (region && (r.region || "Unspecified").trim() !== region) return false;

      if (status && status !== "All") {
        const s = (r.status || "").toUpperCase();
        if (status === "Verified" && s !== "VERIFIED") return false;
        if (status === "Pending"  && s !== "PENDING")  return false;
        if (status === "Rejected" && s !== "REJECTED") return false;
      }

      if (query) {
        const q = query.toLowerCase();
        const hay = `${r.id} ${r.senderId} ${r.category} ${r.region} ${r.status}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [reports, dateRange, category, region, status, query]);

  /* ---------------- Derived from filtered ---------------- */
  const now = React.useMemo(() => new Date(), []);
  const weekStart = startOfWeek(now);
  const monthStart = startOfMonth(now);

  const reportsThisWeek  = filtered.filter(r => { const d = toDate(r.createdAt); return d && d >= weekStart; }).length;
  const reportsThisMonth = filtered.filter(r => { const d = toDate(r.createdAt); return d && d >= monthStart; }).length;

  const activeUsers = React.useMemo(() => {
    if (users.length) {
      const THIRTY = 1000 * 60 * 60 * 24 * 30;
      const nowTs = now.getTime();
      if (users.some(u => u.lastActiveAt)) {
        return users.filter(u => {
          const d = toDate(u.lastActiveAt);
          return d && nowTs - d.getTime() <= THIRTY;
        }).length;
      }
      if (users.some(u => typeof u.active === "boolean")) return users.filter(u => u.active).length;
      return users.length;
    }
    return uniqueReportersSince(filtered, monthStart);
  }, [users, filtered, monthStart, now]);

  const byCategory = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const r of filtered) {
      const k = (r.category || "Uncategorized").trim();
      map.set(k, (map.get(k) || 0) + 1);
    }
    return Array.from(map, ([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);
  }, [filtered]);

  const weekly = React.useMemo(() => {
    const buckets: { label: string; start: Date; value: number }[] = [];
    const cursor = startOfWeek(now);
    for (let i = 7; i >= 0; i--) {
      const d = new Date(cursor);
      d.setDate(cursor.getDate() - 7 * i);
      buckets.push({ label: fmtDate.format(d), start: d, value: 0 });
    }
    for (const r of filtered) {
      const d = toDate(r.createdAt);
      if (!d) continue;
      for (let i = 0; i < buckets.length; i++) {
        const start = buckets[i].start;
        const end = new Date(start); end.setDate(end.getDate() + 7);
        if (d >= start && d < end) { buckets[i].value++; break; }
      }
    }
    return buckets.map(b => ({ label: b.label, count: b.value }));
  }, [filtered, now]);

  const monthly = React.useMemo(() => {
    const months = lastNMonths(12);
    const acc = new Map(months.map(m => [m.key, 0]));
    for (const r of filtered) {
      const d = toDate(r.createdAt);
      if (!d) continue;
      const key = monthKey(d);
      if (acc.has(key)) acc.set(key, (acc.get(key) || 0) + 1);
    }
    return months.map(m => ({ label: m.label, count: acc.get(m.key) || 0 }));
  }, [filtered]);

  const topCategory     = byCategory[0]?.name ?? "—";
  const topCategoryPct  = byCategory.length ? Math.round((byCategory[0].value / filtered.length) * 100) : 0;
  const lastWeek        = weekly[weekly.length - 2]?.count ?? 0;
  const thisWeek        = weekly[weekly.length - 1]?.count ?? 0;
  const wowDelta        = thisWeek - lastWeek;
  const wowPct          = lastWeek > 0 ? Math.round(((thisWeek - lastWeek) / lastWeek) * 100) : (thisWeek > 0 ? 100 : 0);

  /* ---------------- Render ---------------- */
  return (
    <>
      <Title order={3} mt="md">Analytics</Title>
      <Text c="dimmed" mb="lg">Visualize scam reporting patterns and user activity.</Text>

      {error && <Alert color="red" mb="md">{error}</Alert>}

      {loading ? (
        <Group justify="center" mt="lg"><Loader /></Group>
      ) : (
        <Stack gap="lg">
          {/* ---------------- Filters ---------------- */}
          <Paper withBorder radius="xl" p="md" style={{ backdropFilter: "blur(6px)" }}>
            <Grid align="center">
              <Grid.Col span={{ base: 12, md: 2.4 }}>
                <Text fw={600} mb={4}>Date range</Text>
                <DatePickerInput
                  type="range"
                  value={dateRange}
                  onChange={(value) => setDateRange(value.map(toDate) as [Date | null, Date | null])}
                  placeholder="Pick dates"
                  radius="xl"
                />
              </Grid.Col>

              <Grid.Col span={{ base: 12, md: 2.4 }}>
                <Text fw={600} mb={4}>Category</Text>
                <Select
                  data={categoryOptions}
                  value={category}
                  onChange={setCategory}
                  placeholder="All categories"
                  radius="xl"
                  clearable
                />
              </Grid.Col>

              <Grid.Col span={{ base: 12, md: 2.4 }}>
                <Text fw={600} mb={4}>Region</Text>
                <Select
                  data={regionOptions}
                  value={region}
                  onChange={setRegion}
                  placeholder="All regions"
                  radius="xl"
                  clearable
                />
              </Grid.Col>

              <Grid.Col span={{ base: 12, md: 2.4 }}>
                <Text fw={600} mb={4}>Status</Text>
                <Select
                  data={["All", "Verified", "Pending", "Rejected"]}
                  value={status}
                  onChange={setStatus}
                  placeholder="All"
                  radius="xl"
                />
              </Grid.Col>

              <Grid.Col span={{ base: 12, md: 2.4 }}>
                <Text fw={600} mb={4}>Search</Text>
                <Group gap="xs" wrap="nowrap">
                  <TextInput
                    w="100%"
                    value={query}
                    onChange={(e) => setQuery(e.currentTarget.value)}
                    placeholder="Paste report ID / type category"
                    radius="xl"
                  />
                  <Button
                    leftSection={<IconFilter size={16} />}
                    variant="subtle"
                    radius="xl"
                    onClick={() => {/* filters are live; button for UX parity */}}
                  >
                    Apply filters
                  </Button>
                </Group>
              </Grid.Col>
            </Grid>
          </Paper>

          {/* ---------------- Stats ---------------- */}
          <Grid>
            <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
              <Paper withBorder radius="lg" p="md">
                <Text size="sm" c="dimmed">Reports (This Week)</Text>
                <Text fw={700} fz={rem(28)}>{reportsThisWeek}</Text>
                <Badge variant="light" color={wowDelta >= 0 ? "green" : "red"}>
                  {wowDelta >= 0 ? "▲" : "▼"} {Math.abs(wowPct)}% WoW
                </Badge>
              </Paper>
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
              <Paper withBorder radius="lg" p="md">
                <Text size="sm" c="dimmed">Reports (This Month)</Text>
                <Text fw={700} fz={rem(28)}>{reportsThisMonth}</Text>
                <Text size="xs" c="dimmed">{fmtMonth.format(startOfMonth(new Date()))} to date</Text>
              </Paper>
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
              <Paper withBorder radius="lg" p="md">
                <Text size="sm" c="dimmed">Active Users</Text>
                <Text fw={700} fz={rem(28)}>{activeUsers}</Text>
                <Text size="xs" c="dimmed">≈ active within 30 days</Text>
              </Paper>
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
              <Paper withBorder radius="lg" p="md">
                <Text size="sm" c="dimmed">Top Category</Text>
                <Text fw={700} fz={rem(28)}>{topCategory}</Text>
                <Text size="xs" c="dimmed">{topCategoryPct}% of total</Text>
              </Paper>
            </Grid.Col>
          </Grid>

          {/* ---------------- Weekly Trend ---------------- */}
          <Paper withBorder radius="xl" p="md">
            <Group justify="space-between" mb="sm">
              <Text fw={700}>Reports over time</Text>
              <Chip checked={false} onChange={() => {}} radius="xl" variant="outline">
                8 DAY(S)
              </Chip>
            </Group>
            <div style={{ width: "100%", height: 280 }}>
              <ResponsiveContainer>
                <LineChart data={weekly}>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#374151" : "#e5e7eb"} />
                  <XAxis dataKey="label" stroke={isDark ? "#d1d5db" : "#374151"} />
                  <YAxis allowDecimals={false} stroke={isDark ? "#d1d5db" : "#374151"} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="count" name="Reports" stroke="#3B82F6" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <Text size="sm" c="dimmed" mt="xs">
              {thisWeek >= lastWeek
                ? `Reports increased by ${Math.abs(wowPct)}% week-over-week.`
                : `Reports decreased by ${Math.abs(wowPct)}% week-over-week.`}
            </Text>
          </Paper>

          {/* ---------------- Monthly + Category ---------------- */}
          <Grid>
            <Grid.Col span={{ base: 12, md: 7 }}>
              <Paper withBorder radius="xl" p="md">
                <Group justify="space-between" mb="sm">
                  <Text fw={700}>Monthly totals</Text>
                  <Text size="xs" c="dimmed">Last 12 months</Text>
                </Group>
                <div style={{ width: "100%", height: 280 }}>
                  <ResponsiveContainer>
                    <BarChart data={monthly}>
                      <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#374151" : "#e5e7eb"} />
                      <XAxis dataKey="label" stroke={isDark ? "#d1d5db" : "#374151"} />
                      <YAxis allowDecimals={false} stroke={isDark ? "#d1d5db" : "#374151"} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="count" name="Reports" fill="#3B82F6" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Paper>
            </Grid.Col>

            <Grid.Col span={{ base: 12, md: 5 }}>
              <Paper withBorder radius="xl" p="md">
                <Group justify="space-between" mb="sm">
                  <Text fw={700}>By category</Text>
                  <Chip checked={false} onChange={() => {}} radius="xl" variant="outline">
                    {filtered.length} TOTAL
                  </Chip>
                </Group>
                <div style={{ width: "100%", height: 280 }}>
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={byCategory} dataKey="value" nameKey="name" outerRadius={110} label>
                        {byCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </Paper>
            </Grid.Col>
          </Grid>

          <Text size="sm" c="dimmed">
            Tip: you’ll see a toast on this page whenever a new report arrives.
          </Text>
        </Stack>
      )}
    </>
  );
}
