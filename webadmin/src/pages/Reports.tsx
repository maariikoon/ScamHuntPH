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
import { getAuth } from "firebase/auth";

const API_BASE_URL = "https://scamhunt-bcvrqgcc6a-as.a.run.app"; 

type ReportRow = {
  id: string;
  createdAt: string | null;
  updatedAt?: string | null;
  status?: 'new' | 'review' | 'closed' | string;
  sender?: string;
  category?: string;
  region?: string;
  attachments?: string[];
  [k: string]: unknown;
};

// 🔹 Helper to get Firebase ID token
async function getIdToken(): Promise<string> {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated. Please log in.");
  return await user.getIdToken();
}

export default function Reports() {
  const navigate = useNavigate();
  const loc = useLocation();

  const current =
    ((loc.pathname.split('/admin/')[1] || 'reports').split('/')[0]) || 'reports';

  const onTabChange = (v: string | null) => {
    if (!v) return;
    navigate({ to: `/admin/${v}` });
  };

  React.useEffect(() => {
    if (loc.pathname === '/admin') {
      navigate({ to: '/admin/reports', replace: true });
    }
  }, [loc.pathname, navigate]);

  const [rows, setRows] = React.useState<ReportRow[]>([]);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [status, setStatus] = React.useState<string>('');
  const [next, setNext] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string>('');

  // 🔹 Load reports
  const load = React.useCallback(
    async (cursor?: string | null, reset: boolean = false) => {
      try {
        setLoading(true);
        setError('');

        const params = new URLSearchParams();
        if (status) params.append('status', status);
        params.append('limit', '50');
        if (cursor) params.append('cursor', cursor);

        const token = await getIdToken();

        const res = await fetch(`${API_BASE_URL}/reports?${params.toString()}`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        const json = await res.json();
        if (!res.ok || !json.ok) {
          throw new Error(json.error || "Failed to load reports");
        }

        setRows((prev) => (reset ? json.data : [...prev, ...json.data]));
        setNext(json.nextCursor || null);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    },
    [status],
  );

  // 🔹 Update report status
  const setReportStatus = async (id: string, newStatus: string) => {
    try {
      const token = await getIdToken();

      const res = await fetch(`${API_BASE_URL}/report/${id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Failed to update status");
      }

      load(null, true);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  React.useEffect(() => {
    load(null, true);
  }, [status, load]);

  const fmt = (iso?: string | null) =>
    iso ? new Date(iso).toLocaleString() : '';

  const statusBadge = (s?: string) => {
    const map: Record<string, string> = {
      new: 'blue',
      review: 'yellow',
      closed: 'green',
    };
    const color = map[s || ''] || 'gray';
    const label = (s || 'unknown').toUpperCase();
    return <Badge color={color} variant="light">{label}</Badge>;
  };

  return (
    <>
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
      <Text c="dimmed" mb="md">
        Review the most recent submissions and take action.
      </Text>

      <Stack gap="sm">
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

        <div style={{ overflowX: 'auto' }}>
          <Table striped highlightOnHover withTableBorder>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>ID</Table.Th>
                <Table.Th>Created</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Sender</Table.Th>
                <Table.Th>Category</Table.Th>
                <Table.Th>Region</Table.Th>
                <Table.Th>Screenshots</Table.Th>
                <Table.Th>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {rows.map((r) => (
                <Table.Tr key={r.id}>
                  <Table.Td style={{ whiteSpace: 'nowrap' }}>{r.id}</Table.Td>
                  <Table.Td>{fmt(r.createdAt)}</Table.Td>
                  <Table.Td>{statusBadge(r.status)}</Table.Td>
                  <Table.Td>{r.sender || '—'}</Table.Td>
                  <Table.Td>{r.category || '—'}</Table.Td>
                  <Table.Td>{r.region || '—'}</Table.Td>
                  <Table.Td>
                    {r.attachments && r.attachments.length > 0 ? (
                      r.attachments.map((url, i) => (
                        <a
                          key={i}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            color: "#007AFF",
                            textDecoration: "underline",
                            marginRight: 8,
                          }}
                        >
                          View {i + 1}
                        </a>
                      ))
                    ) : (
                      <span style={{ color: "#888" }}>—</span>
                    )}
                  </Table.Td>
                  <Table.Td>
                    <Group gap="xs">
                      <Button
                        size="xs"
                        onClick={() => setReportStatus(r.id, 'review')}
                        disabled={r.status === 'review'}
                      >
                        Review
                      </Button>
                      <Button
                        size="xs"
                        variant="light"
                        color="green"
                        onClick={() => setReportStatus(r.id, 'closed')}
                        disabled={r.status === 'closed'}
                      >
                        Close
                      </Button>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
              {!loading && rows.length === 0 && (
                <Table.Tr>
                  <Table.Td colSpan={8} style={{ textAlign: 'center', color: '#667085' }}>
                    No reports found.
                  </Table.Td>
                </Table.Tr>
              )}
            </Table.Tbody>
          </Table>
        </div>

        {next && !loading && (
          <Group justify="center" mt="sm">
            <Button onClick={() => load(next, false)}>Load more</Button>
          </Group>
        )}
      </Stack>
    </>
  );
}
