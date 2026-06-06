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
import { useMemo, useState } from "react";
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
  const height = 390;
  const graph = useMemo(
    () => makeNetworkGraph(nodes, edges, width, height),
    [nodes, edges],
  );
  const activeNode = activeRoute
    ? graph.nodes.find((node) => node.route === activeRoute)
    : null;

  return (
    <div className="overflow-x-auto">
      <svg
        aria-label="Route network graph"
        className="min-h-80 w-full min-w-[700px] touch-pan-x"
        onMouseLeave={() => setActiveRoute(null)}
        role="img"
        viewBox={`0 0 ${width} ${height}`}
      >
        <title>Route network graph</title>
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
                  "stroke-border transition-opacity",
                  isActive ? "opacity-100" : "opacity-20",
                  activeRoute && isActive && "stroke-chart-1",
                )}
                d={makeCurve(link.source, link.target, {
                  x: width / 2,
                  y: height / 2,
                })}
                fill="none"
                strokeLinecap="round"
                strokeWidth={Math.max(1.5, Math.min(link.requests + 1, 9))}
              />
            );
          }}
          nodeComponent={({ node }) => {
            const isActive = activeRoute === null || activeRoute === node.route;
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
                    "fill-background stroke-chart-1 transition-opacity",
                    isActive ? "opacity-100" : "opacity-35",
                  )}
                  cx={node.x}
                  cy={node.y}
                  r={node.r}
                  strokeWidth={activeRoute === node.route ? 3 : 2}
                />
                <text
                  className={cn(
                    "fill-foreground text-[12px] transition-opacity",
                    isActive ? "opacity-100" : "opacity-35",
                  )}
                  textAnchor="middle"
                  x={node.x}
                  y={node.y + node.r + 18}
                >
                  {node.route}
                </text>
                <text
                  className={cn(
                    "fill-muted-foreground text-[11px] transition-opacity",
                    isActive ? "opacity-100" : "opacity-35",
                  )}
                  textAnchor="middle"
                  x={node.x}
                  y={node.y + node.r + 34}
                >
                  {formatCount(node.requests)} · p95 {formatMs(node.p95Ms)}
                </text>
              </g>
            );
          }}
        />

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
  const center = { x: width / 2, y: height / 2 };
  const maxRequests = Math.max(...nodes.map((node) => node.requests), 1);
  const radius = Math.min(150, 84 + nodes.length * 9);
  const graphNodes = nodes.map<RouteNode>((node, index) => {
    const angle =
      (Math.PI * 2 * index) / Math.max(nodes.length, 1) - Math.PI / 2;

    return {
      ...node,
      r: 10 + (node.requests / maxRequests) * 18,
      x: center.x + Math.cos(angle) * radius,
      y: center.y + Math.sin(angle) * radius,
    };
  });
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

function makeCurve(
  source: { x: number; y: number },
  target: { x: number; y: number },
  center: { x: number; y: number },
) {
  const midX = (source.x + target.x) / 2;
  const midY = (source.y + target.y) / 2;
  const controlX = midX + (midX - center.x) * 0.16;
  const controlY = midY + (midY - center.y) * 0.16;
  return `M ${source.x.toFixed(2)} ${source.y.toFixed(2)} Q ${controlX.toFixed(2)} ${controlY.toFixed(2)} ${target.x.toFixed(2)} ${target.y.toFixed(2)}`;
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
