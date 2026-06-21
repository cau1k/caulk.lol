import { Badge } from "@caulk.lol/ui/components/badge";
import { Button } from "@caulk.lol/ui/components/button";
import { Input } from "@caulk.lol/ui/components/input";
import { Label } from "@caulk.lol/ui/components/label";
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

import {
  AdminApiError,
  approveDeviceCode,
  denyDeviceCode,
  verifyDeviceCode,
} from "@/lib/links-api";

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
  const queryClient = useQueryClient();

  const statusQuery = useQuery({
    enabled: code.length > 0,
    queryFn: () => verifyDeviceCode(code),
    queryKey: ["device-code", code],
    retry: false,
  });

  const approveMutation = useMutation({
    mutationFn: approveDeviceCode,
    onError: (error) => toast.error(errorMessage(error)),
    onSuccess: async () => {
      toast.success("Device approved.");
      await queryClient.invalidateQueries({ queryKey: ["device-code", code] });
    },
  });

  const denyMutation = useMutation({
    mutationFn: denyDeviceCode,
    onError: (error) => toast.error(errorMessage(error)),
    onSuccess: async () => {
      toast.success("Device denied.");
      await queryClient.invalidateQueries({ queryKey: ["device-code", code] });
    },
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setUserCode(normalizeCode(fieldValue(formData, "user_code")));
  }

  return (
    <main className="grid min-h-0 place-items-center overflow-y-auto bg-[radial-gradient(circle_at_top,oklch(0.24_0.03_158),transparent_30rem),oklch(0.12_0_0)] px-4 py-10">
      <section className="w-full max-w-3xl border border-white/10 bg-background/80 shadow-2xl">
        <div className="grid gap-0 md:grid-cols-[0.8fr_1.2fr]">
          <aside className="border-b border-white/10 p-6 md:border-r md:border-b-0">
            <span className="inline-flex size-10 items-center justify-center border border-emerald-300/30 bg-emerald-400/10 text-emerald-300">
              <RadioTowerIcon className="size-5" />
            </span>
            <h1 className="mt-6 text-3xl font-semibold tracking-[-0.05em]">Approve CLI device</h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              The `caulk` CLI is requesting a bearer token through Better Auth device authorization.
            </p>
            <div className="mt-8 space-y-3 text-xs text-muted-foreground">
              <p className="flex items-center gap-2">
                <CommandIcon className="size-3.5" />
                caulk auth login --device-auth
              </p>
              <p className="flex items-center gap-2">
                <ShieldCheckIcon className="size-3.5" />
                owner session required
              </p>
            </div>
          </aside>

          <div className="p-6">
            <form className="grid gap-3" onSubmit={submit}>
              <Label className="grid gap-2 text-xs text-muted-foreground">
                <span>Device code</span>
                <Input name="user_code" defaultValue={code} placeholder="XXXX-XXXX" required />
              </Label>
              <Button type="submit" variant="outline">
                Check code
              </Button>
            </form>

            <div className="mt-6 border border-white/10 bg-black/20 p-4">
              {!code ? (
                <StatusBlock title="Waiting for a code" description="Run the CLI login command and paste the code here." />
              ) : statusQuery.isLoading ? (
                <StatusBlock title="Checking code" description="Claiming the device code against your admin session." />
              ) : statusQuery.isError ? (
                <StatusBlock title="Device code rejected" description={errorMessage(statusQuery.error)} tone="bad" />
              ) : statusQuery.data ? (
                <>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <Badge variant={statusQuery.data.status === "pending" ? "warning" : "success"}>
                        {statusQuery.data.status}
                      </Badge>
                      <p className="mt-3 text-xl font-medium tracking-tight">{statusTitle(statusQuery.data.status)}</p>
                      <p className="mt-2 text-xs leading-5 text-muted-foreground">
                        {statusDescription(statusQuery.data.status)}
                      </p>
                    </div>
                    {statusQuery.data.status === "approved" ? (
                      <CheckCircle2Icon className="size-8 text-emerald-300" />
                    ) : statusQuery.data.status === "denied" ? (
                      <XCircleIcon className="size-8 text-destructive" />
                    ) : (
                      <RadioTowerIcon className="size-8 text-amber-300" />
                    )}
                  </div>

                  {statusQuery.data.status === "pending" && (
                    <div className="mt-6 flex flex-col gap-2 sm:flex-row">
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
                </>
              ) : null}
            </div>
          </div>
        </div>
      </section>
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
      <span className="inline-flex size-10 items-center justify-center border border-white/10 text-muted-foreground data-[tone=bad]:border-destructive/30 data-[tone=bad]:text-destructive" data-tone={tone}>
        {tone === "bad" ? <XCircleIcon className="size-4" /> : <RadioTowerIcon className="size-4" />}
      </span>
      <p className="mt-4 font-medium">{title}</p>
      <p className="mt-2 max-w-sm text-xs leading-5 text-muted-foreground">{description}</p>
    </div>
  );
}

function statusTitle(status: "approved" | "denied" | "pending") {
  if (status === "approved") return "Device is approved";
  if (status === "denied") return "Device was denied";
  return "Device is waiting";
}

function statusDescription(status: "approved" | "denied" | "pending") {
  if (status === "approved") return "Return to the CLI. It should receive the token on the next poll.";
  if (status === "denied") return "The CLI request cannot exchange this code for a token.";
  return "Approve only if the code matches the CLI session you started.";
}

function normalizeCode(value: string): string {
  return value.trim().replace(/\s+/g, "").toUpperCase();
}

function fieldValue(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function errorMessage(error: unknown) {
  if (error instanceof AdminApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Unexpected device authorization error.";
}
