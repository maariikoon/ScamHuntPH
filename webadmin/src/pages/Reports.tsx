// src/pages/Reports.tsx
import * as React from 'react';
import {
  Title,
  Text,
  Tabs,
  Group,
  Select,
  Button,
  Table,
  Loader,
  Alert,
  Badge,
  Stack,
} from '@mantine/core';
import { useNavigate, useLocation } from '@tanstack/react-router';
import { api } from '@/api';

type ReportRow = {
  id: string;
  createdAt: string | null; // ISO string (or null)
  updatedAt?: string | null;
  status?: 'new' | 'review' | 'closed' | string;
  userId?: string;
  email?: string;
  title?: string;
  category?: string;
  [k: string]: unknown;
};

export default function Reports() {
  const navigate = useNavigate();
  const loc = useLocation();

  // Normalize current tab from path: '/admin/<tab>'
  const current =
    ((loc.pathname.split('/admin/')[1] || 'reports').split('/')[0]) || 'reports';

  const onTabChange = (v: string | null) => {
    if (!v) return;
    navigate({ to: `/admin/${v}` });
  };

  // Optional: if someone lands exactly on /admin, send to /admin/reports
  React.useEffect(() => {
    if (loc.pathname === '/admin') {
      navigate({ to: '/admin/reports', replace: true });
    }
  }, [loc.pathname, navigate]);

  // ---- Data state ----
  const [rows, setRows] = React.useState<ReportRow[]>([]);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [status, setStatus] = React.useState<string>(''); // '', 'new', 'review', 'closed'
  const [next, setNext] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string>('');

  // Loader with reset/append behavior to avoid stale closure
  const load = React.useCallback(
    async (cursor?: string | null, reset: boolean = false) => {
      try {
        setLoading(true);
        const r = await api.listReports({
          ...(status ? { status } : {}),
          limit: 50,
          ...(cursor ? { cursor } : {}),
        });
        setRows((prev) => (reset ? r.data as ReportRow[] : [...prev, ...(r.data as ReportRow[])]));
        setNext(r.nextCursor);
        setError('');
      } catch (e: unknown) {
        if (e instanceof Error) {
          setError(e.message);
        } else {
          setError(String(e));
        }
      } finally {
        setLoading(false);
      }
    },
    [status],
  );

  // Initial + whenever status changes → reset list
  React.useEffect(() => {
    load(null, true);
  }, [status, load]);

  // ---- Render helpers ----
  const fmt = (iso?: string | null) => (iso ? new Date(iso).toLocaleString() : '');

  const statusBadge = (s?: string) => {
    const map: Record<string, string> = { new: 'blue', review: 'yellow', closed: 'green' };
    const color = map[s || ''] || 'gray';
    const label = (s || 'unknown').toUpperCase();
    return <Badge color={color} variant="light">{label}</Badge>;
    };

  return (
    <>
      {/* Top tabs for admin sections */}
      <Tabs value={current} onChange={onTabChange} keepMounted={false}>
        <Tabs.List>
          <Tabs.Tab value="reports">Recent Reports</Tabs.Tab>
          <Tabs.Tab value="analytics">Analytics</Tabs.Tab>
          <Tabs.Tab value="users">User Management</Tabs.Tab>
          <Tabs.Tab value="content">Content Management</Tabs.Tab>
          <Tabs.Tab value="security">Security Monitoring</Tabs.Tab>
        </Tabs.List>
      </Tabs>

      <Title order={3} mt="md">Recent Scam Reports</Title>
      <Text c="dimmed" mb="md">Review the most recent submissions and take action.</Text>

      <Stack gap="sm">
        {/* Filters / Actions */}
        <Group gap="sm">
          <Select
            label="Status"
            placeholder="All"
            value={status}
            onChange={(v) => setStatus(v || '')}
            data={[
              { value: '', label: 'All' },
              { value: 'new', label: 'New' },
              { value: 'review', label: 'In Review' },
              { value: 'closed', label: 'Closed' },
            ]}
            maw={220}
          />
          <Button variant="light" onClick={() => load(null, true)} disabled={loading}>
            Refresh
          </Button>
          {loading && <Loader size="sm" />}
        </Group>

        {error && (
          <Alert color="red" variant="light" title="Failed to load">
            {error}
          </Alert>
        )}

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          <Table striped highlightOnHover withTableBorder>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>ID</Table.Th>
                <Table.Th>Created</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Reporter</Table.Th>
                <Table.Th>Title / Category</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {rows.map((r) => (
                <Table.Tr key={r.id}>
                  <Table.Td style={{ whiteSpace: 'nowrap' }}>{r.id}</Table.Td>
                  <Table.Td>{fmt(r.createdAt)}</Table.Td>
                  <Table.Td>{statusBadge(r.status)}</Table.Td>
                  <Table.Td>{r.email || r.userId || '—'}</Table.Td>
                  <Table.Td>{r.title || r.category || '—'}</Table.Td>
                </Table.Tr>
              ))}
              {!loading && rows.length === 0 && (
                <Table.Tr>
                  <Table.Td colSpan={5} style={{ textAlign: 'center', color: '#667085' }}>
                    No reports found.
                  </Table.Td>
                </Table.Tr>
              )}
            </Table.Tbody>
          </Table>
        </div>

        {/* Pagination */}
        {next && !loading && (
          <Group justify="center" mt="sm">
            <Button onClick={() => load(next, false)}>Load more</Button>
          </Group>
        )}
      </Stack>
    </>
  );
}
