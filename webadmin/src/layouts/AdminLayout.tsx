// src/layouts/AdminLayout.tsx
import * as React from 'react';
import { AppShell, Button, Container, Group, Text, Title } from '@mantine/core';
import { useNavigate, Link, Outlet, useLocation } from '@tanstack/react-router';
import { signOut } from 'firebase/auth';
import { auth } from '@/firebase';
import { AdminApi } from '@/utils/api';

export default function AdminLayout() {
  const navigate = useNavigate();
  const loc = useLocation();

  // 🔔 Heartbeat on mount + every 60s to keep lastActiveAt fresh
  React.useEffect(() => {
    let alive = true;
    const ping = async () => {
      try {
        await AdminApi.heartbeat(false); // update lastActiveAt silently
      } catch {
        // no-op; we don't want to spam UI with errors for a background ping
      }
    };
    ping(); // immediately on load
    const id = setInterval(() => {
      if (alive) ping();
    }, 60_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  const onLogout = async () => {
    try {
      await signOut(auth);
    } finally {
      navigate({ to: '/login' });
    }
  };

  const pageTitle = (() => {
    const p = loc.pathname;
    if (p.includes('/admin/reports')) return 'Reports';
    if (p.includes('/admin/analytics')) return 'Analytics';
    if (p.includes('/admin/users')) return 'Users';
    if (p.includes('/admin/content')) return 'Content';
    if (p.includes('/admin/security')) return 'Security';
    return 'Overview';
  })();

  return (
    <AppShell header={{ height: 68 }} padding="lg">
      <AppShell.Header>
        <Container size="lg" style={{ height: '100%' }}>
          <Group justify="space-between" align="center" style={{ height: '100%' }}>
            <Group gap="xs">
              <Title order={3}>Admin Dashboard — {pageTitle}</Title>
              <Text c="dimmed">ScamHuntPH System Management</Text>
            </Group>

            <Group gap="xs">
              <Button component={Link} to="/admin" variant="subtle">Overview</Button>
              <Button component={Link} to="/admin/reports" variant="subtle">Reports</Button>
              <Button component={Link} to="/admin/analytics" variant="subtle">Analytics</Button>
              <Button component={Link} to="/admin/users" variant="subtle">Users</Button>
              <Button component={Link} to="/admin/content" variant="subtle">Content</Button>
              <Button component={Link} to="/admin/security" variant="subtle">Security</Button>
              <Button variant="outline" onClick={onLogout}>Logout</Button>
            </Group>
          </Group>
        </Container>
      </AppShell.Header>

      <AppShell.Main>
        <Container size="lg">
          <Outlet />
        </Container>
      </AppShell.Main>
    </AppShell>
  );
}
