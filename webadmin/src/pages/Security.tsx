// AuditLogs.tsx
import { useEffect, useMemo, useState } from "react";
import {
  Title, Paper, Table, Text, Group, Skeleton, Button,
  TextInput, SegmentedControl, Badge, Select, Tooltip, Alert
} from "@mantine/core";
import { IconShield, IconRefresh, IconSearch, IconAlertCircle, IconPlus } from "@tabler/icons-react";
import {
  collection, getFirestore, limit, onSnapshot, orderBy, query, Timestamp, getDocs
} from "firebase/firestore";
import { getAuth } from "firebase/auth";

type Scope = "admin" | "user";
type Action =
  | "auth.login"
  | "auth.logout"
  | "config.update"
  | "user.update"
  | "role.change"
  | string;

type Log = {
  id: string;
  action: Action;
  scope?: Scope;
  entity?: string | null;
  actorEmail?: string | null;
  actorUid?: string | null;
  note?: string | null;
  ip?: string | null;
  ua?: string | null;
  createdAt?: Timestamp;
  // legacy fallbacks (older docs might have these)
  uid?: string | null;
  email?: string | null;
};

const ACTION_OPTIONS = [
  "auth.login",
  "auth.logout",
  "config.update",
  "user.update",
  "role.change",
];

const ACTION_BADGE: Record<string, "blue" | "grape" | "teal" | "orange" | "red" | "gray"> = {
  "auth.login": "teal",
  "auth.logout": "grape",
  "config.update": "orange",
  "user.update": "blue",
  "role.change": "red",
};

