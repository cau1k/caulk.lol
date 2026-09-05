import { Minus, Plus, RotateCcw } from "lucide-react";
import {
  type PointerEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Area, Line } from "@/components/dither-kit/area";
import { AreaChart } from "@/components/dither-kit/area-chart";
import { Grid } from "@/components/dither-kit/grid";
import { XAxis } from "@/components/dither-kit/x-axis";
import { YAxis } from "@/components/dither-kit/y-axis";
import type {
  NetworkEdge,
  NetworkNode,
  SiteMetricPoint,
} from "@/lib/analytics-engine";
import { cn } from "@/lib/cn";

type LatencyDatum = SiteMetricPoint & {
  label: string;
};

type RouteNode = NetworkNode & {
  x: number;
  y: number;
  r: number;
};

type RouteLink = {
  source: RouteNode;
  target: RouteNode;
  requests: number;
};

const latencyConfig = {
  p95Ms: { label: "p95", color: "primary" },
  p50Ms: { label: "p50", color: "primaryMuted" },
} as const;

export function EmptyChartState({ message }: { message: string }) {
  return (
    <div className="flex min-h-72 items-center justify-center border border-dashed border-border px-4 text-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}

export function LatencyChart({ points }: { points: SiteMetricPoint[] }) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const data = useMemo<LatencyDatum[]>(
    () =>
      points.map((point) => ({
        ...point,
        label: formatTime(point.timestamp),
      })),
    [points],
  );
  const maxLatency = Math.max(...points.map((point) => point.p95Ms), 1);
  const activeDatum = hoverIndex === null ? null : data[hoverIndex];

  return (
    <div className="overflow-x-auto">
      <div className="relative h-[340px] min-w-[720px]">
        <AreaChart
          animate={false}
          bloom="off"
          config={latencyConfig}
          data={data}
          margins={{ top: 16, right: 18, bottom: 34, left: 46 }}
          onHoverChange={setHoverIndex}
        >
          <Grid />
          <XAxis dataKey="label" maxTicks={4} />
          <YAxis tickFormatter={formatMs} />
          <Area dataKey="p95Ms" variant="gradient" />
          <Line dataKey="p50Ms" strokeVariant="dashed" />
        </AreaChart>
        {activeDatum && (
          <div className="pointer-events-none absolute right-3 top-3 z-10 min-w-40 border border-border bg-popover/95 p-3 text-popover-foreground shadow-sm backdrop-blur">
            <div className="mb-2 font-mono text-[11px] text-muted-foreground">
              {formatDateTime(activeDatum.timestamp)}
            </div>
            <TooltipRow label="p95" value={formatMs(activeDatum.p95Ms)} />
            <TooltipRow label="p50" value={formatMs(activeDatum.p50Ms)} />
            <TooltipRow label="average" value={formatMs(activeDatum.avgMs)} />
            <TooltipRow
              label="requests"
              value={formatCount(activeDatum.requests)}
            />
          </div>
        )}
      </div>
      <div className="mt-3 flex justify-between text-xs text-muted-foreground">
        <span>0ms</span>
        <span>peak {formatMs(maxLatency)}</span>
      </div>
    </div>
  );
}

export function NetworkGraph({
  nodes,
  edges,
}: {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
}) {
  const [activeRoute, setActiveRoute] = useState<string | null>(null);
  const [view, setView] = useState({ scale: 1, x: 0, y: 0 });
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const width = 860;
  const height = 360;
  const graph = useMemo(
    () => makeNetworkGraph(nodes, edges, width, height),
    [nodes, edges],
  );
  const activeNode = activeRoute
    ? graph.nodes.find((node) => node.route === activeRoute)
    : null;

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const onWheel = (event: globalThis.WheelEvent) => {
      event.preventDefault();
      zoomBy(
        1 - Math.max(-0.15, Math.min(0.15, event.deltaY / 600)),
        svgPointFromClient(svg, event.clientX, event.clientY),
      );
    };

    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  });

  function startDrag(event: PointerEvent<SVGSVGElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    setDrag({ x: event.clientX, y: event.clientY });
  }

  function moveDrag(event: PointerEvent<SVGSVGElement>) {
    if (!drag) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const dx = ((event.clientX - drag.x) / rect.width) * width;
    const dy = ((event.clientY - drag.y) / rect.height) * height;
    setDrag({ x: event.clientX, y: event.clientY });
    setView((current) => ({
      ...current,
      x: current.x + dx,
      y: current.y + dy,
    }));
  }

  function endDrag(event: PointerEvent<SVGSVGElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setDrag(null);
  }

  function zoomBy(nextScale: number, anchor = { x: width / 2, y: height / 2 }) {
    setView((current) => {
      const scale = Math.max(0.65, Math.min(2.8, current.scale * nextScale));
      const ratio = scale / current.scale;
      return {
        scale,
        x: anchor.x - (anchor.x - current.x) * ratio,
        y: anchor.y - (anchor.y - current.y) * ratio,
      };
    });
  }

  function svgPointFromClient(
    svg: SVGSVGElement,
    clientX: number,
    clientY: number,
  ) {
    const rect = svg.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * width,
      y: ((clientY - rect.top) / rect.height) * height,
    };
  }

  return (
    <div className="relative overflow-x-auto">
      <div className="absolute right-3 top-3 z-10 flex items-center gap-1 border border-border bg-background/85 p-1 backdrop-blur">
        <GraphToolButton label="Zoom in" onClick={() => zoomBy(1.18)}>
          <Plus className="size-3.5" aria-hidden />
        </GraphToolButton>
        <GraphToolButton label="Zoom out" onClick={() => zoomBy(0.84)}>
          <Minus className="size-3.5" aria-hidden />
        </GraphToolButton>
        <GraphToolButton
          label="Reset"
          onClick={() => setView({ scale: 1, x: 0, y: 0 })}
        >
          <RotateCcw className="size-3.5" aria-hidden />
        </GraphToolButton>
      </div>
      <svg
        aria-label="Route network graph"
        className={cn(
          "min-h-[360px] w-full min-w-[760px] touch-none outline-none",
          drag ? "cursor-grabbing" : "cursor-grab",
        )}
        onMouseLeave={() => setActiveRoute(null)}
        onPointerCancel={endDrag}
        onPointerDown={startDrag}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        ref={svgRef}
        role="img"
        viewBox={`0 0 ${width} ${height}`}
      >
        <title>Route network graph</title>
        <rect className="fill-background/20" height={height} width={width} />
        <g transform={`translate(${view.x} ${view.y}) scale(${view.scale})`}>
          {graph.links.map((link) => {
            const isActive =
              activeRoute === null ||
              activeRoute === link.source.route ||
              activeRoute === link.target.route;
            return (
              <path
                key={`${link.source.route}-${link.target.route}`}
                className={cn(
                  "stroke-muted-foreground/45 transition-opacity",
                  isActive ? "opacity-100" : "opacity-55",
                  activeRoute && isActive && "stroke-primary",
                )}
                d={makeFlowPath(link.source, link.target)}
                fill="none"
                strokeLinecap="round"
                strokeWidth={Math.max(
                  1.25,
                  Math.min(link.requests / 22 + 1, 5),
                )}
              />
            );
          })}
          {graph.nodes.map((node) => {
            const isActive = activeRoute === null || activeRoute === node.route;
            const isSelected = activeRoute === node.route;
            const labelWidth = Math.max(96, node.route.length * 7.2);
            const labelX = node.r + 12;
            return (
              <g key={node.route} transform={`translate(${node.x} ${node.y})`}>
                {/* biome-ignore lint/a11y/useSemanticElements: SVG graph nodes cannot render HTML buttons. */}
                <g
                  className="cursor-pointer outline-none"
                  onBlur={() => setActiveRoute(null)}
                  onFocus={() => setActiveRoute(node.route)}
                  onMouseEnter={() => setActiveRoute(node.route)}
                  role="button"
                  tabIndex={0}
                >
                  <circle
                    className={cn(
                      "fill-primary/35 stroke-primary transition-opacity",
                      isActive ? "opacity-100" : "opacity-70",
                    )}
                    cx="0"
                    cy="0"
                    r={node.r + 5}
                    strokeWidth={isSelected ? 3 : 1.5}
                  />
                  <rect
                    className={cn(
                      "fill-background/90 transition-opacity",
                      isActive ? "opacity-100" : "opacity-75",
                    )}
                    height="38"
                    rx="5"
                    width={labelWidth}
                    x={labelX - 8}
                    y="-22"
                  />
                  <text
                    className={cn(
                      "fill-foreground text-[12px] transition-opacity",
                      isActive ? "opacity-100" : "opacity-80",
                    )}
                    x={labelX}
                    y="-5"
                  >
                    {node.route}
                  </text>
                  <text
                    className={cn(
                      "fill-muted-foreground text-[11px] transition-opacity",
                      isActive ? "opacity-100" : "opacity-75",
                    )}
                    x={labelX}
                    y="13"
                  >
                    {formatCount(node.requests)} · p95 {formatMs(node.p95Ms)}
                  </text>
                </g>
              </g>
            );
          })}
        </g>
        {activeNode && (
          <foreignObject height={102} width={220} x={24} y={24}>
            <div className="h-full border border-border bg-popover/95 p-3 text-popover-foreground shadow-sm backdrop-blur">
              <div className="mb-2 truncate font-mono text-xs">
                {activeNode.route}
              </div>
              <TooltipRow
                label="requests"
                value={formatCount(activeNode.requests)}
              />
              <TooltipRow label="p95" value={formatMs(activeNode.p95Ms)} />
              <TooltipRow
                label="linked"
                value={formatCount(
                  edges.filter(
                    (edge) =>
                      edge.source === activeNode.route ||
                      edge.target === activeNode.route,
                  ).length,
                )}
              />
            </div>
          </foreignObject>
        )}
      </svg>
    </div>
  );
}

