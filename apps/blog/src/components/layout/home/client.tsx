import { cva } from "class-variance-authority";
import { ChevronDown, Languages } from "lucide-react";
import {
  type ComponentProps,
  Fragment,
  type RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { cn } from "../../../lib/cn";
import { useInteractionFeedback } from "../../../lib/interaction-feedback";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  NavigationMenuViewport,
} from "../../navigation-menu";
import { buttonVariants } from "../../ui/button";
import { LanguageToggle, LanguageToggleText } from "../language-toggle";
import { LayoutLink, LinkItem } from "../link-item";
import { LargeSearchToggle, SearchToggle } from "../search-toggle";
import {
  type LinkItemType,
  type NavOptions,
  resolveLinkItems,
} from "../shared";
import { ThemeToggle } from "../theme-toggle";
import type { HomeLayoutProps } from "./index";

export const navItemVariants = cva("[&_svg]:size-4", {
  variants: {
    variant: {
      main: "inline-flex items-center gap-1 p-2 text-muted-foreground transition-colors hover:text-accent-foreground data-[active=true]:text-primary",
      button: buttonVariants({
        color: "secondary",
        className: "gap-1.5",
      }),
      icon: buttonVariants({
        color: "ghost",
        size: "icon",
      }),
    },
  },
  defaultVariants: {
    variant: "main",
  },
});

const generatedLinkItemKeys = new WeakMap<LinkItemType, string>();
let generatedLinkItemKeyCounter = 0;

export function Header({
  nav = {},
  i18n = false,
  links,
  githubUrl,
  themeSwitch = {},
  searchToggle = {},
}: HomeLayoutProps) {
  const { triggerSelection } = useInteractionFeedback();
  const navRef = useRef<HTMLElement | null>(null);
  const [isCondensed, setIsCondensed] = useState(false);
  const desktopRequiredWidthRef = useRef(0);
  const triggerNavigationFeedback = useCallback(() => {
    triggerSelection();
  }, [triggerSelection]);

  const { navItems, menuItems } = useMemo(() => {
    const navItems: LinkItemType[] = [];
    const menuItems: LinkItemType[] = [];

    for (const item of resolveLinkItems({ links, githubUrl })) {
      switch (item.on ?? "all") {
        case "menu":
          menuItems.push(item);
          break;
        case "nav":
          navItems.push(item);
          break;
        default:
          navItems.push(item);
          menuItems.push(item);
      }
    }

    return { navItems, menuItems };
  }, [links, githubUrl]);

  const updateCondensedState = useCallback(() => {
    const navElement = navRef.current;
    if (!navElement) return;

    const availableWidth = navElement.clientWidth;
    const requiredWidth = navElement.scrollWidth;

    if (!isCondensed) {
      desktopRequiredWidthRef.current = requiredWidth;
      if (requiredWidth > availableWidth) {
        setIsCondensed(true);
      }
      return;
    }

    if (availableWidth >= desktopRequiredWidthRef.current + 8) {
      setIsCondensed(false);
    }
  }, [isCondensed]);

  useEffect(() => {
    updateCondensedState();
  }, [updateCondensedState]);

  useEffect(() => {
    const navElement = navRef.current;
    if (!navElement) return;

    const observer = new ResizeObserver(() => {
      updateCondensedState();
    });

    observer.observe(navElement);

    return () => {
      observer.disconnect();
    };
  }, [updateCondensedState]);

  return (
    <HeaderNavigationMenu navRef={navRef} transparentMode={nav.transparentMode}>
      <LayoutLink
        href={nav.url ?? "/"}
        className="inline-flex items-center gap-2.5 font-semibold"
      >
        {typeof nav.title === "function" ? nav.title({}) : nav.title}
      </LayoutLink>
      {nav.children}
      <div
        className={cn(
          "flex flex-row items-center justify-end gap-1.5 flex-1",
          isCondensed && "hidden",
        )}
      >
        <ul className="flex flex-row items-center gap-2 empty:hidden">
          {navItems
            .filter((item) => !isSecondary(item))
            .map((item) => (
              <NavigationMenuLinkItem
                key={getLinkItemKey(item)}
                item={item}
                className="text-sm"
                onFeedback={triggerNavigationFeedback}
              />
            ))}
        </ul>
        {searchToggle.enabled !== false &&
          (searchToggle.components?.lg ?? (
            <LargeSearchToggle
              className="w-full rounded-full ps-2.5 max-w-[240px]"
              hideIfDisabled
            />
          ))}
        {themeSwitch.enabled !== false &&
          (themeSwitch.component ?? <ThemeToggle mode={themeSwitch?.mode} />)}
        {i18n && (
          <LanguageToggle>
            <Languages className="size-5" />
          </LanguageToggle>
        )}
        <ul className="flex flex-row gap-2 items-center empty:hidden">
          {navItems.filter(isSecondary).map((item) => (
            <NavigationMenuLinkItem
              key={getLinkItemKey(item)}
              className={cn(
                item.type === "icon" && "-mx-1 first:ms-0 last:me-0",
              )}
              item={item}
              onFeedback={triggerNavigationFeedback}
            />
          ))}
        </ul>
      </div>
      <ul
        className={cn(
          "flex flex-row items-center ms-auto -me-1.5",
          !isCondensed && "hidden",
        )}
      >
        {searchToggle.enabled !== false &&
          (searchToggle.components?.sm ?? (
            <SearchToggle className="p-2" hideIfDisabled />
          ))}
        <NavigationMenuItem>
          <NavigationMenuTrigger
            aria-label="Toggle Menu"
            className={cn(
              buttonVariants({
                size: "icon",
                color: "ghost",
                className: "group [&_svg]:size-5.5",
              }),
            )}
            onPointerMove={
              nav.enableHoverToOpen ? undefined : (e) => e.preventDefault()
            }
            onClick={triggerNavigationFeedback}
          >
            <ChevronDown className="transition-transform duration-300 group-data-[state=open]:rotate-180" />
          </NavigationMenuTrigger>
          <NavigationMenuContent className="flex flex-col p-4 sm:flex-row sm:items-center sm:justify-end">
            {menuItems
              .filter((item) => !isSecondary(item))
              .map((item) => (
                <MobileNavigationMenuLinkItem
                  key={getLinkItemKey(item)}
                  item={item}
                  className="sm:hidden"
                  onFeedback={triggerNavigationFeedback}
                />
              ))}
            <div className="-ms-1.5 flex flex-row items-center gap-2 max-sm:mt-2">
              {menuItems.filter(isSecondary).map((item) => (
                <MobileNavigationMenuLinkItem
                  key={getLinkItemKey(item)}
                  item={item}
                  className={cn(item.type === "icon" && "-mx-1 first:ms-0")}
                  onFeedback={triggerNavigationFeedback}
                />
              ))}
              <div className="flex-1" />
              {i18n && (
                <LanguageToggle>
                  <Languages className="size-5" />
                  <LanguageToggleText />
                  <ChevronDown className="size-3 text-muted-foreground" />
                </LanguageToggle>
              )}
              {themeSwitch.enabled !== false &&
                (themeSwitch.component ?? (
                  <ThemeToggle mode={themeSwitch?.mode} />
                ))}
            </div>
          </NavigationMenuContent>
        </NavigationMenuItem>
      </ul>
    </HeaderNavigationMenu>
  );
}

