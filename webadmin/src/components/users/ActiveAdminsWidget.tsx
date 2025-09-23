import * as React from 'react';
import { Card, Group, Text, Badge, Stack, Loader } from '@mantine/core';
import { AdminApi } from '@/utils/api';

export default function ActiveAdminsWidget() {
  interface Admin {
    id: string;
    role: string;
    email: string;
  }

  const [rows, setRows] = React.useState<Admin[]>([]);
  const [loading, setLoading] = React.useState(true);
  React.useEffect(()=>{ (async ()=>{
    const res = await AdminApi.activeAdmins('24h');
    setRows(res.ok ? res.data : []); setLoading(false);
  })(); },[]);
  return (
    <Card withBorder radius="lg">
      <Group justify="space-between"><Text fw={600}>Active admins (24h)</Text><Badge>{rows.length}</Badge></Group>
      <Stack gap="xs" mt="sm">
        {loading ? <Loader/> : rows.map(a => (
          <Group key={a.id} gap="xs">
            <Badge variant="light">{a.role}</Badge>
            <Text>{a.email}</Text>
          </Group>
        ))}
        {!loading && rows.length===0 && <Text c="dimmed">No recent admin activity.</Text>}
      </Stack>
    </Card>
  );
}
