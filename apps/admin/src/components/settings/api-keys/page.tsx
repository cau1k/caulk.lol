import { Button } from "@caulk.lol/ui/components/button";
import { Input } from "@caulk.lol/ui/components/input";
import { Label } from "@caulk.lol/ui/components/label";
import { Separator } from "@caulk.lol/ui/components/separator";
import { useMutation } from "@tanstack/react-query";
import { ClipboardIcon, KeyRoundIcon } from "lucide-react";
import { type FormEvent, useState } from "react";
import { toast } from "sonner";

import { copyToClipboard, errorMessage, formField } from "@/components/settings/utils";
import { useTRPCClient } from "@/utils/trpc";

export function ApiKeysSettingsPage() {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const trpcClient = useTRPCClient();

  const createKeyMutation = useMutation({
    mutationFn: async (name: string) => await trpcClient.security.apiKey.create.mutate({ name }),
    onError: (error) => toast.error(errorMessage(error)),
    onSuccess: ({ apiKey: nextApiKey }) => {
      setApiKey(nextApiKey);
      toast.success("API key created.");
    },
  });

  function submitApiKey(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    createKeyMutation.mutate(formField(event.currentTarget, "name"));
  }

  async function copyApiKey() {
    if (!apiKey) return;
    await copyToClipboard(apiKey, "API key copied.");
  }

  async function copyApiKeyCommand() {
    await copyToClipboard("caulk auth login --api-key <key>", "API key command copied.");
  }

  return (
    <section className="space-y-5">
      <div className="space-y-1">
        <h3 className="font-medium">API keys</h3>
        <p className="max-w-xl text-muted-foreground">
          Create a write key for scripts or the caulk CLI. The key is shown once.
        </p>
      </div>
      <Separator />
      <form className="grid max-w-md gap-4" onSubmit={submitApiKey}>
        <Label className="grid gap-2 text-xs font-normal text-muted-foreground">
          <span>Name</span>
          <Input name="name" defaultValue="caulk cli" />
        </Label>
        <Button type="submit" disabled={createKeyMutation.isPending}>
          <KeyRoundIcon />
          Create API key
        </Button>
      </form>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={copyApiKeyCommand}>
          <ClipboardIcon />
          Copy login command
        </Button>
        <Button type="button" variant="outline" disabled={!apiKey} onClick={copyApiKey}>
          <ClipboardIcon />
          Copy new key
        </Button>
      </div>
      {apiKey && <code className="block break-all border bg-muted p-3 text-xs">{apiKey}</code>}
    </section>
  );
}
