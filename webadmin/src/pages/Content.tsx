// src/pages/admin/Content.tsx
import React from "react";
import {
  Button,
  Card,
  Text,
  Group,
  Select,
  Modal,
  TextInput,
  Textarea,
  Pagination,
} from "@mantine/core";
import {
  getLessons,
  addLesson,
  updateLesson,
  deleteLesson,
} from "@/services/contentService";

export default function ContentPage() {
  interface LessonItem {
    id: string;
    title: string;
    content: string;
    category: string;
    published?: boolean;
  }

  const [items, setItems] = React.useState<LessonItem[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [selectedCategory, setSelectedCategory] = React.useState<string | null>(null);

  // pagination
  const [page, setPage] = React.useState(1);
  const pageSize = 10;
  const paginatedItems = items
    .filter((item) => !selectedCategory || item.category === selectedCategory)
    .slice((page - 1) * pageSize, page * pageSize);

  // modal states
  const [modalOpen, setModalOpen] = React.useState(false);
  const [detailOpen, setDetailOpen] = React.useState(false);
  const [currentLesson, setCurrentLesson] = React.useState<LessonItem | null>(null);

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

  async function load() {
    setLoading(true);
    const data = await getLessons();
    const formattedData = data.map((item: { id: string; title?: string; content?: string; category?: string; published?: boolean }) => ({
      id: item.id,
      title: item.title || "Untitled",
      content: item.content || "No content available",
      category: item.category || "other",
      published: item.published ?? false,
    }));
    setItems(formattedData);
    setLoading(false);
  }

  React.useEffect(() => {
    load();
  }, []);

  async function handleDelete(id: string) {
    await deleteLesson(id);
    load();
  }

  async function handleAddLesson() {
    await addLesson({
      title: newTitle,
      content: newContent,
      category: newCategory,
      published: false,
    });
    setModalOpen(false);
    setNewTitle("");
    setNewContent("");
    setNewCategory("other");
    load();
  }

  async function handleUpdateLesson() {
    if (currentLesson) {
      await updateLesson(currentLesson.id, {
        title: currentLesson.title,
        content: currentLesson.content,
        category: currentLesson.category,
      });
      load();
      setDetailOpen(false);
    }
  }

  async function handlePublishLesson() {
    if (currentLesson) {
      await updateLesson(currentLesson.id, { published: true });
      load();
      setDetailOpen(false);
    }
  }

  return (
    <div style={{ padding: 20 }}>
      <Select
        label="Filter by category"
        placeholder="Select category"
        data={categories}
        value={selectedCategory}
        onChange={setSelectedCategory}
        mb="lg"
      />

      {loading && <p>Loading...</p>}

      {paginatedItems.map((item) => (
        <Card key={item.id} shadow="sm" mb="sm">
          <Group justify="space-between">
            <Text fw={500}>{item.title}</Text>
            <Text size="sm" c="dimmed">
              {item.category} {item.published ? "(Published)" : ""}
            </Text>
          </Group>
          <Text mt="sm" lineClamp={2}>
            {item.content}
          </Text>
          <Group mt="md">
            <Button variant="light" onClick={() => { setCurrentLesson(item); setDetailOpen(true); }}>
              View Details
            </Button>
            <Button color="red" onClick={() => handleDelete(item.id)}>
              Delete
            </Button>
          </Group>
        </Card>
      ))}

      <Pagination
        value={page}
        onChange={setPage}
        total={Math.ceil(items.length / pageSize)}
        mt="lg"
      />

      <Button mt="lg" onClick={() => setModalOpen(true)}>
        ➕ Add Lesson
      </Button>

      {/* Add Lesson Modal */}
      <Modal opened={modalOpen} onClose={() => setModalOpen(false)} title="Add New Lesson">
        <TextInput label="Title" value={newTitle} onChange={(e) => setNewTitle(e.currentTarget.value)} />
        <Textarea label="Content" value={newContent} onChange={(e) => setNewContent(e.currentTarget.value)} />
        <Select
          label="Category"
          data={categories}
          value={newCategory}
          onChange={(val) => setNewCategory(val || "other")}
        />
        <Button mt="md" onClick={handleAddLesson}>Save</Button>
      </Modal>

      {/* Detail/Edit Modal */}
      <Modal opened={detailOpen} onClose={() => setDetailOpen(false)} title="Lesson Details">
        {currentLesson && (
          <>
            <TextInput
              label="Title"
              value={currentLesson.title}
              onChange={(e) =>
                setCurrentLesson({ ...currentLesson, title: e.currentTarget.value })
              }
            />
            <Textarea
              label="Content"
              value={currentLesson.content}
              onChange={(e) =>
                setCurrentLesson({ ...currentLesson, content: e.currentTarget.value })
              }
            />
            <Select
              label="Category"
              data={categories}
              value={currentLesson.category}
              onChange={(val) =>
                setCurrentLesson({ ...currentLesson, category: val || "other" })
              }
            />
            <Group mt="md">
              <Button onClick={handleUpdateLesson}>Save Changes</Button>
              <Button color="green" onClick={handlePublishLesson}>
                Publish
              </Button>
            </Group>
          </>
        )}
      </Modal>
    </div>
  );
}
