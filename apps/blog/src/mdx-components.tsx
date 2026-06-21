import { Popup, PopupContent, PopupTrigger } from "fumadocs-twoslash/ui";
import { Card, Cards } from "fumadocs-ui/components/card";
import { File, Files, Folder } from "fumadocs-ui/components/files";
import { ImageZoom } from "fumadocs-ui/components/image-zoom";
import { Step, Steps } from "fumadocs-ui/components/steps";
import { Tab, Tabs } from "fumadocs-ui/components/tabs";
import { TypeTable } from "fumadocs-ui/components/type-table";
import defaultMdxComponents from "fumadocs-ui/mdx";
import type { MDXComponents } from "mdx/types";
import { Accordion, Accordions } from "@/components/accordion";
import { Callout } from "@/components/callout";
import { CodeBlock, Pre } from "@/components/codeblock";
import { Mermaid } from "@/components/mdx/mermaid";
import { Tweet } from "@/components/mdx/tweet";
import { YouTube } from "@/components/mdx/youtube";
import { Quote } from "@/components/quote";

/**
 * Returns MDX components with optional overrides.
 * Override any component by passing it in the `components` param.
 */
export function getMDXComponents(overrides?: MDXComponents): MDXComponents {
  return {
    ...defaultMdxComponents,
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
