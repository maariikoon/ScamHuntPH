// src/pages/Reports.tsx
import * as React from "react";
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
} from "@mantine/core";
import { useNavigate, useLocation } from "@tanstack/react-router";
import { getAuth } from "firebase/auth";

const API_BASE_URL = "https://scamhunt-bcvrqgcc6a-as.a.run.app";

type ReportRow = {
  id: string;
  createdAt: string | null;
  status?: "new" | "review" | "closed" | string;
  sender?: string;
};

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
    ((loc.pathname.split("/admin/")[1] || "reports").split("/")[0]) || "reports";

  const onTabChange = (v: string | null) => {
    if (!v) return;
    navigate({ to: `/admin/${v}` });
  };

  React.useEffect(() => {
    if (loc.pathname === "/admin") {
      navigate({ to: "/admin/reports", replace: true });
    }
  }, [loc.pathname, navigate]);

  const [rows, setRows] = React.useState<ReportRow[]>([]);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [status, setStatus] = React.useState<string>("");
  const [error, setError] = React.useState<string>("");

  // 🔹 Load reports
  const load = React.useCallback(
    async () => {
      try {
        setLoading(true);
        setError("");

        const params = new URLSearchParams();
        if (status) params.append("status", status);
        params.append("limit", "50");

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

        setRows(json.data);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    },
    [status]
  );

  React.useEffect(() => {
    load();
  }, [status, load]);

  const statusBadge = (s?: string) => {
    const map: Record<string, string> = {
      pending: "yellow",
      verified: "green",
      declined: "red",
    };
    const color = map[s || ""] || "gray";
    const label = (s || "unknown").toUpperCase();
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
            onChange={(v) => setStatus(v || "")}
            data={[
              { value: "", label: "All" },
              { value: "pending", label: "Pending" },
              { value: "verified", label: "Verified" },
              { value: "declined", label: "Declined" },
            ]}
            maw={220}
          />
          <Button variant="light" onClick={load} disabled={loading}>
            Refresh
          </Button>
          {loading && <Loader size="sm" />}
        </Group>

        {error && (
          <Alert color="red" variant="light" title="Failed to load">
            {error}
          </Alert>
        )}

        <div style={{ overflowX: "auto" }}>
          <Table striped highlightOnHover withTableBorder>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Report ID</Table.Th>
                <Table.Th>Sender ID</Table.Th>
                <Table.Th>Status</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {rows.map((r) => (
                <Table.Tr
                  key={r.id}
                  style={{ cursor: "pointer" }}
                  onClick={() => navigate({ to: `/admin/reports/${r.id}` })}
                >
                  <Table.Td>{r.id.slice(0, 8)}…</Table.Td>
                  <Table.Td>{r.sender || "—"}</Table.Td>
                  <Table.Td>{statusBadge(r.status)}</Table.Td>
                </Table.Tr>
              ))}
              {!loading && rows.length === 0 && (
                <Table.Tr>
                  <Table.Td colSpan={3} style={{ textAlign: "center", color: "#667085" }}>
                    No reports found.
                  </Table.Td>
                </Table.Tr>
              )}
            </Table.Tbody>
          </Table>
        </div>
      </Stack>
    </>
  );
}
