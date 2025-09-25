import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  Alert, Badge, Button, Card, Grid, Group, Select, Stack, Text, TextInput, Title, Menu,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { notifications } from '@mantine/notifications';
import {
  collection, getDocs, limit, onSnapshot, orderBy, query, Timestamp, where,
  documentId, type QueryConstraint,
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db } from '@/firebase';
import StatCard from '@/components/StatCard';
import { Download, Filter, RefreshCw } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import jsPDF from 'jspdf';
import { getFreshIdToken } from '@/utils/token';

// --- Types ---
type Stats = {
  totalReports: number;
  pendingReviews: number;
  verifiedReports: number;
  activeUsers: number;
};

type Report = {
  id: string;
  createdAt?: Timestamp | null;
  category?: string;
  region?: string;
  status?: 'pending' | 'verified' | 'declined' | string;
};

// --- Constants ---
const CATEGORY_OPTIONS = [
  'Phishing', 'Investment scam', 'Loan scam', 'Romance scam', 'Impersonation', 'Other',
];

const REGION_OPTIONS = [
  'NCR','Region I','Region II','Region III','Region IV-A','MIMAROPA','Region V','Region VI',
  'Region VII','Region VIII','Region IX','Region X','Region XI','Region XII','CAR','BARMM',
];

// ✅ backend base for admin endpoints
const API_BASE_URL = import.meta.env.VITE_BACKEND_URL ?? 'https://analytics-bcvrqgcc6a-as.a.run.app';

// Small helper to call backend with ID token
async function fetchOverview() {
  const idToken = await getFreshIdToken();
  const resp = await fetch(`${API_BASE_URL}/admin/overview`, {
    headers: { Authorization: `Bearer ${idToken}`, Accept: 'application/json' },
  });
  if (!resp.ok) {
    const t = await resp.text().catch(() => '');
    throw new Error(`HTTP ${resp.status} ${resp.statusText} ${t}`);
  }
  return resp.json();
}

// ✅ safe helpers (no mutation of state dates)
const startOfDay = (d: Date) => { const x = new Date(d); x.setHours(0,0,0,0); return x; };
const endOfDay   = (d: Date) => { const x = new Date(d); x.setHours(23,59,59,999); return x; };

// Simple doc-id heuristic
const looksLikeDocId = (s: string) => s.length >= 18 && !/\s/.test(s);

