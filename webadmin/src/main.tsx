// src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import {
  MantineProvider,
  Center,
  Loader,
  Stack,
  Text,
  Button,
} from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { ModalsProvider } from "@mantine/modals";
import AppRouter from "@/router";
import { AuthProvider } from "@/auth";

import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import "@/styles.css";

// Simple error boundary to surface any runtime errors instead of a white screen
class RouteErrorBoundary extends React.Component<{children: React.ReactNode}, {error: Error | null}> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: Error | null) {
    return { error };
  }
  componentDidCatch(error: unknown, info: unknown) {
    // eslint-disable-next-line no-console
    console.error("[App Error]", error, info);
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <Center style={{ minHeight: "100vh" }}>
        <Stack align="center">
          <Text fw={700} fz="lg">Something went wrong</Text>
          <Text c="dimmed" ta="center" maw={520}>
            {this.state.error?.message || "Unknown error"}
          </Text>
          <Button onClick={() => location.reload()}>Reload</Button>
        </Stack>
      </Center>
    );
  }
}

const theme = {
  fontFamily:
    "Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, Apple Color Emoji, Segoe UI Emoji",
  headings: {
    fontFamily:
      "Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, Apple Color Emoji, Segoe UI Emoji",
    fontWeight: "800",
  },
  defaultRadius: "lg" as const,
  primaryColor: "blue" as const,
};

export function Root() {
  return (
    <MantineProvider defaultColorScheme="light" theme={theme}>
      <Notifications position="top-right" />
      <AuthProvider>
        {/* Wrap lazy routes/components to avoid blank screen while they load */}
        <React.Suspense
          fallback={
            <Center style={{ minHeight: "100vh" }}>
              <Loader />
            </Center>
          }
        >
          <RouteErrorBoundary>
            <AppRouter />
          </RouteErrorBoundary>
        </React.Suspense>
      </AuthProvider>
    </MantineProvider>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
