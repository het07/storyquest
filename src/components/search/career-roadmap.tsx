"use client";

import * as React from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Edge,
  type Node,
  type NodeMouseHandler,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { motion, AnimatePresence } from "motion/react";
import {
  AlertCircle,
  Briefcase,
  CheckCircle2,
  Clock,
  Loader2,
  MapPinned,
  Maximize2,
  Minimize2,
  RotateCcw,
  Route,
  Target,
} from "lucide-react";

import type { CareerRoadmap, RoadmapLevel, RoadmapStage, SearchResult } from "@/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  useVoiceCommands,
  useVoiceMode,
} from "@/components/voice/voice-mode-provider";

const LEVEL_META: Record<
  RoadmapLevel,
  { label: string; className: string; ring: string }
> = {
  foundation: {
    label: "Foundation",
    className:
      "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    ring: "oklch(0.65 0.17 155)",
  },
  building: {
    label: "Building",
    className:
      "border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300",
    ring: "oklch(0.65 0.15 230)",
  },
  advanced: {
    label: "Advanced",
    className:
      "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    ring: "oklch(0.7 0.15 75)",
  },
  expert: {
    label: "Expert",
    className:
      "border-violet-500/40 bg-violet-500/10 text-violet-700 dark:text-violet-300",
    ring: "oklch(0.6 0.22 286)",
  },
};

type StageNodeData = {
  stage: RoadmapStage;
  index: number;
};

function StageNode({ data, selected }: NodeProps) {
  const { stage, index } = data as StageNodeData;
  const meta = LEVEL_META[stage.level];

  return (
    <div
      className={cn(
        "w-[200px] cursor-pointer rounded-2xl border bg-card p-3 shadow-sm transition-all",
        selected
          ? "border-primary ring-2 ring-primary/30"
          : "border-border/60 hover:border-primary/40 hover:shadow-md"
      )}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!pointer-events-none !bg-primary !size-2"
      />
      <div className="flex items-center justify-between gap-2">
        <span
          className="grid size-7 place-items-center rounded-full text-xs font-bold text-white"
          style={{ background: meta.ring }}
        >
          {index + 1}
        </span>
        <Badge variant="outline" className={cn("text-[10px]", meta.className)}>
          {meta.label}
        </Badge>
      </div>
      <p className="mt-2 line-clamp-2 text-sm font-semibold leading-snug">
        {stage.title}
      </p>
      <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
        <Clock className="size-3" />
        {stage.estimatedTime}
      </p>
      <Handle
        type="source"
        position={Position.Right}
        className="!pointer-events-none !bg-primary !size-2"
      />
    </div>
  );
}

const nodeTypes = { stage: StageNode };

function FitRoadmap({ deps }: { deps: string }) {
  const { fitView } = useReactFlow();
  React.useEffect(() => {
    const id = window.setTimeout(() => {
      fitView({ padding: 0.2, duration: 280 });
    }, 60);
    return () => window.clearTimeout(id);
  }, [deps, fitView]);
  return null;
}

function RoadmapFlow({
  stages,
  selectedId,
  onSelect,
  expanded,
}: {
  stages: RoadmapStage[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  expanded: boolean;
}) {
  const { nodes, edges } = React.useMemo(() => {
    const gapX = expanded ? 260 : 230;
    const ns: Node[] = stages.map((stage, i) => ({
      id: stage.id,
      type: "stage",
      position: { x: i * gapX, y: i % 2 === 0 ? 0 : 40 },
      data: {
        stage,
        index: i,
      } satisfies StageNodeData,
      draggable: false,
      selectable: true,
      selected: selectedId === stage.id,
    }));

    const es: Edge[] = stages.slice(0, -1).map((stage, i) => ({
      id: `e-${stage.id}-${stages[i + 1].id}`,
      source: stage.id,
      target: stages[i + 1].id,
      animated: true,
      style: { stroke: "var(--primary)", strokeWidth: 2, opacity: 0.55 },
    }));

    return { nodes: ns, edges: es };
  }, [stages, selectedId, expanded]);

  const onNodeClick = React.useCallback<NodeMouseHandler>(
    (_event, node) => {
      onSelect(node.id);
    },
    [onSelect]
  );

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onNodeClick={onNodeClick}
      fitView
      fitViewOptions={{ padding: 0.2 }}
      nodesDraggable={false}
      nodesConnectable={false}
      nodesSelectable
      elementsSelectable
      selectNodesOnDrag={false}
      nodeClickDistance={0}
      zoomOnScroll={expanded}
      zoomOnPinch
      panOnDrag
      panOnScroll={expanded}
      minZoom={0.35}
      maxZoom={1.8}
      preventScrolling={!expanded}
      proOptions={{ hideAttribution: true }}
      className="bg-background/40"
    >
      <Background
        variant={BackgroundVariant.Dots}
        gap={20}
        size={1}
        className="opacity-40"
      />
      <Controls
        showInteractive={false}
        className="!overflow-hidden !rounded-xl !border !border-border/60 !bg-card/95 !shadow-md [&>button]:!border-border/60 [&>button]:!bg-card"
      />
      {/* Only re-fit when the graph layout changes — not on every stage click. */}
      <FitRoadmap deps={`${expanded}-${stages.map((s) => s.id).join(",")}`} />
    </ReactFlow>
  );
}

