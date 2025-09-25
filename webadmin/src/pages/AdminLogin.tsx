// src/pages/AdminLogin.tsx
import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import {
  Card, TextInput, PasswordInput, Button, Title, Text, Stack, Group, ThemeIcon, Alert,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconLock, IconShieldCheck, IconEye } from '@tabler/icons-react';
import { auth } from '@/firebase';
import { sendPasswordResetEmail, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { AdminApi } from '@/utils/api'; 

function friendlyError(err: unknown): string {
  const e = err as { code?: string; message?: string };
  const code = e?.code || '';
  const msg = e?.message || '';

  if (/auth\/invalid-email/.test(code)) return 'Please enter a valid email.';
  if (/auth\/user-disabled/.test(code)) return 'Your admin account is disabled.';
  if (/auth\/invalid-credential|auth\/wrong-password/.test(code)) return 'Invalid email or password.';
  if (/auth\/too-many-requests/.test(code)) return 'Too many attempts. Try again later.';
  if (/auth\/user-not-found/.test(code)) return 'Account not found.';
  if (/network/i.test(msg)) return 'Network error. Check your connection.';
  return (msg || 'Sign-in failed').replace(/^Firebase:\s*/i, '').trim();
}

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const doLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);

      // Force-refresh token so new claims (e.g., role upgrades) apply immediately
      const tokenResult = await cred.user.getIdTokenResult(true);
      const claims = tokenResult.claims as Record<string, unknown>;
      const role = (claims.role as string | undefined) ?? null;
      const isAdmin =
        role === 'admin' || role === 'super_admin' || (claims.admin as boolean | undefined) === true;

      if (!isAdmin) {
        // Not an admin → deny and sign out
        await signOut(auth);
        setError('This account is not authorized for the Admin Dashboard.');
        return;
      }

      // Optional enforcement: if backend set mustChange=true, email a reset link
      const mustChange = Boolean(claims.mustChange);
      if (mustChange && cred.user.email) {
        await sendPasswordResetEmail(auth, cred.user.email);
        notifications.show({
          title: 'Password update required',
          message: 'We sent a password reset link to your email.',
        });
      }

      await AdminApi.heartbeat(true);

      // Go to Admin root (we removed the change-password route)
      navigate({ to: '/admin' as const });
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        background: '#f7f9fc',
        padding: 16,
      }}
    >
      <Card
        withBorder
        radius="lg"
        p="xl"
        style={{
          width: 'min(92vw, 480px)',
          boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
          background: '#fff',
        }}
      >
        <Stack gap="lg">
          <Group gap="sm">
            <ThemeIcon size="lg" radius="xl" variant="light">
              <IconShieldCheck />
            </ThemeIcon>
            <div>
              <Title order={2} style={{ fontWeight: 800, fontSize: 28, lineHeight: 1.2 }}>
                Admin Access
              </Title>
              <Text c="dimmed" style={{ fontSize: 14 }}>
                Sign in to the ScamHuntPH dashboard
              </Text>
            </div>
          </Group>

          {error && <Alert color="red">{error}</Alert>}

          <form onSubmit={doLogin}>
            <Stack gap="md">
              <TextInput
                size="md"
                label={<Text style={{ fontSize: 13, fontWeight: 600 }}>Administrator Email</Text>}
                placeholder="admin@scamhuntph.gov.ph"
                value={email}
                onChange={(e) => setEmail(e.currentTarget.value)}
                required
                autoComplete="username"
              />
              <PasswordInput
                size="md"
                label={<Text style={{ fontSize: 13, fontWeight: 600 }}>Password</Text>}
                placeholder="Enter your admin password"
                value={password}
                onChange={(e) => setPassword(e.currentTarget.value)}
                visibilityToggleIcon={({ reveal }) => (reveal ? <IconEye /> : <IconLock />)}
                visible={visible}
                onVisibilityChange={setVisible}
                required
                autoComplete="current-password"
              />
              <Button type="submit" size="md" loading={loading} disabled={loading} fullWidth>
                Access Admin Dashboard
              </Button>
            </Stack>
          </form>

          <Text ta="center" c="dimmed" style={{ fontSize: 12 }}>
            Need access? Ask a super admin to grant your role.
          </Text>
        </Stack>
      </Card>
    </div>
  );
}

