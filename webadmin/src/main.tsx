// src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import {
  MantineProvider,
  Center,
  Loader,
} from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '@/firebase';
import AppRouter from '@/router';
import { AuthProvider } from '@/auth';

// Mantine styles
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import '@/styles.css';

export function Root() {
  const [user, setUser] = React.useState<User | null>(null);
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      // Ensure latest custom claims (e.g., role: "admin") are present
      if (u) await u.getIdTokenResult(true).catch(() => {});
      setUser(u);
      setReady(true);
    });
    return () => unsub();
  }, []);

  // Show a minimal, centered loader until auth state is known
  if (!ready) {
    return (
      <MantineProvider
        defaultColorScheme="light"
        theme={{
          fontFamily:
            'Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, Apple Color Emoji, Segoe UI Emoji',
          headings: {
            fontFamily:
              'Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, Apple Color Emoji, Segoe UI Emoji',
            fontWeight: '800',
          },
          defaultRadius: 'lg',
          primaryColor: 'blue',
        }}
      >
        <Center style={{ minHeight: '100vh', background: '#f7f9fc' }}>
          <Loader />
        </Center>
      </MantineProvider>
    );
  }

  return (
    <MantineProvider
      defaultColorScheme="light"
      theme={{
        fontFamily:
          'Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, Apple Color Emoji, Segoe UI Emoji',
        headings: {
          fontFamily:
            'Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, Apple Color Emoji, Segoe UI Emoji',
          fontWeight: '800',
        },
        defaultRadius: 'lg',
        primaryColor: 'blue',
      }}
    >
      <Notifications position="top-right" />
      <AuthProvider>
        <AppRouter user={user} />
      </AuthProvider>
    </MantineProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
