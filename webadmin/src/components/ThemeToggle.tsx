// src/components/ThemeToggle.tsx
import {
    Group,
    Switch,
    Text,
    useMantineColorScheme,
    useComputedColorScheme,
  } from "@mantine/core";
  import { Sun, Moon } from "lucide-react";
  
  export function ThemeToggle({ showLabel = true }: { showLabel?: boolean }) {
    const { setColorScheme } = useMantineColorScheme();
    const scheme = useComputedColorScheme("light");
    const isDark = scheme === "dark";
  
    return (
      <Group gap="xs" align="center">
        <Switch
          checked={isDark}
          onChange={(e) =>
            setColorScheme(e.currentTarget.checked ? "dark" : "light")
          }
          size="md"
          radius="xl"
          thumbIcon={isDark ? <Moon size={12} /> : <Sun size={12} />}
          aria-label="Toggle color scheme"
          styles={(theme) => {
            const blueLight = theme.colors.blue[6]; // track when light
            const greyDark = "linear-gradient(180deg, #2E2E2E, #3A3A3A)"; // sleek dark-grey track
            return {
              root: { cursor: "pointer" },
              track: {
                background: isDark ? greyDark : blueLight,
                borderColor: isDark
                  ? "rgba(255,255,255,.25)"
                  : theme.colors.blue[7],
                boxShadow: isDark
                  ? "inset 0 0 0 1px rgba(255,255,255,.12), 0 4px 14px rgba(0,0,0,.6)"
                  : "0 4px 10px rgba(0,0,0,.15)",
                transition: "all .25s ease",
              },
              thumb: {
                backgroundColor: isDark
                  ? "rgba(255,255,255,.92)"
                  : "rgba(245,245,245,1)",
                boxShadow: "0 2px 6px rgba(0,0,0,.35)",
              },
            };
          }}
        />
        {showLabel && (
          <Text size="sm" c="dimmed">
            {isDark ? "Dark Theme" : "Light Theme"}
          </Text>
        )}
      </Group>
    );
  }
  