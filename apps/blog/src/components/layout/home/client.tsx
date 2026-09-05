import { Link, useRouterState } from "@tanstack/react-router";
import { ChevronDown } from "lucide-react";
import {
  type ComponentProps,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  type Ref,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { cn } from "../../../lib/cn";
import { useInteractionFeedback } from "../../../lib/interaction-feedback";
import type { LinkItemType } from "../shared";
import { ThemeToggle } from "../theme-toggle";
import type { HomeLayoutProps } from "./index";

type HeaderItem = Exclude<LinkItemType, { type: "custom" } | { type: "menu" }>;

export function Header({ nav = {}, links, githubUrl, themeSwitch = {} }: HomeLayoutProps) {
  const { triggerSelection } = useInteractionFeedback();
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const navRef = useRef<HTMLElement | null>(null);
  const menuRef = useRef<HTMLLIElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const firstMenuLinkRef = useRef<HTMLAnchorElement | null>(null);
  const shouldFocusMenuRef = useRef(false);
  const previousPathnameRef = useRef(pathname);
  const [isCondensed, setIsCondensed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const desktopRequiredWidthRef = useRef(0);

  const { navItems, menuItems } = useMemo(
    () => splitLinkItems(resolveLinkItems({ links, githubUrl })),
    [links, githubUrl],
  );
  const firstMenuItem = menuItems.find((item) => !isSecondary(item)) ?? menuItems.find(isSecondary);

  const closeMenu = useCallback(() => {
    setMenuOpen(false);
  }, []);

  const triggerNavigationFeedback = useCallback(() => {
    triggerSelection();
    closeMenu();
  }, [closeMenu, triggerSelection]);

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
      setMenuOpen(false);
    }
  }, [isCondensed]);

  useEffect(() => {
    if (previousPathnameRef.current === pathname) return;
    previousPathnameRef.current = pathname;
    setMenuOpen(false);
    // Reset before the measurement effect, so it can retain a newly required menu.
    setIsCondensed(false);
  }, [pathname]);

  useEffect(() => {
    // Route-specific titles can change width without resizing the nav container.
    updateCondensedState();
  }, [pathname, updateCondensedState]);

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

  useEffect(() => {
    if (!menuOpen) return;

    function handlePointerDown(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (menuRef.current?.contains(target)) return;
      closeMenu();
    }

    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key !== "Escape") return;
      closeMenu();
      triggerRef.current?.focus();
    }

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeMenu, menuOpen]);

  useEffect(() => {
    if (!menuOpen || !shouldFocusMenuRef.current) return;
    shouldFocusMenuRef.current = false;
    firstMenuLinkRef.current?.focus();
  }, [menuOpen]);

  const title = typeof nav.title === "function" ? nav.title({}) : (nav.title ?? "caulk.lol");

  return (
    <header id="nd-nav" className="sticky top-0 z-40 min-h-14 bg-background! opacity-100!">
      <div className="border-b border-border bg-background!">
        <nav
          ref={navRef}
          className="mx-auto flex min-h-14 w-full max-w-(--fd-layout-width) items-center px-4 py-1"
        >
          <HeaderLink
            href={nav.url ?? "/"}
            className="inline-flex shrink-0 items-center gap-2.5 font-semibold"
            onNavigate={triggerNavigationFeedback}
          >
            {title}
          </HeaderLink>
          {nav.children}
          <div
            className={cn(
              "flex flex-1 flex-row items-center justify-end gap-1.5",
              isCondensed && "hidden",
            )}
          >
            <ul className="flex flex-row items-center gap-2 empty:hidden">
              {navItems
                .filter((item) => !isSecondary(item))
                .map((item) => (
                  <HeaderLinkItem
                    key={getLinkItemKey(item)}
                    item={item}
                    pathname={pathname}
                    className="text-sm"
                    onNavigate={triggerNavigationFeedback}
                  />
                ))}
            </ul>
            {!isCondensed &&
              themeSwitch.enabled !== false &&
              (themeSwitch.component ?? <ThemeToggle mode={themeSwitch?.mode} />)}
            <ul className="flex flex-row items-center gap-2 empty:hidden">
              {navItems.filter(isSecondary).map((item) => (
                <HeaderLinkItem
                  key={getLinkItemKey(item)}
                  item={item}
                  pathname={pathname}
                  className={cn(item.type === "icon" && "-mx-1 first:ms-0 last:me-0")}
                  onNavigate={triggerNavigationFeedback}
                />
              ))}
            </ul>
          </div>
          <ul
            className={cn("ms-auto flex flex-row items-center -me-1.5", !isCondensed && "hidden")}
          >
            <li ref={menuRef} className="relative list-none">
              <button
                ref={triggerRef}
                type="button"
                aria-label="Toggle Menu"
                aria-expanded={menuOpen}
                aria-controls="nd-nav-menu"
                className="inline-flex size-9 items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-5.5"
                onPointerMove={
                  nav.enableHoverToOpen ? undefined : (event) => event.preventDefault()
                }
                onClick={() => {
                  triggerSelection();
                  setMenuOpen((value) => !value);
                }}
                onKeyDown={(event) =>
                  handleMenuTriggerKeyDown(event, () => {
                    shouldFocusMenuRef.current = true;
                    setMenuOpen(true);
                  })
                }
              >
                <ChevronDown
                  className={cn("transition-transform duration-300", menuOpen && "rotate-180")}
                />
              </button>
              {menuOpen && (
                <div
                  id="nd-nav-menu"
                  className="absolute right-0 top-full mt-2 min-w-48 border border-border bg-popover p-4 text-popover-foreground shadow outline-none"
                >
                  <div className="flex flex-col gap-1">
                    {menuItems
                      .filter((item) => !isSecondary(item))
                      .map((item) => (
                        <MobileLinkItem
                          key={getLinkItemKey(item)}
                          item={item}
                          pathname={pathname}
                          linkRef={item === firstMenuItem ? firstMenuLinkRef : undefined}
                          onNavigate={triggerNavigationFeedback}
                        />
                      ))}
                    <div className="-ms-1.5 flex flex-row items-center gap-2 max-sm:mt-2">
                      {menuItems.filter(isSecondary).map((item) => (
                        <MobileLinkItem
                          key={getLinkItemKey(item)}
                          item={item}
                          pathname={pathname}
                          className={cn(item.type === "icon" && "-mx-1 first:ms-0")}
                          linkRef={item === firstMenuItem ? firstMenuLinkRef : undefined}
                          onNavigate={triggerNavigationFeedback}
                        />
                      ))}
                      <div className="flex-1" />
                      {themeSwitch.enabled !== false &&
                        (themeSwitch.component ?? <ThemeToggle mode={themeSwitch?.mode} />)}
                    </div>
                  </div>
                </div>
              )}
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}

