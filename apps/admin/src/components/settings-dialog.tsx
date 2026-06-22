import { Button } from "@caulk.lol/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@caulk.lol/ui/components/dialog";
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
  SidebarMenuItem,
  SidebarProvider,
} from "@caulk.lol/ui/components/sidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@caulk.lol/ui/components/tabs";
import {
  FingerprintIcon,
  KeyRoundIcon,
  RadioTowerIcon,
  SettingsIcon,
  type LucideIcon,
} from "lucide-react";
import { type ReactElement, useState } from "react";

import { ApiKeysSettingsPage } from "@/components/settings/api-keys/page";
import { DeviceSettingsPage } from "@/components/settings/device/page";
import { PasskeysSettingsPage } from "@/components/settings/passkeys/page";

type SecurityTab = "device" | "passkeys" | "api-keys";

const securityTabs = [
  { icon: RadioTowerIcon, label: "Device auth", value: "device" },
  { icon: FingerprintIcon, label: "Passkeys", value: "passkeys" },
  { icon: KeyRoundIcon, label: "API keys", value: "api-keys" },
] satisfies ReadonlyArray<{ icon: LucideIcon; label: string; value: SecurityTab }>;

export function SettingsDialog({
  ownerEmail,
  trigger,
}: {
  ownerEmail: string;
  trigger?: ReactElement;
}) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<SecurityTab>("device");

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
                            <Button
                              type="button"
                              variant="full"
                              className="w-full"
                              render={<TabsTrigger value={tab.value} />}
                            >
                              <tab.icon />
                              <span>{tab.label}</span>
                            </Button>
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
                  <DeviceSettingsPage />
                </TabsContent>
                <TabsContent value="passkeys">
                  <PasskeysSettingsPage enabled={open} />
                </TabsContent>
                <TabsContent value="api-keys">
                  <ApiKeysSettingsPage />
                </TabsContent>
              </section>
            </div>
          </SidebarProvider>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function parseSecurityTab(value: string): SecurityTab {
  const tab = securityTabs.find((item) => item.value === value);
  if (!tab) throw new Error(`Invalid security tab: ${value}`);
  return tab.value;
}
