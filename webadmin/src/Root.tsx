// src/Root.tsx
import React from 'react';
import { MantineProvider, Center, Loader } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/firebase';
import AppRouter from '@/router';
import { AuthProvider } from '@/auth';

const theme = {
  fontFamily:
    'Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, Apple Color Emoji, Segoe UI Emoji',
  headings: {
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, Apple Color Emoji, Segoe UI Emoji',
    fontWeight: '800',
  },
  defaultRadius: 'lg' as const,
  primaryColor: 'blue' as const,
};

export default function Root() {
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        try {
          // refresh once so router beforeLoad sees latest claims
          await u.getIdTokenResult(true);
        } catch { /* empty */ }
      }
      setReady(true);
    });
    return () => unsub();
  }, []);

  if (!ready) {
    return (
      <MantineProvider defaultColorScheme="light" theme={theme}>
        <Center style={{ minHeight: '100vh', background: '#f7f9fc' }}>
          <Loader />
        </Center>
      </MantineProvider>
    );
  }

  return (
    <MantineProvider defaultColorScheme="light" theme={theme}>
      <Notifications position="top-right" />
      <AuthProvider>
        {/* Always mount the router; it will redirect to /login or /admin */}
        <AppRouter />
      </AuthProvider>
    </MantineProvider>
  );
}
