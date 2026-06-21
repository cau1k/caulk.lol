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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@caulk.lol/ui/components/tabs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  ArrowUpRightIcon,
  ClipboardIcon,
  FingerprintIcon,
  KeyRoundIcon,
  SettingsIcon,
  TrashIcon,
} from "lucide-react";
import { type FormEvent, type ReactNode, useState } from "react";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";
import { useTRPC, useTRPCClient } from "@/utils/trpc";

type SecurityTab = "device" | "passkeys" | "api-keys";

const securityTabs = [
  { label: "Device auth", value: "device" },
  { label: "Passkeys", value: "passkeys" },
  { label: "API keys", value: "api-keys" },
] satisfies ReadonlyArray<{ label: string; value: SecurityTab }>;

export function SettingsDialog({
  ownerEmail,
  trigger,
}: {
  ownerEmail: string;
  trigger?: ReactNode;
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
      <DialogContent className="max-h-[calc(100svh-2rem)] gap-0 overflow-hidden p-0 sm:max-w-3xl">
        <div className="grid gap-4 p-4">
          <DialogHeader>
            <DialogTitle>Settings</DialogTitle>
            <DialogDescription>Security controls for {ownerEmail}.</DialogDescription>
          </DialogHeader>
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(parseSecurityTab(value))}>
            <TabsList className="w-full justify-start">
              {securityTabs.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value}>
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
            <TabsContent value="device" className="mt-4 space-y-4">
              <section className="space-y-3">
                <div className="flex items-start gap-3">
                  <KeyRoundIcon className="mt-0.5 size-4 text-muted-foreground" />
                  <div className="space-y-1">
                    <h3 className="font-medium">Device authorization</h3>
                    <p className="max-w-xl text-muted-foreground">
                      Use this when signing in from the caulk CLI without pasting an API key.
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 pl-7">
                  <Button type="button" variant="outline" onClick={copyDeviceCommand}>
                    <ClipboardIcon />
                    Copy command
                  </Button>
                  <Button type="button" variant="outline" render={<Link to="/device" />}>
                    <ArrowUpRightIcon />
                    Open approval page
                  </Button>
                </div>
              </section>
            </TabsContent>
            <TabsContent value="passkeys" className="mt-4 space-y-4">
              <section className="space-y-4">
                <div className="flex items-start gap-3">
                  <FingerprintIcon className="mt-0.5 size-4 text-muted-foreground" />
                  <div className="space-y-1">
                    <h3 className="font-medium">Passkeys</h3>
                    <p className="max-w-xl text-muted-foreground">
                      Add passkeys for this browser and remove old credentials here.
                    </p>
                  </div>
                </div>
                <form className="flex max-w-md gap-2 pl-7" onSubmit={submitPasskey}>
                  <Label className="sr-only" htmlFor="passkey-name">
                    Passkey name
                  </Label>
                  <Input id="passkey-name" name="name" defaultValue="caulk admin" />
                  <Button type="submit" disabled={addPasskeyMutation.isPending}>
                    Add passkey
                  </Button>
                </form>
                <Separator />
                <div className="divide-y">
                  {passkeys.data?.map((passkey) => (
                    <div
                      key={passkey.id}
                      className="grid gap-3 py-3 sm:grid-cols-[minmax(0,1fr)_auto]"
                    >
                      <form
                        className="min-w-0 space-y-2"
                        onSubmit={(event) => submitPasskeyRename(passkey.id, event)}
                      >
                        <Label className="sr-only" htmlFor={`passkey-${passkey.id}-name`}>
                          Passkey name
                        </Label>
                        <div className="flex gap-2">
                          <Input
                            id={`passkey-${passkey.id}-name`}
                            name="name"
                            defaultValue={passkey.name ?? "Unnamed passkey"}
                          />
                          <Button
                            type="submit"
                            variant="outline"
                            disabled={renamePasskeyMutation.isPending}
                          >
                            Save
                          </Button>
                        </div>
                        <p className="text-muted-foreground">
                          {passkey.deviceType} · {passkey.backedUp ? "backed up" : "not backed up"}{" "}
                          · {formatDate(passkey.createdAt)}
                        </p>
                      </form>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        disabled={deletePasskeyMutation.isPending}
                        onClick={() => deletePasskeyMutation.mutate(passkey.id)}
                      >
                        <TrashIcon />
                        <span className="sr-only">Delete passkey</span>
                      </Button>
                    </div>
                  ))}
                  {passkeys.data?.length === 0 && (
                    <p className="py-4 text-muted-foreground">No passkeys yet.</p>
                  )}
                  {passkeys.isLoading && (
                    <p className="py-4 text-muted-foreground">Loading passkeys.</p>
                  )}
                </div>
              </section>
            </TabsContent>
            <TabsContent value="api-keys" className="mt-4 space-y-4">
              <section className="space-y-4">
                <div className="flex items-start gap-3">
                  <KeyRoundIcon className="mt-0.5 size-4 text-muted-foreground" />
                  <div className="space-y-1">
                    <h3 className="font-medium">API keys</h3>
                    <p className="max-w-xl text-muted-foreground">
                      Create a write key for scripts or the caulk CLI. The key is shown once.
                    </p>
                  </div>
                </div>
                <form className="flex max-w-md gap-2 pl-7" onSubmit={submitApiKey}>
                  <Label className="sr-only" htmlFor="api-key-name">
                    API key name
                  </Label>
                  <Input id="api-key-name" name="name" defaultValue="caulk cli" />
                  <Button type="submit" disabled={createKeyMutation.isPending}>
                    Create API key
                  </Button>
                </form>
                <div className="flex flex-wrap gap-2 pl-7">
                  <Button type="button" variant="outline" onClick={copyApiKeyCommand}>
                    <ClipboardIcon />
                    Copy login command
                  </Button>
                  <Button type="button" variant="outline" disabled={!apiKey} onClick={copyApiKey}>
                    <ClipboardIcon />
                    Copy new key
                  </Button>
                </div>
                {apiKey && (
                  <code className="block break-all border bg-muted p-3 text-xs">{apiKey}</code>
                )}
              </section>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
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