function GraphToolButton({
  children,
  label,
  onClick,
}: {
  children: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={label}
      className="grid size-7 place-items-center text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
      onClick={onClick}
      title={label}
      type="button"
    >
      {children}
    </button>
  );
}

function TooltipRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono tabular-nums">{value}</span>
    </div>
  );
}

function makeNetworkGraph(
  nodes: NetworkNode[],
  edges: NetworkEdge[],
  width: number,
  height: number,
) {
  const maxRequests = Math.max(...nodes.map((node) => node.requests), 1);
  const lanes = groupNodesByLane(nodes);
  const xByLane = [130, width * 0.43, width * 0.72, width - 118];
  const graphNodes = lanes.flatMap((lane, laneIndex) =>
    lane.map<RouteNode>((node, index) => {
      const laneHeight = height - 128;
      const step = laneHeight / Math.max(lane.length, 1);
      const y = 64 + step * index + step / 2;

      return {
        ...node,
        r: 5 + (node.requests / maxRequests) * 8,
        x: xByLane[laneIndex] ?? width - 118,
        y,
      };
    }),
  );
  const nodeByRoute = new Map(
    graphNodes.map((node) => [node.route, node] as const),
  );

  return {
    nodes: graphNodes,
    links: edges.flatMap<RouteLink>((edge) => {
      const source = nodeByRoute.get(edge.source);
      const target = nodeByRoute.get(edge.target);
      if (!source || !target) return [];
      return [{ ...edge, source, target }];
    }),
  };
}

