// src/pages/ReportDetail.tsx
import { useParams, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { Title, Text, Badge, Button, Group, Loader, Alert, Stack } from '@mantine/core';
import { getAuth } from 'firebase/auth';


const API_BASE_URL = "https://scamhunt-bcvrqgcc6a-as.a.run.app";

type Report = {
  id: string;
  sender?: string;
  message?: string;
  category?: string;
  region?: string;
  attachments?: string[];
  status?: string;
  createdAt?: string | null;
  updatedAt?: string | null;
};

async function getIdToken() {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");
  return await user.getIdToken();
}

export default function ReportDetail() {
  const { id } = useParams({ from: "/admin/reports/$id" });
  const navigate = useNavigate();
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        setLoading(true);
        const token = await getIdToken();
        const res = await fetch(`${API_BASE_URL}/report/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        if (!res.ok || !json.ok) throw new Error(json.error || "Failed to load report");
        setReport(json.data);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, [id]);

  const updateStatus = async (status: string) => {
    try {
      const token = await getIdToken();
      await fetch(`${API_BASE_URL}/report/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status }),
      });
      navigate({ to: "/admin/reports" }); // go back after update
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  if (loading) return <Loader />;
  if (error) return <Alert color="red">{error}</Alert>;
  if (!report) return <Text>No report found.</Text>;

  return (
    <Stack>
      <Title order={3}>Report Details</Title>
      <Text><b>Report ID:</b> {report.id}</Text>
      <Text><b>Sender ID:</b> {report.sender}</Text>
      <Text><b>Message:</b> {report.message}</Text>
      <Text><b>Category:</b> {report.category}</Text>
      <Text><b>Region:</b> {report.region}</Text>
      <Text><b>Status:</b> <Badge>{report.status}</Badge></Text>
      <Text><b>Created:</b> {report.createdAt ? new Date(report.createdAt).toLocaleString() : "—"}</Text>
      <Text><b>Updated:</b> {report.updatedAt ? new Date(report.updatedAt).toLocaleString() : "—"}</Text>

      <div>
        <b>Attachments:</b>
        {report.attachments?.length ? (
          report.attachments.map((url, i) => (
            <div key={i}><a href={url} target="_blank" rel="noreferrer">Screenshot {i + 1}</a></div>
          ))
        ) : (
          <Text c="dimmed">None</Text>
        )}
      </div>

      <Group>
        <Button
            onClick={() => updateStatus("verified")}
            disabled={report.status === "verified"}
            color="green"
        >
            Approve
        </Button>
        <Button
            onClick={() => updateStatus("declined")}
            disabled={report.status === "declined"}
            color="red"
            variant="light"
        >
            Deny
        </Button>
      </Group>
    </Stack>
  );
}
