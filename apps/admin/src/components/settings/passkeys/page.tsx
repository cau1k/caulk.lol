import { Button } from "@caulk.lol/ui/components/button";
import { Input } from "@caulk.lol/ui/components/input";
import { Label } from "@caulk.lol/ui/components/label";
import { Separator } from "@caulk.lol/ui/components/separator";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FingerprintIcon, TrashIcon } from "lucide-react";
import type { FormEvent } from "react";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";
import { errorMessage, formField, formatDate } from "@/components/settings/utils";
import { useTRPC, useTRPCClient } from "@/utils/trpc";

export function PasskeysSettingsPage({ enabled }: { enabled: boolean }) {
  const trpc = useTRPC();
  const trpcClient = useTRPCClient();
  const queryClient = useQueryClient();

  const passkeys = useQuery({
    ...trpc.security.passkey.list.queryOptions(),
    enabled,
    refetchInterval: enabled ? 5_000 : false,
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

  function submitPasskey(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    addPasskeyMutation.mutate(formField(event.currentTarget, "name"));
  }

  function submitPasskeyRename(id: string, event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    renamePasskeyMutation.mutate({ id, name: formField(event.currentTarget, "name") });
  }

  return (
    <section className="space-y-5">
      <div className="space-y-1">
        <h3 className="font-medium">Passkeys</h3>
        <p className="max-w-xl text-muted-foreground">
          Add passkeys for this browser, rename credentials, and remove old devices.
        </p>
      </div>
      <Separator />
      <form className="flex max-w-md gap-2" onSubmit={submitPasskey}>
        <Label className="sr-only" htmlFor="passkey-name">
          Passkey name
        </Label>
        <Input id="passkey-name" name="name" defaultValue="caulk admin" />
        <Button type="submit" disabled={addPasskeyMutation.isPending}>
          <FingerprintIcon />
          Add passkey
        </Button>
      </form>
      <Separator />
      <div className="divide-y">
        {passkeys.data?.map((passkey) => (
          <div key={passkey.id} className="grid gap-3 py-3 sm:grid-cols-[minmax(0,1fr)_auto]">
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
                <Button type="submit" variant="outline" disabled={renamePasskeyMutation.isPending}>
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
              disabled={deletePasskeyMutation.isPending}
              onClick={() => deletePasskeyMutation.mutate(passkey.id)}
            >
              <TrashIcon />
              <span className="sr-only">Delete passkey</span>
            </Button>
          </div>
        ))}
        {passkeys.data?.length === 0 && !passkeys.isLoading && (
          <p className="py-4 text-muted-foreground">No passkeys yet.</p>
        )}
        {passkeys.isLoading && <p className="py-4 text-muted-foreground">Loading passkeys.</p>}
      </div>
    </section>
  );
}

async function addPasskey(name: string) {
  const result = await authClient.passkey.addPasskey({ name });
  if (result.error) throw new Error(result.error.message ?? "Passkey registration failed.");
  return result.data;
}
