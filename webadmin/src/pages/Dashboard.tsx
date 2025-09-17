import { useEffect, useRef, useState } from 'react';
import { Button, Grid, Group, Text } from '@mantine/core';
import { collection, getCountFromServer, query, where } from 'firebase/firestore';
import { db } from '@/firebase';
import StatCard from '../components/StatCard';

type Stats = {
  totalReports: number;
  pendingReviews: number;
  verifiedReports: number;
  activeUsers: number;
};

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({
    totalReports: 0,
    pendingReviews: 0,
    verifiedReports: 0,
    activeUsers: 0,
  });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const alive = useRef(true);

  const load = async () => {
    setErr(null);
    setLoading(true);
    try {
      const reportsCol = collection(db, 'reports');
      const usersCol = collection(db, 'users');

      const [
        totalReportsSnap,
        pendingReviewsSnap,
        verifiedReportsSnap,
        activeUsersSnap,
      ] = await Promise.all([
        getCountFromServer(reportsCol),
        getCountFromServer(query(reportsCol, where('status', '==', 'pending'))),
        getCountFromServer(query(reportsCol, where('status', '==', 'verified'))),
        getCountFromServer(usersCol),
      ]);

      if (!alive.current) return;

      setStats({
        totalReports: totalReportsSnap.data().count,
        pendingReviews: pendingReviewsSnap.data().count,
        verifiedReports: verifiedReportsSnap.data().count,
        activeUsers: activeUsersSnap.data().count,
      });
    } catch (e: unknown) {
      if (!alive.current) return;
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      if (alive.current) setLoading(false);
    }
  };

  useEffect(() => {
    alive.current = true;
    load();
    return () => {
      alive.current = false;
    };
  }, []);

  return (
    <>
      <Group justify="space-between" mb="md">
        <Text fw={600} size="lg">Overview</Text>
        <Button onClick={load} loading={loading}>Refresh Data</Button>
      </Group>

      {err && (
        <Text c="red" mb="sm">
          {err}
        </Text>
      )}

      <Grid>
        <Grid.Col span={{ base: 12, sm: 6 }}>
          <StatCard title="Total Reports" value={stats.totalReports} subtitle="All time reports" />
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6 }}>
          <StatCard title="Pending Reviews" value={stats.pendingReviews} subtitle="Awaiting verification" />
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6 }}>
          <StatCard title="Verified Reports" value={stats.verifiedReports} subtitle="Confirmed threats" valueColor="green" />
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6 }}>
          <StatCard title="Active Users" value={stats.activeUsers} subtitle="Registered users" />
        </Grid.Col>
      </Grid>
    </>
  );
}
