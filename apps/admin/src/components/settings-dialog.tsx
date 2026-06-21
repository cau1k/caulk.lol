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
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  ArrowUpRightIcon,
  ClipboardIcon,
  FingerprintIcon,
  KeyRoundIcon,
  RadioTowerIcon,
  SettingsIcon,
  TrashIcon,
} from "lucide-react";
import { type FormEvent, type ReactElement, type ReactNode, useState } from "react";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";
import { useTRPC, useTRPCClient } from "@/utils/trpc";

type SecurityTab = "device" | "passkeys" | "api-keys";

const securityTabs = [
  { icon: RadioTowerIcon, label: "Device auth", value: "device" },
  { icon: FingerprintIcon, label: "Passkeys", value: "passkeys" },
  { icon: KeyRoundIcon, label: "API keys", value: "api-keys" },
] satisfies ReadonlyArray<{ icon: typeof RadioTowerIcon; label: string; value: SecurityTab }>;

export function SettingsDialog({
  ownerEmail,
  trigger,
}: {
  ownerEmail: string;
  trigger?: ReactElement;
}) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<SecurityTab>("device");
  const [apiKey, setApiKey] = useState<string | null>(null);
  const trpc = useTRPC();
  const trpcClient = useTRPCClient();
  const queryClient = useQueryClient();

  const passkeys = useQuery({
    ...trpc.security.passkey.list.queryOptions(),
    enabled: open,
    refetchInterval: open ? 5_000 : false,
  });

  const addPasskeyMutation = useMutation({
    mutationFn: addPasskey,
    onError: (error) => toast.error(errorMessage(error)),
    onSuccess: async () => {
      toast.success("Passkey added.");
      await queryClient.invalidateQueries(trpc.security.passkey.list.queryFilter());
    },
  });

  const deletePasskeyMutation = useMutation({
    mutationFn: async (id: string) => await trpcClient.security.passkey.delete.mutate({ id }),
    onError: (error) => toast.error(errorMessage(error)),
    onSuccess: async () => {
      toast.success("Passkey deleted.");
      await queryClient.invalidateQueries(trpc.security.passkey.list.queryFilter());
    },
  });

  const renamePasskeyMutation = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) =>
      await trpcClient.security.passkey.rename.mutate({ id, name }),
    onError: (error) => toast.error(errorMessage(error)),
    onSuccess: async () => {
      toast.success("Passkey renamed.");
      await queryClient.invalidateQueries(trpc.security.passkey.list.queryFilter());
    },
  });

  const createKeyMutation = useMutation({
    mutationFn: async (name: string) => await trpcClient.security.apiKey.create.mutate({ name }),
    onError: (error) => toast.error(errorMessage(error)),
    onSuccess: ({ apiKey: nextApiKey }) => {
      setApiKey(nextApiKey);
      toast.success("API key created.");
    },
  });

  function submitPasskey(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    addPasskeyMutation.mutate(formField(event.currentTarget, "name"));
  }

  function submitApiKey(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    createKeyMutation.mutate(formField(event.currentTarget, "name"));
  }

  function submitPasskeyRename(id: string, event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    renamePasskeyMutation.mutate({ id, name: formField(event.currentTarget, "name") });
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger ?? <Button variant="ghost" />}>
        <SettingsIcon />
        Settings
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100svh-2rem)] gap-0 overflow-hidden p-0 sm:max-w-4xl">
        <Tabs
          orientation="vertical"
          value={activeTab}
          onValueChange={(value) => setActiveTab(parseSecurityTab(value))}
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
                      <TabsList
                        render={<SidebarMenu />}
                        className="h-auto w-full flex-col bg-transparent p-0"
                      >
                        {securityTabs.map((tab) => (
                          <SidebarMenuItem key={tab.value}>
                            <SidebarMenuButton
                              isActive={activeTab === tab.value}
                              render={<TabsTrigger value={tab.value} />}
                            >
                              <tab.icon />
                              <span>{tab.label}</span>
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
                  <DeviceSettings onCopyCommand={copyDeviceCommand} />
                </TabsContent>
                <TabsContent value="passkeys">
                  <PasskeySettings
                    isAdding={addPasskeyMutation.isPending}
                    isDeleting={deletePasskeyMutation.isPending}
                    isLoading={passkeys.isLoading}
                    isRenaming={renamePasskeyMutation.isPending}
                    onAdd={submitPasskey}
                    onDelete={(id) => deletePasskeyMutation.mutate(id)}
                    onRename={submitPasskeyRename}
                    passkeys={passkeys.data ?? []}
                  />
                </TabsContent>
                <TabsContent value="api-keys">
                  <ApiKeySettings
                    apiKey={apiKey}
                    isCreating={createKeyMutation.isPending}
                    onCopyApiKey={copyApiKey}
                    onCopyCommand={copyApiKeyCommand}
                    onCreate={submitApiKey}
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

function DeviceSettings({ onCopyCommand }: { onCopyCommand: () => void }) {
  return (
    <section className="space-y-5">
      <div className="space-y-1">
        <h3 className="font-medium">Device authorization</h3>
        <p className="max-w-xl text-muted-foreground">
          Use this when signing in from the caulk CLI without pasting an API key.
        </p>
      </div>
      <Separator />
      <SettingsRow
        action={
          <Button type="button" size="sm" variant="outline" onClick={onCopyCommand}>
            <ClipboardIcon />
            Copy
          </Button>
        }
        label="CLI login"
        value="caulk auth login --device-auth"
      >
        Approve the code in the device auth route.
      </SettingsRow>
      <SettingsRow
        action={
          <Button type="button" size="sm" variant="outline" render={<Link to="/device" />}>
            Open
            <ArrowUpRightIcon />
          </Button>
        }
        label="Approval page"
        value="admin.caulk.lol/device"
      >
        Device codes require the owner session.
      </SettingsRow>
    </section>
  );
}

function PasskeySettings({
  isAdding,
  isDeleting,
  isLoading,
  isRenaming,
  onAdd,
  onDelete,
  onRename,
  passkeys,
}: {
  isAdding: boolean;
  isDeleting: boolean;
  isLoading: boolean;
  isRenaming: boolean;
  onAdd: (event: FormEvent<HTMLFormElement>) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, event: FormEvent<HTMLFormElement>) => void;
  passkeys: ReadonlyArray<{
    backedUp: boolean;
    createdAt: string | null;
    deviceType: string;
    id: string;
    name: string | null;
  }>;
}) {
  return (
    <section className="space-y-5">
      <div className="space-y-1">
        <h3 className="font-medium">Passkeys</h3>
        <p className="max-w-xl text-muted-foreground">
          Add passkeys for this browser, rename credentials, and remove old devices.
        </p>
      </div>
      <Separator />
      <form className="flex max-w-md gap-2" onSubmit={onAdd}>
        <Label className="sr-only" htmlFor="passkey-name">
          Passkey name
        </Label>
        <Input id="passkey-name" name="name" defaultValue="caulk admin" />
        <Button type="submit" disabled={isAdding}>
          <FingerprintIcon />
          Add passkey
        </Button>
      </form>
      <Separator />
      <div className="divide-y">
        {passkeys.map((passkey) => (
          <div key={passkey.id} className="grid gap-3 py-3 sm:grid-cols-[minmax(0,1fr)_auto]">
            <form className="min-w-0 space-y-2" onSubmit={(event) => onRename(passkey.id, event)}>
              <Label className="sr-only" htmlFor={`passkey-${passkey.id}-name`}>
                Passkey name
              </Label>
              <div className="flex gap-2">
                <Input
                  id={`passkey-${passkey.id}-name`}
                  name="name"
                  defaultValue={passkey.name ?? "Unnamed passkey"}
                />
                <Button type="submit" variant="outline" disabled={isRenaming}>
                  Save
                </Button>
              </div>
              <p className="text-muted-foreground">
                {passkey.deviceType} · {passkey.backedUp ? "backed up" : "not backed up"} ·{" "}
                {formatDate(passkey.createdAt)}
              </p>
            </form>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              disabled={isDeleting}
              onClick={() => onDelete(passkey.id)}
            >
              <TrashIcon />
              <span className="sr-only">Delete passkey</span>
            </Button>
          </div>
        ))}
        {passkeys.length === 0 && !isLoading && (
          <p className="py-4 text-muted-foreground">No passkeys yet.</p>
        )}
        {isLoading && <p className="py-4 text-muted-foreground">Loading passkeys.</p>}
      </div>
    </section>
  );
}

function ApiKeySettings({
  apiKey,
  isCreating,
  onCopyApiKey,
  onCopyCommand,
  onCreate,
}: {
  apiKey: string | null;
  isCreating: boolean;
  onCopyApiKey: () => void;
  onCopyCommand: () => void;
  onCreate: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <section className="space-y-5">
      <div className="space-y-1">
        <h3 className="font-medium">API keys</h3>
        <p className="max-w-xl text-muted-foreground">
          Create a write key for scripts or the caulk CLI. The key is shown once.
        </p>
      </div>
      <Separator />
      <form className="grid max-w-md gap-4" onSubmit={onCreate}>
        <Label className="grid gap-2 text-xs font-normal text-muted-foreground">
          <span>Name</span>
          <Input name="name" defaultValue="caulk cli" />
        </Label>
        <Button type="submit" disabled={isCreating}>
          <KeyRoundIcon />
          Create API key
        </Button>
      </form>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={onCopyCommand}>
          <ClipboardIcon />
          Copy login command
        </Button>
        <Button type="button" variant="outline" disabled={!apiKey} onClick={onCopyApiKey}>
          <ClipboardIcon />
          Copy new key
        </Button>
      </div>
      {apiKey && <code className="block break-all border bg-muted p-3 text-xs">{apiKey}</code>}
    </section>
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
    <div className="grid gap-3 py-2 sm:grid-cols-[10rem_minmax(0,1fr)_auto] sm:items-center">
      <p className="text-muted-foreground">{label}</p>
      <div className="min-w-0">
        <p className="break-all font-medium">{value}</p>
        <p className="mt-1 text-muted-foreground">{children}</p>
      </div>
      {action}
    </div>
  );
}

async function addPasskey(name: string) {
  const result = await authClient.passkey.addPasskey({ name });
  if (result.error) throw new Error(result.error.message ?? "Passkey registration failed.");
  return result.data;
}

async function copyToClipboard(value: string, message: string) {
  try {
    await navigator.clipboard.writeText(value);
    toast.success(message);
  } catch (error) {
    toast.error(errorMessage(error));
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Request failed.";
}

function formField(form: HTMLFormElement, name: string): string {
  const value = new FormData(form).get(name);
  if (typeof value !== "string") throw new Error(`Missing ${name}.`);
  const trimmed = value.trim();
  if (!trimmed) throw new Error(`${name} is required.`);
  return trimmed;
}

function formatDate(value: string | null): string {
  if (!value) return "unknown date";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(value),
  );
}

function parseSecurityTab(value: string): SecurityTab {
  const tab = securityTabs.find((item) => item.value === value);
  if (!tab) throw new Error(`Invalid security tab: ${value}`);
  return tab.value;
}
