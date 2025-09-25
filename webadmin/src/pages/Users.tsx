// src/pages/Users.tsx
import * as React from 'react';
import {
  Title, Group, TextInput, Select, Button, Table, Badge, Menu, ActionIcon,
  Stack, Loader, Alert, Pagination, Modal, Text, Card, Grid, Tooltip
} from '@mantine/core';
import {
  IconPlus, IconDots, IconReload, IconShield, IconUserX, IconUserCheck, IconMail
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { AdminApi } from '@/utils/api';
import CreateAdminModal from '../components/users/CreateAdminModal';
import UserDrawer, { type DrawerUser } from '../components/users/UserDrawer';

type TSLike = Date | { toDate: () => Date } | string | number | null | undefined;

type UserRow = {
  id: string;
  email?: string;
  displayName?: string;
  role?: 'superadmin'|'admin'|'analyst'|'viewer'|'user'|string;
  status?: 'active'|'suspended'|'deleted'|string;
  lastLoginAt?: TSLike;
  lastActiveAt?: TSLike;
  reportCount?: number;
};

const PAGE_SIZE = 5;

function fmt(ts: TSLike) {
  if (!ts) return '—';
  if (typeof ts === 'object' && ts && 'toDate' in ts && typeof ts.toDate === 'function') {
    try { return ts.toDate()?.toLocaleString() ?? '—'; } catch { return '—'; }
  }
  const d = new Date(typeof ts === 'string' || typeof ts === 'number' ? ts : '');
  return isNaN(d.getTime()) ? '—' : d.toLocaleString();
}

export default function UsersPage() {
  /* filters */
  const [query, setQuery]   = React.useState('');
  const [role, setRole]     = React.useState<string | null>(null);
  const [status, setStatus] = React.useState<string | null>(null);

  /* paging */
  const [page, setPage]   = React.useState(1);
  const [total, setTotal] = React.useState(0);

  /* data */
  const [rows, setRows]       = React.useState<UserRow[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError]     = React.useState<string | null>(null);

  /* ui */
  const [createOpen, setCreateOpen] = React.useState(false);
  const [selected, setSelected]     = React.useState<DrawerUser | null>(null);

  const fetchList = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string | number | undefined> = {
        q: query || undefined,
        role: role || undefined,
        status: status || undefined,
        page,
        limit: PAGE_SIZE,
        sort: 'lastActiveAt:desc',
      };

      const res = await AdminApi.listUsers(params) as { items?: UserRow[]; data?: { items?: UserRow[]; total?: number }; total?: number; count?: number };

      // Accept multiple envelopes
      const items: UserRow[] =
        res?.items ??
        res?.data?.items ??
        (Array.isArray(res?.data) ? res.data : []) ??
        (Array.isArray(res) ? res : []);

      const totalCount: number =
        res?.total ??
        res?.data?.total ??
        res?.count ??
        items.length;

      setRows(items);
      setTotal(typeof totalCount === 'number' ? totalCount : items.length);
    } catch (e: unknown) {
      setError((e instanceof Error && e.message) ? e.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [query, role, status, page]);

  React.useEffect(() => { fetchList(); }, [fetchList]);

  const totalPages = Math.max(1, Math.ceil((total || 0) / PAGE_SIZE));

  const clearFilters = () => {
    setQuery('');
    setRole(null);
    setStatus(null);
    setPage(1);
  };

  const refresh = async () => {
    notifications.show({ title: 'Refreshing…', message: 'Fetching latest users' });
    await fetchList();
    notifications.show({ color: 'green', title: 'Up to date', message: 'Users list refreshed' });
  };

  const doReset = async (u: UserRow) => {
    const res = await AdminApi.resetUser(u.id, { revokeTokens: true, sendReset: true }) as { ok: boolean; data?: { resetLink?: string }; error?: string };
    if (res?.ok === false) {
      notifications.show({ color: 'red', title: 'Reset failed', message: res?.error || 'Error' });
      return;
    }
    notifications.show({ color: 'green', title: 'Reset sent', message: 'Password reset processed.' });
    if (res?.data?.resetLink) await navigator.clipboard.writeText(res.data.resetLink);
  };

  const changeRole = async (u: UserRow, newRole: string) => {
    const res = await AdminApi.setRole(u.id, newRole) as { ok?: boolean; error?: string };
    if (res?.ok === false) {
      notifications.show({ color: 'red', title: 'Role update failed', message: res?.error || 'Error' });
    } else {
      notifications.show({ color: 'green', title: 'Role updated', message: `${u.email} → ${newRole}` });
      fetchList();
    }
  };

  const suspend = async (u: UserRow) => {
    const res = await AdminApi.suspend(u.id, 'By admin action') as { ok?: boolean; error?: string };
    if (res?.ok === false) {
      notifications.show({ color: 'red', title: 'Suspend failed', message: res?.error || 'Error' });
    } else {
      notifications.show({ color: 'yellow', title: 'Suspended', message: u.email ?? '' });
      fetchList();
    }
  };

  const reactivate = async (u: UserRow) => {
    const res = await AdminApi.reactivate(u.id) as { ok?: boolean; error?: string };
    if (res?.ok === false) {
      notifications.show({ color: 'red', title: 'Reactivate failed', message: res?.error || 'Error' });
    } else {
      notifications.show({ color: 'green', title: 'Reactivated', message: u.email ?? '' });
      fetchList();
    }
  };

  return (
    <Stack>
      <Group justify="space-between" align="center">
        <Title order={2}>Users</Title>
        <Group>
          <Button variant="light" leftSection={<IconReload size={16} />} onClick={refresh}>
            Refresh
          </Button>
          <Button leftSection={<IconPlus size={16} />} onClick={() => setCreateOpen(true)}>
            Create admin
          </Button>
        </Group>
      </Group>

      {/* Filters — Grid like in Reports.tsx */}
      <Card withBorder radius="lg">
        <Grid gutter="md" align="end">
          <Grid.Col span={{ base: 12, sm: 6, md: 5 }}>
            <TextInput
              label="Search"
              placeholder="Email or name"
              value={query}
              onChange={(e) => { setQuery(e.currentTarget.value); setPage(1); }}
              miw={240}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 6, sm: 3, md: 3 }}>
            <Select
              label="Role"
              placeholder="All"
              data={['super_admin','admin','analyst','viewer','user'].map(v => ({ value: v, label: v }))}
              value={role}
              onChange={(v) => { setRole(v); setPage(1); }}
              clearable
            />
          </Grid.Col>
          <Grid.Col span={{ base: 6, sm: 3, md: 3 }}>
            <Select
              label="Status"
              placeholder="All"
              data={['active','suspended','deleted'].map(v => ({ value: v, label: v }))}
              value={status}
              onChange={(v) => { setStatus(v); setPage(1); }}
              clearable
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 12, md: 1 }}>
            <Button variant="default" onClick={clearFilters} fullWidth>
              Clear
            </Button>
          </Grid.Col>
        </Grid>
      </Card>

      {error && <Alert color="red">{error}</Alert>}

      {loading ? (
        <Loader />
      ) : (
        <Card withBorder radius="lg">
          <Table striped highlightOnHover withTableBorder>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Email</Table.Th>
                <Table.Th>Role</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Reports</Table.Th>
                <Table.Th>Last login</Table.Th>
                <Table.Th>Last active</Table.Th>
                <Table.Th />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {rows.length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={7}><Text c="dimmed">No users match your filters.</Text></Table.Td>
                </Table.Tr>
              ) : rows.map((u) => (
                <Table.Tr key={u.id}>
                  <Table.Td>
                    <Group gap="xs">
                      <Text fw={500} style={{ cursor: 'pointer' }} onClick={() => setSelected(u as DrawerUser)}>
                        {u.email ?? '—'}
                      </Text>
                      {(u.role === 'super_admin' || u.role === 'admin') && (
                        <Badge variant="light" leftSection={<IconShield size={12} />}>admin</Badge>
                      )}
                    </Group>
                  </Table.Td>
                  <Table.Td><Badge variant="light">{u.role || 'user'}</Badge></Table.Td>
                  <Table.Td>
                    <Badge color={u.status === 'active' ? 'green' : u.status === 'suspended' ? 'red' : 'gray'}>
                      {u.status ?? '—'}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Tooltip label="Open reports by this user">
                      <Badge component="a" href={`/admin/reports?senderUid=${u.id}`} variant="outline">
                        {u.reportCount ?? 0}
                      </Badge>
                    </Tooltip>
                  </Table.Td>
                  <Table.Td>{fmt(u.lastLoginAt)}</Table.Td>
                  <Table.Td>{fmt(u.lastActiveAt)}</Table.Td>
                  <Table.Td width={64}>
                    <Group gap={4} justify="right">
                      <Menu withinPortal shadow="md" width={220} position="bottom-end">
                        <Menu.Target>
                          <ActionIcon variant="subtle"><IconDots size={18} /></ActionIcon>
                        </Menu.Target>
                        <Menu.Dropdown>
                          <Menu.Label>Quick actions</Menu.Label>
                          <Menu.Item leftSection={<IconMail size={16} />} onClick={() => doReset(u)}>
                            Reset (revoke + email)
                          </Menu.Item>
                          <Menu.Divider />
                          <Menu.Label>Role</Menu.Label>
                          {['super_admin','admin','analyst','viewer','user'].map(r => (
                            <Menu.Item key={r} onClick={() => changeRole(u, r)}>{r}</Menu.Item>
                          ))}
                          <Menu.Divider />
                          {u.status === 'active' ? (
                            <Menu.Item color="red" leftSection={<IconUserX size={16} />} onClick={() => suspend(u)}>
                              Suspend
                            </Menu.Item>
                          ) : (
                            <Menu.Item color="green" leftSection={<IconUserCheck size={16} />} onClick={() => reactivate(u)}>
                              Reactivate
                            </Menu.Item>
                          )}
                        </Menu.Dropdown>
                      </Menu>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>

          {/* Pagination — page size = 5 */}
          <Group justify="center" mt="md">
            <Pagination value={page} onChange={setPage} total={totalPages} />
          </Group>
        </Card>
      )}

      {/* Create Admin inside Mantine Modal */}
      <Modal
        opened={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create Admin Account"
        size="lg"
        centered
      >
        <CreateAdminModal
          opened={createOpen}
          onClose={() => setCreateOpen(false)}
          onCreated={() => {
            setCreateOpen(false);
            setPage(1);
            fetchList();
          }}
        />
      </Modal>

      {/* User details/actions drawer */}
      <UserDrawer
        user={selected}
        onClose={() => setSelected(null)}
        onUpdated={() => fetchList()}
      />
    </Stack>
  );
}
