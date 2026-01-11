import type { ComponentProps, ReactNode } from "react";
import { cn } from "../lib/cn";

export type CalloutType = "info" | "warn" | "warning" | "error" | "note";

const typeConfig = {
  info: { label: "INFO", color: "var(--color-primary)" },
  note: { label: "NOTE", color: "var(--color-muted-foreground)" },
  warn: { label: "WARN", color: "var(--color-chart-2)" },
  warning: { label: "WARN", color: "var(--color-chart-2)" },
  error: { label: "ERROR", color: "var(--color-destructive)" },
} as const;

export type CalloutProps = Omit<ComponentProps<"aside">, "title"> & {
  type?: CalloutType;
  title?: ReactNode;
};

function PixelGrid({ color }: { color: string }) {
  // 8x4 grid of pixels with decreasing opacity from bottom-right to center
  const rows = 4;
  const cols = 8;
  const pixels: React.ReactNode[] = [];

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      // Opacity increases as we go right and down (toward corner)
      const colProgress = col / (cols - 1);
      const rowProgress = row / (rows - 1);
      const baseOpacity = (colProgress + rowProgress) / 2;
      const opacity = Math.max(0, baseOpacity * (0.6 + Math.random() * 0.4) * 0.15);
      pixels.push(
        <div
          key={`${row}-${col}`}
          className="w-4 h-4"
          style={{
            backgroundColor: color,
            opacity,
          }}
        />
      );
    }
  }

  return (
    <div
      className="absolute bottom-0 right-0 grid pointer-events-none"
      style={{
        gridTemplateColumns: `repeat(${cols}, 1rem)`,
        gridTemplateRows: `repeat(${rows}, 1rem)`,
      }}
    >
      {pixels}
    </div>
  );
}

export function Callout({
  type = "note",
  title,
  children,
  className,
  ...props
}: CalloutProps) {
  const config = typeConfig[type] ?? typeConfig.note;

  return (
    <aside
      className={cn(
        "my-6 p-4 text-sm border relative overflow-hidden",
        className,
      )}
      style={{ borderColor: config.color }}
      {...props}
    >
      <PixelGrid color={config.color} />
      <div
        className="font-mono text-xs tracking-wide mb-1 relative"
        style={{ color: config.color }}
      >
        [{config.label}]
        {title && (
          <span className="font-mono font-medium text-foreground text-sm ml-2">
            {title}
          </span>
        )}
      </div>
      <div className="font-mono text-muted-foreground prose-no-margin [&>p]:my-0 relative">
        {children}
      </div>
    </aside>
  );
}
