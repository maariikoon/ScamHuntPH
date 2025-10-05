// src/components/PanelCard.tsx
import { Card, CardProps } from '@mantine/core';

export default function PanelCard(props: CardProps) {
  return (
    <Card
      withBorder
      radius="xl"
      p="lg"
      className="panel-card"
      {...props}
    />
  );
}
