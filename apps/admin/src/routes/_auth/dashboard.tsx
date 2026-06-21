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
import { NativeSelect, NativeSelectOption } from "@caulk.lol/ui/components/native-select";
import { Separator } from "@caulk.lol/ui/components/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@caulk.lol/ui/components/sidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@caulk.lol/ui/components/tabs";
import { Textarea } from "@caulk.lol/ui/components/textarea";
import {
  type CreateLinkInput,
  type GoodLink,
  type LinkStatus,
  createLinkInputSchema,
} from "@caulk.lol/api/links";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowUpRightIcon,
  ClipboardIcon,
  FingerprintIcon,
  KeyRoundIcon,
  RadioTowerIcon,
  SettingsIcon,
} from "lucide-react";
import { type FormEvent, type ReactNode, useMemo, useState } from "react";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";
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
type SecurityTab = "device" | "passkeys" | "api-keys";

type LinkMutationInput = {
  id: string;
  status: LinkStatus;
};

const linksQueryKey = ["admin-links"];
const filterOptions: LinkFilter[] = ["all", "published", "draft", "archived"];
const securityTabs = [
  { label: "Device auth", value: "device" },
  { label: "Passkeys", value: "passkeys" },
  { label: "API keys", value: "api-keys" },
] satisfies ReadonlyArray<{ label: string; value: SecurityTab }>;

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
    <main className="min-h-full bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-medium tracking-tight">Links</h1>
            <p className="mt-1 text-xs text-muted-foreground">Add, publish, and archive links shown on caulk.lol.</p>
          </div>
          <div className="flex items-center gap-2">
            <SettingsPanel ownerEmail={ownerEmail} />
            <a href="/device">
              <Button variant="outline">
                <RadioTowerIcon />
                Device auth
              </Button>
            </a>
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
          <CreateLinkForm isPending={createMutation.isPending} onCreate={createMutation.mutate} />

          <div id="links" className="min-w-0">
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
    <form className="grid h-max gap-4" onSubmit={submit}>
      <div>
        <h2 className="text-sm font-medium">Add link</h2>
        <p className="mt-1 text-xs text-muted-foreground">Metadata is fetched when title or description is empty.</p>
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
          <p className="mt-2 text-xs text-muted-foreground">{link.tags.map((tag) => `#${tag}`).join(" ")}</p>
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

function SettingsPanel({ ownerEmail }: { ownerEmail: string }) {
  const [activeTab, setActiveTab] = useState<SecurityTab>("device");
  const [apiKey, setApiKey] = useState<string | null>(null);

  const createKeyMutation = useMutation({
    mutationFn: createAdminApiKey,
    onError: (error) => toast.error(errorMessage(error)),
    onSuccess: (key) => {
      setApiKey(key);
      toast.success("API key created.");
    },
  });

  const addPasskeyMutation = useMutation({
    mutationFn: addPasskey,
    onError: (error) => toast.error(errorMessage(error)),
    onSuccess: () => toast.success("Passkey added."),
  });

  function submitApiKey(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    createKeyMutation.mutate(fieldValue(formData, "name"));
  }

  function submitPasskey(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    addPasskeyMutation.mutate(fieldValue(formData, "name"));
  }

  async function copyApiKey() {
    if (!apiKey) return;
    await copyToClipboard(apiKey, "API key copied.");
  }

  async function copyDeviceCommand() {
    await copyToClipboard("caulk auth login --device-auth", "Device auth command copied.");
  }

  async function copyApiKeyCommand() {
    await copyToClipboard("caulk auth login --api-key <key>", "API key command copied.");
  }

  return (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" />}>
        <SettingsIcon />
        Settings
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100svh-2rem)] gap-0 overflow-hidden p-0 sm:max-w-4xl">
        <Tabs
          orientation="vertical"
          value={activeTab}
          onValueChange={(value: unknown) => setActiveTab(parseSecurityTab(value))}
          className="block"
        >
          <SidebarProvider defaultOpen className="min-h-0 bg-background">
            <div className="grid max-h-[calc(100svh-2rem)] min-h-[32rem] md:grid-cols-[16rem_minmax(0,1fr)]">
              <Sidebar collapsible="none" className="border-r">
                <SidebarHeader>
                  <p className="px-2 py-1 text-sm font-medium">Settings</p>
                </SidebarHeader>
                <SidebarContent>
                  <SidebarGroup>
                    <SidebarGroupLabel>Security</SidebarGroupLabel>
                    <SidebarGroupContent>
                      <TabsList render={<SidebarMenu />} className="h-auto w-full flex-col bg-transparent p-0">
                        {securityTabs.map((tab) => (
                          <SidebarMenuItem key={tab.value}>
                            <SidebarMenuButton isActive={activeTab === tab.value} render={<TabsTrigger value={tab.value} />}>
                              {tab.label}
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        ))}
                      </TabsList>
                    </SidebarGroupContent>
                  </SidebarGroup>
                </SidebarContent>
                <SidebarFooter>
                  <p className="break-all px-2 text-xs text-muted-foreground">{ownerEmail}</p>
                </SidebarFooter>
              </Sidebar>

              <section className="min-w-0 overflow-y-auto p-6">
                <DialogHeader>
                  <DialogTitle>Security</DialogTitle>
                  <DialogDescription>Manage admin login and CLI access.</DialogDescription>
                </DialogHeader>
                <Separator className="my-5" />

                <TabsContent value="device">
                  <DeviceAuthSettings onCopyCommand={copyDeviceCommand} />
                </TabsContent>
                <TabsContent value="passkeys">
                  <PasskeySettings isPending={addPasskeyMutation.isPending} onSubmit={submitPasskey} />
                </TabsContent>
                <TabsContent value="api-keys">
                  <ApiKeySettings
                    apiKey={apiKey}
                    isPending={createKeyMutation.isPending}
                    onCopyApiKey={copyApiKey}
                    onCopyCommand={copyApiKeyCommand}
                    onSubmit={submitApiKey}
                  />
                </TabsContent>
              </section>
            </div>
          </SidebarProvider>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function DeviceAuthSettings({ onCopyCommand }: { onCopyCommand: () => void }) {
  return (
    <Section title="Device auth">
      <SettingsRow
        label="CLI login"
        value="caulk auth login --device-auth"
        action={
          <Button type="button" size="sm" variant="outline" onClick={onCopyCommand}>
            <ClipboardIcon />
            Copy
          </Button>
        }
      >
        Approve the code at <a href="/device" className="text-emerald-400 hover:underline">/device</a>.
      </SettingsRow>
      <SettingsRow
        label="Approval page"
        value="admin.caulk.lol/device"
        action={
          <a href="/device">
            <Button type="button" size="sm" variant="outline">
              Open
              <ArrowUpRightIcon />
            </Button>
          </a>
        }
      >
        Device codes require the owner session.
      </SettingsRow>
    </Section>
  );
}

