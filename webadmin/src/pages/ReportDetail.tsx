// src/pages/ReportDetail.tsx
import { useParams, useNavigate } from '@tanstack/react-router';
import { useEffect, useState, useMemo } from 'react';
import {
  Title, Text, Badge, Button, Group, Loader, Alert, Stack,
  Paper, Divider, Grid, Anchor, Center, Select, Textarea,
} from '@mantine/core';
import { IconArrowLeft, IconShieldCheck, IconMessage2, IconTags } from '@tabler/icons-react';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import { getAuth } from 'firebase/auth';

const API_BASE_URL = 'https://reports-bcvrqgcc6a-as.a.run.app';

const CATEGORY_OPTIONS = [
  { value: 'phishing', label: 'Phishing/Smishing' },
  { value: 'gcash_scam', label: 'Gcash Scam' },
  { value: 'delivery_fraud', label: 'Delivery Fraud' },
  { value: 'fake_job', label: 'Fake Job' },
  { value: 'loan_scam', label: 'Loan Scam' },
  { value: 'investment_scam', label: 'Investment Scam' },
  { value: 'identity_theft', label: 'Identity Theft' },
  { value: 'lottery_scam', label: 'Lottery Scam' },
  { value: 'other', label: 'Other' },
];

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
  lastActionBy?: string;
  feedback?: string;
};

async function getIdToken() {
  const user = getAuth().currentUser;
  if (!user) throw new Error('Not authenticated');
  // force refresh so latest custom claims are present
  return user.getIdToken(true);
}

function statusColor(status?: string) {
  switch ((status || '').toLowerCase()) {
    case 'verified': return 'green';
    case 'declined': return 'red';
    case 'pending':
    default: return 'blue';
  }
}

export default function ReportDetail() {
  const { id } = useParams({ from: '/admin/reports/$id' });
  const navigate = useNavigate();
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState('');
  const [newCategory, setNewCategory] = useState<string | null>(null);

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
      const json = await res.json().catch(() => ({}));
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

  /** Opens a confirm modal, then PATCHes if confirmed */
  const confirmAndUpdate = (status: 'verified' | 'declined') => {
    const nextCategory = newCategory || report?.category || 'other';
    const confirmColor = status === 'verified' ? 'green' : 'red';
    const confirmLabel = status === 'verified' ? 'Approve' : 'Deny';

    modals.openConfirmModal({
      centered: true,
      title: status === 'verified' ? 'Approve this report?' : 'Deny this report?',
      labels: { confirm: confirmLabel, cancel: 'Cancel' },
      confirmProps: { color: confirmColor, loading: submitting },
      children: (
        <Stack gap="xs">
          <Text size="sm">
            {status === 'verified'
              ? 'Are you sure you want to mark this report as VERIFIED? The reporter will be notified.'
              : 'Are you sure you want to mark this report as DENIED? The reporter will be notified.'}
          </Text>
          <Text size="sm" c="dimmed">
            Category: <b>{nextCategory}</b>
          </Text>
          {feedback?.trim() && (
            <Text size="sm" c="dimmed" style={{ whiteSpace: 'pre-wrap' }}>
              Feedback: {feedback.trim()}
            </Text>
          )}
        </Stack>
      ),
      onConfirm: async () => {
        try {
          setSubmitting(true);

          const token = await getIdToken();
          const res = await fetch(`${API_BASE_URL}/${id}/status`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              status,
              // send both keys for compatibility with either backend shape
              adminComment: (feedback || '').trim(),
              feedback: (feedback || '').trim(),
              category: nextCategory,
              notify: true,
            }),
          });

          const text = await res.text();
          interface JsonResponse {
            error?: string;
          }

          const j: JsonResponse | undefined = (() => { 
            try { 
              return JSON.parse(text) as JsonResponse; 
            } catch { 
              return undefined; 
            } 
          })();

          if (!res.ok) {
            const msg =
              (j && j.error) ||
              (res.status === 403 ? 'Forbidden (admin only)' : `Request failed (${res.status})`);
            throw new Error(msg);
          }

          notifications.show({
            color: status === 'verified' ? 'green' : 'red',
            title: status === 'verified' ? 'Report verified' : 'Report denied',
            message:
              status === 'verified'
                ? 'The reporter has been notified of the approval.'
                : 'The reporter has been notified of the denial.',
          });

          navigate({ to: '/admin/reports' });
        } catch (e) {
          const msg = e instanceof Error ? e.message : 'Could not submit decision.';
          notifications.show({ color: 'red', title: 'Action failed', message: msg });
          setError(msg);
        } finally {
          setSubmitting(false);
        }
      },
    });
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
          {/* Sender & meta */}
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

          {/* Attachments */}
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

          {/* Message */}
          <Text>
            <b>Message:</b>{' '}
            <Text span style={{ whiteSpace: 'pre-wrap' }}>
              {report.message || '—'}
            </Text>
          </Text>
        </Stack>
      </Paper>

      <Divider my="sm" />

      {/* Review Info */}
      <Stack gap="xs">
        <Text fw={700} size="lg" c="#1338BE">Admin Review</Text>
        <Text ml="md"><b>Status updated to:</b> {(report.status || '—').toUpperCase()}</Text>
        <Text ml="md"><b>Category set to:</b> {report.category || '—'}</Text>
        <Text ml="md"><b>Reviewed by:</b> {report.lastActionBy || '—'}</Text>
        <Text ml="md"><b>Reviewed on:</b> {report.updatedAt ? new Date(report.updatedAt).toLocaleString() : '—'}</Text>
        <Text ml="md">
          <b>Feedback:</b>{' '}
          <Text span style={{ whiteSpace: 'pre-wrap' }}>{report.feedback || '—'}</Text>
        </Text>
      </Stack>

      <Divider my="sm" />

      {/* Admin inputs */}
      <Textarea
        label="Admin Feedback"
        placeholder="Add notes for this report"
        value={feedback}
        onChange={(e) => setFeedback(e.currentTarget.value)}
        autosize
        minRows={3}
        leftSection={<IconMessage2 size={18} stroke={1.5} />}
      />

      <Select
        label="Category"
        data={CATEGORY_OPTIONS}
        value={newCategory ?? report?.category ?? 'other'}
        onChange={setNewCategory}
        mt="md"
        leftSection={<IconTags size={18} stroke={1.5} />}
      />

      <Group mt="xs">
        <Button
          onClick={() => confirmAndUpdate('verified')}
          disabled={isVerified || submitting}
          color="green"
        >
          Approve
        </Button>
        <Button
          onClick={() => confirmAndUpdate('declined')}
          disabled={(report.status || '').toLowerCase() === 'declined' || submitting}
          color="red"
          variant="light"
        >
          Deny
        </Button>
      </Group>
    </Stack>
  );
}