function splitLinkItems(items: LinkItemType[]) {
  const navItems: HeaderItem[] = [];
  const menuItems: HeaderItem[] = [];

  for (const item of items) {
    if (!isLinkItem(item)) continue;

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
}

function resolveLinkItems({
  links = [],
  githubUrl,
}: Pick<HomeLayoutProps, "links" | "githubUrl">): LinkItemType[] {
  const result = [...links];

  if (githubUrl) {
    result.push({
      type: "icon",
      url: githubUrl,
      text: "Github",
      label: "GitHub",
      icon: (
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
        </svg>
      ),
      external: true,
    });
  }

  return result;
}

function HeaderLinkItem({
  item,
  pathname,
  onNavigate,
  className,
}: {
  item: HeaderItem;
  pathname: string;
  onNavigate: () => void;
  className?: string;
}) {
  return (
    <li className={className}>
      <HeaderLink
        href={item.url}
        external={item.external}
        aria-label={item.type === "icon" ? item.label : undefined}
        className={navItemClassName(item.type)}
        data-active={isActive(item.url, pathname, item.active)}
        onNavigate={onNavigate}
      >
        {item.type === "icon" ? item.icon : item.text}
      </HeaderLink>
    </li>
  );
}

function MobileLinkItem({
  item,
  pathname,
  onNavigate,
  className,
  linkRef,
}: {
  item: HeaderItem;
  pathname: string;
  onNavigate: () => void;
  className?: string;
  linkRef?: Ref<HTMLAnchorElement>;
}) {
  return (
    <HeaderLink
      ref={linkRef}
      href={item.url}
      external={item.external}
      className={cn(
        {
          main: "inline-flex items-center gap-2 py-1.5 transition-colors hover:text-popover-foreground/50 data-[active=true]:font-medium data-[active=true]:text-primary [&_svg]:size-4",
          icon: "inline-flex size-9 items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4",
          button:
            "inline-flex h-9 items-center justify-center gap-1.5 rounded-md bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground transition-colors hover:bg-secondary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4",
        }[item.type ?? "main"],
        className,
      )}
      aria-label={item.type === "icon" ? item.label : undefined}
      data-active={isActive(item.url, pathname, item.active)}
      onNavigate={onNavigate}
    >
      {item.icon}
      {item.type === "icon" ? undefined : item.text}
    </HeaderLink>
  );
}

function HeaderLink({
  ref,
  external,
  href,
  onNavigate,
  children,
  ...props
}: Omit<ComponentProps<"a">, "href"> & {
  ref?: Ref<HTMLAnchorElement>;
  external?: boolean;
  href: string;
  onNavigate?: () => void;
  children: ReactNode;
}) {
  const handleClick = useCallback(
    (event: MouseEvent<HTMLAnchorElement>) => {
      props.onClick?.(event);
      if (!event.defaultPrevented) onNavigate?.();
    },
    [onNavigate, props.onClick],
  );

  if (external || !isSameOriginPath(href)) {
    return (
      <a
        ref={ref}
        href={href}
        target={external ? "_blank" : props.target}
        rel={external ? "noreferrer" : props.rel}
        {...props}
        onClick={handleClick}
      >
        {children}
      </a>
    );
  }

  return (
    <Link ref={ref} to={href} preload="intent" {...props} onClick={handleClick}>
      {children}
    </Link>
  );
}

function handleMenuTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>, openMenu: () => void) {
  if (event.key !== "ArrowDown" && event.key !== "Enter" && event.key !== " ") return;

  event.preventDefault();
  openMenu();
}

