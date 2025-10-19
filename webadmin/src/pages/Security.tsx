import { useEffect, useState } from "react";
import { Title, Paper, Table, Text, Group, Skeleton, Button } from "@mantine/core";
import { collection, getFirestore, limit, onSnapshot, orderBy, query, where, Timestamp } from "firebase/firestore";
import { IconShield, IconRefresh } from "@tabler/icons-react";

type Log = {
  id: string;
  action: "auth.login" | "auth.logout" | "config.update" | "user.update" | "role.change" | string;
  entity?: string | null;
  actorEmail?: string | null;
  actorUid?: string | null;
  note?: string | null;
  createdAt?: Timestamp;
};

export default function AuditLogsSimple() {
  const db = getFirestore();
  const [rows, setRows] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const col = collection(db, "auditLogs");
    // Only the actions we care about:
    const qy = query(
      col,
      where("action", "in", ["auth.login","auth.logout","config.update"]),
      orderBy("createdAt", "desc"),
      limit(100)
    );
    const unsub = onSnapshot(qy, (snap) => {
      setRows(snap.docs.map(d => {
        const data = d.data() as Log;
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id, ...rest } = data;
        return { id: d.id, ...rest };
      }));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  return (
    <div>
      <Group mb="md" justify="space-between">
        <Group><IconShield size={22} /><Title order={3}>Audit Logs</Title></Group>
        <Button variant="default" leftSection={<IconRefresh size={16} />} onClick={() => window.location.reload()}>
          Refresh
        </Button>
      </Group>

      <Paper radius="xl" withBorder>
        <Table striped highlightOnHover verticalSpacing="sm">
          <Table.Thead>
            <Table.Tr>
              <Table.Th style={{width: 220}}>Time</Table.Th>
              <Table.Th style={{width: 160}}>Action</Table.Th>
              <Table.Th>Entity</Table.Th>
              <Table.Th style={{width: 280}}>Actor</Table.Th>
              <Table.Th>Note</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {loading && Array.from({length:8}).map((_,i)=>(
              <Table.Tr key={i}><Table.Td colSpan={5}><Skeleton h={18}/></Table.Td></Table.Tr>
            ))}
            {!loading && rows.map((r) => (
              <Table.Tr key={r.id}>
                <Table.Td><Text size="sm">{r.createdAt?.toDate ? r.createdAt.toDate().toLocaleString() : "—"}</Text></Table.Td>
                <Table.Td><Text size="sm">{r.action}</Text></Table.Td>
                <Table.Td><Text size="sm">{r.entity ?? "—"}</Text></Table.Td>
                <Table.Td>
                  <Text size="sm">{r.actorEmail ?? "system"}</Text>
                  <Text size="xs" c="dimmed">{r.actorUid ?? ""}</Text>
                </Table.Td>
                <Table.Td><Text size="sm" lineClamp={2}>{r.note ?? "—"}</Text></Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Paper>
    </div>
  );
}
