import type { ComponentProps, ReactNode } from "react";
import { cn } from "../lib/cn";
import { AlertCircle } from "./icon/alert-circle";
import { CloudError } from "./icon/cloud-error";
import { Heart } from "./icon/heart";
import { WarningTriangle } from "./icon/warning-triangle";

export type CalloutType = "info" | "warn" | "warning" | "error" | "note";

const typeConfig = {
  info: { label: "INFO", color: "var(--color-primary)", Icon: AlertCircle },
  note: { label: "NOTE", color: "oklch(0.75 0.08 350)", Icon: Heart },
  warn: { label: "WARN", color: "var(--color-chart-2)", Icon: WarningTriangle },
  warning: { label: "WARN", color: "var(--color-chart-2)", Icon: WarningTriangle },
  error: { label: "ERROR", color: "var(--color-destructive)", Icon: CloudError },
} as const;

export type CalloutProps = Omit<ComponentProps<"aside">, "title"> & {
  type?: CalloutType;
  title?: ReactNode;
};

export function Callout({
  type = "note",
  title,
  children,
  className,
  ...props
}: CalloutProps) {
  const config = typeConfig[type] ?? typeConfig.note;

  const iconBoxSize = 64;

  return (
    <aside
      className={cn(
        "my-6 text-sm grid",
        className,
      )}
      style={{
        gridTemplateColumns: `1fr ${iconBoxSize}px`,
        gridTemplateRows: `${iconBoxSize}px auto`,
      }}
      {...props}
    >
      {/* Top left - title area */}
      <div 
        className="border-t border-l border-b flex items-center"
        style={{ borderColor: config.color }}
      >
        <div className="px-4 font-mono font-medium text-foreground text-lg">
          {title}
        </div>
      </div>
      {/* Icon box - top right */}
      <div
        className="border flex items-center justify-center"
        style={{ borderColor: config.color }}
      >
        <config.Icon
          style={{ 
            color: config.color, 
            width: 32, 
            height: 32,
          }}
        />
      </div>
      {/* Bottom - main content spans full width */}
      <div
        className="border-l border-r border-b col-span-2"
        style={{ borderColor: config.color }}
      >
        <div
          className="p-4 font-mono text-muted-foreground prose-no-margin [&>p]:my-0 [&_a]:underline relative"
          style={{ "--callout-link-color": config.color } as React.CSSProperties}
        >
          <style>{`aside:has([style*="--callout-link-color"]) a { text-decoration-color: var(--callout-link-color); }`}</style>
          {children}
        </div>
      </div>
    </aside>
  );
}
