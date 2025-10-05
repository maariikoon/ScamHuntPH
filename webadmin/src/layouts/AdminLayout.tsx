// src/layouts/AdminLayout.tsx
import * as React from "react";
import {
  AppShell,
  Button,
  Container,
  Group,
  Text,
  Title,
  useComputedColorScheme,
  Box,
  Divider,
} from "@mantine/core";
import { useNavigate, Link, Outlet, useLocation } from "@tanstack/react-router";
import { signOut } from "firebase/auth";
import { auth } from "@/firebase";
import { AdminApi } from "@/utils/api";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  LayoutDashboard,
  FileText,
  BarChart3,
  Users,
  BookOpen,
  Shield,
  LogOut,
} from "lucide-react";

export default function AdminLayout() {
  const navigate = useNavigate();
  const loc = useLocation();
  const scheme = useComputedColorScheme("dark");
  const isDark = scheme === "dark";

  React.useEffect(() => {
    let alive = true;
    const ping = async () => {
      try {
        await AdminApi.heartbeat(false);
      } catch {
        /* ignore */
      }
    };
    ping();
    const id = setInterval(() => alive && ping(), 60_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  const onLogout = async () => {
    try {
      await signOut(auth);
    } finally {
      navigate({ to: "/login" });
    }
  };

  const pageTitle = (() => {
    const p = loc.pathname;
    if (p.includes("/admin/reports")) return "Reports";
    if (p.includes("/admin/analytics")) return "Analytics";
    if (p.includes("/admin/users")) return "Users";
    if (p.includes("/admin/content")) return "Content";
    if (p.includes("/admin/security")) return "Security";
    return "Overview";
  })();

  const nav = [
    { label: "Overview", to: "/admin", icon: LayoutDashboard },
    { label: "Reports", to: "/admin/reports", icon: FileText },
    { label: "Analytics", to: "/admin/analytics", icon: BarChart3 },
    { label: "Users", to: "/admin/users", icon: Users },
    { label: "Content", to: "/admin/content", icon: BookOpen },
    { label: "Security", to: "/admin/security", icon: Shield },
  ];
  const isActive = (to: string) =>
    loc.pathname === to || loc.pathname.startsWith(to + "/");

  return (
    <AppShell header={{ height: 64 }} padding="lg">
      {/* ✅ Header with same width as content */}
      <AppShell.Header
        style={{
          background: isDark
            ? "linear-gradient(180deg, rgba(11,17,29,.88), rgba(7,12,22,.80))"
            : "rgba(255,255,255,.78)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          borderBottom: isDark
            ? "1px solid rgba(96,165,250,.14)"
            : "1px solid rgba(30,64,175,.10)",
          boxShadow: isDark
            ? "0 8px 32px rgba(2,6,23,.45)"
            : "0 6px 22px rgba(15,23,42,.08)",
        }}
      >
        <Container size="lg" style={{ height: "100%" }}>
          <Group justify="space-between" align="center" style={{ height: "100%" }} gap="sm">
            <Box>
              <Group gap={8} align="baseline">
                <Title order={3} c={isDark ? "white" : undefined} fw={900}>
                  Admin Dashboard — {pageTitle}
                </Title>
                <Text c={isDark ? "blue.2" : "dimmed"} fz="sm">
                  ScamHuntPH System Management
                </Text>
              </Group>
            </Box>

            <Group gap={6} align="center">
              {nav.map((item) => {
                const active = isActive(item.to);
                const Icon = item.icon;
                return (
                  <Button
                    key={item.to}
                    component={Link}
                    to={item.to}
                    size="compact-md"
                    radius="xl"
                    variant="subtle"
                    leftSection={<Icon size={16} />}
                    styles={(t) => ({
                      root: {
                        paddingInline: 14,
                        fontWeight: 600,
                        color: active
                          ? t.colors.blue[4]
                          : isDark
                          ? t.colors.gray[2]
                          : t.colors.gray[7],
                        backgroundColor: active
                          ? isDark
                            ? "rgba(37,99,235,.14)"
                            : t.colors.gray[0]
                          : "transparent",
                        borderRadius: 20,
                        transition: "all .18s ease",
                        "&:hover": {
                          backgroundColor: isDark
                            ? "rgba(37,99,235,.12)"
                            : t.colors.gray[0],
                          color: t.colors.blue[5],
                        },
                      },
                      section: { marginRight: 6 },
                    })}
                  >
                    {item.label}
                  </Button>
                );
              })}

              <Divider orientation="vertical" mx={6} color={isDark ? "rgba(255,255,255,.08)" : "gray.3"} />

              <Button
                size="compact-md"
                radius="xl"
                variant="outline"
                color="blue"
                leftSection={<LogOut size={16} />}
                onClick={onLogout}
                styles={{
                  root: { fontWeight: 700 },
                }}
              >
                Logout
              </Button>

              <ThemeToggle showLabel={false} />
            </Group>
          </Group>
        </Container>
      </AppShell.Header>

      {/* ✅ Main aligned to same width */}
      <AppShell.Main>
        <Container size="lg" px="md">
          <Outlet />
        </Container>
      </AppShell.Main>
    </AppShell>
  );
}