function isSecondary(item: LinkItemType): boolean {
  if ("secondary" in item && item.secondary != null) return item.secondary;

  return item.type === "icon";
}

function getLinkItemKey(item: LinkItemType): string {
  if (item.type === "custom") return getGeneratedLinkItemKey(item);

  if (item.type === "menu") {
    if (item.url) return `menu:${item.url}`;
    return getGeneratedLinkItemKey(item);
  }

  return `${item.type ?? "main"}:${item.url}`;
}

function getGeneratedLinkItemKey(item: LinkItemType): string {
  const existingKey = generatedLinkItemKeys.get(item);
  if (existingKey) return existingKey;

  generatedLinkItemKeyCounter += 1;
  const key = `generated:${generatedLinkItemKeyCounter}`;
  generatedLinkItemKeys.set(item, key);
  return key;
}

function HeaderNavigationMenu({
  navRef,
  transparentMode: _transparentMode = "none",
  ...props
}: ComponentProps<"div"> & {
  navRef?: RefObject<HTMLElement | null>;
  transparentMode?: NavOptions["transparentMode"];
}) {
  const [value, setValue] = useState("");

  return (
    <NavigationMenu value={value} onValueChange={setValue} asChild>
      <header
        id="nd-nav"
        {...props}
        className={cn(
          "sticky h-14 top-0 z-40 bg-background! opacity-100!",
          props.className,
        )}
      >
        <div
          className={cn(
            "bg-background! *:mx-auto *:max-w-(--fd-layout-width) border-b border-border",
            value.length > 0 && "",
          )}
        >
          <NavigationMenuList
            className="flex h-14 w-full items-center px-4"
            asChild
          >
            <nav ref={navRef}>{props.children}</nav>
          </NavigationMenuList>

          <NavigationMenuViewport />
        </div>
      </header>
    </NavigationMenu>
  );
}

