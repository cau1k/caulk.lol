import type { ComponentProps, ReactNode } from "react";
import { cn } from "../../../lib/cn";
import { ThemeToggle } from "../theme-toggle";
import { LayoutLink, type LinkItemType } from "../link-item";
import type { BaseLayoutProps, NavOptions } from "../shared";

export type HomeLayoutProps = BaseLayoutProps & {
  nav?: Partial<
    NavOptions & {
      /**
       * Open mobile menu when hovering the trigger
       */
      enableHoverToOpen?: boolean;
    }
  >;
};

export function HomeLayout(props: HomeLayoutProps & ComponentProps<"main">) {
  const {
    nav = {},
    links,
    githubUrl,
    i18n: _i18n,
    themeSwitch = {},
    searchToggle: _searchToggle,
    ...rest
  } = props;

  return (
    <main
      id="nd-home-layout"
      {...rest}
      className={cn("flex flex-1 flex-col [--fd-layout-width:1400px]", rest.className)}
    >
      {nav.enabled !== false &&
        (nav.component ?? (
          <Header links={links} nav={nav} themeSwitch={themeSwitch} githubUrl={githubUrl} />
        ))}
      {props.children}
    </main>
  );
}

function Header({
  links,
  githubUrl,
  nav = {},
  themeSwitch = {},
}: Pick<HomeLayoutProps, "links" | "githubUrl" | "nav" | "themeSwitch">) {
  return (
    <header
      id="nd-nav"
      className="sticky top-0 z-40 h-14 border-b border-border bg-background!"
      aria-label="Main"
    >
      <nav className="mx-auto flex h-14 w-full max-w-(--fd-layout-width) items-center px-4">
        <LayoutLink
          href={nav.url ?? "/"}
          className="inline-flex items-center gap-2.5 font-semibold"
        >
          {typeof nav.title === "function" ? nav.title({}) : nav.title}
        </LayoutLink>
        {nav.children}
        <div className="ml-auto flex items-center gap-2">
          <ul className="flex items-center gap-2 empty:hidden">
            {links?.filter(hasUrl).map((item) => (
              <li key={item.url} className="list-none text-sm">
                <LayoutLink
                  href={item.url}
                  external={item.external}
                  className="inline-flex items-center gap-1 p-2 text-muted-foreground transition-colors hover:text-accent-foreground"
                >
                  {item.text}
                </LayoutLink>
              </li>
            ))}
            {githubUrl && (
              <li className="list-none text-sm">
                <a
                  href={githubUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-1 p-2 text-muted-foreground transition-colors hover:text-accent-foreground"
                >
                  github
                </a>
              </li>
            )}
          </ul>
          {themeSwitch.enabled !== false &&
            (themeSwitch.component ?? <ThemeToggle mode={themeSwitch.mode} />)}
        </div>
      </nav>
    </header>
  );
}

function hasUrl(item: LinkItemType): item is LinkItemType & {
  url: string;
  text: ReactNode;
  external?: boolean;
} {
  return "url" in item && typeof item.url === "string" && "text" in item;
}