function StageDetail({
  stage,
  onExplore,
}: {
  stage: RoadmapStage;
  onExplore: (topic: string) => void;
}) {
  const meta = LEVEL_META[stage.level];
  return (
    <motion.div
      key={stage.id}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      className="rounded-2xl border border-border/60 bg-card p-5"
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className={meta.className}>
          {meta.label}
        </Badge>
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="size-3.5" />
          {stage.estimatedTime}
        </span>
      </div>
      <h3 className="mt-2 text-lg font-semibold">{stage.title}</h3>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
        {stage.description}
      </p>

      {stage.skills.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <Target className="size-3.5" />
            Skills to build
          </p>
          <div className="flex flex-wrap gap-1.5">
            {stage.skills.map((skill) => (
              <span
                key={skill}
                className="rounded-full bg-accent px-2.5 py-1 text-xs font-medium"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {stage.milestones.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Milestones
          </p>
          <ul className="space-y-1.5">
            {stage.milestones.map((m) => (
              <li key={m} className="flex gap-2 text-sm">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                {m}
              </li>
            ))}
          </ul>
        </div>
      )}

      {stage.exploreTopics.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Explore next
          </p>
          <div className="flex flex-wrap gap-2">
            {stage.exploreTopics.map((topic) => (
              <button
                key={topic}
                type="button"
                onClick={() => onExplore(topic)}
                className="rounded-full border border-border/60 bg-background px-3 py-1.5 text-xs font-medium transition-colors hover:border-primary/50 hover:bg-accent"
              >
                {topic}
              </button>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

function buildContext(result: SearchResult) {
  return `${result.tldr} Key takeaways: ${result.keyTakeaways.join("; ")}`;
}

export function CareerRoadmapPanel({
  result,
  onExplore,
}: {
  result: SearchResult;
  onExplore: (topic: string) => void;
}) {
  const voice = useVoiceMode();
  const [roadmap, setRoadmap] = React.useState<CareerRoadmap | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [expanded, setExpanded] = React.useState(false);
  const cacheRef = React.useRef(new Map<string, CareerRoadmap>());
  const requestedRef = React.useRef<string | null>(null);

  const load = React.useCallback(async () => {
    const key = result.query;
    const cached = cacheRef.current.get(key);
    if (cached) {
      setRoadmap(cached);
      setSelectedId(cached.stages[0]?.id ?? null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/roadmap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: result.query,
          context: buildContext(result),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Couldn't build a roadmap.");
      }
      const data: CareerRoadmap = await res.json();
      cacheRef.current.set(key, data);
      setRoadmap(data);
      setSelectedId(data.stages[0]?.id ?? null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [result]);

  // Auto-load when search results appear.
  React.useEffect(() => {
    if (requestedRef.current === result.query) return;
    requestedRef.current = result.query;
    setRoadmap(null);
    setSelectedId(null);
    setError(null);
    void load();
  }, [result.query, load]);

  React.useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setExpanded(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [expanded]);

  useVoiceCommands("roadmap", [
    {
      pattern:
        /\b(career path|roadmap|show roadmap|learning path|career roadmap)\b/,
      description: "Focus the career roadmap",
      run: () => {
        if (!roadmap && !loading) void load();
        void voice.speak(
          roadmap
            ? `${roadmap.pathTitle}. ${roadmap.summary} There are ${roadmap.stages.length} stages. Say explore, then a skill topic, to dive in.`
            : "Building your career roadmap now."
        );
      },
    },
  ]);

  const selected = roadmap?.stages.find((s) => s.id === selectedId) ?? null;

  const flow = roadmap ? (
    <ReactFlowProvider>
      <div className="h-full w-full">
        <RoadmapFlow
          stages={roadmap.stages}
          selectedId={selectedId}
          onSelect={setSelectedId}
          expanded={expanded}
        />
      </div>
    </ReactFlowProvider>
  ) : null;

  return (
    <>
      <section className="overflow-hidden rounded-2xl border border-border/60 bg-card">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/50 px-5 py-4">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <Route className="size-4 text-primary" />
              Career &amp; learning roadmap
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              A visual path to go further in {result.query}
            </p>
          </div>
          {roadmap && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0 gap-1.5 rounded-full"
              onClick={() => setExpanded(true)}
            >
              <Maximize2 className="size-3.5" />
              <span className="hidden sm:inline">Fullscreen</span>
            </Button>
          )}
        </div>

        <div className="p-5">
          {loading && !roadmap && (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <Loader2 className="size-7 animate-spin text-primary" />
              <p className="text-sm font-medium">Mapping your path…</p>
              <p className="text-xs text-muted-foreground">
                Building stages, skills, and roles for this topic.
              </p>
            </div>
          )}

          {error && !roadmap && (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <AlertCircle className="size-7 text-destructive" />
              <p className="text-sm font-medium">{error}</p>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 rounded-full"
                onClick={() => {
                  requestedRef.current = null;
                  void load();
                }}
              >
                <RotateCcw className="size-3.5" />
                Try again
              </Button>
            </div>
          )}

          {roadmap && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-semibold tracking-tight">
                  {roadmap.pathTitle}
                </h2>
                {roadmap.summary && (
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {roadmap.summary}
                  </p>
                )}
              </div>

              <div className="h-[280px] overflow-hidden rounded-xl border border-border/50 sm:h-[320px]">
                {flow}
              </div>

              <p className="text-xs text-muted-foreground">
                Click a stage on the path to see skills, milestones, and what to explore next.
              </p>

              <AnimatePresence mode="wait">
                {selected && (
                  <StageDetail stage={selected} onExplore={onExplore} />
                )}
              </AnimatePresence>

              {roadmap.possibleRoles.length > 0 && (
                <div>
                  <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <Briefcase className="size-3.5" />
                    Possible roles &amp; outcomes
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {roadmap.possibleRoles.map((role) => (
                      <span
                        key={role}
                        className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary"
                      >
                        <MapPinned className="size-3" />
                        {role}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {expanded && roadmap && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={roadmap.pathTitle}
          className="fixed inset-0 z-[80] flex flex-col bg-background"
        >
          <div className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-3 sm:px-6">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{roadmap.pathTitle}</p>
              <p className="text-xs text-muted-foreground">
                Scroll to zoom · click a stage · Escape to exit
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0 gap-1.5 rounded-full"
              onClick={() => setExpanded(false)}
            >
              <Minimize2 className="size-3.5" />
              Exit
            </Button>
          </div>
          <div className="grid min-h-0 flex-1 gap-0 lg:grid-cols-[1fr_360px]">
            <div className="min-h-[50vh] border-b border-border/50 lg:min-h-0 lg:border-b-0 lg:border-r">
              <ReactFlowProvider>
                <div className="h-full w-full">
                  <RoadmapFlow
                    stages={roadmap.stages}
                    selectedId={selectedId}
                    onSelect={setSelectedId}
                    expanded
                  />
                </div>
              </ReactFlowProvider>
            </div>
            <div className="overflow-y-auto p-4 sm:p-5">
              <AnimatePresence mode="wait">
                {selected ? (
                  <StageDetail stage={selected} onExplore={(t) => {
                    setExpanded(false);
                    onExplore(t);
                  }} />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Select a stage on the path.
                  </p>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
