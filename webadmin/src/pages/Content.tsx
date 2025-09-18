import React from "react";
import {
  Button,
  Text,
  Group,
  Select,
  Modal,
  TextInput,
  Textarea,
  Pagination,
  Table,
  Badge,
  Stack,
  ActionIcon,
  rem,
} from "@mantine/core";
import {
  IconPlus,
  IconExternalLink,
  IconEye,
  IconTrash,
  IconCircleCheck,
  IconCircleDashed,
} from "@tabler/icons-react";
import {
  getLessons,
  addLesson,
  updateLesson,
  deleteLesson,
} from "@/services/contentService";
import { useNavigate, Link } from "@tanstack/react-router";

export default function ContentPage() {
  interface LessonItem {
    id: string;
    title: string;
    content: string; // can hold HTML (render in detail page)
    category: string;
    published?: boolean; // true = Published, false/undefined = Saved
    createdAt?: string | number | Date | null;
  }

  const nav = useNavigate();

  const [items, setItems] = React.useState<LessonItem[]>([]);
  const [loading, setLoading] = React.useState(false);

  // filters
  const [selectedCategory, setSelectedCategory] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState<"all" | "published" | "saved">("all");

  // pagination
  const [page, setPage] = React.useState(1);
  const PAGE_SIZE = 5;

  // modals
  const [modalOpen, setModalOpen] = React.useState(false);
  const [detailOpen, setDetailOpen] = React.useState(false);
  const [currentLesson, setCurrentLesson] = React.useState<LessonItem | null>(null);

  // add/edit form
  const [newTitle, setNewTitle] = React.useState("");
  const [newContent, setNewContent] = React.useState("");
  const [newCategory, setNewCategory] = React.useState("other");

  const categories = [
    "gcash_scam",
    "phishing",
    "delivery_fraud",
    "investment_scam",
    "loan_scam",
    "identity_theft",
    "other",
  ];

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await getLessons();
      const formatted: LessonItem[] = data.map(
        (item: {
          id: string;
          title?: string;
          content?: string;
          category?: string;
          published?: boolean;
          createdAt?: Date | string | null;
        }) => ({
          id: item.id,
          title: item.title || "Untitled",
          content: item.content || "",
          category: item.category || "other",
          published: item.published ?? false,
          createdAt:
            item.createdAt &&
            typeof item.createdAt === "object" &&
            "toDate" in item.createdAt
              ? (item.createdAt as { toDate: () => Date }).toDate()
              : item.createdAt ?? null,
        })
      );
      setItems(formatted);
      setPage(1);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  // derived rows (filters)
  const filtered = React.useMemo(() => {
    let rows = items.slice();
    if (selectedCategory) {
      rows = rows.filter((i) => i.category === selectedCategory);
    }
    if (status !== "all") {
      rows = rows.filter((i) => (status === "published" ? i.published : !i.published));
    }
    return rows;
  }, [items, selectedCategory, status]);

  // pagination slice
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  async function handleDelete(id: string) {
    await deleteLesson(id);
    await load();
  }

  async function handleAddLesson() {
    await addLesson({
      title: newTitle,
      content: newContent, // can be HTML, rendered safely in detail page
      category: newCategory,
      published: false, // new lessons start as "Saved"
    });
    setModalOpen(false);
    setNewTitle("");
    setNewContent("");
    setNewCategory("other");
    await load();
  }

  async function handleUpdateLesson() {
    if (!currentLesson) return;
    await updateLesson(currentLesson.id, {
      title: currentLesson.title,
      content: currentLesson.content,
      category: currentLesson.category,
    });
    setDetailOpen(false);
    await load();
  }

  async function handlePublishLesson() {
    if (!currentLesson) return;
    await updateLesson(currentLesson.id, { published: true });
    setDetailOpen(false);
    await load();
  }

  const openDetail = (id: string) => {
    nav({ to: "/admin/content/$lessonId", params: { lessonId: id } });
  };

  return (
    <Stack gap="lg" p="md">
      {/* Header row */}
      <Group justify="space-between" align="center">
        <Text fw={700} size="xl">Lessons</Text>
        <Button leftSection={<IconPlus size={18} />} onClick={() => setModalOpen(true)}>
          Add Lesson
        </Button>
      </Group>

      {/* Filters */}
      <Group wrap="wrap" gap="md">
        <Select
          label="Status"
          value={status}
          onChange={(v: string | null) => setStatus((v ?? "all") as typeof status)}
          data={[
            { value: "all", label: "All" },
            { value: "published", label: "Published" },
            { value: "saved", label: "Saved" },
          ]}
          w={200}
        />
        <Select
          label="Filter by category"
          placeholder="Select category"
          data={categories}
          value={selectedCategory}
          onChange={setSelectedCategory}
          w={260}
        />
      </Group>

      {/* Table list */}
      <Table striped highlightOnHover withTableBorder withColumnBorders>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Title</Table.Th>
            <Table.Th>Category</Table.Th>
            <Table.Th>Status</Table.Th>
            <Table.Th style={{ width: rem(220) }}>Actions</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {paged.map((item) => (
            <Table.Tr key={item.id}>
              <Table.Td>
                {/* Declarative link to detail */}
                <Link to="/admin/content/$lessonId" params={{ lessonId: item.id }}>
                  {item.title}
                </Link>
              </Table.Td>
              <Table.Td>{item.category}</Table.Td>
              <Table.Td>
                {item.published ? (
                  <Badge
                    color="green"
                    variant="light"
                    leftSection={<IconCircleCheck size={14} />}
                  >
                    Published
                  </Badge>
                ) : (
                  <Badge
                    color="gray"
                    variant="light"
                    leftSection={<IconCircleDashed size={14} />}
                  >
                    Saved
                  </Badge>
                )}
              </Table.Td>
              <Table.Td>
                <Group gap="xs">
                  {/* Icon button that wraps a Link */}
                  <ActionIcon variant="subtle" title="Open" component={Link}
                    to={`/admin/content/${item.id}`}>
                    <IconExternalLink size={18} />
                  </ActionIcon>

                  <ActionIcon
                    variant="subtle"
                    onClick={() => { setCurrentLesson(item); setDetailOpen(true); }}
                    title="View Details"
                  >
                    <IconEye size={18} />
                  </ActionIcon>

                  <ActionIcon
                    color="red"
                    variant="subtle"
                    onClick={() => handleDelete(item.id)}
                    title="Delete"
                  >
                    <IconTrash size={18} />
                  </ActionIcon>
                </Group>
              </Table.Td>
            </Table.Tr>
          ))}

          {paged.length === 0 && (
            <Table.Tr>
              <Table.Td colSpan={4} style={{ textAlign: "center" }}>
                {loading ? "Loading…" : "No lessons found"}
              </Table.Td>
            </Table.Tr>
          )}
        </Table.Tbody>
      </Table>

      {/* Pagination footer */}
      <Group justify="space-between" align="center">
        <Text size="sm" c="dimmed">
          Showing {filtered.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}–
          {Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
        </Text>
        <Pagination total={totalPages} value={page} onChange={setPage} />
      </Group>

      {/* Add Lesson Modal */}
      <Modal opened={modalOpen} onClose={() => setModalOpen(false)} title="Add New Lesson">
        <Stack>
          <TextInput label="Title" value={newTitle} onChange={(e) => setNewTitle(e.currentTarget.value)} />
          <Textarea
            label="Content (supports HTML)"
            description="You can paste HTML here; it will be rendered safely in the lesson detail page."
            value={newContent}
            onChange={(e) => setNewContent(e.currentTarget.value)}
            minRows={6}
          />
          <Select
            label="Category"
            data={categories}
            value={newCategory}
            onChange={(val) => setNewCategory(val || "other")}
          />
          <Group justify="flex-end">
            <Button onClick={handleAddLesson}>Save</Button>
          </Group>
        </Stack>
      </Modal>

      {/* Detail/Edit Modal */}
      <Modal opened={detailOpen} onClose={() => setDetailOpen(false)} title="Lesson Details">
        {currentLesson && (
          <Stack>
            <TextInput
              label="Title"
              value={currentLesson.title}
              onChange={(e) =>
                setCurrentLesson({ ...currentLesson, title: e.currentTarget.value })
              }
            />
            <Textarea
              label="Content (supports HTML)"
              value={currentLesson.content}
              onChange={(e) =>
                setCurrentLesson({ ...currentLesson, content: e.currentTarget.value })
              }
              minRows={8}
            />
            <Select
              label="Category"
              data={categories}
              value={currentLesson.category}
              onChange={(val) =>
                setCurrentLesson({ ...currentLesson, category: val || "other" })
              }
            />
            <Group justify="space-between" mt="md">
              <Group>
                <Button onClick={handleUpdateLesson}>Save Changes</Button>
                {!currentLesson.published && (
                  <Button color="green" onClick={handlePublishLesson}>
                    Publish
                  </Button>
                )}
              </Group>
              {/* Keep programmatic nav for modal's Open */}
              <Button
                variant="light"
                leftSection={<IconExternalLink size={16} />}
                onClick={() => openDetail(currentLesson.id)}
              >
                Open
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </Stack>
  );
}
