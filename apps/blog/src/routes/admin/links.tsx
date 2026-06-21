import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { type FormEvent, useState } from "react";
import { HomeLayout } from "@/components/layout/home";
import { buttonVariants } from "@/components/ui/button";
import { getAdminSession } from "@/lib/auth.functions";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/format-date";
import { baseOptions } from "@/lib/layout.shared";
import { type GoodLink, listLinks, requireLinksDb } from "@/lib/links/queries";

export const Route = createFileRoute("/admin/links")({
  beforeLoad: async () => {
    const session = await getAdminSession();
    if (!session) throw redirect({ to: "/admin/login" });
  },
  loader: () => serverLoader(),
  component: AdminLinksPage,
});

const serverLoader = createServerFn({ method: "GET" }).handler(async () => ({
  links: await listLinks(requireLinksDb(), { includeArchived: true }),
}));

function AdminLinksPage() {
  const { links } = Route.useLoaderData() as { links: GoodLink[] };
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState<string | null>(null);

  async function refresh(nextMessage?: string) {
    if (nextMessage) setMessage(nextMessage);
    await router.invalidate();
  }

  return (
    <HomeLayout {...baseOptions()}>
      <main className="mx-auto w-full max-w-2xl px-4 py-16">
        <header className="mb-12 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Links</h1>
            <p className="mt-3 text-muted-foreground">
              Add, publish, and retire good links.
            </p>
          </div>
          <CreateKeyButton onCreated={setApiKey} />
        </header>

        {apiKey && (
          <pre className="mb-8 overflow-x-auto whitespace-pre-wrap text-xs text-muted-foreground">
            {apiKey}
          </pre>
        )}

        <CreateLinkForm onCreated={() => refresh("Link added.")} />

        {message && (
          <p className="mt-6 text-sm text-muted-foreground">{message}</p>
        )}

        <div className="mt-10">
          {links.map((link) => (
            <AdminLinkRow
              key={link.id}
              link={link}
              onChanged={() => refresh("Link updated.")}
            />
          ))}
        </div>
      </main>
    </HomeLayout>
  );
}

function CreateLinkForm({ onCreated }: { onCreated: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: String(form.get("url") ?? ""),
        title: optionalString(form.get("title")),
        reason: String(form.get("reason") ?? ""),
        tags: splitTags(String(form.get("tags") ?? "")),
        source: "admin",
      }),
    });

    setIsSubmitting(false);

    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      setError(payload.error ?? "Could not add link.");
      return;
    }

    event.currentTarget.reset();
    onCreated();
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={submit}>
      <label className="flex flex-col gap-2 text-sm">
        <span className="text-muted-foreground">URL</span>
        <input
          name="url"
          type="url"
          className="h-10 bg-transparent border-b border-border outline-none focus:border-primary"
          required
        />
      </label>
      <label className="flex flex-col gap-2 text-sm">
        <span className="text-muted-foreground">Title override</span>
        <input
          name="title"
          className="h-10 bg-transparent border-b border-border outline-none focus:border-primary"
        />
      </label>
      <label className="flex flex-col gap-2 text-sm">
        <span className="text-muted-foreground">Reason</span>
        <textarea
          name="reason"
          rows={3}
          className="resize-none bg-transparent border-b border-border py-2 outline-none focus:border-primary"
          required
        />
      </label>
      <label className="flex flex-col gap-2 text-sm">
        <span className="text-muted-foreground">Tags</span>
        <input
          name="tags"
          placeholder="tools, writing"
          className="h-10 bg-transparent border-b border-border outline-none focus:border-primary"
        />
      </label>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <button
        type="submit"
        className={cn(buttonVariants({ color: "secondary" }), "self-start")}
        disabled={isSubmitting}
      >
        {isSubmitting ? "Adding..." : "Add link"}
      </button>
    </form>
  );
}

function AdminLinkRow({
  link,
  onChanged,
}: {
  link: GoodLink;
  onChanged: () => void;
}) {
  const nextStatus = link.status === "published" ? "archived" : "published";

  async function updateStatus() {
    await fetch(`/api/links/${link.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    onChanged();
  }

  return (
    <article className="-mx-3 flex flex-col gap-2 px-3 py-5 sm:flex-row sm:items-baseline sm:justify-between">
      <div>
        <a href={link.url} className="font-medium hover:text-primary">
          {link.title}
        </a>
        <p className="mt-1 text-sm text-muted-foreground">{link.reason}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {link.status} · {formatDate(link.createdAt)}
        </p>
      </div>
      <button
        type="button"
        className="self-start text-sm text-muted-foreground transition-colors hover:text-foreground"
        onClick={updateStatus}
      >
        {nextStatus}
      </button>
    </article>
  );
}

function CreateKeyButton({ onCreated }: { onCreated: (key: string) => void }) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function createKey() {
    setIsSubmitting(true);
    const response = await fetch("/api/admin/api-key", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "good links client" }),
    });
    setIsSubmitting(false);
    if (!response.ok) return;

    const payload = (await response.json()) as { key: { key?: string } };
    if (payload.key.key) onCreated(payload.key.key);
  }

  return (
    <button
      type="button"
      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
      onClick={createKey}
      disabled={isSubmitting}
    >
      {isSubmitting ? "creating key..." : "create api key"}
    </button>
  );
}

function optionalString(value: FormDataEntryValue | null): string | undefined {
  const text = String(value ?? "").trim();
  return text.length > 0 ? text : undefined;
}

function splitTags(value: string): string[] {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);
}
