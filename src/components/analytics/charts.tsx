import { Graph as VisxGraph } from "@visx/network";
import { ParentSize } from "@visx/responsive";
import {
  AreaSeries,
  Axis,
  buildChartTheme,
  Grid,
  LineSeries,
  Tooltip,
  XYChart,
} from "@visx/xychart";
import { Zoom } from "@visx/zoom";
import { Minus, Plus, RotateCcw } from "lucide-react";
import { type ReactNode, useMemo, useState } from "react";
import type {
  NetworkEdge,
  NetworkNode,
  SiteMetricPoint,
} from "@/lib/analytics-engine";
import { cn } from "@/lib/cn";

const chartTheme = buildChartTheme({
  backgroundColor: "transparent",
  colors: [
    "var(--color-chart-1)",
    "var(--color-chart-3)",
    "var(--color-chart-5)",
  ],
  gridColor: "var(--color-border)",
  gridColorDark: "var(--color-border)",
  tickLength: 0,
  svgLabelSmall: {
    fill: "var(--color-muted-foreground)",
    fontFamily: "var(--font-sans)",
    fontSize: 11,
  },
  htmlLabel: {
    background: "var(--color-popover)",
    border: "1px solid var(--color-border)",
    color: "var(--color-popover-foreground)",
    fontFamily: "var(--font-sans)",
    lineHeight: 1.4,
  },
});

