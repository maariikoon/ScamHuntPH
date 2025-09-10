import { useEffect, useState } from 'react';
import { Button, Grid, Group } from '@mantine/core';
import { collection, getCountFromServer, query, where } from 'firebase/firestore';
import { db } from '@/firebase';
import StatCard from '@components/StatCard';

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalReports: 0,
    pendingReviews: 0,
    verifiedReports: 0,
    activeUsers: 0,
    activeThreats: 0,
    threatsBlocked: 0,
  });

  const load = async () => {
    const totalReports = await getCountFromServer(collection(db, 'reports'));
    const pendingReviews = await getCountFromServer(query(collection(db, 'reports'), where('status', '==', 'pending')));
    const verifiedReports = await getCountFromServer(query(collection(db, 'reports'), where('status', '==', 'verified')));
    const activeUsers = await getCountFromServer(collection(db, 'users'));
    const activeThreats = await getCountFromServer(query(collection(db, 'reports'), where('isActiveThreat', '==', true)));
    const threatsBlocked = await getCountFromServer(query(collection(db, 'reports'), where('status', '==', 'blocked')));

    setStats({
      totalReports: totalReports.data().count,
      pendingReviews: pendingReviews.data().count,
      verifiedReports: verifiedReports.data().count,
      activeUsers: activeUsers.data().count,
      activeThreats: activeThreats.data().count,
      threatsBlocked: threatsBlocked.data().count,
    });
  };

  useEffect(() => { load(); }, []);

  return (
    <>
      <Group justify="flex-end" mb="md">
        <Button onClick={load}>Refresh Data</Button>
      </Group>

      <Grid>
        <Grid.Col span={{ base: 12, sm: 6 }}><StatCard title="Total Reports" value={stats.totalReports} subtitle="All time reports" /></Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6 }}><StatCard title="Pending Reviews" value={stats.pendingReviews} subtitle="Awaiting verification" /></Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6 }}><StatCard title="Verified Reports" value={stats.verifiedReports} subtitle="Confirmed threats" valueColor="green" /></Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6 }}><StatCard title="Active Users" value={stats.activeUsers} subtitle="Registered users" /></Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6 }}><StatCard title="Active Threats" value={stats.activeThreats} subtitle="Current threats" valueColor="red" /></Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6 }}><StatCard title="Threats Blocked" value={stats.threatsBlocked} subtitle="Prevented incidents" valueColor="green" /></Grid.Col>
      </Grid>
    </>
  );
}
