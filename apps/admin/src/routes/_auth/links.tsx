import { type CreateLinkInput, type GoodLink, type LinkStatus } from "@caulk.lol/api/links";
import { type LinkPreviewResponse, linkPreviewResponseSchema } from "@caulk.lol/api/link-preview";
import { env } from "@caulk.lol/env/web";
import { Badge } from "@caulk.lol/ui/components/badge";
import { Button } from "@caulk.lol/ui/components/button";
import { LinkCard } from "@caulk.lol/ui/components/link-preview";
import { Separator } from "@caulk.lol/ui/components/separator";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { PlusIcon, RefreshCwIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { LinkForm } from "@/components/link-form";
import { useTRPC, useTRPCClient } from "@/utils/trpc";

export const Route = createFileRoute("/_auth/links")({
  component: LinksRoute,
});

type LinkFilter = "all" | LinkStatus;
type LinkMutationInput = {
  id: string;
  status: LinkStatus;
};

const filterOptions = ["all", "published", "draft", "archived"] satisfies LinkFilter[];

function LinksRoute() {
  const trpc = useTRPC();
  const trpcClient = useTRPCClient();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<LinkFilter>("all");

  const linksQuery = useQuery({
    ...trpc.links.adminList.queryOptions(),
    refetchInterval: 5_000,
  });

  const createMutation = useMutation({
    mutationFn: async (input: CreateLinkInput) => await trpcClient.links.create.mutate(input),
    onError: (error) => toast.error(errorMessage(error)),
    onSuccess: async () => {
      toast.success("Link added.");
      await queryClient.invalidateQueries(trpc.links.adminList.queryFilter());
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: LinkMutationInput) =>
      await trpcClient.links.update.mutate({ id, input: { status } }),
    onError: (error) => toast.error(errorMessage(error)),
    onSuccess: async () => {
      await queryClient.invalidateQueries(trpc.links.adminList.queryFilter());
    },
  });

  const previewRefreshMutation = useMutation({
    mutationFn: async (url: string) => await trpcClient.links.preview.refresh.mutate({ url }),
    onError: (error) => toast.error(errorMessage(error)),
    onSuccess: async (_preview, url) => {
      toast.success("Preview refreshed.");
      await queryClient.invalidateQueries({ queryKey: linkPreviewQueryKey(url) });
    },
  });

  const previewRefreshAllMutation = useMutation({
    mutationFn: async () =>
      await trpcClient.links.preview.refreshAll.mutate({ includeArchived: true }),
    onError: (error) => toast.error(errorMessage(error)),
    onSuccess: async (result) => {
      toast.success(`Refreshed ${result.refreshed}/${result.count} previews.`);
      await queryClient.invalidateQueries({ queryKey: ["link-preview"] });
    },
  });

  const links = linksQuery.data ?? [];
  const filteredLinks = useMemo(
    () => links.filter((link) => filter === "all" || link.status === filter),
    [filter, links],
  );
  const metrics = useMemo(() => linkMetrics(links), [links]);

  return (
    <main className="min-h-full bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-medium tracking-tight">Links</h1>
            <p className="text-xs text-muted-foreground">
              Add, publish, and archive links shown on caulk.lol.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              disabled={previewRefreshAllMutation.isPending}
              onClick={() => previewRefreshAllMutation.mutate()}
            >
              <RefreshCwIcon />
              Refresh previews
            </Button>
            <Button className="w-full sm:w-auto" render={<Link to="/links/add" />}>
              <PlusIcon />
              Add link
            </Button>
          </div>
        </header>

        <Separator />

        <section className="grid gap-4 text-xs sm:grid-cols-4">
          <Metric label="published" value={metrics.published.toString()} />
          <Metric label="draft" value={metrics.draft.toString()} />
          <Metric label="archived" value={metrics.archived.toString()} />
          <Metric label="top tag" value={metrics.topTag} />
        </section>

        <Separator />

        <section className="grid gap-8 lg:grid-cols-[22rem_minmax(0,1fr)]">
          <LinkForm
            isPending={createMutation.isPending}
            onCreate={(input, onSuccess) => createMutation.mutate(input, { onSuccess })}
          />

          <div className="min-w-0">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-sm font-medium">Inventory</h2>
              <div className="flex flex-wrap gap-1">
                {filterOptions.map((option) => (
                  <Button
                    key={option}
                    type="button"
                    variant={filter === option ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setFilter(option)}
                  >
                    {option}
                  </Button>
                ))}
              </div>
            </div>

            <Separator className="my-4" />

            {linksQuery.isLoading ? (
              <EmptyPanel title="Loading links" description="Fetching links from the API." />
            ) : linksQuery.isError ? (
              <EmptyPanel title="Links unavailable" description={errorMessage(linksQuery.error)} />
            ) : filteredLinks.length === 0 ? (
              <EmptyPanel title="No links" description="Change the filter or add a link." />
            ) : (
              <div className="divide-y divide-border">
                {filteredLinks.map((link) => (
                  <LinkRow
                    key={link.id}
                    link={link}
                    isPreviewPending={previewRefreshMutation.isPending}
                    isStatusPending={statusMutation.isPending}
                    onPreviewRefresh={() => previewRefreshMutation.mutate(link.url)}
                    onStatusChange={(status) => statusMutation.mutate({ id: link.id, status })}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
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

function LinkRow({
  isPreviewPending,
  isStatusPending,
  link,
  onPreviewRefresh,
  onStatusChange,
}: {
  isPreviewPending: boolean;
  isStatusPending: boolean;
  link: GoodLink;
  onPreviewRefresh: () => void;
  onStatusChange: (status: LinkStatus) => void;
}) {
  const nextStatus = link.status === "published" ? "archived" : "published";

  return (
    <div className="grid gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_auto]">
      <div className="flex flex-col gap-3 sm:col-span-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={statusVariant(link.status)}>{link.status}</Badge>
          <span className="text-xs text-muted-foreground">{link.source}</span>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isStatusPending}
          onClick={() => onStatusChange(nextStatus)}
        >
          {nextStatus === "archived" ? "Archive" : "Publish"}
        </Button>
      </div>
      <div className="sm:col-span-2">
        <LinkCardPanel link={link} isRefreshing={isPreviewPending} onRefresh={onPreviewRefresh} />
      </div>
    </div>
  );
}

function LinkCardPanel({
  isRefreshing,
  link,
  onRefresh,
}: {
  isRefreshing: boolean;
  link: GoodLink;
  onRefresh: () => void;
}) {
  const previewQuery = useQuery({
    queryKey: linkPreviewQueryKey(link.url),
    queryFn: async () => await fetchLinkPreview(link.url),
    staleTime: 60 * 60 * 1000,
  });
  const preview = previewQuery.data;
  const previewStatus = preview
    ? `${preview.meta.provider} preview · ${preview.meta.cacheSource}`
    : previewQuery.isError
      ? "Preview unavailable"
      : "Loading preview";

  return (
    <div className="mt-2 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">{previewStatus}</p>
        <Button type="button" variant="ghost" size="xs" disabled={isRefreshing} onClick={onRefresh}>
          <RefreshCwIcon />
          Refresh
        </Button>
      </div>
      <LinkCard
        className="border p-3 sm:p-4"
        link={{
          url: link.url,
          title: link.title,
          reason: link.reason,
          tags: link.tags,
          dateLabel: formatDate(link.createdAt),
          dateTitle: formatDate(link.createdAt),
        }}
        preview={preview}
        previewError={previewQuery.isError ? errorMessage(previewQuery.error) : undefined}
        tweetApiUrl={(tweetId) => `${env.VITE_SERVER_URL}/api/link/preview/tweet/${tweetId}`}
      />
    </div>
  );
}

function EmptyPanel({ description, title }: { description: string; title: string }) {
  return (
    <div className="py-12 text-center">
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

function statusVariant(status: LinkStatus) {
  if (status === "archived") return "outline";
  if (status === "draft") return "secondary";
  return "default";
}

function linkMetrics(links: GoodLink[]) {
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

function linkPreviewQueryKey(url: string) {
  return ["link-preview", url] as const;
}

async function fetchLinkPreview(url: string): Promise<LinkPreviewResponse> {
  const previewUrl = new URL("/api/link/preview", env.VITE_SERVER_URL);
  previewUrl.searchParams.set("url", url);
  const response = await fetch(previewUrl, { credentials: "include" });
  if (!response.ok) throw new Error(`Link preview API returned ${response.status}.`);

  const payload: unknown = await response.json();
  return linkPreviewResponseSchema.parse(payload);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Request failed.";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(value),
  );
}
