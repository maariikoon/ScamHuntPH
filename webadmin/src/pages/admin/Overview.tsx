// src/pages/admin/Dashboard.tsx   (replace file contents)
import React from "react";
import { Button, Grid, Group, Text } from "@mantine/core";
import { subscribeStats, type Stats } from "@/services/statsService";
import StatCard from "@/components/StatCard";

export default function Dashboard() {
  const [stats, setStats] = React.useState<Stats>({});
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    const unsub = subscribeStats(
      (s) => setStats(s),
      (e) => setErr(e instanceof Error ? e.message : String(e))
    );
    return () => unsub();
  }, []);

  const {
    totalReports = 0,
    pendingReviews = 0,
    verifiedReports = 0,
    activeThreats = 0,
    threatsBlocked = 0,
    activeUsers = 0,
  } = stats;

  return (
    <>
      <Group justify="space-between" mb="md">
        <Text fw={600} size="lg">Overview</Text>
        <Button disabled title="Live via onSnapshot">Refresh Data</Button>
      </Group>

      {err && <Text c="red" mb="sm">{err}</Text>}

      <Grid>
        <Grid.Col span={{ base: 12, sm: 6 }}>
          <StatCard title="Total Reports" value={totalReports} subtitle="All time reports" />
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6 }}>
          <StatCard title="Pending Reviews" value={pendingReviews} subtitle="Awaiting verification" />
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6 }}>
          <StatCard title="Verified Reports" value={verifiedReports} subtitle="Confirmed threats" valueColor="green" />
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6 }}>
          <StatCard title="Active Users" value={activeUsers} subtitle="Registered users" />
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6 }}>
          <StatCard title="Active Threats" value={activeThreats} subtitle="Current threats" valueColor="red" />
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6 }}>
          <StatCard title="Threats Blocked" value={threatsBlocked} subtitle="Prevented incidents" valueColor="green" />
        </Grid.Col>
      </Grid>
    </>
  );
}
