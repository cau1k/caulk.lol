import type { CreateLinkInput } from "@caulk.lol/api/links";
import { Button } from "@caulk.lol/ui/components/button";
import { Separator } from "@caulk.lol/ui/components/separator";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute, useRouter } from "@tanstack/react-router";
import { ArrowLeftIcon, BookmarkIcon, LinkIcon } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";

import { LinkForm, type LinkFormInitialValues } from "@/components/link-form";
import { useTRPC, useTRPCClient } from "@/utils/trpc";

const searchValueSchema = z
  .union([z.string(), z.array(z.string())])
  .optional()
  .transform((value) => {
    if (Array.isArray(value)) return value[0];
    return value;
  });

const addLinkSearchSchema = z.object({
  description: searchValueSchema,
  reason: searchValueSchema,
  status: searchValueSchema,
  tags: searchValueSchema,
  title: searchValueSchema,
  url: searchValueSchema,
});

const addLinkShortcutHref =
  "javascript:(()=>{const p=new URLSearchParams({url:location.href,title:document.title});location.href='https://admin.caulk.lol/links/add?'+p.toString()})()";

export const Route = createFileRoute("/_auth/links_/add")({
  validateSearch: addLinkSearchSchema,
  component: AddLinkRoute,
});

type AddLinkSearch = z.infer<typeof addLinkSearchSchema>;

function AddLinkRoute() {
  const search = Route.useSearch();
  const trpc = useTRPC();
  const trpcClient = useTRPCClient();
  const queryClient = useQueryClient();
  const router = useRouter();

  const createMutation = useMutation({
    mutationFn: async (input: CreateLinkInput) => await trpcClient.links.create.mutate(input),
    onError: (error) => toast.error(errorMessage(error)),
    onSuccess: async () => {
      toast.success("Link added.");
      await queryClient.invalidateQueries(trpc.links.adminList.queryFilter());
      await router.navigate({ to: "/links" });
    },
  });

  return (
    <main className="min-h-full bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <div>
          <Button variant="ghost" size="sm" render={<Link to="/links" />}>
            <ArrowLeftIcon />
            Links
          </Button>
        </div>

        <header className="space-y-1">
          <h1 className="text-2xl font-medium tracking-tight">Add link</h1>
          <p className="text-xs text-muted-foreground">
            Paste a URL, use query params, or visit admin.caulk.lol/&lt;link&gt;.
          </p>
        </header>

        <Separator />

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start">
          <div className="border p-4 sm:p-5">
            <LinkForm
              initialValues={initialValuesFromSearch(search)}
              isPending={createMutation.isPending}
              pendingLabel="Saving"
              resetOnSuccess={false}
              submitLabel="Save link"
              onCreate={(input, onSuccess) => createMutation.mutate(input, { onSuccess })}
            />
          </div>

          <aside className="grid gap-4 text-xs text-muted-foreground">
            <ShortcutPanel />
            <PrefillPanel />
          </aside>
        </section>
      </div>
    </main>
  );
}

function ShortcutPanel() {
  return (
    <section className="space-y-3 border p-4">
      <div className="flex items-center gap-2 text-foreground">
        <BookmarkIcon className="size-3.5" />
        <h2 className="text-sm font-medium">Browser shortcut</h2>
      </div>
      <p className="leading-5">Drag this to your bookmarks bar, then click it from any page.</p>
      <Button className="w-full" variant="outline" render={<a href={addLinkShortcutHref} />}>
        Add current page
      </Button>
    </section>
  );
}

function PrefillPanel() {
  return (
    <section className="space-y-3 border p-4">
      <div className="flex items-center gap-2 text-foreground">
        <LinkIcon className="size-3.5" />
        <h2 className="text-sm font-medium">Prefill URL</h2>
      </div>
      <p className="leading-5">Use query params for quick add flows from shortcuts.</p>
      <code className="block overflow-x-auto border bg-muted/30 p-2 text-[11px] text-muted-foreground">
        /links/add?url=https%3A%2F%2Fexample.com&title=Example
      </code>
      <code className="block overflow-x-auto border bg-muted/30 p-2 text-[11px] text-muted-foreground">
        /https://twitter.com/135413414142124124124
      </code>
    </section>
  );
}

function initialValuesFromSearch(search: AddLinkSearch): LinkFormInitialValues {
  return {
    description: optionalSearchValue(search.description),
    reason: optionalSearchValue(search.reason),
    status: createStatus(search.status) ?? "draft",
    tags: optionalSearchValue(search.tags),
    title: optionalSearchValue(search.title),
    url: optionalSearchValue(search.url),
  };
}

function createStatus(value: string | undefined) {
  if (value === "draft" || value === "published") return value;
  return undefined;
}

function optionalSearchValue(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Request failed.";
}