type LatencyDatum = SiteMetricPoint & {
  date: Date;
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

export function EmptyChartState({ message }: { message: string }) {
  return (
    <div className="flex min-h-72 items-center justify-center border border-dashed border-border px-4 text-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}

export function LatencyChart({ points }: { points: SiteMetricPoint[] }) {
  const data = useMemo<LatencyDatum[]>(
    () =>
      points.map((point) => ({
        ...point,
        date: new Date(point.timestamp),
      })),
    [points],
  );
  const maxLatency = Math.max(...points.map((point) => point.p95Ms), 1);

  return (
    <div className="overflow-x-auto">
      <div className="h-[340px] min-w-[720px]">
        <ParentSize>
          {({ width }) => {
            if (width <= 0) return null;

            return (
              <XYChart
                height={340}
                margin={{ top: 16, right: 18, bottom: 34, left: 46 }}
                theme={chartTheme}
                width={width}
                xScale={{ type: "time" }}
                yScale={{ nice: true, type: "linear", zero: true }}
              >
                <Grid columns={false} numTicks={4} />
                <Axis
                  numTicks={4}
                  orientation="bottom"
                  tickFormat={(value) => formatTime(String(value))}
                />
                <Axis
                  numTicks={4}
                  orientation="left"
                  tickFormat={(value) => formatMs(Number(value))}
                />
                <AreaSeries
                  data={data}
                  dataKey="p95 area"
                  fill="var(--color-chart-1)"
                  fillOpacity={0.14}
                  xAccessor={(datum) => datum.date}
                  yAccessor={(datum) => datum.p95Ms}
                />
                <LineSeries
                  data={data}
                  dataKey="p95"
                  stroke="var(--color-chart-1)"
                  strokeWidth={2.5}
                  xAccessor={(datum) => datum.date}
                  yAccessor={(datum) => datum.p95Ms}
                />
                <LineSeries
                  data={data}
                  dataKey="p50"
                  stroke="var(--color-chart-3)"
                  strokeWidth={2}
                  xAccessor={(datum) => datum.date}
                  yAccessor={(datum) => datum.p50Ms}
                />
                <Tooltip<LatencyDatum>
                  className="border border-border bg-popover/95 p-3 text-popover-foreground shadow-sm backdrop-blur"
                  detectBounds
                  glyphStyle={{
                    fill: "var(--color-background)",
                    r: 4,
                    stroke: "var(--color-chart-1)",
                    strokeWidth: 2,
                  }}
                  renderTooltip={({ tooltipData }) => {
                    const datum = tooltipData?.nearestDatum?.datum;
                    if (!datum) return null;

                    return (
                      <div className="min-w-40">
                        <div className="mb-2 font-mono text-[11px] text-muted-foreground">
                          {formatDateTime(datum.timestamp)}
                        </div>
                        <TooltipRow label="p95" value={formatMs(datum.p95Ms)} />
                        <TooltipRow label="p50" value={formatMs(datum.p50Ms)} />
                        <TooltipRow
                          label="average"
                          value={formatMs(datum.avgMs)}
                        />
                        <TooltipRow
                          label="requests"
                          value={formatCount(datum.requests)}
                        />
                      </div>
                    );
                  }}
                  showDatumGlyph
                  showVerticalCrosshair
                  snapTooltipToDatumX
                  verticalCrosshairStyle={{
                    stroke: "var(--color-muted-foreground)",
                    strokeDasharray: "4 4",
                    strokeOpacity: 0.35,
                  }}
                />
              </XYChart>
            );
          }}
        </ParentSize>
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
  const width = 860;
  const height = 360;
  const graph = useMemo(
    () => makeNetworkGraph(nodes, edges, width, height),
    [nodes, edges],
  );
  const activeNode = activeRoute
    ? graph.nodes.find((node) => node.route === activeRoute)
    : null;

  return (
    <div className="relative overflow-x-auto">
      <Zoom<SVGSVGElement>
        height={height}
        initialTransformMatrix={{
          scaleX: 1,
          scaleY: 1,
          skewX: 0,
          skewY: 0,
          translateX: 0,
          translateY: 0,
        }}
        scaleXMax={2.8}
        scaleXMin={0.65}
        scaleYMax={2.8}
        scaleYMin={0.65}
        wheelDelta={(event) => {
          const scale = 1 - Math.max(-0.15, Math.min(0.15, event.deltaY / 600));
          return { scaleX: scale, scaleY: scale };
        }}
        width={width}
      >
        {(zoom) => (
          <>
            <div className="absolute right-3 top-3 z-10 flex items-center gap-1 border border-border bg-background/85 p-1 backdrop-blur">
              <GraphToolButton
                label="Zoom in"
                onClick={() =>
                  zoom.scale({
                    scaleX: 1.18,
                    scaleY: 1.18,
                    point: { x: width / 2, y: height / 2 },
                  })
                }
              >
                <Plus className="size-3.5" aria-hidden />
              </GraphToolButton>
              <GraphToolButton
                label="Zoom out"
                onClick={() =>
                  zoom.scale({
                    scaleX: 0.84,
                    scaleY: 0.84,
                    point: { x: width / 2, y: height / 2 },
                  })
                }
              >
                <Minus className="size-3.5" aria-hidden />
              </GraphToolButton>
              <GraphToolButton label="Reset" onClick={zoom.reset}>
                <RotateCcw className="size-3.5" aria-hidden />
              </GraphToolButton>
            </div>
            <svg
              aria-label="Route network graph"
              className={cn(
                "min-h-[360px] w-full min-w-[760px] touch-none outline-none",
                zoom.isDragging ? "cursor-grabbing" : "cursor-grab",
              )}
              onMouseDown={zoom.dragStart}
              onMouseLeave={() => {
                zoom.dragEnd();
                setActiveRoute(null);
              }}
              onMouseMove={zoom.dragMove}
              onMouseUp={zoom.dragEnd}
              onTouchEnd={zoom.dragEnd}
              onTouchMove={zoom.dragMove}
              onTouchStart={zoom.dragStart}
              onWheel={zoom.handleWheel}
              ref={zoom.containerRef}
              role="img"
              viewBox={`0 0 ${width} ${height}`}
            >
              <title>Route network graph</title>
              <rect
                className="fill-background/20"
                height={height}
                width={width}
              />
              <g transform={zoom.toString()}>
                <VisxGraph<RouteLink, RouteNode>
                  graph={graph}
                  linkComponent={({ link }) => {
                    const isActive =
                      activeRoute === null ||
                      activeRoute === link.source.route ||
                      activeRoute === link.target.route;
                    return (
                      <path
                        className={cn(
                          "stroke-muted-foreground/45 transition-opacity",
                          isActive ? "opacity-100" : "opacity-55",
                          activeRoute && isActive && "stroke-chart-1",
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
                  }}
                  nodeComponent={({ node }) => {
                    const isActive =
                      activeRoute === null || activeRoute === node.route;
                    const isSelected = activeRoute === node.route;
                    const labelWidth = Math.max(96, node.route.length * 7.2);
                    const labelX = node.r + 12;
                    return (
                      // biome-ignore lint/a11y/useSemanticElements: SVG graph nodes cannot render HTML buttons.
                      <g
                        className="cursor-pointer outline-none"
                        onFocus={() => setActiveRoute(node.route)}
                        onMouseEnter={() => setActiveRoute(node.route)}
                        role="button"
                        tabIndex={0}
                      >
                        <circle
                          className={cn(
                            "fill-chart-1/35 stroke-chart-1 transition-opacity",
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
                          {formatCount(node.requests)} · p95{" "}
                          {formatMs(node.p95Ms)}
                        </text>
                      </g>
                    );
                  }}
                />
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
                    <TooltipRow
                      label="p95"
                      value={formatMs(activeNode.p95Ms)}
                    />
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
          </>
        )}
      </Zoom>
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
