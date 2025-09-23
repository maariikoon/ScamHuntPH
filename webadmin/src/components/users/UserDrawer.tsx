// src/components/users/UserDrawer.tsx
import * as React from 'react';
import {
  Drawer, Group, Text, Badge, Stack, Button, Divider, Select
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { AdminApi } from '@/utils/api';

type TSLike = { toDate?: () => Date } | string | number | null | undefined;

interface User {
  id: string;
  displayName?: string;
  role?: string;
  status?: 'active' | 'suspended' | string;
  email?: string;
  reportCount?: number;
  lastLoginAt?: TSLike;
  lastActiveAt?: TSLike;
}

// 👉 export a public type so callers (UsersPage) can use the SAME type
export type DrawerUser = User;

function fmt(ts: TSLike) {
  if (!ts) return '—';
  if (typeof ts === 'object' && ts && 'toDate' in ts && typeof ts.toDate === 'function') {
    try { return ts.toDate()?.toLocaleString() ?? '—'; } catch { return '—'; }
  }
  const d = new Date(typeof ts === 'string' || typeof ts === 'number' ? ts : '');
  return isNaN(d.getTime()) ? '—' : d.toLocaleString();
}

export default function UserDrawer({
  user,
  onClose,
  onUpdated, // optional: parent can refetch after actions
}: {
  user: DrawerUser | null;
  onClose: () => void;
  onUpdated?: (u: DrawerUser) => void;
}) {
  const [u, setU] = React.useState<DrawerUser | null>(user);
  const [busy, setBusy] = React.useState<Record<string, boolean>>({});
  const [roleDraft, setRoleDraft] = React.useState<string | null>(user?.role ?? null);

  React.useEffect(() => {
    setU(user ?? null);
    setRoleDraft(user?.role ?? null);
  }, [user]);

  if (!u) return null;

  async function withBusy<T>(key: string, fn: () => Promise<T>) {
    setBusy((b) => ({ ...b, [key]: true }));
    try { return await fn(); }
    finally { setBusy((b) => ({ ...b, [key]: false })); }
  }

  const handleReset = () =>
    withBusy('reset', async () => {
      await AdminApi.resetUser(u.id);
      notifications.show({ color: 'green', title: 'User reset', message: 'Password reset email sent & tokens revoked.' });
      onUpdated?.(u);
    }).catch((e) => {
      notifications.show({ color: 'red', title: 'Reset failed', message: String(e?.message ?? e) });
    });

  const handleSuspend = () =>
    withBusy('suspend', async () => {
      await AdminApi.suspend(u.id, 'Admin action');
      const nu = { ...u, status: 'suspended' as const };
      setU(nu);
      notifications.show({ color: 'yellow', title: 'User suspended', message: 'The user can no longer sign in.' });
      onUpdated?.(nu);
    }).catch((e) => {
      notifications.show({ color: 'red', title: 'Suspend failed', message: String(e?.message ?? e) });
    });

  const handleReactivate = () =>
    withBusy('reactivate', async () => {
      await AdminApi.reactivate(u.id);
      const nu = { ...u, status: 'active' as const };
      setU(nu);
      notifications.show({ color: 'green', title: 'User reactivated', message: 'The user can sign in again.' });
      onUpdated?.(nu);
    }).catch((e) => {
      notifications.show({ color: 'red', title: 'Reactivate failed', message: String(e?.message ?? e) });
    });

  const handleSaveRole = () =>
    withBusy('role', async () => {
      const newRole = roleDraft ?? 'user';
      await AdminApi.setRole(u.id, newRole);
      const nu = { ...u, role: newRole };
      setU(nu);
      notifications.show({ color: 'green', title: 'Role updated', message: `Role set to ${newRole}.` });
      onUpdated?.(nu);
    }).catch((e) => {
      notifications.show({ color: 'red', title: 'Role update failed', message: String(e?.message ?? e) });
    });

  const isSuspended = (u.status ?? '').toLowerCase() === 'suspended';

  return (
    <Drawer opened={!!u} onClose={onClose} position="right" title="User details" size="lg">
      <Stack gap="md">
        <Group wrap="nowrap">
          <Text fw={600} size="lg">{u.displayName || '—'}</Text>
          <Badge variant="light">{u.role || 'user'}</Badge>
          <Badge color={u.status === 'active' ? 'green' : isSuspended ? 'red' : 'gray'}>
            {u.status ?? '—'}
          </Badge>
        </Group>

        <Text c="dimmed">{u.email ?? '—'}</Text>

        <Divider />

        <Text>Reports: <b>{u.reportCount ?? 0}</b></Text>
        <Text>Last login: {fmt(u.lastLoginAt)}</Text>
        <Text>Last active: {fmt(u.lastActiveAt)}</Text>

        <Divider />

        {/* Role management */}
        <Stack gap="xs">
          <Text fw={500}>Role</Text>
          <Group>
            <Select
              data={[
                { value: 'user', label: 'User' },
                { value: 'viewer', label: 'Viewer' },
                { value: 'analyst', label: 'Analyst' },
                { value: 'admin', label: 'Admin' },
                { value: 'super_admin', label: 'Super Admin' }, // aligned with UsersPage
              ]}
              value={roleDraft}
              onChange={setRoleDraft}
              w={240}
              clearable
            />
            <Button
              onClick={handleSaveRole}
              loading={!!busy.role}
              disabled={roleDraft === u.role || !roleDraft}
            >
              Save role
            </Button>
          </Group>
        </Stack>

        {/* Actions */}
        <Group>
          <Button
            component="a"
            href={`/admin/reports?senderUid=${u.id}`}
            variant="outline"
          >
            Open reports
          </Button>

          <Button
            color="yellow"
            onClick={handleReset}
            loading={!!busy.reset}
          >
            Reset user
          </Button>

          {!isSuspended ? (
            <Button color="red" onClick={handleSuspend} loading={!!busy.suspend}>
              Suspend
            </Button>
          ) : (
            <Button color="green" onClick={handleReactivate} loading={!!busy.reactivate}>
              Reactivate
            </Button>
          )}
        </Group>
      </Stack>
    </Drawer>
  );
}
