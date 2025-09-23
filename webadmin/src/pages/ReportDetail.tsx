// src/pages/ReportDetail.tsx
import { useParams, useNavigate } from '@tanstack/react-router';
import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Title, Text, Badge, Button, Group, Loader, Alert, Stack,
  Paper, Divider, Grid, Anchor, Center, Textarea
} from '@mantine/core';
import { IconArrowLeft, IconShieldCheck } from '@tabler/icons-react';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import { REPORTS_BASE, authFetch } from '@/utils/api';
import { getFreshIdToken } from '@/utils/token';

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
  adminComment?: string;
  reviewedBy?: string;
  reviewedAt?: string | null;
};

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
  const [lastStatusCode, setLastStatusCode] = useState<number | null>(null);

  const created = useMemo(
    () => (report?.createdAt ? new Date(report.createdAt).toLocaleString() : '—'),
    [report?.createdAt]
  );
  const updated = useMemo(
    () => (report?.updatedAt ? new Date(report.updatedAt).toLocaleString() : '—'),
    [report?.updatedAt]
  );
  const reviewed = useMemo(
    () => (report?.reviewedAt ? new Date(report.reviewedAt).toLocaleString() : null),
    [report?.reviewedAt]
  );

  const load = useCallback(async () => {
    try {
      setError(null);
      setLastStatusCode(null);
      setLoading(true);
      const r = await authFetch<{ ok: boolean; data: Report; error?: string }>(
        `${REPORTS_BASE}/${id}`
      );
      setLastStatusCode(r.status);
      if (!r.ok || !r.data?.ok) {
        // Helpful message for misrouted calls returning HTML 404
        if (r.status === 404 && r.text?.startsWith('<')) {
          throw new Error('Endpoint not found (404). Check API base URL & reports prefix.');
        }
        throw new Error(r.data?.error || 'Failed to load report');
      }
      setReport(r.data.data);
    } catch (e) {
      setReport(null);
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const reauthAndRetry = async () => {
    try {
      await getFreshIdToken(); // force-refresh token/claims
    } catch {/* ignore */}
    await load();
  };

  const confirmAndUpdate = (status: 'verified' | 'declined') => {
    let feedback = report?.adminComment ?? '';

    modals.openConfirmModal({
      centered: true,
      title: status === 'verified' ? 'Approve this report?' : 'Deny this report?',
      labels: { confirm: status === 'verified' ? 'Approve' : 'Deny', cancel: 'Cancel' },
      confirmProps: { color: status === 'verified' ? 'green' : 'red', loading: submitting },
      children: (
        <Stack gap="xs">
          <Text size="sm">
            {status === 'verified'
              ? 'Are you sure you want to mark this report as VERIFIED? The reporter will be notified.'
              : 'Are you sure you want to mark this report as DENIED? The reporter will be notified.'}
          </Text>
          <Textarea
            label="Feedback to the reporter (optional)"
            placeholder={
              status === 'verified'
                ? 'Thank you. This matches a known phishing pattern. We’re taking action.'
                : 'We can’t verify due to missing details. Please attach screenshots/links.'
            }
            defaultValue={feedback}
            autosize
            minRows={3}
            onChange={(e) => { feedback = e.currentTarget.value; }}
          />
        </Stack>
      ),
      onConfirm: async () => {
        try {
          setSubmitting(true);

          const r = await authFetch<{ ok: boolean; error?: string }>(
            `${REPORTS_BASE}/${id}/status`,
            {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                status,
                adminComment: (feedback || '').trim(),
                notify: true,
              }),
            }
          );

          if (!r.ok) {
            const msg =
              (r.data as { error?: string })?.error ||
              (r.status === 401
                ? 'Not authenticated. Please re-authenticate and try again.'
                : r.status === 403
                ? 'Forbidden (admin only). Sign out/in to refresh your admin token or ensure your role is set.'
                : `Request failed (${r.status})`);
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
        } catch (e: unknown) {
          const errorMessage = e instanceof Error ? e.message : 'Could not submit decision.';
          notifications.show({ color: 'red', title: 'Action failed', message: errorMessage });
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
          {lastStatusCode === 401 || lastStatusCode === 403 ? (
            <div style={{ marginTop: 8 }}>
              <Button size="xs" variant="light" onClick={reauthAndRetry}>
                Re-authenticate & retry
              </Button>
            </div>
          ) : null}
        </Alert>

        <Group>
          <Button onClick={load}>Try again</Button>
        </Group>
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
          {/* Meta */}
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
              {reviewed && (
                <Text><b>Reviewed:</b> {reviewed} {report.reviewedBy ? `by ${report.reviewedBy}` : ''}</Text>
              )}
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

          {/* Admin Feedback */}
          {report.adminComment ? (
            <>
              <Divider my="sm" />
              <Paper withBorder radius="md" p="md">
                <Text fw={600}>Admin Feedback</Text>
                <Text size="sm" c="dimmed" mt={4} style={{ whiteSpace: 'pre-wrap' }}>
                  {report.adminComment}
                </Text>
              </Paper>
            </>
          ) : null}
        </Stack>
      </Paper>

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
