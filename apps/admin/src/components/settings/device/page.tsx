import { Button } from "@caulk.lol/ui/components/button";
import { Separator } from "@caulk.lol/ui/components/separator";
import { Link } from "@tanstack/react-router";
import { ArrowUpRightIcon, ClipboardIcon } from "lucide-react";
import type { ReactNode } from "react";

import { copyToClipboard } from "@/components/settings/utils";

export function DeviceSettingsPage() {
  async function copyDeviceCommand() {
    await copyToClipboard("caulk auth login --device-auth", "Device auth command copied.");
  }

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
          <Button type="button" size="sm" variant="outline" onClick={copyDeviceCommand}>
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
