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
        "my-6 py-2 text-sm",
        className,
      )}
      {...props}
    >
      <div
        className="font-mono text-xs tracking-wide mb-1"
        style={{ color: config.color }}
      >
        [{config.label}]
        {title && (
          <span className="font-mono font-medium text-foreground text-sm ml-2">
            {title}
          </span>
        )}
      </div>
      <div className="font-mono text-muted-foreground prose-no-margin [&>p]:my-0">
        {children}
      </div>
    </aside>
  );
}
