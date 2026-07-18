"use client";

import * as React from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Edge,
  type Node,
  type NodeMouseHandler,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Maximize2, Minimize2, Waypoints } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const centerStyle: React.CSSProperties = {
  background: "linear-gradient(135deg, oklch(0.58 0.24 286), oklch(0.55 0.22 320))",
  color: "white",
  border: "none",
  borderRadius: 16,
  padding: "12px 18px",
  fontSize: 14,
  fontWeight: 600,
  maxWidth: 220,
  textAlign: "center",
  boxShadow: "0 8px 30px -8px oklch(0.55 0.24 286 / 0.6)",
};

const conceptStyle: React.CSSProperties = {
  background: "var(--card)",
  color: "var(--foreground)",
  border: "1px solid var(--border)",
  borderRadius: 14,
  padding: "10px 14px",
  fontSize: 13,
  maxWidth: 180,
  textAlign: "center",
  cursor: "pointer",
  boxShadow: "0 1px 2px oklch(0 0 0 / 0.04)",
};

function buildGraph(topic: string, concepts: string[], expansive: boolean) {
  const list = concepts.slice(0, expansive ? 12 : 8);
  const radiusX = expansive ? 360 : 240;
  const radiusY = expansive ? 240 : 150;

  const centerNode: Node = {
    id: "center",
    position: { x: 0, y: 0 },
    data: { label: topic },
    style: {
      ...centerStyle,
      fontSize: expansive ? 16 : 14,
      padding: expansive ? "14px 22px" : centerStyle.padding,
    },
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
      style: {
        ...conceptStyle,
        fontSize: expansive ? 14 : 13,
        maxWidth: expansive ? 200 : 180,
      },
      draggable: expansive,
    };
  });

  const conceptEdges: Edge[] = list.map((_, i) => ({
    id: `e-${i}`,
    source: "center",
    target: `c-${i}`,
    animated: true,
    style: {
      stroke: "var(--primary)",
      strokeWidth: expansive ? 2 : 1.5,
      opacity: 0.55,
    },
  }));

  return {
    nodes: [centerNode, ...conceptNodes],
    edges: conceptEdges,
  };
}

function FitOnMount({ expanded }: { expanded: boolean }) {
  const { fitView } = useReactFlow();

  React.useEffect(() => {
    const id = window.setTimeout(() => {
      fitView({ padding: expanded ? 0.18 : 0.25, duration: 280 });
    }, 60);
    return () => window.clearTimeout(id);
  }, [expanded, fitView]);

  return null;
}

function ConceptFlow({
  topic,
  concepts,
  onSelect,
  expanded,
}: {
  topic: string;
  concepts: string[];
  onSelect: (concept: string) => void;
  expanded: boolean;
}) {
  const { nodes, edges } = React.useMemo(
    () => buildGraph(topic, concepts, expanded),
    [topic, concepts, expanded]
  );

  const onNodeClick: NodeMouseHandler = (_event, node) => {
    if (node.id === "center") return;
    const label = node.data?.label;
    if (typeof label === "string") onSelect(label);
  };

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodeClick={onNodeClick}
      fitView
      fitViewOptions={{ padding: expanded ? 0.18 : 0.25 }}
      nodesConnectable={false}
      elementsSelectable
      zoomOnScroll={expanded}
      zoomOnPinch
      panOnScroll={expanded}
      panOnDrag
      minZoom={0.35}
      maxZoom={2.2}
      preventScrolling={!expanded}
      proOptions={{ hideAttribution: true }}
      className={cn(
        "bg-background/40 [&_.react-flow__node]:transition-transform [&_.react-flow__node:hover]:scale-105"
      )}
    >
      <Background
        variant={BackgroundVariant.Dots}
        gap={expanded ? 22 : 20}
        size={1}
        className="opacity-50"
      />
      <Controls
        showInteractive={false}
        className="!overflow-hidden !rounded-xl !border !border-border/60 !bg-card/95 !shadow-md [&>button]:!border-border/60 [&>button]:!bg-card"
      />
      {expanded && (
        <MiniMap
          pannable
          zoomable
          className="!overflow-hidden !rounded-xl !border !border-border/60 !bg-card/90"
          maskColor="color-mix(in oklab, var(--background) 70%, transparent)"
          nodeColor={(n) =>
            n.id === "center" ? "oklch(0.58 0.24 286)" : "var(--muted-foreground)"
          }
        />
      )}
      <FitOnMount expanded={expanded} />
    </ReactFlow>
  );
}

function MapCanvas({
  topic,
  concepts,
  onSelect,
  expanded,
  className,
}: {
  topic: string;
  concepts: string[];
  onSelect: (concept: string) => void;
  expanded: boolean;
  className?: string;
}) {
  return (
    <div className={cn("h-full w-full", className)}>
      <ReactFlowProvider>
        <div className="h-full w-full">
          <ConceptFlow
            topic={topic}
            concepts={concepts}
            onSelect={onSelect}
            expanded={expanded}
          />
        </div>
      </ReactFlowProvider>
    </div>
  );
}

export function ConceptMap({
  topic,
  concepts,
  onSelect,
}: {
  topic: string;
  concepts: string[];
  onSelect: (concept: string) => void;
}) {
  const [expanded, setExpanded] = React.useState(false);
  const closeBtnRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setExpanded(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeBtnRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [expanded]);

  const handleSelect = React.useCallback(
    (concept: string) => {
      setExpanded(false);
      onSelect(concept);
    },
    [onSelect]
  );

  if (!concepts.length) return null;

  return (
    <>
      <Card className="h-full overflow-hidden">
        <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <Waypoints className="size-4 text-primary" />
            Explore related concepts
          </CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0 gap-1.5 rounded-full"
            onClick={() => setExpanded(true)}
            aria-label="Open concept map fullscreen"
          >
            <Maximize2 className="size-3.5" />
            <span className="hidden sm:inline">Fullscreen</span>
          </Button>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {!expanded ? (
            <MapCanvas
              topic={topic}
              concepts={concepts}
              onSelect={handleSelect}
              expanded={false}
              className="h-[300px] sm:h-[340px]"
            />
          ) : (
            <div className="grid h-[300px] place-items-center text-sm text-muted-foreground sm:h-[340px]">
              Viewing fullscreen…
            </div>
          )}
          <p className="px-6 py-3 text-xs text-muted-foreground">
            Drag to pan · use +/− to zoom · tap a concept to dive deeper.
          </p>
        </CardContent>
      </Card>

      {expanded && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Concept map for ${topic}`}
          className="fixed inset-0 z-[80] flex flex-col bg-background"
        >
          <div className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-3 sm:px-6">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <Waypoints className="size-4 shrink-0 text-primary" />
                <span className="truncate">Concept map — {topic}</span>
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Scroll to zoom · drag to pan · Escape to exit · tap a concept to explore it
              </p>
            </div>
            <Button
              ref={closeBtnRef}
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0 gap-1.5 rounded-full"
              onClick={() => setExpanded(false)}
              aria-label="Exit fullscreen"
            >
              <Minimize2 className="size-3.5" />
              Exit
            </Button>
          </div>
          <MapCanvas
            topic={topic}
            concepts={concepts}
            onSelect={handleSelect}
            expanded
            className="min-h-0 flex-1"
          />
        </div>
      )}
    </>
  );
}
