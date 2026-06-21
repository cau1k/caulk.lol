import { Button } from "@caulk.lol/ui/components/button";
import { Separator } from "@caulk.lol/ui/components/separator";
import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowUpRightIcon, LinkIcon, RadioTowerIcon, SettingsIcon } from "lucide-react";
import type { ReactNode } from "react";

import { useTRPC } from "@/utils/trpc";

export const Route = createFileRoute("/_auth/dashboard")({
  component: DashboardRoute,
});

function DashboardRoute() {
  const trpc = useTRPC();
  const linksQuery = useQuery({
    ...trpc.links.adminList.queryOptions(),
    refetchInterval: 5_000,
  });
  const links = linksQuery.data ?? [];
  const metrics = linkMetrics(links);
  const recentLinks = links.slice(0, 5);

  return (
    <main className="min-h-full bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <header className="space-y-1">
          <h1 className="text-2xl font-medium tracking-tight">Dashboard</h1>
          <p className="text-xs text-muted-foreground">Owner controls and link activity.</p>
        </header>

        <Separator />

        <section className="grid gap-4 text-xs sm:grid-cols-4">
          <Metric label="published" value={metrics.published.toString()} />
          <Metric label="draft" value={metrics.draft.toString()} />
          <Metric label="archived" value={metrics.archived.toString()} />
          <Metric label="top tag" value={metrics.topTag} />
        </section>

        <Separator />

        <section className="grid gap-4 md:grid-cols-3">
          <ActionPanel
            icon={<LinkIcon />}
            title="Links"
            description="Add, publish, draft, and archive good links."
            action={
              <Button render={<Link to="/links" />}>
                Open links
                <ArrowUpRightIcon />
              </Button>
            }
          />
          <ActionPanel
            icon={<RadioTowerIcon />}
            title="Device auth"
            description="Approve CLI device authorization codes."
            action={
              <Button variant="outline" render={<Link to="/device" />}>
                Open approvals
                <ArrowUpRightIcon />
              </Button>
            }
          />
          <ActionPanel
            icon={<SettingsIcon />}
            title="Settings"
            description="Use the sidebar settings item for passkeys, API keys, and device commands."
          />
        </section>

        <Separator />

        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-medium">Recent links</h2>
            <Button variant="ghost" size="sm" render={<Link to="/links" />}>
              View all
            </Button>
          </div>
          {linksQuery.isLoading ? (
            <p className="text-xs text-muted-foreground">Loading links.</p>
          ) : linksQuery.isError ? (
            <p className="text-xs text-muted-foreground">Links unavailable.</p>
          ) : recentLinks.length === 0 ? (
            <p className="text-xs text-muted-foreground">No links yet.</p>
          ) : (
            <div className="divide-y">
              {recentLinks.map((link) => (
                <article key={link.id} className="flex items-center justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noreferrer"
                      className="block truncate text-sm font-medium hover:text-emerald-400"
                    >
                      {link.title}
                    </a>
                    <p className="text-xs text-muted-foreground">{link.status}</p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatDate(link.createdAt)}
                  </span>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function ActionPanel({
  action,
  description,
  icon,
  title,
}: {
  action?: ReactNode;
  description: string;
  icon: ReactNode;
  title: string;
}) {
  return (
    <div className="space-y-4 border p-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 text-muted-foreground [&_svg]:size-4">{icon}</div>
        <div className="space-y-1">
          <h2 className="text-sm font-medium">{title}</h2>
          <p className="text-xs leading-5 text-muted-foreground">{description}</p>
        </div>
      </div>
      {action}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-lg font-medium">{value}</p>
    </div>
  );
}

function linkMetrics(links: Array<{ status: string; tags: string[] }>) {
  const tagCounts = new Map<string, number>();
  let archived = 0;
  let draft = 0;
  let published = 0;

  for (const link of links) {
    if (link.status === "archived") archived += 1;
    if (link.status === "draft") draft += 1;
    if (link.status === "published") published += 1;
    for (const tag of link.tags) tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
  }

  const topTag =
    Array.from(tagCounts.entries()).sort((left, right) => right[1] - left[1])[0]?.[0] ?? "none";

  return { archived, draft, published, topTag };
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(value));
}
