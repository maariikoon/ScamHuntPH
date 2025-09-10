import { Title, Text, Tabs } from '@mantine/core';
import ReportsTable from '@/components/ReportsTable';
import { useNavigate, useLocation } from '@tanstack/react-router';
import { useEffect } from 'react';

export default function Reports() {
  const navigate = useNavigate();
  const loc = useLocation();

  const current = loc.pathname.split('/admin/')[1] || 'reports';

  const onChange = (v: string | null) => {
    if (!v) return;
    navigate({ to: `/admin/${v}` });
  };

  useEffect(() => {
    if (loc.pathname === '/admin') {
      navigate({ to: '/admin/reports', replace: true });
    }
  }, [loc.pathname, navigate]);

  return (
    <>
      <Tabs value={current} onChange={onChange} keepMounted={false}>
        <Tabs.List>
          <Tabs.Tab value="reports">Recent Reports</Tabs.Tab>
          <Tabs.Tab value="analytics">Analytics</Tabs.Tab>
          <Tabs.Tab value="users">User Management</Tabs.Tab>
          <Tabs.Tab value="content">Content Management</Tabs.Tab>
          <Tabs.Tab value="security">Security Monitoring</Tabs.Tab>
        </Tabs.List>
      </Tabs>

      <Title order={3} mt="md">Recent Scam Reports</Title>
      <Text c="dimmed" mb="md">Review the most recent submissions and take action.</Text>

      <ReportsTable />
    </>
  );
}
