import { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/firebase';
import { useNavigate } from '@tanstack/react-router';
import { Card, TextInput, PasswordInput, Button, Title, Text, Stack, Group, List, ThemeIcon } from '@mantine/core';
import { IconLock, IconShieldCheck, IconEye } from '@tabler/icons-react';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('admin@scamhuntph.gov.ph');
  const [password, setPassword] = useState('Passw0rd!');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);

  const doLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      await signInWithEmailAndPassword(auth, email.trim(), password);
      navigate({ to: '/admin' });
    } catch (e: unknown) {
      if (e instanceof Error) {
        setError(e.message);
      } else {
        setError(String(e));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#f7f9fc', padding: 16 }}>
      <Card withBorder radius="lg" p="xl" style={{ width: 520 }} className="card-shadow">
        <Stack>
          <Group>
            <ThemeIcon size="lg" radius="xl" variant="light"><IconShieldCheck /></ThemeIcon>
            <div>
              <Title order={2}>Admin Access</Title>
              <Text c="dimmed">ScamHuntPH System Administration</Text>
            </div>
          </Group>

          <form onSubmit={doLogin}>
            <Stack>
              <TextInput
                label="Administrator Email"
                placeholder="admin@scamhuntph.gov.ph"
                value={email}
                onChange={(e) => setEmail(e.currentTarget.value)}
              />
              <PasswordInput
                label="Password"
                placeholder="Enter your admin password"
                value={password}
                onChange={(e) => setPassword(e.currentTarget.value)}
                visibilityToggleIcon={({ reveal }) => (reveal ? <IconEye /> : <IconLock />)}
                visible={visible}
                onVisibilityChange={setVisible}
              />
              <Button type="submit" size="md" loading={loading}>
                Access Admin Dashboard
              </Button>
              {error && <Text c="red">{error}</Text>}
            </Stack>
          </form>

          <Card withBorder radius="md" p="md" bg="gray.0">
            <Text fw={600}>Security Features:</Text>
            <List spacing="xs" size="sm" mt="xs">
              <List.Item icon={<ThemeIcon size={18} radius="xl" variant="light"><IconLock size={14} /></ThemeIcon>}>
                Role-based access control (RBAC)
              </List.Item>
              <List.Item icon={<ThemeIcon size={18} radius="xl" variant="light"><IconLock size={14} /></ThemeIcon>}>
                AES-256 encryption
              </List.Item>
              <List.Item icon={<ThemeIcon size={18} radius="xl" variant="light"><IconLock size={14} /></ThemeIcon>}>
                OWASP compliance
              </List.Item>
              <List.Item icon={<ThemeIcon size={18} radius="xl" variant="light"><IconLock size={14} /></ThemeIcon>}>
                Audit logging enabled
              </List.Item>
            </List>
          </Card>
        </Stack>
      </Card>
    </div>
  );
}
