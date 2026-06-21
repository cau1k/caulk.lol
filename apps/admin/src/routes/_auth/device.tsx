import { Badge } from "@caulk.lol/ui/components/badge";
import { Button } from "@caulk.lol/ui/components/button";
import { Input } from "@caulk.lol/ui/components/input";
import { Label } from "@caulk.lol/ui/components/label";
import { Separator } from "@caulk.lol/ui/components/separator";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useLocation } from "@tanstack/react-router";
import {
  CheckCircle2Icon,
  CommandIcon,
  RadioTowerIcon,
  ShieldCheckIcon,
  XCircleIcon,
} from "lucide-react";
import { type FormEvent, useMemo, useState } from "react";
import { toast } from "sonner";

import { useTRPC, useTRPCClient } from "@/utils/trpc";

export const Route = createFileRoute("/_auth/device")({
  component: DeviceRoute,
});

function DeviceRoute() {
  const location = useLocation();
  const initialCode = useMemo(() => {
    const params = new URLSearchParams(location.searchStr);
    return normalizeCode(params.get("user_code") ?? "");
  }, [location.searchStr]);
  const [userCode, setUserCode] = useState(initialCode);
  const code = normalizeCode(userCode);
  const trpc = useTRPC();
  const trpcClient = useTRPCClient();
  const queryClient = useQueryClient();

  const statusQuery = useQuery({
    ...trpc.security.device.verify.queryOptions({ userCode: code }),
    enabled: code.length > 0,
    refetchInterval: code.length > 0 ? 2_000 : false,
    retry: false,
  });

  const approveMutation = useMutation({
    mutationFn: async (nextCode: string) =>
      await trpcClient.security.device.approve.mutate({ userCode: nextCode }),
    onError: (error) => toast.error(errorMessage(error)),
    onSuccess: async () => {
      toast.success("Device approved.");
      await queryClient.invalidateQueries(
        trpc.security.device.verify.queryFilter({ userCode: code }),
      );
    },
  });

  const denyMutation = useMutation({
    mutationFn: async (nextCode: string) =>
      await trpcClient.security.device.deny.mutate({ userCode: nextCode }),
    onError: (error) => toast.error(errorMessage(error)),
    onSuccess: async () => {
      toast.success("Device denied.");
      await queryClient.invalidateQueries(
        trpc.security.device.verify.queryFilter({ userCode: code }),
      );
    },
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setUserCode(normalizeCode(fieldValue(formData, "user_code")));
  }

  return (
    <main className="min-h-full bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <header className="space-y-1">
          <h1 className="text-2xl font-medium tracking-tight">Device auth</h1>
          <p className="text-xs text-muted-foreground">
            Approve a caulk CLI device authorization code.
          </p>
        </header>

        <Separator />

        <section className="grid gap-8 lg:grid-cols-[18rem_minmax(0,1fr)]">
          <aside className="space-y-4 text-xs text-muted-foreground">
            <p className="flex items-center gap-2">
              <CommandIcon className="size-3.5" />
              caulk auth login --device-auth
            </p>
            <p className="flex items-center gap-2">
              <ShieldCheckIcon className="size-3.5" />
              owner session required
            </p>
            <p className="leading-5">
              Approve only when the code matches the CLI session you started.
            </p>
          </aside>

          <div className="space-y-6">
            <form className="grid gap-3" onSubmit={submit}>
              <Label className="grid gap-2 text-xs font-normal text-muted-foreground">
                <span>Device code</span>
                <Input name="user_code" defaultValue={code} placeholder="XXXX-XXXX" required />
              </Label>
              <Button type="submit" variant="outline">
                Check code
              </Button>
            </form>

            <Separator />

            {!code ? (
              <StatusBlock
                title="Waiting for a code"
                description="Run the CLI login command and paste the code here."
              />
            ) : statusQuery.isLoading ? (
              <StatusBlock
                title="Checking code"
                description="Verifying the code against your admin session."
              />
            ) : statusQuery.isError ? (
              <StatusBlock
                title="Device code rejected"
                description={errorMessage(statusQuery.error)}
                tone="bad"
              />
            ) : statusQuery.data ? (
              <section className="space-y-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <Badge variant={statusVariant(statusQuery.data.status)}>
                      {statusQuery.data.status}
                    </Badge>
                    <p className="mt-3 text-xl font-medium tracking-tight">
                      {statusTitle(statusQuery.data.status)}
                    </p>
                    <p className="mt-2 text-xs leading-5 text-muted-foreground">
                      {statusDescription(statusQuery.data.status)}
                    </p>
                  </div>
                  {statusQuery.data.status === "approved" ? (
                    <CheckCircle2Icon className="size-8 text-emerald-400" />
                  ) : statusQuery.data.status === "denied" ? (
                    <XCircleIcon className="size-8 text-destructive" />
                  ) : (
                    <RadioTowerIcon className="size-8 text-muted-foreground" />
                  )}
                </div>

                {statusQuery.data.status === "pending" && (
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button
                      type="button"
                      className="flex-1"
                      disabled={approveMutation.isPending || denyMutation.isPending}
                      onClick={() => approveMutation.mutate(code)}
                    >
                      Approve device
                    </Button>
                    <Button
                      type="button"
                      className="flex-1"
                      variant="destructive"
                      disabled={approveMutation.isPending || denyMutation.isPending}
                      onClick={() => denyMutation.mutate(code)}
                    >
                      Deny
                    </Button>
                  </div>
                )}
              </section>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}

function StatusBlock({
  description,
  title,
  tone = "neutral",
}: {
  description: string;
  title: string;
  tone?: "neutral" | "bad";
}) {
  return (
    <div className="grid place-items-center py-12 text-center">
      <span
        className="inline-flex size-10 items-center justify-center border text-muted-foreground data-[tone=bad]:border-destructive/30 data-[tone=bad]:text-destructive"
        data-tone={tone}
      >
        {tone === "bad" ? (
          <XCircleIcon className="size-4" />
        ) : (
          <RadioTowerIcon className="size-4" />
        )}
      </span>
      <p className="mt-4 font-medium">{title}</p>
      <p className="mt-2 max-w-sm text-xs leading-5 text-muted-foreground">{description}</p>
    </div>
  );
}

function statusVariant(status: "approved" | "denied" | "pending") {
  if (status === "denied") return "destructive";
  if (status === "pending") return "secondary";
  return "default";
}

function statusTitle(status: "approved" | "denied" | "pending") {
  if (status === "approved") return "Device is approved";
  if (status === "denied") return "Device was denied";
  return "Device is waiting";
}

function statusDescription(status: "approved" | "denied" | "pending") {
  if (status === "approved")
    return "Return to the CLI. It should receive the token on the next poll.";
  if (status === "denied") return "The CLI request cannot exchange this code for a token.";
  return "Approve only if this code matches your CLI.";
}

function normalizeCode(value: string): string {
  return value.trim().replace(/\s+/g, "").toUpperCase();
}

function fieldValue(formData: FormData, name: string): string {
  const value = formData.get(name);
  if (typeof value !== "string") throw new Error(`Missing ${name}.`);
  return value;
}

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return "Unexpected device authorization error.";
}
