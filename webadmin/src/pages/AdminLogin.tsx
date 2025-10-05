// src/pages/AdminLogin.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Card,
  TextInput,
  PasswordInput,
  Button,
  Title,
  Text,
  Stack,
  Group,
  ThemeIcon,
  Alert,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconLock,
  IconShieldCheck,
  IconEye,
  IconKey,
} from "@tabler/icons-react";
import {
  getAuth,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";

const auth = getAuth();
import { AdminApi } from "@/utils/api";

function friendlyError(err: unknown): string {
  const e = err as { code?: string; message?: string };
  const code = e?.code || "";
  const msg = e?.message || "";

  if (/auth\/invalid-email/.test(code)) return "Please enter a valid email.";
  if (/auth\/user-disabled/.test(code)) return "Your admin account is disabled.";
  if (/auth\/invalid-credential|auth\/wrong-password/.test(code))
    return "Invalid email or password.";
  if (/auth\/too-many-requests/.test(code))
    return "Too many attempts. Try again later.";
  if (/auth\/user-not-found/.test(code)) return "Account not found.";
  if (/network/i.test(msg)) return "Network error. Check your connection.";
  return (msg || "Sign-in failed").replace(/^Firebase:\s*/i, "").trim();
}

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 🔐 MFA + inactivity logout
useEffect(() => {
  let timer: ReturnType<typeof setTimeout>; // ✅ cross-platform type

  const resetTimer = () => {
    clearTimeout(timer);
    timer = setTimeout(async () => {
      await signOut(auth);
      notifications.show({
        title: "Session expired",
        message: "You were logged out due to 15 minutes of inactivity.",
        color: "red",
      });
      navigate({ to: "/login" });
    }, 15 * 60 * 1000); // 15 min
  };

  window.addEventListener("mousemove", resetTimer);
  window.addEventListener("keypress", resetTimer);
  window.addEventListener("click", resetTimer);

  resetTimer();

  return () => {
    clearTimeout(timer);
    window.removeEventListener("mousemove", resetTimer);
    window.removeEventListener("keypress", resetTimer);
    window.removeEventListener("click", resetTimer);
  };
}, [navigate]);


  const doLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );

      // 🔑 Multi-factor authentication check
      const mfaTokenResult = await cred.user.getIdTokenResult(true);
      if (mfaTokenResult.claims.mfa) {
        notifications.show({
          title: "MFA required",
          message: "Complete the second factor on your device.",
          color: "blue",
        });
        // Firebase will automatically trigger MFA resolver flow
      }

      // Role claims check
      const tokenResult = await cred.user.getIdTokenResult(true);
      const claims = tokenResult.claims as Record<string, unknown>;
      const role = (claims.role as string | undefined) ?? null;
      const isAdmin =
        role === "admin" ||
        role === "super_admin" ||
        (claims.admin as boolean | undefined) === true;

      if (!isAdmin) {
        await signOut(auth);
        setError("This account is not authorized for the Admin Dashboard.");
        return;
      }

      await AdminApi.heartbeat(true);
      navigate({ to: "/admin" as const });
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setLoading(false);
    }
  };

  const doForgotPassword = async () => {
    if (!email) {
      notifications.show({
        title: "Enter email first",
        message: "Please type your email before requesting reset.",
        color: "orange",
      });
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email.trim());
      notifications.show({
        title: "Reset link sent",
        message: "Check your inbox for a password reset link.",
      });
    } catch (e) {
      setError(friendlyError(e));
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "#f7f9fc",
        padding: 16,
      }}
    >
      <Card
        withBorder
        radius="lg"
        p="xl"
        style={{
          width: "min(92vw, 460px)",
          boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
          background: "#fff",
        }}
      >
        <Stack gap="lg">
          <Group gap="sm">
            <ThemeIcon size="lg" radius="xl" variant="light" color="blue">
              <IconShieldCheck />
            </ThemeIcon>
            <div>
              <Title order={2} style={{ fontWeight: 800, fontSize: 26 }}>
                Admin Login
              </Title>
              <Text c="dimmed" fz="sm">
                Sign in to the ScamHuntPH dashboard
              </Text>
            </div>
          </Group>

          {error && <Alert color="red">{error}</Alert>}

          <form onSubmit={doLogin}>
            <Stack gap="md">
              <TextInput
                size="md"
                label={<Text fw={600} fz="sm">Administrator Email</Text>}
                placeholder="admin@scamhuntph.gov.ph"
                value={email}
                onChange={(e) => setEmail(e.currentTarget.value)}
                required
                autoComplete="username"
                styles={{
                  input: {
                    transition: "all .2s ease",
                    "&:hover": {
                      borderColor: "#2563eb",
                      boxShadow: "0 0 0 3px rgba(37,99,235,.2)",
                    },
                  },
                }}
              />
              <PasswordInput
                size="md"
                label={<Text fw={600} fz="sm">Password</Text>}
                placeholder="Enter your admin password"
                value={password}
                onChange={(e) => setPassword(e.currentTarget.value)}
                visibilityToggleIcon={({ reveal }) =>
                  reveal ? <IconEye /> : <IconLock />
                }
                visible={visible}
                onVisibilityChange={setVisible}
                required
                autoComplete="current-password"
                styles={{
                  input: {
                    transition: "all .2s ease",
                    "&:hover": {
                      borderColor: "#2563eb",
                      boxShadow: "0 0 0 3px rgba(37,99,235,.2)",
                    },
                  },
                }}
              />

              {/* Forgot password link */}
              <Button
                variant="subtle"
                size="xs"
                onClick={doForgotPassword}
                leftSection={<IconKey size={14} />}
                style={{ alignSelf: "flex-end" }}
              >
                Forgot password?
              </Button>

              <Button
                type="submit"
                size="md"
                loading={loading}
                disabled={loading}
                fullWidth
                radius="xl"
                style={{ fontWeight: 700 }}
              >
                Access Admin Dashboard
              </Button>
            </Stack>
          </form>

          <Text ta="center" c="dimmed" fz="xs">
            Need access? Ask a super admin to grant your role.
          </Text>
        </Stack>
      </Card>
    </div>
  );
}
