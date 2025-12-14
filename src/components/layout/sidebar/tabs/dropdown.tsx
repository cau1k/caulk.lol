"use client";
import { usePathname } from "fumadocs-core/framework";
import Link from "fumadocs-core/link";
import { Check, ChevronsUpDown } from "lucide-react";
import { type ComponentProps, type ReactNode, useMemo, useState } from "react";
import { cn } from "../../../../lib/cn";
import { isTabActive } from "../../../../lib/is-active";
import { Popover, PopoverContent, PopoverTrigger } from "../../../ui/popover";
import { useSidebar } from "../base";
import type { SidebarTab } from "./index";

export interface SidebarTabWithProps extends SidebarTab {
  props?: ComponentProps<"a">;
}

export function SidebarTabsDropdown({
  options,
  placeholder,
  ...props
}: {
  placeholder?: ReactNode;
  options: SidebarTabWithProps[];
} & ComponentProps<"button">) {
  const [open, setOpen] = useState(false);
  const { closeOnRedirect } = useSidebar();
  const pathname = usePathname();

  const selected = useMemo(() => {
    return options.findLast((item) => isTabActive(item, pathname));
  }, [options, pathname]);

  const onClick = () => {
    closeOnRedirect.current = false;
    setOpen(false);
  };

  const item = selected ? (
    <>
      <div className="size-9 shrink-0 empty:hidden md:size-5">
        {selected.icon}
      </div>
      <div>
        <p className="text-sm font-medium">{selected.title}</p>
        <p className="text-sm text-muted-foreground empty:hidden md:hidden">
          {selected.description}
        </p>
      </div>
    </>
  ) : (
    placeholder
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      {item && (
        <PopoverTrigger
          {...props}
          className={cn(
            "flex items-center gap-2 rounded-lg p-2 border bg-secondary/50 text-start text-secondary-foreground transition-colors hover:bg-accent data-[state=open]:bg-accent data-[state=open]:text-accent-foreground",
            props.className,
          )}
        >
          {item}
          <ChevronsUpDown className="shrink-0 ms-auto size-4 text-muted-foreground" />
        </PopoverTrigger>
      )}
      <PopoverContent className="flex flex-col gap-1 w-(--radix-popover-trigger-width) p-1 fd-scroll-container">
        {options.map((item) => {
          const isActive = selected && item.url === selected.url;
          if (!isActive && item.unlisted) return;

          return (
            <Link
              key={item.url}
              href={item.url}
              onClick={onClick}
              {...item.props}
              className={cn(
                "flex items-center gap-2 rounded-lg p-1.5 hover:bg-accent hover:text-accent-foreground",
                item.props?.className,
              )}
            >
              <div className="shrink-0 size-9 md:mt-1 md:mb-auto md:size-5 empty:hidden">
                {item.icon}
              </div>
              <div>
                <p className="text-sm font-medium">{item.title}</p>
                <p className="text-[0.8125rem] text-muted-foreground empty:hidden">
                  {item.description}
                </p>
              </div>

              <Check
                className={cn(
                  "shrink-0 ms-auto size-3.5 text-primary",
                  !isActive && "invisible",
                )}
              />
            </Link>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}