function navItemClassName(type: HeaderItem["type"]) {
  if (type === "button") {
    return "inline-flex h-9 items-center justify-center gap-1.5 rounded-md bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground transition-colors hover:bg-secondary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4";
  }

  if (type === "icon") {
    return "inline-flex size-9 items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4";
  }

  return "inline-flex items-center gap-1 p-2 text-muted-foreground transition-colors hover:text-accent-foreground data-[active=true]:text-primary [&_svg]:size-4";
}

function isLinkItem(item: LinkItemType): item is HeaderItem {
  return item.type !== "custom" && item.type !== "menu";
}

function isSecondary(item: HeaderItem): boolean {
  if ("secondary" in item && item.secondary != null) return item.secondary;

  return item.type === "icon";
}

function getLinkItemKey(item: HeaderItem): string {
  return `${item.type ?? "main"}:${item.url}`;
}

function isActive(
  url: string,
  pathname: string,
  activeType: "url" | "nested-url" | "none" = "url",
) {
  if (activeType === "none") return false;
  if (activeType === "nested-url") {
    return pathname === url || pathname.startsWith(`${url.replace(/\/$/, "")}/`);
  }

  return pathname === url;
}

function isSameOriginPath(url: string) {
  return url.startsWith("/") && !url.startsWith("//");
}
