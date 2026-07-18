"use client";

import * as React from "react";
import {
  Background,
  BackgroundVariant,
  ReactFlow,
  type Edge,
  type Node,
  type NodeMouseHandler,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Waypoints } from "lucide-react";

const centerStyle: React.CSSProperties = {
  background: "linear-gradient(135deg, oklch(0.58 0.24 286), oklch(0.55 0.22 320))",
  color: "white",
  border: "none",
  borderRadius: 14,
  padding: "10px 14px",
  fontSize: 13,
  fontWeight: 600,
  maxWidth: 180,
  textAlign: "center",
  boxShadow: "0 8px 30px -8px oklch(0.55 0.24 286 / 0.6)",
};

const conceptStyle: React.CSSProperties = {
  background: "var(--card)",
  color: "var(--foreground)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  padding: "8px 12px",
  fontSize: 12,
  maxWidth: 160,
  textAlign: "center",
  cursor: "pointer",
};

export function ConceptMap({
  topic,
  concepts,
  onSelect,
}: {
  topic: string;
  concepts: string[];
  onSelect: (concept: string) => void;
}) {
  const { nodes, edges } = React.useMemo(() => {
    const list = concepts.slice(0, 8);
    const radiusX = 240;
    const radiusY = 150;
    const centerNode: Node = {
      id: "center",
      position: { x: 0, y: 0 },
      data: { label: topic },
      style: centerStyle,
      draggable: false,
      selectable: false,
    };

    const conceptNodes: Node[] = list.map((concept, i) => {
      const angle = (i / list.length) * Math.PI * 2 - Math.PI / 2;
      return {
        id: `c-${i}`,
        position: {
          x: Math.cos(angle) * radiusX,
          y: Math.sin(angle) * radiusY,
        },
        data: { label: concept },
        style: conceptStyle,
        draggable: false,
      };
    });

    const conceptEdges: Edge[] = list.map((_, i) => ({
      id: `e-${i}`,
      source: "center",
      target: `c-${i}`,
      animated: true,
      style: { stroke: "var(--primary)", strokeWidth: 1.5, opacity: 0.5 },
    }));

    return {
      nodes: [centerNode, ...conceptNodes],
      edges: conceptEdges,
    };
  }, [topic, concepts]);

  const onNodeClick: NodeMouseHandler = (_event, node) => {
    if (node.id === "center") return;
    const label = node.data?.label;
    if (typeof label === "string") onSelect(label);
  };

  if (!concepts.length) return null;

  return (
    <Card className="h-full overflow-hidden">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Waypoints className="size-4 text-primary" />
          Explore related concepts
        </CardTitle>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        <div className="h-[300px] w-full">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodeClick={onNodeClick}
            fitView
            fitViewOptions={{ padding: 0.25 }}
            nodesConnectable={false}
            zoomOnScroll={false}
            panOnScroll={false}
            preventScrolling={false}
            proOptions={{ hideAttribution: true }}
            className="[&_.react-flow__node]:transition-transform [&_.react-flow__node:hover]:scale-105"
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={20}
              size={1}
              className="opacity-50"
            />
          </ReactFlow>
        </div>
        <p className="px-6 py-3 text-xs text-muted-foreground">
          Tap any concept to dive deeper.
        </p>
      </CardContent>
    </Card>
  );
}
