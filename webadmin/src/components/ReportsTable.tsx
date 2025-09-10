import { useEffect, useState } from 'react';
import { Badge, Button, Group, Table, Text } from '@mantine/core';
import { collection, onSnapshot, orderBy, query, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/firebase';

type Report = {
  id: string;
  createdAt?: { seconds: number; nanoseconds: number };
  date?: string;
  sender?: string;
  category?: string;
  region?: string;
  status?: 'pending' | 'verified' | 'rejected';
};

export default function ReportsTable() {
  const [rows, setRows] = useState<Report[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'reports'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const data: Report[] = snap.docs.map((d) => {
        const v = d.data() as Omit<Report, 'id'>;
        const ts = v.createdAt;
        const date = ts?.seconds ? new Date(ts.seconds * 1000).toLocaleDateString() : v.date || '';
        return {
          id: d.id,
          date,
          sender: v.sender || 'Unknown',
          category: v.category || 'n/a',
          region: v.region || 'N/A',
          status: (v.status || 'pending') as Report['status'],
        };
      });
      setRows(data);
    });
    return () => unsub();
  }, []);

  const setStatus = async (id: string, status: Report['status']) => {
    await updateDoc(doc(db, 'reports', id), { status });
  };

  return (
    <Table striped withTableBorder withColumnBorders>
      <Table.Thead>
        <Table.Tr>
          <Table.Th>Date</Table.Th>
          <Table.Th>Sender</Table.Th>
          <Table.Th>Category</Table.Th>
          <Table.Th>Region</Table.Th>
          <Table.Th>Status</Table.Th>
          <Table.Th>Actions</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {rows.map((r) => (
          <Table.Tr key={r.id}>
            <Table.Td>{r.date}</Table.Td>
            <Table.Td>{r.sender}</Table.Td>
            <Table.Td><Badge variant="light">{r.category}</Badge></Table.Td>
            <Table.Td>{r.region}</Table.Td>
            <Table.Td>
              <Badge variant="light" color={r.status === 'pending' ? 'gray' : r.status === 'verified' ? 'green' : 'red'}>
                {(r.status || 'pending').charAt(0).toUpperCase() + (r.status || 'pending').slice(1)}
              </Badge>
            </Table.Td>
            <Table.Td>
              <Group gap="xs">
                <Button size="xs" onClick={() => setStatus(r.id, 'verified')}>Verify</Button>
                <Button size="xs" variant="light" color="red" onClick={() => setStatus(r.id, 'rejected')}>Reject</Button>
              </Group>
            </Table.Td>
          </Table.Tr>
        ))}
        {rows.length === 0 && (
          <Table.Tr>
            <Table.Td colSpan={6}>
              <Text c="dimmed">No reports yet.</Text>
            </Table.Td>
          </Table.Tr>
        )}
      </Table.Tbody>
    </Table>
  );
}