function PasskeySettings({
  isPending,
  onSubmit,
}: {
  isPending: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <Section title="Passkeys">
      <form className="grid gap-4" onSubmit={onSubmit}>
        <Field label="Name">
          <Input name="name" defaultValue="Admin passkey" required />
        </Field>
        <Button type="submit" disabled={isPending}>
          <FingerprintIcon />
          {isPending ? "Adding" : "Add passkey"}
        </Button>
      </form>
      <Separator />
      <p className="text-xs text-muted-foreground">Passkeys are registered for caulk.lol and work on admin.caulk.lol.</p>
    </Section>
  );
}

function ApiKeySettings({
  apiKey,
  isPending,
  onCopyApiKey,
  onCopyCommand,
  onSubmit,
}: {
  apiKey: string | null;
  isPending: boolean;
  onCopyApiKey: () => void;
  onCopyCommand: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <Section title="API keys">
      <form className="grid gap-4" onSubmit={onSubmit}>
        <Field label="Name">
          <Input name="name" defaultValue="caulk cli" required />
        </Field>
        <Button type="submit" disabled={isPending}>
          <KeyRoundIcon />
          {isPending ? "Creating" : "Create API key"}
        </Button>
      </form>

      {apiKey && (
        <>
          <Separator />
          <div className="grid gap-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">Copy this key now. It is shown once.</p>
              <Button type="button" size="sm" variant="outline" onClick={onCopyApiKey}>
                <ClipboardIcon />
                Copy
              </Button>
            </div>
            <pre className="max-h-28 overflow-auto whitespace-pre-wrap break-all border p-3 text-xs">{apiKey}</pre>
          </div>
        </>
      )}

      <Separator />
      <SettingsRow
        label="CLI command"
        value="caulk auth login --api-key <key>"
        action={
          <Button type="button" size="sm" variant="outline" onClick={onCopyCommand}>
            <ClipboardIcon />
            Copy
          </Button>
        }
      >
        Stores the key in the local caulk config directory.
      </SettingsRow>
    </Section>
  );
}

function Section({ children, title }: { children: ReactNode; title: string }) {
  return (
    <div className="grid gap-4">
      <h3 className="text-sm font-medium">{title}</h3>
      <Separator />
      {children}
    </div>
  );
}

function SettingsRow({
  action,
  children,
  label,
  value,
}: {
  action: ReactNode;
  children: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        <p className="mt-1 text-xs text-muted-foreground">{children}</p>
        <code className="mt-2 block truncate border px-2 py-1 text-xs">{value}</code>
      </div>
      {action}
    </div>
  );
}

function EmptyPanel({ description, title }: { description: string; title: string }) {
  return (
    <div className="py-12 text-center">
      <h3 className="text-sm font-medium">{title}</h3>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
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
  if (status === "published") return "default";
  if (status === "draft") return "secondary";
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

async function addPasskey(name: string) {
  const result = await authClient.passkey.addPasskey({ name });
  if (result.error) {
    throw new Error(result.error.message ?? "Could not add passkey.");
  }
  return result.data;
}

async function copyToClipboard(value: string, successMessage: string) {
  try {
    await navigator.clipboard.writeText(value);
    toast.success(successMessage);
  } catch (error) {
    toast.error(error instanceof Error ? error.message : "Could not copy value.");
  }
}

function parseSecurityTab(value: unknown): SecurityTab {
  if (value === "device" || value === "passkeys" || value === "api-keys") return value;
  throw new Error("Invalid security tab.");
}

function errorMessage(error: unknown) {
  if (error instanceof AdminApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Unexpected admin API error.";
}
