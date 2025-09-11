import { useState } from 'react';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth } from '@/firebase';
import { useNavigate } from '@tanstack/react-router';
import {
  Card, TextInput, PasswordInput, Button, Title, Text, Stack, Group, ThemeIcon
} from '@mantine/core';
import { IconLock, IconShieldCheck, IconEye } from '@tabler/icons-react';

function friendlyError(err: unknown): string {
  const msg = String((err instanceof Error && err.message) || err);
  if (msg.includes('auth/invalid-credential')) return 'Invalid email or password.';
  if (msg.includes('auth/user-not-found')) return 'Account not found.';
  if (msg.includes('auth/wrong-password')) return 'Incorrect password.';
  if (msg.includes('auth/too-many-requests')) return 'Too many attempts. Try again later.';
  return msg.replace(/^Firebase:\s*/i, '').replace(/\s*\(auth\/[a-z0-9-]+\)\.?$/i, '').trim();
}

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('admin@scamhuntph.gov.ph');
  const [password, setPassword] = useState('Passw0rd!');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);

  const doLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
      const token = await cred.user.getIdTokenResult(true); // refresh to get latest claims
      if (token.claims?.role === 'admin') {
        navigate({ to: '/admin' });
      } else {
        await signOut(auth);
        setError("Your account doesn't have admin access yet.");
      }
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
        // Responsive, perfectly centered card
        style={{
          width: 'min(92vw, 480px)',
          boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
          background: '#fff',
        }}
      >
        <Stack gap="lg">
          <Group gap="sm">
            <ThemeIcon size="lg" radius="xl" variant="light"><IconShieldCheck /></ThemeIcon>
            <div>
              <Title order={2} style={{ fontWeight: 800, fontSize: 28, lineHeight: 1.2 }}>
                Admin Access
              </Title>
              <Text c="dimmed" style={{ fontSize: 14 }}>
                Sign in to the ScamHuntPH dashboard
              </Text>
            </div>
          </Group>

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
              {error && <Text c="red" style={{ fontSize: 13 }}>{error}</Text>}
            </Stack>
          </form>

          <Text ta="center" c="dimmed" style={{ fontSize: 12 }}>
            Need access? Ask an owner to grant <Text span fw={600}>role: "admin"</Text>.
          </Text>
        </Stack>
      </Card>
    </div>
  );
}
