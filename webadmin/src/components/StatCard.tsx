import { Card, Group, Text } from '@mantine/core';
import { ReactNode } from 'react';

type StatCardProps = {
  title: string;
  value: string | number;
  subtitle?: string;
  rightSection?: ReactNode;
  valueColor?: string;
};

export default function StatCard({ title, value, subtitle, rightSection, valueColor }: StatCardProps) {
  return (
    <Card withBorder radius="lg" className="card-shadow">
      <Group justify="space-between" align="flex-start" mb="xs">
        <Text fw={600}>{title}</Text>
        {rightSection}
      </Group>
      <Text fz={36} fw={700} style={{ color: valueColor || 'inherit', lineHeight: 1.1 }}>{value}</Text>
      {subtitle && <Text size="sm" c="dimmed">{subtitle}</Text>}
    </Card>
  );
}