function niceDate(ts?: Timestamp) {
  if (!ts?.toDate) return "—";
  const d = ts.toDate();
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`;
}

const LOG_ENDPOINT = import.meta.env.VITE_LOG_ACTION_URL as string | undefined;

export default function AuditLogs() {
  const db = getFirestore();
  const [rows, setRows] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // UI state
  const [view, setView] = useState<"activity" | "users">("activity");
  const [scope, setScope] = useState<"all" | Scope>("all");
  const [actionFilter, setActionFilter] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // Live subscription – latest 500 by createdAt
  useEffect(() => {
    setLoading(true);
    setErrorMsg(null);

    const col = collection(db, "auditLogs");
    const qy = query(col, orderBy("createdAt", "desc"), limit(500));

    const unsub = onSnapshot(
      qy,
      (snap) => {
        const list: Log[] = snap.docs.map((d) => {
          const data = d.data() as Log;
          // Normalize legacy fields to current names for UI:
          const actorUid = data.actorUid ?? data.uid ?? null;
          const actorEmail = data.actorEmail ?? data.email ?? null;
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { id, ...rest } = data;
          return { id: d.id, ...rest, actorUid, actorEmail };
        });
        setRows(list);
        setLoading(false);
      },
      (err) => {
        console.error("auditLogs subscription error:", err);
        setErrorMsg(err?.message ?? String(err));
        setRows([]);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [db]);

  // DEBUG helper: check raw count even if createdAt missing
  async function debugRawCount() {
    try {
      const snap = await getDocs(collection(db, "auditLogs"));
      console.log("auditLogs raw count:", snap.size);
      snap.forEach((d) => console.log("doc", d.id, d.data()));
    } catch (e) {
      console.warn("debugRawCount error:", e);
    }
  }

  const filtered = useMemo(() => {
    let list = rows;

    if (scope !== "all") list = list.filter((r) => r.scope === scope);

    if (actionFilter && actionFilter.length > 0) {
      list = list.filter((r) => r.action === actionFilter);
    }

    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((r) => {
        const hay = [
          r.action ?? "",
          r.entity ?? "",
          r.actorEmail ?? "",
          r.actorUid ?? "",
          r.note ?? "",
          r.ip ?? "",
        ]
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      });
    }

    return list;
  }, [rows, scope, actionFilter, search]);

  // Per-user summary
  const usersSummary = useMemo(() => {
    const map = new Map<
      string,
      {
        email: string;
        uid: string;
        lastLogin?: Date;
        lastActive?: Date;
        lastAction?: string;
        totalActions: number;
      }
    >();

    for (const r of rows) {
      const uid = r.actorUid ?? "system";
      const email = r.actorEmail ?? "system";
      const created = r.createdAt?.toDate?.() ?? undefined;

      if (!map.has(uid)) {
        map.set(uid, {
          email,
          uid,
          lastLogin: undefined,
          lastActive: undefined,
          lastAction: undefined,
          totalActions: 0,
        });
      }
      const u = map.get(uid)!;
      u.totalActions += 1;

      if (!u.lastActive || (created && created > u.lastActive)) {
        u.lastActive = created;
        u.lastAction = r.action;
      }

      if (r.action === "auth.login" && created) {
        if (!u.lastLogin || created > u.lastLogin) u.lastLogin = created;
      }
    }

    const q = search.trim().toLowerCase();
    const list = Array.from(map.values())
      .filter((u) => (!q ? true : `${u.email} ${u.uid}`.toLowerCase().includes(q)))
      .sort((a, b) => (b.lastActive?.getTime?.() ?? 0) - (a.lastActive?.getTime?.() ?? 0));

    return list;
  }, [rows, search]);

  const refreshNow = () => window.location.reload();

  async function seedTest() {
    if (!LOG_ENDPOINT) {
      alert("VITE_LOG_ACTION_URL is not set in .env.local");
      return;
    }
    try {
      const auth = getAuth();
      const idToken = await auth.currentUser?.getIdToken();
      const res = await fetch(LOG_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
        },
        body: JSON.stringify({
          action: "config.update",
          entity: "audit-logs",
          note: "seed from UI",
        }),
      });
      if (!res.ok) {
        const txt = await res.text();
        console.warn("Seed failed:", txt);
        alert(`Seed failed: ${txt}`);
      }
    } catch (e: unknown) {
      console.warn("Seed error:", e);
      alert(`Seed error: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return (
    <div>
      <Group mb="md" justify="space-between" wrap="wrap">
        <Group>
          <IconShield size={22} />
          <Title order={3}>Audit Logs</Title>
        </Group>
        <Group>
          <Button variant="light" leftSection={<IconPlus size={16} />} onClick={seedTest}>
            Seed test log
          </Button>
          <Button variant="default" leftSection={<IconRefresh size={16} />} onClick={refreshNow}>
            Refresh
          </Button>
        </Group>
      </Group>

      {errorMsg && (
        <Alert icon={<IconAlertCircle size={16} />} color="red" mb="sm">
          <Text fw={500}>Can’t read audit logs.</Text>
          <Text size="sm">
            {errorMsg}
            {" "}
            {errorMsg.includes("permission") && "— Is your account an admin (admins/{uid} or custom claim)?"}
          </Text>
          <Button size="xs" mt="xs" variant="subtle" onClick={debugRawCount}>
            Debug: print raw collection to console
          </Button>
        </Alert>
      )}

      <Paper withBorder radius="xl" p="md" mb="sm">
        <Group justify="space-between" align="flex-end" wrap="wrap">
          <SegmentedControl
            value={view}
            onChange={(v) => setView(v as "activity" | "users")}
            data={[
              { label: "Activity", value: "activity" },
              { label: "Users", value: "users" },
            ]}
          />

          <Group wrap="wrap" gap="sm">
            <Select
              label="Scope"
              value={scope}
              onChange={(value) => setScope((value as Scope | "all" | null) ?? "all")}
              data={[
                { label: "All", value: "all" },
                { label: "Admin only", value: "admin" },
                { label: "Users only", value: "user" },
              ]}
              clearable={false}
              maw={180}
            />
            <Select
              label="Action"
              value={actionFilter}
              onChange={setActionFilter}
              data={ACTION_OPTIONS.map((a) => ({ label: a, value: a }))}
              placeholder="Any"
              clearable
              maw={220}
            />
            <TextInput
              label="Search"
              placeholder="email, uid, action, entity, note, IP…"
              leftSection={<IconSearch size={16} />}
              value={search}
              onChange={(e) => setSearch(e.currentTarget.value)}
              maw={300}
            />
          </Group>
        </Group>
      </Paper>

      {view === "activity" ? (
        <Paper radius="xl" withBorder>
          <Table striped highlightOnHover verticalSpacing="sm" horizontalSpacing="md">
            <Table.Thead>
              <Table.Tr>
                <Table.Th style={{ width: 210 }}>Time</Table.Th>
                <Table.Th style={{ width: 120 }}>Scope</Table.Th>
                <Table.Th style={{ width: 170 }}>Action</Table.Th>
                <Table.Th>Entity</Table.Th>
                <Table.Th style={{ width: 280 }}>Actor</Table.Th>
                <Table.Th>Note</Table.Th>
                <Table.Th style={{ width: 140 }}>IP</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {loading &&
                Array.from({ length: 10 }).map((_, i) => (
                  <Table.Tr key={i}>
                    <Table.Td colSpan={7}>
                      <Skeleton h={18} />
                    </Table.Td>
                  </Table.Tr>
                ))}

              {!loading &&
                filtered.map((r) => (
                  <Table.Tr key={r.id}>
                    <Table.Td>
                      <Text size="sm">{niceDate(r.createdAt)}</Text>
                    </Table.Td>

                    <Table.Td>
                      <Badge variant="light" color={r.scope === "admin" ? "red" : "blue"}>
                        {r.scope ?? "—"}
                      </Badge>
                    </Table.Td>

                    <Table.Td>
                      <Badge variant="light" color={ACTION_BADGE[r.action] ?? "gray"}>
                        {r.action}
                      </Badge>
                    </Table.Td>

                    <Table.Td>
                      <Text size="sm" lineClamp={1}>
                        {r.entity ?? "—"}
                      </Text>
                    </Table.Td>

                    <Table.Td>
                      <Text size="sm">{r.actorEmail ?? "system"}</Text>
                      <Text size="xs" c="dimmed" lineClamp={1}>
                        {r.actorUid ?? ""}
                      </Text>
                    </Table.Td>

                    <Table.Td>
                      <Tooltip label={r.note ?? ""} disabled={!r.note}>
                        <Text size="sm" lineClamp={2}>
                          {r.note ?? "—"}
                        </Text>
                      </Tooltip>
                    </Table.Td>

                    <Table.Td>
                      <Text size="sm">{r.ip ?? "—"}</Text>
                    </Table.Td>
                  </Table.Tr>
                ))}

              {!loading && filtered.length === 0 && !errorMsg && (
                <Table.Tr>
                  <Table.Td colSpan={7}>
                    <Text c="dimmed" ta="center">
                      No results. Try <b>Seed test log</b> (top right), check your function URL, or ensure you’re an admin.
                    </Text>
                  </Table.Td>
                </Table.Tr>
              )}
            </Table.Tbody>
          </Table>
        </Paper>
      ) : (
        <Paper radius="xl" withBorder>
          <Table striped highlightOnHover verticalSpacing="sm" horizontalSpacing="md">
            <Table.Thead>
              <Table.Tr>
                <Table.Th style={{ width: 320 }}>User</Table.Th>
                <Table.Th style={{ width: 210 }}>Last Login</Table.Th>
                <Table.Th style={{ width: 210 }}>Last Active</Table.Th>
                <Table.Th style={{ width: 160 }}>Status</Table.Th>
                <Table.Th>Last Action</Table.Th>
                <Table.Th style={{ width: 120, textAlign: "right" }}>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {loading &&
                Array.from({ length: 8 }).map((_, i) => (
                  <Table.Tr key={i}>
                    <Table.Td colSpan={6}>
                      <Skeleton h={18} />
                    </Table.Td>
                  </Table.Tr>
                ))}

              {!loading &&
                usersSummary.map((u) => {
                  const now = Date.now();
                  const activeMs = u.lastActive?.getTime?.() ?? 0;
                  const isActive = activeMs > 0 && now - activeMs < 10 * 60 * 1000; // 10 mins
                  return (
                    <Table.Tr key={u.uid}>
                      <Table.Td>
                        <Text size="sm">{u.email}</Text>
                        <Text size="xs" c="dimmed" lineClamp={1}>
                          {u.uid}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">{u.lastLogin ? niceDate(Timestamp.fromDate(u.lastLogin)) : "—"}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">{u.lastActive ? niceDate(Timestamp.fromDate(u.lastActive)) : "—"}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Badge color={isActive ? "teal" : "gray"} variant="light">
                          {isActive ? "Active" : "Idle"}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Badge variant="light" color={ACTION_BADGE[u.lastAction ?? ""] ?? "gray"}>
                          {u.lastAction ?? "—"}
                        </Badge>
                      </Table.Td>
                      <Table.Td style={{ textAlign: "right" }}>
                        <Badge variant="outline">{u.totalActions}</Badge>
                      </Table.Td>
                    </Table.Tr>
                  );
                })}

              {!loading && usersSummary.length === 0 && !errorMsg && (
                <Table.Tr>
                  <Table.Td colSpan={6}>
                    <Text c="dimmed" ta="center">
                      No users found. Generate activity (login, settings save) or use <b>Seed test log</b>.
                    </Text>
                  </Table.Td>
                </Table.Tr>
              )}
            </Table.Tbody>
          </Table>
        </Paper>
      )}
    </div>
  );
}
