import { Badge } from "@caulk.lol/ui/components/badge";
import { Button } from "@caulk.lol/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@caulk.lol/ui/components/dialog";
import { Input } from "@caulk.lol/ui/components/input";
import { Label } from "@caulk.lol/ui/components/label";
import { Separator } from "@caulk.lol/ui/components/separator";
import { Textarea } from "@caulk.lol/ui/components/textarea";
import {
  type CreateLinkInput,
  type GoodLink,
  type LinkStatus,
  createLinkInputSchema,
} from "@caulk.lol/api/links";
import { env } from "@caulk.lol/env/web";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  ArchiveIcon,
  ArrowUpRightIcon,
  CheckCircle2Icon,
  ClipboardIcon,
  CommandIcon,
  GaugeIcon,
  KeyRoundIcon,
  LinkIcon,
  PlusIcon,
  RadioTowerIcon,
  SettingsIcon,
  SparklesIcon,
} from "lucide-react";
import { type FormEvent, type ReactNode, useMemo, useState } from "react";
import { toast } from "sonner";

import {
  AdminApiError,
  createAdminApiKey,
  createAdminLink,
  listAdminLinks,
  updateAdminLink,
} from "@/lib/links-api";

export const Route = createFileRoute("/_auth/dashboard")({
  component: DashboardRoute,
});

type LinkFilter = "all" | "published" | "draft" | "archived";

type LinkMutationInput = {
  id: string;
  status: LinkStatus;
};

const linksQueryKey = ["admin-links"];
const filterOptions: LinkFilter[] = ["all", "published", "draft", "archived"];

