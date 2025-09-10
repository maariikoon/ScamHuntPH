import { AppShell, Button, Container, Group, Text, Title } from '@mantine/core';
import { useNavigate, Link, Outlet, useLocation } from '@tanstack/react-router';
import { signOut } from 'firebase/auth';
import { auth } from '@/firebase';

export default function AdminLayout() {
  const navigate = useNavigate();
  const loc = useLocation();

  const onLogout = async () => {
    await signOut(auth);
    navigate({ to: '/login' });
  };

  const pageTitle = (() => {
    if (loc.pathname.includes('/admin/reports')) return 'Admin Dashboard';
    if (loc.pathname.includes('/admin/analytics')) return 'Admin Dashboard';
    if (loc.pathname.includes('/admin/users')) return 'Admin Dashboard';
    if (loc.pathname.includes('/admin/content')) return 'Admin Dashboard';
    if (loc.pathname.includes('/admin/security')) return 'Admin Dashboard';
    return 'Admin Dashboard';
  })();

  return (
    <AppShell header={{ height: 68 }} padding="lg">
      <AppShell.Header>
        <Container size="lg" style={{ height: '100%' }}>
          <Group justify="space-between" align="center" style={{ height: '100%' }}>
            <Group>
              <Title order={3}>{pageTitle}</Title>
              <Text c="dimmed">ScamHuntPH System Management</Text>
            </Group>
            <Group>
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
