// src/pages/LessonDetail.tsx
import * as React from "react";
import {
  Title,
  Text,
  Group,
  Button,
  Badge,
  Paper,
  Stack,
  Divider,
  TextInput,
  Select,
  Textarea,
  Loader,
} from "@mantine/core";
import {
  IconArrowLeft,
  IconCircleCheck,
  IconCircleDashed,
  IconPencil,
  IconDeviceFloppy,
  IconX,
  IconRocket,
  IconEyeOff,
} from "@tabler/icons-react";
import { useParams, Link } from "@tanstack/react-router";
import DOMPurify from "dompurify";
import {
  getLesson,
  updateLesson,
  publishLesson,
  unpublishLesson,
} from "@/services/contentService";

type ViewLesson = {
  id: string;
  title: string;
  content: string; // HTML allowed
  category?: string;
  published: boolean;
  createdAt?: Date | null;
  updatedAt?: Date | null;
};

const CATEGORIES = [
  "gcash_scam",
  "phishing",
  "delivery_fraud",
  "investment_scam",
  "loan_scam",
  "identity_theft",
  "other",
];

const CATEGORY_OPTIONS = CATEGORIES.map((c) => ({
  value: c,
  label: c.replace(/_/g, " "),
}));

export default function LessonDetail() {
  const { lessonId } = useParams({ from: "/admin/content/$lessonId" });

  const [item, setItem] = React.useState<ViewLesson | null>(null);
  const [loading, setLoading] = React.useState(false);

  // edit mode state
  const [editing, setEditing] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [publishing, setPublishing] = React.useState(false);

  // form fields (used only in editing mode)
  const [title, setTitle] = React.useState("");
  const [category, setCategory] = React.useState<string | null>("other");
  const [content, setContent] = React.useState("");

  const hydrateForm = (data: ViewLesson) => {
    setTitle(data.title ?? "");
    setCategory(data.category ?? "other");
    setContent(data.content ?? "");
  };

  const load = React.useCallback(async () => {
    if (!lessonId) return;
    setLoading(true);
    try {
      const data = await getLesson(lessonId);
      if (data) {
        const hydrated: ViewLesson = {
          id: data.id,
          title: data.title ?? "(Untitled)",
          content: data.content ?? "",
          category: data.category ?? "other",
          published: !!data.published,
          createdAt: data.createdAt ?? null,
          updatedAt: data.updatedAt ?? null,
        };
        setItem(hydrated);
        if (editing) hydrateForm(hydrated);
      } else {
        setItem(null);
      }
    } finally {
      setLoading(false);
    }
  }, [lessonId, editing]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const startEdit = () => {
    if (!item) return;
    hydrateForm(item);
    setEditing(true);
  };

  const cancelEdit = () => setEditing(false);

  const saveChanges = async () => {
    if (!item) return;
    setSaving(true);
    try {
      await updateLesson(item.id, {
        title: title.trim() || "Untitled",
        content,
        category: category || "other",
      });
      setEditing(false);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const doPublishToggle = async () => {
    if (!item) return;
    setPublishing(true);
    try {
      if (item.published) {
        await unpublishLesson(item.id);
      } else {
        await publishLesson(item.id);
      }
      await load();
    } finally {
      setPublishing(false);
    }
  };

  // Memoized sanitized HTML for view mode
  const safeHtml = React.useMemo(
    () => DOMPurify.sanitize(item?.content ?? ""),
    [item?.content]
  );

  return (
    <Stack>
      {/* Top bar */}
      <Group justify="space-between" align="center">
        <Button
          variant="light"
          leftSection={<IconArrowLeft size={16} />}
          component={Link}
          to="/admin/content"
        >
          Back to Content
        </Button>

        {/* Right-side big actions */}
        <Group gap="sm">
          {!editing ? (
            <Button
              size="md"
              leftSection={<IconPencil size={18} />}
              onClick={startEdit}
              variant="default"
            >
              Edit
            </Button>
          ) : (
            <>
              <Button
                size="md"
                leftSection={
                  saving ? <Loader size="xs" /> : <IconDeviceFloppy size={18} />
                }
                onClick={saveChanges}
                disabled={saving}
                color="blue"
              >
                {saving ? "Saving…" : "Save"}
              </Button>
              <Button
                size="md"
                variant="default"
                leftSection={<IconX size={18} />}
                onClick={cancelEdit}
                disabled={saving}
              >
                Cancel
              </Button>
            </>
          )}

          <Button
            size="md"
            color={item?.published ? "gray" : "green"}
            leftSection={
              publishing ? (
                <Loader size="xs" />
              ) : item?.published ? (
                <IconEyeOff size={18} />
              ) : (
                <IconRocket size={18} />
              )
            }
            onClick={doPublishToggle}
            disabled={publishing || editing} // optional: disable publish while editing
          >
            {publishing
              ? item?.published
                ? "Unpublishing…"
                : "Publishing…"
              : item?.published
              ? "Unpublish"
              : "Publish"}
          </Button>
        </Group>
      </Group>

      {loading && <Text>Loading…</Text>}
      {!loading && !item && <Text>Lesson not found.</Text>}

      {item && (
        <Paper p="xl" radius="lg" withBorder>
          {/* Header */}
          <Group justify="space-between" align="start">
            <div>
              {!editing ? (
                <Title order={2} style={{ fontSize: 34 }}>
                  {item.title}
                </Title>
              ) : (
                <TextInput
                  label="Title"
                  value={title}
                  onChange={(e) => setTitle(e.currentTarget.value)}
                  size="md"
                  styles={{ label: { fontWeight: 600 } }}
                />
              )}
              <Text c="dimmed" mt="xs">
                {!editing ? (
                  <>
                    {item.category ?? "other"} •{" "}
                    {item.createdAt ? item.createdAt.toLocaleString() : "—"}
                    {item.updatedAt
                      ? ` • Updated ${item.updatedAt.toLocaleString()}`
                      : ""}
                  </>
                ) : (
                  <Group gap="sm" wrap="wrap" mt="xs">
                    <Select
                      label="Category"
                      data={CATEGORY_OPTIONS}
                      value={category}
                      onChange={setCategory}
                      w={260}
                      size="sm"
                    />
                  </Group>
                )}
              </Text>
            </div>

            {item.published ? (
              <Badge
                size="lg"
                leftSection={<IconCircleCheck size={16} />}
                color="green"
                variant="light"
              >
                PUBLISHED
              </Badge>
            ) : (
              <Badge
                size="lg"
                leftSection={<IconCircleDashed size={16} />}
                color="gray"
                variant="light"
              >
                SAVED
              </Badge>
            )}
          </Group>

          <Divider my="lg" />

          {/* Body */}
          {!editing ? (
            <div
              style={{ lineHeight: 1.7, fontSize: 16 }}
              dangerouslySetInnerHTML={{ __html: safeHtml }}
            />
          ) : (
            <Textarea
              label="Content (HTML supported)"
              description="Paste HTML here (images allowed). The preview sanitizes HTML for safety."
              value={content}
              onChange={(e) => setContent(e.currentTarget.value)}
              minRows={14}
              autosize
            />
          )}
        </Paper>
      )}
    </Stack>
  );
}