function DashboardRoute() {
  const { session } = Route.useRouteContext();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<LinkFilter>("all");

  const linksQuery = useQuery({
    queryFn: listAdminLinks,
    queryKey: linksQueryKey,
  });

  const createMutation = useMutation({
    mutationFn: createAdminLink,
    onError: (error) => toast.error(errorMessage(error)),
    onSuccess: async () => {
      toast.success("Link added.");
      await queryClient.invalidateQueries({ queryKey: linksQueryKey });
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: LinkMutationInput) => updateAdminLink(id, { status }),
    onError: (error) => toast.error(errorMessage(error)),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: linksQueryKey });
    },
  });

  const links = linksQuery.data ?? [];
  const filteredLinks = useMemo(
    () => links.filter((link) => filter === "all" || link.status === filter),
    [filter, links],
  );
  const metrics = useMemo(() => linkMetrics(links), [links]);
  const ownerEmail = session.data?.user.email ?? "admin";

  return (
    <main className="min-h-0 overflow-hidden bg-[radial-gradient(circle_at_top_left,oklch(0.24_0.03_158)_0,transparent_34rem),linear-gradient(180deg,oklch(0.11_0_0),oklch(0.145_0_0))]">
      <div className="grid h-full min-h-0 grid-cols-1 xl:grid-cols-[18rem_minmax(0,1fr)]">
        <aside className="hidden border-r border-white/10 bg-black/20 px-5 py-6 xl:block">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-flex size-7 items-center justify-center border border-emerald-400/30 bg-emerald-400/10 text-emerald-300">
              <CommandIcon className="size-4" />
            </span>
            caulk operator
          </div>
          <nav className="mt-10 grid gap-1 text-xs">
            <a className="border-l border-emerald-300 bg-white/[0.03] px-3 py-2 text-foreground" href="#links">
              Links command
            </a>
            <a className="border-l border-transparent px-3 py-2 text-muted-foreground transition-colors hover:text-foreground" href="#intake">
              Intake
            </a>
            <a className="border-l border-transparent px-3 py-2 text-muted-foreground transition-colors hover:text-foreground" href="/device">
              Device auth
            </a>
          </nav>
          <div className="mt-10 space-y-3 text-xs text-muted-foreground">
            <p className="tracking-[0.2em] uppercase">signed in</p>
            <p className="break-all text-foreground">{ownerEmail}</p>
          </div>
        </aside>

        <section className="min-h-0 overflow-y-auto">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8">
            <header className="grid gap-5 border-b border-white/10 pb-7 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
              <div>
                <Badge variant="success">live control plane</Badge>
                <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-[-0.06em] text-balance sm:text-6xl">
                  Good links, zero blog admin surface.
                </h1>
                <p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground">
                  Create, publish, and retire links from the dedicated admin worker. The public blog only reads the result.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <SettingsPanel linkCount={links.length} archivedCount={metrics.archived} />
                <a href="/device">
                  <Button variant="outline">
                    <RadioTowerIcon />
                    Device auth
                  </Button>
                </a>
              </div>
            </header>

            <section className="grid gap-px overflow-hidden border border-white/10 bg-white/10 md:grid-cols-4">
              <Metric label="published" value={metrics.published.toString()} icon={<CheckCircle2Icon />} />
              <Metric label="draft" value={metrics.draft.toString()} icon={<SparklesIcon />} />
              <Metric label="archived" value={metrics.archived.toString()} icon={<ArchiveIcon />} />
              <Metric label="top tag" value={metrics.topTag} icon={<GaugeIcon />} />
            </section>

            <section className="grid gap-8 xl:grid-cols-[24rem_minmax(0,1fr)]">
              <CreateLinkPanel isPending={createMutation.isPending} onCreate={createMutation.mutate} />

              <div id="links" className="min-w-0">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h2 className="text-lg font-medium tracking-tight">Link inventory</h2>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {linksQuery.isFetching ? "Syncing with Hono API..." : `${filteredLinks.length} visible links`}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {filterOptions.map((option) => (
                      <button
                        key={option}
                        type="button"
                        className="border border-white/10 px-2.5 py-1.5 text-[10px] tracking-[0.16em] uppercase text-muted-foreground transition-colors hover:text-foreground data-[active=true]:border-emerald-300/60 data-[active=true]:bg-emerald-400/10 data-[active=true]:text-emerald-200"
                        data-active={filter === option}
                        onClick={() => setFilter(option)}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="overflow-hidden border border-white/10 bg-black/20">
                  {linksQuery.isLoading ? (
                    <EmptyPanel title="Loading links" description="Fetching the latest link inventory." />
                  ) : linksQuery.isError ? (
                    <EmptyPanel title="Links unavailable" description={errorMessage(linksQuery.error)} />
                  ) : filteredLinks.length === 0 ? (
                    <EmptyPanel title="No matching links" description="Change the filter or add something worth saving." />
                  ) : (
                    <div className="divide-y divide-white/10">
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
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}

function Metric({ label, value, icon }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="bg-background/80 p-4">
      <div className="flex items-center justify-between text-muted-foreground">
        <span className="text-[10px] tracking-[0.18em] uppercase">{label}</span>
        <span className="[&_svg]:size-3.5">{icon}</span>
      </div>
      <p className="mt-5 truncate text-2xl font-medium tracking-tight">{value}</p>
    </div>
  );
}

function CreateLinkPanel({
  isPending,
  onCreate,
}: {
  isPending: boolean;
  onCreate: (input: CreateLinkInput, options: { onSuccess: () => void }) => void;
}) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const parsed = createLinkInputSchema.safeParse({
      url: fieldValue(formData, "url"),
      title: optionalFieldValue(formData, "title"),
      description: optionalFieldValue(formData, "description"),
      reason: fieldValue(formData, "reason"),
      tags: splitTags(fieldValue(formData, "tags")),
      source: "admin",
      status: fieldValue(formData, "status"),
    });

    if (!parsed.success) {
      toast.error(parsed.error.issues.map((issue) => issue.message).join(" "));
      return;
    }

    onCreate(parsed.data, {
      onSuccess: () => form.reset(),
    });
  }

  return (
    <form id="intake" className="h-max border border-emerald-300/20 bg-emerald-400/[0.03] p-4" onSubmit={submit}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-medium tracking-tight">Intake</h2>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Paste the URL. Metadata fills itself unless you override it.
          </p>
        </div>
        <span className="inline-flex size-9 items-center justify-center border border-emerald-300/20 text-emerald-300">
          <PlusIcon className="size-4" />
        </span>
      </div>

      <div className="mt-6 grid gap-4">
        <Field label="URL">
          <Input name="url" placeholder="https://..." type="url" required />
        </Field>
        <Field label="Title override">
          <Input name="title" placeholder="Fetched when empty" />
        </Field>
        <Field label="Reason">
          <Textarea name="reason" placeholder="Why this is worth someone's time" required />
        </Field>
        <div className="grid gap-4 sm:grid-cols-[1fr_9rem]">
          <Field label="Tags">
            <Input name="tags" placeholder="tools, writing" />
          </Field>
          <Field label="Status">
            <select
              name="status"
              className="h-8 w-full rounded-none border border-input bg-background px-2.5 py-1 text-xs outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50"
              defaultValue="published"
            >
              <option value="published">published</option>
              <option value="draft">draft</option>
            </select>
          </Field>
        </div>
      </div>

      <Button className="mt-5 w-full" type="submit" disabled={isPending}>
        {isPending ? "Adding..." : "Add link"}
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
    <article className="group grid gap-4 p-4 transition-colors hover:bg-white/[0.03] lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={statusVariant(link.status)}>{link.status}</Badge>
          <span className="text-[10px] tracking-[0.16em] text-muted-foreground uppercase">{formatDate(link.createdAt)}</span>
        </div>
        <a
          href={link.url}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex max-w-full items-center gap-2 text-base font-medium tracking-tight hover:text-emerald-200"
        >
          <span className="truncate">{link.title}</span>
          <ArrowUpRightIcon className="size-4 shrink-0 opacity-40 transition-opacity group-hover:opacity-100" />
        </a>
        <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">{link.reason}</p>
        {link.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {link.tags.map((tag) => (
              <span key={tag} className="border border-white/10 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isPending}
          onClick={() => onStatusChange(nextStatus)}
        >
          {nextStatus === "archived" ? "Archive" : "Publish"}
        </Button>
      </div>
    </article>
  );
}

function SettingsPanel({ archivedCount, linkCount }: { archivedCount: number; linkCount: number }) {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const createKeyMutation = useMutation({
    mutationFn: createAdminApiKey,
    onError: (error) => toast.error(errorMessage(error)),
    onSuccess: (key) => {
      setApiKey(key);
      toast.success("API key created.");
    },
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    createKeyMutation.mutate(fieldValue(formData, "name"));
  }

  async function copyApiKey() {
    if (!apiKey) return;
    try {
      await navigator.clipboard.writeText(apiKey);
      toast.success("API key copied.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not copy API key.");
    }
  }

  return (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" />}>
        <SettingsIcon />
        Settings
      </DialogTrigger>
      <DialogContent className="border-white/15 bg-[linear-gradient(135deg,oklch(0.18_0.02_160),oklch(0.12_0_0)_52%,oklch(0.18_0.02_260))] p-0">
        <div className="grid gap-0 md:grid-cols-[0.9fr_1.1fr]">
          <div className="border-b border-white/10 p-6 md:border-r md:border-b-0">
            <DialogHeader>
              <Badge variant="success">settings</Badge>
              <DialogTitle className="mt-4 text-2xl tracking-[-0.04em]">Operator keys</DialogTitle>
              <DialogDescription>
                Create short-lived working credentials for `caulk` and keep the admin surface isolated from the blog.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-8 grid grid-cols-2 gap-px overflow-hidden border border-white/10 bg-white/10 text-xs">
              <div className="bg-background/70 p-3">
                <p className="text-muted-foreground">links</p>
                <p className="mt-2 text-2xl">{linkCount}</p>
              </div>
              <div className="bg-background/70 p-3">
                <p className="text-muted-foreground">archived</p>
                <p className="mt-2 text-2xl">{archivedCount}</p>
              </div>
            </div>
            <div className="mt-6 space-y-2 text-xs text-muted-foreground">
              <p className="flex items-center gap-2">
                <LinkIcon className="size-3.5" />
                {env.VITE_SERVER_URL}
              </p>
              <p className="flex items-center gap-2">
                <CommandIcon className="size-3.5" />
                bin: caulk
              </p>
            </div>
          </div>

          <div className="p-6">
            <form className="grid gap-4" onSubmit={submit}>
              <Field label="API key name">
                <Input name="name" defaultValue="good links client" required />
              </Field>
              <Button type="submit" disabled={createKeyMutation.isPending}>
                <KeyRoundIcon />
                {createKeyMutation.isPending ? "Creating..." : "Create API key"}
              </Button>
            </form>

            {apiKey && (
              <div className="mt-6 border border-emerald-300/20 bg-emerald-400/10 p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-medium text-emerald-200">Copy now. It will not be shown again.</p>
                  <Button type="button" size="sm" variant="outline" onClick={copyApiKey}>
                    <ClipboardIcon />
                    Copy
                  </Button>
                </div>
                <pre className="mt-3 max-h-28 overflow-auto whitespace-pre-wrap break-all text-xs text-emerald-100">
                  {apiKey}
                </pre>
              </div>
            )}

            <Separator className="my-6 bg-white/10" />

            <div className="space-y-3 text-xs leading-5 text-muted-foreground">
              <p className="font-medium text-foreground">Device authorization</p>
              <p>
                Run <code className="border border-white/10 bg-black/30 px-1 py-0.5">caulk auth login --device-auth</code>, approve the code on the device screen, then use bearer auth for CLI writes.
              </p>
              <a className="inline-flex items-center gap-1 text-emerald-200 hover:text-emerald-100" href="/device">
                Open device approval <ArrowUpRightIcon className="size-3" />
              </a>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EmptyPanel({ description, title }: { description: string; title: string }) {
  return (
    <div className="grid place-items-center px-6 py-20 text-center">
      <div className="inline-flex size-10 items-center justify-center border border-white/10 text-muted-foreground">
        <LinkIcon className="size-4" />
      </div>
      <h3 className="mt-4 font-medium">{title}</h3>
      <p className="mt-2 max-w-sm text-xs leading-5 text-muted-foreground">{description}</p>
    </div>
  );
}

function Field({ children, label }: { children: ReactNode; label: string }) {
  return (
    <Label className="grid gap-2 text-xs text-muted-foreground">
      <span>{label}</span>
      {children}
    </Label>
  );
}

function linkMetrics(links: GoodLink[]) {
  const published = links.filter((link) => link.status === "published").length;
  const draft = links.filter((link) => link.status === "draft").length;
  const archived = links.filter((link) => link.status === "archived").length;
  return {
    archived,
    draft,
    published,
    topTag: dominantTag(links),
  };
}

function dominantTag(links: GoodLink[]) {
  const counts = new Map<string, number>();
  for (const link of links) {
    for (const tag of link.tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }

  let topTag = "none";
  let topCount = 0;
  for (const [tag, count] of counts) {
    if (count > topCount) {
      topTag = `#${tag}`;
      topCount = count;
    }
  }
  return topTag;
}

function statusVariant(status: LinkStatus) {
  if (status === "published") return "success";
  if (status === "draft") return "warning";
  return "outline";
}

function fieldValue(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function optionalFieldValue(formData: FormData, name: string): string | undefined {
  const value = fieldValue(formData, name);
  return value.length > 0 ? value : undefined;
}

function splitTags(value: string): string[] {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
  }).format(new Date(value));
}

function errorMessage(error: unknown) {
  if (error instanceof AdminApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Unexpected admin API error.";
}
