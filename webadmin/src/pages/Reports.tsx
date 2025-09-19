// src/pages/Reports.tsx
import * as React from "react";
import {
  Title, Text, Group, Select, Button, Table, Loader, Alert, Badge,
  Stack, Paper, TextInput, Divider, Pagination,
} from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import { useDebouncedValue } from "@mantine/hooks";
import { IconRefresh, IconSearch } from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";
import { getAuth } from "firebase/auth";
import "@mantine/dates/styles.css";

const API_BASE_URL = "https://reports-bcvrqgcc6a-as.a.run.app";
const PAGE_SIZE = 5;

type ReportRow = {
  id: string;
  createdAt: string | number | null;
  status?: "pending" | "verified" | "declined" | string;
  sender?: string;
};

async function getIdToken(): Promise<string> {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated. Please log in.");
  return await user.getIdToken();
}

function toDate(v: string | number | null): Date | null {
  if (v == null) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

const fmt = new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "short" });

/** ---------- Safe date helpers ---------- */
function coerceDate(x: Date | string | number | null | undefined): Date | null {
  if (!x) return null;
  const d = x instanceof Date ? x : new Date(x);
  return Number.isNaN(d.getTime()) ? null : d;
}
function startOfDay(x: Date | string | number | null | undefined): Date | null {
  const d = coerceDate(x); if (!d) return null;
  const copy = new Date(d.getTime()); copy.setHours(0, 0, 0, 0); return copy;
}
function endOfDay(x: Date | string | number | null | undefined): Date | null {
  const d = coerceDate(x); if (!d) return null;
  const copy = new Date(d.getTime()); copy.setHours(23, 59, 59, 999); return copy;
}
/** -------------------------------------- */

export default function Reports() {
  const navigate = useNavigate();

  // data
  const [rows, setRows] = React.useState<ReportRow[]>([]);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string>("");

  // filters
  const [status, setStatus] = React.useState<string>("");
  const [sender, setSender] = React.useState<string>("");
  const [dateRange, setDateRange] = React.useState<[Date | null, Date | null]>([null, null]);
  const [senderDebounced] = useDebouncedValue(sender, 300);

  // pagination
  const [page, setPage] = React.useState<number>(1);

  // Load reports (passes filters to API; still filters client-side as fallback)
  const load = React.useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();
      if (status) params.append("status", status);
      if (senderDebounced.trim()) params.append("sender", senderDebounced.trim());

      // ✅ Coerce before calling toISOString()
      const fromDate = coerceDate(dateRange[0]);
      const toDateVal = coerceDate(dateRange[1]);
      if (fromDate) params.append("from", fromDate.toISOString());
      if (toDateVal) params.append("to", toDateVal.toISOString());

      // backend limit high; client paginates to 5/page
      params.append("limit", "200");

      const token = await getIdToken();
      const res = await fetch(`${API_BASE_URL}/?${params.toString()}`, {
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });

      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Failed to load reports");

      setRows((json.data ?? []) as ReportRow[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [status, senderDebounced, dateRange]);

  React.useEffect(() => { load(); }, [load]);

  // client-side fallback filtering
  const filtered = React.useMemo(() => {
    const [from, to] = dateRange;
    const fromBound = startOfDay(from);
    const toBound = endOfDay(to);

    return rows.filter((r) => {
      if (status && r.status !== status) return false;

      if (senderDebounced) {
        const s = (r.sender || "").toLowerCase();
        if (!s.includes(senderDebounced.toLowerCase())) return false;
      }

      const d = coerceDate(r.createdAt);
      if (fromBound && d && d < fromBound) return false;
      if (toBound && d && d > toBound) return false;
      return true;
    });
  }, [rows, status, senderDebounced, dateRange]);

  // reset page on changes
  React.useEffect(() => { setPage(1); }, [status, senderDebounced, dateRange, rows.length]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const start = (page - 1) * PAGE_SIZE;
  const visible = filtered.slice(start, start + PAGE_SIZE);

  const statusBadge = (s?: string) => {
    const map: Record<string, string> = { pending: "yellow", verified: "green", declined: "red", review: "blue", new: "gray" };
    const color = map[s || ""] || "gray";
    const label = (s || "unknown").toUpperCase();
    return <Badge color={color} variant="light">{label}</Badge>;
  };

  return (
    <>
      <Title order={3} mt="md">Recent Scam Reports</Title>
      <Text c="dimmed" mb="md">Review the most recent submissions and take action.</Text>

      {/* Filters */}
      <Paper withBorder p="md" radius="lg" mb="md">
        <Stack gap="sm">
          <Group gap="sm" wrap="wrap">
            <Select
              label="Status"
              placeholder="All"
              value={status}
              onChange={(v) => setStatus(v || "")}
              data={[
                { value: "", label: "All" },
                { value: "pending", label: "Pending" },
                { value: "verified", label: "Verified" },
                { value: "declined", label: "Declined" },
              ]}
              maw={220}
            />

            <TextInput
              label="Search by sender"
              placeholder="Enter sender ID or part of it"
              value={sender}
              onChange={(e) => setSender(e.currentTarget.value)}
              leftSection={<IconSearch size={16} />}
              maw={300}
            />

<DatePickerInput
  type="range"
  label="Date range"
  placeholder="Pick dates"
  value={dateRange}
  onChange={(v) =>
    setDateRange((Array.isArray(v) ? v : [v, v]) as [Date | null, Date | null])
  }
  maw={320}
  allowSingleDateInRange
  clearable
/>

            <Group gap="xs" mt="lg">
              <Button variant="light" leftSection={<IconRefresh size={16} />} onClick={load} disabled={loading}>
                Refresh
              </Button>
              {loading && <Loader size="sm" />}
            </Group>
          </Group>

          <Divider />
          <Text size="sm" c="dimmed">
            Showing <b>{filtered.length === 0 ? 0 : `${start + 1}-${Math.min(start + PAGE_SIZE, filtered.length)}`}</b> of{" "}
            <b>{filtered.length}</b> {filtered.length === 1 ? "result" : "results"}
          </Text>
        </Stack>
      </Paper>

      {error && <Alert color="red" variant="light" title="Failed to load" mb="md">{error}</Alert>}

      {/* Table */}
      <div style={{ overflowX: "auto" }}>
        <Table striped highlightOnHover withTableBorder withColumnBorders>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Report ID</Table.Th>
              <Table.Th>Sender ID</Table.Th>
              <Table.Th>Created</Table.Th>
              <Table.Th>Status</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {visible.map((r) => {
              const d = toDate(r.createdAt);
              return (
                <Table.Tr key={r.id} style={{ cursor: "pointer" }} onClick={() => navigate({ to: `/admin/reports/${r.id}` })}>
                  <Table.Td>{r.id.slice(0, 8)}…</Table.Td>
                  <Table.Td>{r.sender || "—"}</Table.Td>
                  <Table.Td>{d ? fmt.format(d) : "—"}</Table.Td>
                  <Table.Td>{statusBadge(r.status)}</Table.Td>
                </Table.Tr>
              );
            })}
            {!loading && filtered.length === 0 && (
              <Table.Tr>
                <Table.Td colSpan={4} style={{ textAlign: "center", color: "#667085" }}>
                  No reports found.
                </Table.Td>
              </Table.Tr>
            )}
          </Table.Tbody>
        </Table>
      </div>

      {/* Pagination */}
      <Group justify="center" mt="md">
        <Pagination total={pageCount} value={page} onChange={setPage} size="sm" />
      </Group>
    </>
  );
}
