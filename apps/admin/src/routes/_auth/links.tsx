import {
  type CreateLinkInput,
  type GoodLink,
  type LinkStatus,
  createLinkInputSchema,
} from "@caulk.lol/api/links";
import { Badge } from "@caulk.lol/ui/components/badge";
import { Button } from "@caulk.lol/ui/components/button";
import { Input } from "@caulk.lol/ui/components/input";
import { Label } from "@caulk.lol/ui/components/label";
import { NativeSelect, NativeSelectOption } from "@caulk.lol/ui/components/native-select";
import { Separator } from "@caulk.lol/ui/components/separator";
import { Textarea } from "@caulk.lol/ui/components/textarea";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowUpRightIcon } from "lucide-react";
import { type FormEvent, type ReactNode, useMemo, useState } from "react";
import { toast } from "sonner";

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

  const links = linksQuery.data ?? [];
  const filteredLinks = useMemo(
    () => links.filter((link) => filter === "all" || link.status === filter),
    [filter, links],
  );
  const metrics = useMemo(() => linkMetrics(links), [links]);

  return (
    <main className="min-h-full bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <header className="space-y-1">
          <h1 className="text-2xl font-medium tracking-tight">Links</h1>
          <p className="text-xs text-muted-foreground">
            Add, publish, and archive links shown on caulk.lol.
          </p>
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
          <CreateLinkForm
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
                    isPending={statusMutation.isPending}
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

function CreateLinkForm({
  isPending,
  onCreate,
}: {
  isPending: boolean;
  onCreate: (input: CreateLinkInput, onSuccess: () => void) => void;
}) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const parsed = createLinkInputSchema.safeParse({
      description: optionalFieldValue(formData, "description"),
      reason: fieldValue(formData, "reason"),
      source: "admin",
      status: fieldValue(formData, "status"),
      tags: splitTags(fieldValue(formData, "tags")),
      title: optionalFieldValue(formData, "title"),
      url: fieldValue(formData, "url"),
    });

    if (!parsed.success) {
      toast.error(parsed.error.issues.map((issue) => issue.message).join(" "));
      return;
    }

    onCreate(parsed.data, () => form.reset());
  }

  return (
    <form className="grid h-max gap-4" onSubmit={submit}>
      <div>
        <h2 className="text-sm font-medium">Add link</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Metadata is fetched when title or description is empty.
        </p>
      </div>
      <Separator />
      <Field label="URL">
        <Input name="url" placeholder="https://" type="url" required />
      </Field>
      <Field label="Title override">
        <Input name="title" placeholder="Fetched when empty" />
      </Field>
      <Field label="Reason">
        <Textarea name="reason" placeholder="Why this belongs on the list" required />
      </Field>
      <div className="grid gap-4 sm:grid-cols-[1fr_9rem] lg:grid-cols-1 xl:grid-cols-[1fr_9rem]">
        <Field label="Tags">
          <Input name="tags" placeholder="tools, writing" />
        </Field>
        <Field label="Status">
          <NativeSelect name="status" defaultValue="published" className="w-full">
            <NativeSelectOption value="published">published</NativeSelectOption>
            <NativeSelectOption value="draft">draft</NativeSelectOption>
          </NativeSelect>
        </Field>
      </div>
      <Button type="submit" disabled={isPending}>
        {isPending ? "Adding" : "Add link"}
      </Button>
    </form>
  );
}

function LinkRow({
  isPending,
  link,
  onStatusChange,
}: {
  isPending: boolean;
  link: GoodLink;
  onStatusChange: (status: LinkStatus) => void;
}) {
  const nextStatus = link.status === "published" ? "archived" : "published";

  return (
    <article className="grid gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={statusVariant(link.status)}>{link.status}</Badge>
          <span className="text-xs text-muted-foreground">{formatDate(link.createdAt)}</span>
        </div>
        <a
          href={link.url}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-flex max-w-full items-center gap-2 text-sm font-medium hover:text-emerald-400"
        >
          <span className="truncate">{link.title}</span>
          <ArrowUpRightIcon className="size-3.5 shrink-0" />
        </a>
        <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{link.reason}</p>
        {link.tags.length > 0 && (
          <p className="mt-2 text-xs text-muted-foreground">
            {link.tags.map((tag) => `#${tag}`).join(" ")}
          </p>
        )}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={isPending}
        onClick={() => onStatusChange(nextStatus)}
      >
        {nextStatus === "archived" ? "Archive" : "Publish"}
      </Button>
    </article>
  );
}

function Field({ children, label }: { children: ReactNode; label: string }) {
  return (
    <Label className="grid gap-2 text-xs font-normal text-muted-foreground">
      <span>{label}</span>
      {children}
    </Label>
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

function splitTags(value: string) {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);
}

function fieldValue(formData: FormData, name: string) {
  const value = formData.get(name);
  if (typeof value !== "string") throw new Error(`Missing ${name}.`);
  return value.trim();
}

function optionalFieldValue(formData: FormData, name: string) {
  const value = fieldValue(formData, name);
  return value.length > 0 ? value : undefined;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Request failed.";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(value),
  );
}
