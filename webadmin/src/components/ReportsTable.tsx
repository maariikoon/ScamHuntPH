import { useEffect, useState } from 'react';
import { Badge, Button, Group, Table, Text, Loader, Alert } from '@mantine/core';

const API_BASE_URL = "https://scamhunt-bcvrqgcc6a-as.a.run.app"; // your backend API

type Report = {
  id: string;
  createdAt?: string | null; // ISO string from backend
  updatedAt?: string | null;
  sender?: string;
  message?: string;            // ✅ add message
  category?: string;
  region?: string;
  status?: 'new' | 'review' | 'closed' | string;
  attachments?: string[];      // ✅ add attachments (screenshots)
};

export default function ReportsTable() {
  const [rows, setRows] = useState<Report[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadReports = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`${API_BASE_URL}/reports`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          // If auth is required, include:
          // Authorization: `Bearer ${yourIdToken}`
        },
      });

      const text = await res.text();
      let json;
      try {
        json = JSON.parse(text);
      } catch {
        throw new Error("Invalid JSON from server: " + text);
      }

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Failed to fetch reports");
      }

      setRows(json.data as Report[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const setStatus = async (id: string, status: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/report/${id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          // If auth is required, include:
          // Authorization: `Bearer ${yourIdToken}`
        },
        body: JSON.stringify({ status }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Failed to update status");
      }
      // Refresh list after update
      loadReports();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <>
      {error && (
        <Alert color="red" variant="light" title="Error">
          {error}
        </Alert>
      )}
      {loading && <Loader size="sm" />}

      <Table striped withTableBorder withColumnBorders>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Created</Table.Th>
            <Table.Th>Sender</Table.Th>
            <Table.Th>Message</Table.Th>      {/* ✅ new column */}
            <Table.Th>Category</Table.Th>
            <Table.Th>Region</Table.Th>
            <Table.Th>Screenshots</Table.Th>  {/* ✅ new column */}
            <Table.Th>Status</Table.Th>
            <Table.Th>Actions</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {rows.map((r) => (
            <Table.Tr key={r.id}>
              <Table.Td>{r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '—'}</Table.Td>
              <Table.Td>{r.sender || 'Unknown'}</Table.Td>
              <Table.Td style={{ maxWidth: 200, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {r.message || '—'}
              </Table.Td>
              <Table.Td><Badge variant="light">{r.category || 'n/a'}</Badge></Table.Td>
              <Table.Td>{r.region || 'N/A'}</Table.Td>
              <Table.Td>
                {r.attachments?.length ? (
                  r.attachments.map((url, i) => (
                    <a
                      key={i}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: "#007AFF", marginRight: 8 }}
                    >
                      View {i + 1}
                    </a>
                  ))
                ) : (
                  <span style={{ color: "#888" }}>—</span>
                )}
              </Table.Td>
              <Table.Td>
                <Badge
                  variant="light"
                  color={
                    r.status === 'new'
                      ? 'gray'
                      : r.status === 'review'
                      ? 'yellow'
                      : r.status === 'closed'
                      ? 'green'
                      : 'red'
                  }
                >
                  {(r.status || 'unknown').toUpperCase()}
                </Badge>
              </Table.Td>
              <Table.Td>
                <Group gap="xs">
                  <Button size="xs" onClick={() => setStatus(r.id, 'review')}>
                    Review
                  </Button>
                  <Button size="xs" variant="light" color="green" onClick={() => setStatus(r.id, 'closed')}>
                    Close
                  </Button>
                </Group>
              </Table.Td>
            </Table.Tr>
          ))}
          {rows.length === 0 && !loading && (
            <Table.Tr>
              <Table.Td colSpan={8}>
                <Text c="dimmed">No reports yet.</Text>
              </Table.Td>
            </Table.Tr>
          )}
        </Table.Tbody>
      </Table>
    </>
  );
}
