import { Card, Cards } from "fumadocs-ui/components/card";
import defaultMdxComponents from "fumadocs-ui/mdx";
import type { MDXComponents } from "mdx/types";
import { lazy } from "react";
import { Accordion, Accordions } from "@/components/accordion";
import { Callout } from "@/components/callout";
import { CodeBlock, Pre } from "@/components/codeblock";
import { Quote } from "@/components/quote";

// MDX names remain available to every article. Optional widgets load only when
// that article renders them, instead of adding every widget to every post.
const Popup = lazy(() => import("fumadocs-twoslash/ui").then((m) => ({ default: m.Popup })));
const PopupContent = lazy(() =>
  import("fumadocs-twoslash/ui").then((m) => ({ default: m.PopupContent })),
);
const PopupTrigger = lazy(() =>
  import("fumadocs-twoslash/ui").then((m) => ({ default: m.PopupTrigger })),
);
const File = lazy(() => import("fumadocs-ui/components/files").then((m) => ({ default: m.File })));
const Files = lazy(() =>
  import("fumadocs-ui/components/files").then((m) => ({ default: m.Files })),
);
const Folder = lazy(() =>
  import("fumadocs-ui/components/files").then((m) => ({ default: m.Folder })),
);
const ImageZoom = lazy(() =>
  import("fumadocs-ui/components/image-zoom").then((m) => ({ default: m.ImageZoom })),
);
const Step = lazy(() => import("fumadocs-ui/components/steps").then((m) => ({ default: m.Step })));
const Steps = lazy(() =>
  import("fumadocs-ui/components/steps").then((m) => ({ default: m.Steps })),
);
const Tab = lazy(() => import("fumadocs-ui/components/tabs").then((m) => ({ default: m.Tab })));
const Tabs = lazy(() => import("fumadocs-ui/components/tabs").then((m) => ({ default: m.Tabs })));
const TypeTable = lazy(() =>
  import("fumadocs-ui/components/type-table").then((m) => ({ default: m.TypeTable })),
);
const Mermaid = lazy(() =>
  import("@/components/mdx/mermaid").then((m) => ({ default: m.Mermaid })),
);
const Tweet = lazy(() => import("@/components/mdx/tweet").then((m) => ({ default: m.Tweet })));
const YouTube = lazy(() =>
  import("@/components/mdx/youtube").then((m) => ({ default: m.YouTube })),
);

/**
 * Returns MDX components with optional overrides.
 * Override any component by passing it in the `components` param.
 */
export function getMDXComponents(overrides?: MDXComponents): MDXComponents {
  return {
    ...defaultMdxComponents,
    // Keep offscreen article images out of the initial download queue. Retain
    // Fumadocs' image component and allow an explicit eager image when needed.
    img: (props) => <defaultMdxComponents.img loading="lazy" {...props} />,
    pre: (props) => (
      <CodeBlock {...props}>
        <Pre>{props.children}</Pre>
      </CodeBlock>
    ),
    Accordion,
    Accordions,
    Callout,
    Card,
    Cards,
    File,
    Files,
    Folder,
    ImageZoom,
    Step,
    Steps,
    Tab,
    Tabs,
    TypeTable,
    Tweet,
    YouTube,
    Quote,
    Popup,
    PopupContent,
    PopupTrigger,
    ...overrides,
    Mermaid,
  };
}

export default getMDXComponents;
