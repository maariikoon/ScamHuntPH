// src/pages/ReportDetail.tsx
import { useParams, useNavigate } from '@tanstack/react-router';
import { useEffect, useState, useMemo } from 'react';
import {
  Title, Text, Badge, Button, Group, Loader, Alert, Stack,
  Paper, Divider, Grid, Anchor, Center
} from '@mantine/core';
import { IconArrowLeft, IconShieldCheck } from '@tabler/icons-react';
import { getAuth } from 'firebase/auth';

const API_BASE_URL = 'https://reports-bcvrqgcc6a-as.a.run.app';

type Report = {
  id: string;
  sender?: string;
  message?: string;
  category?: string;
  region?: string;
  attachments?: string[];
  status?: 'pending' | 'verified' | 'declined' | string;
  createdAt?: string | null;
  updatedAt?: string | null;
};

async function getIdToken() {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');
  return user.getIdToken();
}

function statusColor(status?: string) {
  switch ((status || '').toLowerCase()) {
    case 'verified':
      return 'green';
    case 'declined':
      return 'red';
    case 'pending':
    default:
      return 'blue';
  }
}

export default function ReportDetail() {
  const { id } = useParams({ from: '/admin/reports/$id' });
  const navigate = useNavigate();
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const created = useMemo(
    () => (report?.createdAt ? new Date(report.createdAt).toLocaleString() : '—'),
    [report?.createdAt]
  );
  const updated = useMemo(
    () => (report?.updatedAt ? new Date(report.updatedAt).toLocaleString() : '—'),
    [report?.updatedAt]
  );

  const load = async () => {
    try {
      setError(null);
      setLoading(true);
      const token = await getIdToken();
      const res = await fetch(`${API_BASE_URL}/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || 'Failed to load report');
      setReport(json.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const updateStatus = async (status: 'verified' | 'declined') => {
    try {
      const token = await getIdToken();
      const res = await fetch(`${API_BASE_URL}/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || 'Failed to update status');
      }
      navigate({ to: '/admin/reports' });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  if (loading) {
    return (
      <Center mih={240}>
        <Loader />
      </Center>
    );
  }

  if (error) {
    return (
      <Stack gap="md">
        <Group>
          <Button
            variant="subtle"
            leftSection={<IconArrowLeft size={18} />}
            onClick={() => navigate({ to: '/admin/reports' })}
          >
            Back to Reports
          </Button>
        </Group>
        <Alert color="red" title="Couldn’t load report">
          {error}
        </Alert>
        <Button onClick={load}>Try again</Button>
      </Stack>
    );
  }

  if (!report) return <Text>No report found.</Text>;

  const isVerified = (report.status || '').toLowerCase() === 'verified';

  return (
    <Stack gap="md">
      {/* Top bar */}
      <Group justify="space-between">
        <Group>
          <Button
            variant="subtle"
            leftSection={<IconArrowLeft size={18} />}
            onClick={() => navigate({ to: '/admin/reports' })}
          >
            Back
          </Button>
          <Title order={3} fw={700} ml={-8}>
            Report Details
          </Title>
        </Group>

        <Group gap="xs">
          <Text c="dimmed" fw={600}>Status:</Text>
          <Badge
            size="lg"
            color={statusColor(report.status)}
            radius="sm"
            leftSection={isVerified ? <IconShieldCheck size={16} /> : undefined}
          >
            {(report.status || 'pending').toUpperCase()}
          </Badge>
        </Group>
      </Group>

      <Paper withBorder p="lg" radius="md" shadow="sm">
        <Stack gap="sm">
          {/* --- Sender & meta FIRST --- */}
          <Grid gutter="md">
            <Grid.Col span={{ base: 12, sm: 6 }}>
              <Text><b>Report ID:</b> {report.id}</Text>
              <Text><b>Sender ID:</b> {report.sender || '—'}</Text>
              <Text><b>Category:</b> {report.category || '—'}</Text>
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 6 }}>
              <Text><b>Region:</b> {report.region || '—'}</Text>
              <Text><b>Created:</b> {created}</Text>
              <Text><b>Updated:</b> {updated}</Text>
            </Grid.Col>
          </Grid>

          <Divider my="sm" />

          {/* --- Attachments --- */}
          <Stack gap={6}>
            <Text fw={600}>Attachments:</Text>
            {report.attachments?.length ? (
              <Stack gap={4}>
                {report.attachments.map((url, i) => (
                  <Anchor key={i} href={url} target="_blank" rel="noreferrer">
                    Screenshot {i + 1}
                  </Anchor>
                ))}
              </Stack>
            ) : (
              <Text c="dimmed">None</Text>
            )}
          </Stack>

          <Divider my="sm" />

          {/* --- Message LAST --- */}
          <Text>
            <b>Message:</b>{' '}
            <Text span style={{ whiteSpace: 'pre-wrap' }}>
              {report.message || '—'}
            </Text>
          </Text>
        </Stack>
      </Paper>

      <Group mt="xs">
        <Button
          onClick={() => updateStatus('verified')}
          disabled={isVerified}
          color="green"
        >
          Approve
        </Button>
        <Button
          onClick={() => updateStatus('declined')}
          disabled={(report.status || '').toLowerCase() === 'declined'}
          color="red"
          variant="light"
        >
          Deny
        </Button>
      </Group>
    </Stack>
  );
}