function NavigationMenuLinkItem({
  item,
  onFeedback,
  ...props
}: {
  item: LinkItemType;
  className?: string;
  onFeedback?: () => void;
}) {
  if (item.type === "custom") return <div {...props}>{item.children}</div>;

  if (item.type === "menu") {
    const children = item.items.map((child) => {
      if (child.type === "custom") {
        return (
          <Fragment key={getLinkItemKey(child)}>{child.children}</Fragment>
        );
      }

      const {
        banner = child.icon ? (
          <div className="w-fit rounded-md border bg-background p-1 [&_svg]:size-4">
            {child.icon}
          </div>
        ) : null,
        ...rest
      } = child.menu ?? {};

      return (
        <NavigationMenuLink key={getLinkItemKey(child)} asChild>
          <LayoutLink
            {...rest}
            href={child.url}
            external={child.external}
            onClick={onFeedback}
            className={cn(
              "flex flex-col gap-2 rounded-lg border bg-card p-3 transition-colors hover:bg-accent/80 hover:text-accent-foreground",
              rest.className,
            )}
          >
            {rest.children ?? (
              <>
                {banner}
                <p className="text-base font-medium">{child.text}</p>
                <p className="text-sm text-muted-foreground empty:hidden">
                  {child.description}
                </p>
              </>
            )}
          </LayoutLink>
        </NavigationMenuLink>
      );
    });

    return (
      <NavigationMenuItem {...props}>
        <NavigationMenuTrigger
          className={cn(navItemVariants(), "rounded-md")}
          onClick={onFeedback}
        >
          {item.url ? (
            <LayoutLink href={item.url} external={item.external}>
              {item.text}
            </LayoutLink>
          ) : (
            item.text
          )}
        </NavigationMenuTrigger>
        <NavigationMenuContent className="grid grid-cols-1 gap-2 p-4 md:grid-cols-2 lg:grid-cols-3">
          {children}
        </NavigationMenuContent>
      </NavigationMenuItem>
    );
  }

  return (
    <NavigationMenuItem {...props}>
      <NavigationMenuLink asChild>
        <LinkItem
          item={item}
          aria-label={item.type === "icon" ? item.label : undefined}
          className={cn(navItemVariants({ variant: item.type }))}
          onClick={onFeedback}
        >
          {item.type === "icon" ? item.icon : item.text}
        </LinkItem>
      </NavigationMenuLink>
    </NavigationMenuItem>
  );
}

function MobileNavigationMenuLinkItem({
  item,
  onFeedback,
  ...props
}: {
  item: LinkItemType;
  className?: string;
  onFeedback?: () => void;
}) {
  if (item.type === "custom")
    return <div className={cn("grid", props.className)}>{item.children}</div>;

  if (item.type === "menu") {
    const header = (
      <>
        {item.icon}
        {item.text}
      </>
    );

    return (
      <div className={cn("mb-4 flex flex-col", props.className)}>
        <p className="text-sm text-muted-foreground">
          {item.url ? (
            <NavigationMenuLink asChild>
              <LayoutLink
                href={item.url}
                external={item.external}
                onClick={onFeedback}
              >
                {header}
              </LayoutLink>
            </NavigationMenuLink>
          ) : (
            header
          )}
        </p>
        {item.items.map((child) => (
          <MobileNavigationMenuLinkItem
            key={getLinkItemKey(child)}
            item={child}
            onFeedback={onFeedback}
          />
        ))}
      </div>
    );
  }

  return (
    <NavigationMenuLink asChild>
      <LinkItem
        item={item}
        className={cn(
          {
            main: "inline-flex items-center gap-2 py-1.5 transition-colors hover:text-popover-foreground/50 data-[active=true]:font-medium data-[active=true]:text-primary [&_svg]:size-4",
            icon: buttonVariants({
              size: "icon",
              color: "ghost",
            }),
            button: buttonVariants({
              color: "secondary",
              className: "gap-1.5 [&_svg]:size-4",
            }),
          }[item.type ?? "main"],
          props.className,
        )}
        aria-label={item.type === "icon" ? item.label : undefined}
        onClick={onFeedback}
      >
        {item.icon}
        {item.type === "icon" ? undefined : item.text}
      </LinkItem>
    </NavigationMenuLink>
  );
}