function groupNodesByLane(nodes: NetworkNode[]) {
  const lanes = [[], [], [], []] as NetworkNode[][];

  for (const node of nodes) {
    lanes[getRouteLane(node.route)].push(node);
  }

  for (const lane of lanes) {
    lane.sort((a, b) => b.requests - a.requests);
  }

  return lanes.filter((lane) => lane.length > 0);
}

function getRouteLane(route: string) {
  if (route === "/") return 0;
  if (route.includes(":")) return 2;
  const depth = route.split("/").filter(Boolean).length;
  if (depth <= 1) return 1;
  return 3;
}

function makeFlowPath(source: RouteNode, target: RouteNode) {
  const startX = source.x + source.r + 8;
  const endX = target.x - target.r - 8;
  const controlOffset = Math.max(48, Math.abs(endX - startX) * 0.44);

  return [
    `M ${startX.toFixed(2)} ${source.y.toFixed(2)}`,
    `C ${(startX + controlOffset).toFixed(2)} ${source.y.toFixed(2)}`,
    `${(endX - controlOffset).toFixed(2)} ${target.y.toFixed(2)}`,
    `${endX.toFixed(2)} ${target.y.toFixed(2)}`,
  ].join(" ");
}

function formatCount(value: number) {
  return Math.round(value).toLocaleString();
}

function formatMs(value: number) {
  if (value >= 1000) return `${(value / 1000).toFixed(1)}s`;
  return `${Math.round(value)}ms`;
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString([], {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
  });
}
