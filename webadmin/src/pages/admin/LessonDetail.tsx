// src/pages/admin/LessonDetail.tsx
import React from "react";
import {
  Button,
  TextInput,
  Textarea,
  Select,
  Group,
  Badge,
  Breadcrumbs,
  Anchor,
  Paper,
  Loader,
  Alert,
} from "@mantine/core";
import { useParams, Link, useNavigate } from "@tanstack/react-router";
import {
  getLesson,
  updateLesson,
  deleteLesson,
  publishLesson,
  unpublishLesson,
} from "@/services/contentService";

type Props = {
  /** Optional: pass when embedding inside a modal. If omitted, route param /admin/content/$id is used. */
  id?: string;
  /** Optional: allow parent modal to close after delete/save if desired */
  onClose?: () => void;
};

const CATS = [
  "gcash_scam",
  "phishing",
  "delivery_fraud",
  "investment_scam",
  "loan_scam",
  "identity_theft",
  "other",
];

export default function LessonDetail(props: Props) {
  // Get id from prop or from route param
  const routeParams = useParams({ from: "/admin/content/$id" });
  const id = props.id ?? routeParams.id;

  const nav = useNavigate();

  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  const [title, setTitle] = React.useState("");
  const [content, setContent] = React.useState("");
  const [category, setCategory] = React.useState("other");
  const [published, setPublished] = React.useState(false);

  React.useEffect(() => {
    let alive = true;
    (async () => {
      setErr(null);
      setLoading(true);
      try {
        if (!id) throw new Error("Missing lesson id.");
        const doc = await getLesson(id);
        if (alive) {
          if (doc) {
            setTitle(doc.title);
            setContent(doc.content);
            setCategory(doc.category);
            setPublished(!!doc.published);
          } else {
            setErr("Lesson not found.");
          }
        }
      } catch (e: unknown) {
        if (alive) setErr(e instanceof Error ? e.message : "Failed to load lesson.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [id]);

  async function save() {
    if (!id) return;
    setSaving(true);
    setErr(null);
    try {
      await updateLesson(id, { title, content, category });
      // keep state as-is; optionally notify here
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed to save changes.");
    } finally {
      setSaving(false);
    }
  }

  async function togglePub() {
    if (!id) return;
    setSaving(true);
    setErr(null);
    try {
      if (published) {
        await unpublishLesson(id);
        setPublished(false);
      } else {
        await publishLesson(id);
        setPublished(true);
      }
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed to update publish state.");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!id) return;
    const ok = window.confirm("Delete this lesson? This cannot be undone.");
    if (!ok) return;
    setSaving(true);
    setErr(null);
    try {
      await deleteLesson(id);
      // If embedded, let parent close; if routed, navigate back to list
      if (props.onClose) props.onClose();
      else nav({ to: "/admin/content" });
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed to delete lesson.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div style={{ padding: 20 }}>
        <Loader size="sm" /> Loading…
      </div>
    );
  }

  if (err) {
    return (
      <div style={{ padding: 20 }}>
        <Alert color="red" mb="md">
          {err}
        </Alert>
        {/* If routed, show a back link */}
        {!props.id && (
          <Button variant="default" component={Link} to="/admin/content">
            Back
          </Button>
        )}
      </div>
    );
  }

  return (
    <div style={{ padding: 20 }}>
      {/* Hide breadcrumbs when embedded in a modal */}
      {!props.id && (
        <Breadcrumbs mb="md">
          <Anchor component={Link} to="/admin/content">
            Content
          </Anchor>
          <Anchor component={Link} to={`/admin/content/${id}`}>
            {title || "Lesson"}
          </Anchor>
        </Breadcrumbs>
      )}

      <Paper p="lg" radius="lg" withBorder>
        <Group justify="space-between" align="center" mb="md">
          <Badge size="lg" color={published ? "green" : "yellow"} variant="light">
            {published ? "Published" : "Draft"}
          </Badge>
          <Select
            data={CATS}
            value={category}
            onChange={(v) => setCategory(v || "other")}
            aria-label="Category"
          />
        </Group>

        <TextInput
          label="Title"
          value={title}
          onChange={(e) => setTitle(e.currentTarget.value)}
          mb="sm"
        />
        <Textarea
          label="Content"
          minRows={12}
          value={content}
          onChange={(e) => setContent(e.currentTarget.value)}
        />

        <Group justify="space-between" mt="md">
          <Button color={published ? "yellow" : "green"} onClick={togglePub} loading={saving}>
            {published ? "Unpublish" : "Publish"}
          </Button>
          <Group>
            {!props.id && (
              <Button variant="default" component={Link} to="/admin/content">
                Back
              </Button>
            )}
            <Button onClick={save} loading={saving}>
              Save
            </Button>
            <Button color="red" onClick={remove} loading={saving}>
              Delete
            </Button>
          </Group>
        </Group>
      </Paper>
    </div>
  );
}
