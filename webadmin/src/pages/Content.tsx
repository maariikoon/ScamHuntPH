// src/pages/admin/Content.tsx
import React from "react";
import { Button, Card, Text, Group, Select } from "@mantine/core";
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
  }

  const [items, setItems] = React.useState<LessonItem[]>([]);
  const [loading, setLoading] = React.useState(false);

  const categories = [
    "gcash_scam",
    "phishing",
    "delivery_fraud",
    "investment_scam",
    "loan_scam",
    "identity_theft",
    "other",
  ];

  const [selectedCategory, setSelectedCategory] = React.useState<string | null>(
    null
  );

  async function load() {
    setLoading(true);
    const data = await getLessons();
    const formattedData = data.map(
      (item: {
        id: string;
        title?: string;
        content?: string;
        category?: string;
      }) => ({
        id: item.id,
        title: item.title || "Untitled",
        content: item.content || "No content available",
        category: item.category || "other",
      })
    );
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

      {items
        .filter((item) => !selectedCategory || item.category === selectedCategory)
        .map((item) => (
          <Card key={item.id} shadow="sm" mb="sm">
            <Group justify="space-between">
              <Text fw={500}>{item.title}</Text>
              <Text size="sm" c="dimmed">
                {item.category}
              </Text>
            </Group>
            <Text mt="sm">{item.content}</Text>
            <Group mt="md">
              <Button
                variant="light"
                color="blue"
                onClick={() =>
                  updateLesson(item.id, { title: item.title + " (updated)" })
                }
              >
                Update
              </Button>
              <Button color="red" onClick={() => handleDelete(item.id)}>
                Delete
              </Button>
            </Group>
          </Card>
        ))}

      <Button
        mt="lg"
        onClick={() =>
          addLesson({
            title: "New Scam Example",
            content: "Description of scam...",
            category: "phishing",
          }).then(load)
        }
      >
        Add Example Lesson
      </Button>
    </div>
  );
}
