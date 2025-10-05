// src/layouts/DashboardShell.tsx
import {
    AppShell,
    Group,
    Stack,
    Text,
    NavLink,
    ScrollArea,
    Button,
    ActionIcon,
    useComputedColorScheme,
  } from "@mantine/core";
  import {
    LayoutDashboard,
    FileText,
    BarChart3,
    Users,
    BookOpen,
    Shield,
    RefreshCw,
    Download,
    LogOut,
  } from "lucide-react";
  import { ThemeToggle } from "@/components/ThemeToggle";
  import { Link, useLocation } from "react-router-dom";
  
  const links = [
    { label: "Overview", to: "/dashboard", icon: LayoutDashboard },
    { label: "Reports", to: "/reports", icon: FileText },
    { label: "Analytics", to: "/analytics", icon: BarChart3 },
    { label: "Users", to: "/users", icon: Users },
    { label: "Content", to: "/content", icon: BookOpen },
    { label: "Security", to: "/security", icon: Shield },
  ];
  
  export default function DashboardShell({ children }: { children: React.ReactNode }) {
    const { pathname } = useLocation();
    const scheme = useComputedColorScheme("dark");      // default to dark
    const isDark = scheme === "dark";
  
    return (
      <AppShell
        header={{ height: 64 }}
        navbar={{ width: 260, breakpoint: "sm" }}
        padding="md"
      >
        {/* Header */}
        <AppShell.Header
          // Force a dark glass header in dark mode (no washed-out gray)
          style={{
            background: isDark
              ? "linear-gradient(180deg, rgba(10,16,28,.85), rgba(6,12,20,.78))"
              : "rgba(255,255,255,.78)",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
            borderBottom: isDark
              ? "1px solid rgba(96,165,250,.14)"
              : "1px solid rgba(30,64,175,.10)",
          }}
        >
          <Group h="100%" px="md" justify="space-between">
            {/* Left: title + subtitle; force white/blue in dark */}
            <Group gap="sm">
              <Text fw={800} fz="lg" c={isDark ? "white" : "dark"}>
                Admin Dashboard — Overview
              </Text>
              <Text c={isDark ? "blue.2" : "gray.6"} fz="sm">
                ScamHuntPH System Management
              </Text>
            </Group>
  
            {/* Right: actions */}
            <Group gap="xs">
              <ActionIcon
                size="lg"
                variant={isDark ? "light" : "subtle"}
                aria-label="Refresh"
              >
                <RefreshCw size={18} />
              </ActionIcon>
              <ActionIcon
                size="lg"
                variant={isDark ? "light" : "subtle"}
                aria-label="Export"
              >
                <Download size={18} />
              </ActionIcon>
              <Button
                variant="outline"
                leftSection={<LogOut size={16} />}
                color="blue"
                radius="xl"
              >
                Logout
              </Button>
              {/* Hide label so text doesn’t dim next to actions */}
              <ThemeToggle showLabel={false} />
            </Group>
          </Group>
        </AppShell.Header>
  
        {/* Sidebar */}
        <AppShell.Navbar
          p="md"
          // Match the dark look so it doesn’t appear lighter than main area
          style={{
            background: isDark
              ? "linear-gradient(180deg, rgba(6,12,20,.92), rgba(6,12,20,.82))"
              : "rgba(255,255,255,.72)",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
            borderRight: isDark
              ? "1px solid rgba(96,165,250,.12)"
              : "1px solid rgba(30,64,175,.10)",
          }}
        >
          <Stack gap="xs">
            <Text fw={800} c={isDark ? "white" : "dark"}>
              ScamHuntPH
            </Text>
            <Text c={isDark ? "blue.2" : "gray.6"} fz="sm" mb="sm">
              Admin
            </Text>
          </Stack>
  
          <ScrollArea style={{ flex: 1 }} type="auto">
            <Stack gap={2} pr={4}>
              {links.map((l) => {
                const Icon = l.icon;
                const active = pathname.startsWith(l.to);
                return (
                  <NavLink
                    key={l.to}
                    component={Link}
                    to={l.to}
                    label={l.label}
                    active={active}
                    leftSection={<Icon size={18} />}
                    variant="subtle"
                    style={{ borderRadius: 14, fontWeight: 600 }}
                    styles={(theme) => ({
                      root: {
                        color: active
                          ? theme.colors.blue[3]
                          : isDark
                          ? theme.colors.gray[2]
                          : theme.colors.gray[7],
                        "&:hover": {
                          backgroundColor: isDark
                            ? "rgba(37,99,235,.15)"
                            : theme.colors.gray[0],
                          color: theme.colors.blue[4],
                        },
                      },
                    })}
                  />
                );
              })}
            </Stack>
          </ScrollArea>
  
          <Button
            mt="md"
            variant="light"
            leftSection={<LogOut size={16} />}
            color="blue"
            radius="xl"
            fullWidth
          >
            Logout
          </Button>
        </AppShell.Navbar>
  
        <AppShell.Main>{children}</AppShell.Main>
      </AppShell>
    );
  }
  