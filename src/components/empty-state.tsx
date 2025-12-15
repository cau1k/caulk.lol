import { Link } from "@tanstack/react-router";
import { NotebookPen } from "lucide-react";

type EmptyStateProps = {
  title?: string;
  description?: string;
  action?: {
    label: string;
    to: string;
  };
};

export function EmptyState({
  title = "Nothing here yet",
  description = "Check back soon for new content.",
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-muted/30 px-6 py-12 text-center">
      <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-muted">
        <NotebookPen className="size-6 text-muted-foreground" />
      </div>
      <h2 className="text-lg font-medium text-foreground">{title}</h2>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        {description}
      </p>
      {action && (
        <Link
          to={action.to}
          className="mt-4 text-sm font-medium text-primary hover:underline"
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}
