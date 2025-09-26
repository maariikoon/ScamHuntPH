// src/pages/security/ResetPassword.tsx
import { useState, useEffect } from "react";
import { useLocation } from "@tanstack/react-router";
import {
  PasswordInput,
  Button,
  Title,
  Stack,
  Alert,
  Text,
  Paper,
  Group,
  Progress,
} from "@mantine/core";
import { IconLock, IconCheck, IconX } from "@tabler/icons-react";
import {
  confirmPasswordReset,
  verifyPasswordResetCode,
} from "firebase/auth";
import { auth } from "@/firebase";

// --- Password strength check ---
function validatePassword(pwd: string) {
  const rules = {
    length: pwd.length >= 8,
    upper: /[A-Z]/.test(pwd),
    lower: /[a-z]/.test(pwd),
    number: /\d/.test(pwd),
    symbol: /[!@#$%^&*]/.test(pwd),
  };
  const passed = Object.values(rules).filter(Boolean).length;
  return { rules, passed };
}

export default function ResetPassword() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const oobCode = params.get("oobCode");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [checkingCode, setCheckingCode] = useState(true);
  const [codeValid, setCodeValid] = useState(false);

  // validate code on load
  useEffect(() => {
    async function checkCode() {
      if (!oobCode) {
        setError("Invalid password reset link.");
        setCheckingCode(false);
        return;
      }
      try {
        await verifyPasswordResetCode(auth, oobCode);
        setCodeValid(true);
      } catch {
        setError("This password reset link is invalid or has expired.");
      } finally {
        setCheckingCode(false);
      }
    }
    void checkCode();
  }, [oobCode]);

  // auto-close on success
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        window.close();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const handleSubmit = async () => {
    setError("");
    setSuccess("");

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    const { passed } = validatePassword(newPassword);
    if (passed < 5) {
      setError("Password does not meet strength requirements.");
      return;
    }

    try {
      await confirmPasswordReset(auth, oobCode!, newPassword);
      setSuccess(
        "Your password has been changed successfully. This page will close automatically."
      );
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setError(err.message);
    }
  };

  const { rules, passed } = validatePassword(newPassword);
  const strength = (passed / 5) * 100;

  return (
    <Stack align="center" justify="center" style={{ minHeight: "100vh", padding: 20 }}>
      <Paper shadow="md" radius="lg" p="xl" withBorder style={{ maxWidth: 420, width: "100%" }}>
        <Group align="center" mb="lg" justify="center">
          <IconLock size={32} />
          <Title order={2}>Reset Password</Title>
        </Group>

        {checkingCode && <Text>Validating link…</Text>}

        {!checkingCode && error && (
          <Alert icon={<IconX size={16} />} color="red" mb="md">
            {error}
          </Alert>
        )}

        {!checkingCode && codeValid && !success && (
          <Stack gap="md">
            <PasswordInput
              label="New Password"
              placeholder="Enter a strong password"
              size="md"
              value={newPassword}
              onChange={(e) => setNewPassword(e.currentTarget.value)}
              required
            />

            {/* Password strength bar */}
            {newPassword.length > 0 && (
              <Stack gap={4}>
                <Progress value={strength} color={strength > 80 ? "green" : strength > 50 ? "yellow" : "red"} />
                <Text size="sm" c="dimmed">
                  Requirements:
                </Text>
                <Text size="xs" c={rules.length ? "green" : "red"}>
                  {rules.length ? "✅" : "❌"} Minimum 8 characters
                </Text>
                <Text size="xs" c={rules.upper ? "green" : "red"}>
                  {rules.upper ? "✅" : "❌"} At least one uppercase
                </Text>
                <Text size="xs" c={rules.lower ? "green" : "red"}>
                  {rules.lower ? "✅" : "❌"} At least one lowercase
                </Text>
                <Text size="xs" c={rules.number ? "green" : "red"}>
                  {rules.number ? "✅" : "❌"} At least one number
                </Text>
                <Text size="xs" c={rules.symbol ? "green" : "red"}>
                  {rules.symbol ? "✅" : "❌"} At least one symbol
                </Text>
              </Stack>
            )}

            <PasswordInput
            label="Confirm Password"
            placeholder="Re-enter your password"
            size="md"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.currentTarget.value)}
            required
            error={confirmPassword.length > 0 && confirmPassword !== newPassword ? "Passwords do not match" : undefined}
            />

            <Button fullWidth size="md" onClick={handleSubmit}>
              Update Password
            </Button>
          </Stack>
        )}

        {success && (
          <Alert icon={<IconCheck size={16} />} color="green" mb="md">
            <Text>{success}</Text>
            <Text size="sm" mt="xs">
              If this page does not close, you can close it manually.
            </Text>
          </Alert>
        )}
      </Paper>
    </Stack>
  );
}