export default function Dashboard() {
  // ---- cards state ----
  const [stats, setStats] = useState<Stats>({
    totalReports: 0,
    pendingReviews: 0,
    verifiedReports: 0,
    activeUsers: 0,
  });
  const [loadingCards, setLoadingCards] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // ---- filters ----
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
  const [category, setCategory] = useState<string | null>(null);
  const [region, setRegion] = useState<string | null>(null);
  const [status, setStatus] = useState<'all' | 'pending' | 'verified' | 'declined'>('all');
  const [search, setSearch] = useState('');

  // ---- data for charts / export ----
  const [filteredReports, setFilteredReports] = useState<Report[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  const alive = useRef(true);
  const mountedAt = useRef<number>(Date.now());
  const auth = getAuth();

  // ensure latest custom claims (admin) are on the token
  useEffect(() => {
    (async () => {
      try { await auth.currentUser?.getIdToken(true); } catch { /* ignore */ }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ build constraints without mutating dates
  const buildReportConstraints = useCallback((): QueryConstraint[] => {
    const cons: QueryConstraint[] = [];

    if (status !== 'all') cons.push(where('status', '==', status));
    const [from, to] = dateRange;
    if (from) cons.push(where('createdAt', '>=', Timestamp.fromDate(startOfDay(from))));
    if (to)   cons.push(where('createdAt', '<=', Timestamp.fromDate(endOfDay(to))));

    if (category) cons.push(where('category', '==', category));
    if (region)   cons.push(where('region', '==', region));

    cons.push(orderBy('createdAt', 'desc'));
    return cons;
  }, [status, dateRange, category, region]);

  // retry once after a forced token refresh
  async function withPermRetry<T>(fn: () => Promise<T>): Promise<T> {
    try { return await fn(); }
    catch (e: unknown) {
      const msg = `${(e as { code?: string; message?: string })?.code ?? ''} ${(e as { code?: string; message?: string })?.message ?? e}`;
      if (/permission|insufficient/i.test(msg)) {
        await auth.currentUser?.getIdToken(true);
        return await fn();
      }
      throw e;
    }
  }

  // ---- load top cards ----
  const loadCards = async () => {
    setErr(null);
    setLoadingCards(true);
    try {
      const res = await fetchOverview();
      if (!alive.current) return;
      // expecting { ok: true, data: {...} }
      if (!res?.ok) throw new Error(res?.error || 'Failed to load overview');
      setStats(res.data);
    } catch (e: unknown) {
      if (!alive.current) return;
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      if (alive.current) setLoadingCards(false);
    }
  };

  // ---- load filtered reports ----
  const loadFiltered = useCallback(async () => {
    setLoadingData(true);
    try {
      const s = search.trim();

      // ✅ Fast path: exact document ID
      let qRef;
      if (s && looksLikeDocId(s)) {
        qRef = query(collection(db, 'reports'), where(documentId(), '==', s));
      } else {
        const cons = buildReportConstraints();
        // ✅ keep queries bounded
        qRef = query(collection(db, 'reports'), ...cons, limit(500));
      }

      const snap = await withPermRetry(() => getDocs(qRef));
      let items: Report[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Partial<Report>) }));

      // Optional client-side fuzzy contains for non-docId searches
      if (s && !looksLikeDocId(s)) {
        const ql = s.toLowerCase();
        items = items.filter((r) =>
          [r.id, r.category, r.region]
            .some((v) => (v ?? '').toString().toLowerCase().includes(ql)),
        );
      }

      if (!alive.current) return;
      setFilteredReports(items);
    } catch (e: unknown) {
      if (!alive.current) return;
      setErr(e instanceof Error ? e.message : String(e));
      setFilteredReports([]);
    } finally {
      if (alive.current) setLoadingData(false);
    }
  }, [buildReportConstraints, search]);

  // initial + whenever filters change
  useEffect(() => {
    alive.current = true;
    loadCards();
    loadFiltered();
    return () => { alive.current = false; };
  }, [loadFiltered]);

  // realtime toast for new reports
  useEffect(() => {
    const cons: QueryConstraint[] = [orderBy('createdAt', 'desc'), limit(1)];
    const unsub = onSnapshot(
      query(collection(db, 'reports'), ...cons),
      {
        next: (snap) => {
          const doc = snap.docs[0];
          if (!doc) return;
          const data = doc.data() as Report;
          const ts = (data.createdAt as Timestamp | undefined)?.toMillis?.() ?? Date.now();
          if (ts > mountedAt.current + 2500) {
            notifications.show({
              title: 'New report received',
              message: `A new ${data.category ?? 'report'} was submitted.`,
            });
          }
        },
        error: async (err) => {
          const msg = `${(err as { code?: string; message?: string })?.code ?? ''} ${(err as { code?: string; message?: string })?.message ?? err}`;
          if (/permission|insufficient/i.test(msg)) {
            await auth.currentUser?.getIdToken(true);
          }
        },
      }
    );
    return () => unsub();
  }, [auth]);

  // charts
  const lineData = useMemo(() => {
    const map = new Map<string, number>();
    filteredReports.forEach((r) => {
      const d = r.createdAt?.toDate?.() ?? new Date();
      const key = d.toISOString().slice(0, 10); // YYYY-MM-DD
      map.set(key, (map.get(key) ?? 0) + 1);
    });
    return Array.from(map.entries())
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .map(([date, count]) => ({ date, count }));
  }, [filteredReports]);

  const pieData = useMemo(() => {
    const map = new Map<string, number>();
    filteredReports.forEach((r) => {
      const key = r.category || 'Unknown';
      map.set(key, (map.get(key) ?? 0) + 1);
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [filteredReports]);

  // export helpers
  function exportCSV() {
    const rows = filteredReports.map((r) => ({
      id: r.id,
      createdAt: r.createdAt ? r.createdAt.toDate().toISOString() : '',
      category: r.category ?? '',
      region: r.region ?? '',
      status: r.status ?? '',
    }));

    const header = Object.keys(rows[0] ?? { id: '', createdAt: '', category: '', region: '', status: '' });
    const csv = [header.join(','), ...rows.map((r) =>
      header.map((h) => JSON.stringify((r as Record<string, string | number | null>)[h] ?? '')).join(',')
    )].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'reports.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportPDF() {
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text('ScamHuntPH – Reports (filtered)', 14, 16);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 22);

    const rows = filteredReports.slice(0, 30).map((r) => [
      r.id,
      r.createdAt ? r.createdAt.toDate().toISOString().slice(0, 19).replace('T', ' ') : '',
      r.category ?? '',
      r.region ?? '',
      r.status ?? '',
    ]);

    const colX = [14, 64, 114, 154, 184];
    let y = 32;
    doc.setFont('helvetica', 'bold');
    ['ID', 'Created At', 'Category', 'Region', 'Status'].forEach((t, i) => doc.text(t, colX[i], y));
    doc.setFont('helvetica', 'normal');
    y += 6;
    rows.forEach((row) => {
      row.forEach((cell, i) => doc.text(String(cell).slice(0, 24), colX[i], y));
      y += 6;
      if (y > 280) {
        doc.addPage();
        y = 20;
      }
    });

    doc.save('reports.pdf');
  }

  return (
    <Stack>
      <Group justify="space-between">
        <Title order={3}>Overview</Title>
        <Group>
          <Button leftSection={<RefreshCw size={16} />} onClick={loadCards} loading={loadingCards}>
            Refresh Data
          </Button>
          <Menu shadow="md" width={200}>
            <Menu.Target>
              <Button variant="light" leftSection={<Download size={16} />}>Export</Button>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item onClick={exportCSV}>Export CSV</Menu.Item>
              <Menu.Item onClick={exportPDF}>Export PDF (summary)</Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>
      </Group>

      {err && <Alert color="red" variant="light">{err}</Alert>}

      {/* KPI Cards */}
      <Grid>
        <Grid.Col span={{ base: 12, sm: 6 }}>
          <StatCard title="Total Reports" value={stats.totalReports} subtitle="All time reports" />
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6 }}>
          <StatCard title="Pending Reviews" value={stats.pendingReviews} subtitle="Awaiting verification" />
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6 }}>
          <StatCard title="Verified Reports" value={stats.verifiedReports} subtitle="Confirmed threats" valueColor="green" />
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6 }}>
          <StatCard title="Active Users" value={stats.activeUsers} subtitle="Registered users" />
        </Grid.Col>
      </Grid>

      {/* Filters */}
      <Card withBorder radius="lg" p="md">
        <Group justify="space-between" align="end">
          <Group wrap="wrap" gap="md" align="end">
            <DatePickerInput
              type="range"
              label="Date range"
              placeholder="Pick dates"
              maw={280}
              value={dateRange}
              onChange={(v) => setDateRange(v as [Date | null, Date | null])}
              allowSingleDateInRange
              clearable
            />
            <Select
              label="Category"
              placeholder="All categories"
              data={CATEGORY_OPTIONS}
              value={category}
              onChange={setCategory}
              clearable
              searchable
              maw={220}
            />
            <Select
              label="Region"
              placeholder="All regions"
              data={REGION_OPTIONS}
              value={region}
              onChange={setRegion}
              clearable
              searchable
              maw={220}
            />
            <Select
              label="Status"
              data={[
                { value: 'all', label: 'All' },
                { value: 'pending', label: 'Pending' },
                { value: 'verified', label: 'Verified' },
                { value: 'declined', label: 'Declined' },
              ]}
              value={status}
              onChange={(v: string | null) =>
                setStatus((v as 'all' | 'pending' | 'verified' | 'declined') ?? 'all')
              }
              maw={160}
            />
            <TextInput
              label="Search"
              placeholder="Paste report ID / type category or region"
              value={search}
              onChange={(e) => setSearch(e.currentTarget.value)}
              maw={320}
            />
          </Group>
          <Group>
            <Button
              variant="subtle"
              leftSection={<Filter size={16} />}
              onClick={loadFiltered}
              loading={loadingData}
            >
              Apply filters
            </Button>
          </Group>
        </Group>
      </Card>

      {/* Charts */}
      <Grid>
        <Grid.Col span={{ base: 12, md: 7 }}>
          <Card withBorder radius="lg" p="md">
            <Group justify="space-between" mb="sm">
              <Text fw={600}>Reports over time</Text>
              <Badge variant="light">{lineData.length} day(s)</Badge>
            </Group>
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <LineChart data={lineData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis allowDecimals={false} />
                  <RTooltip />
                  <Legend />
                  <Line type="monotone" dataKey="count" name="Reports" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 5 }}>
          <Card withBorder radius="lg" p="md">
            <Group justify="space-between" mb="sm">
              <Text fw={600}>By category</Text>
              <Badge variant="light">{filteredReports.length} total</Badge>
            </Group>
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={110} label>
                    {pieData.map((_, i) => (
                      <Cell key={i} />
                    ))}
                  </Pie>
                  <Legend />
                  <RTooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Grid.Col>
      </Grid>

      <Text c="dimmed" size="xs">
        Tip: you will see a toast on this page whenever a new report arrives.
      </Text>
    </Stack>
  );
}
