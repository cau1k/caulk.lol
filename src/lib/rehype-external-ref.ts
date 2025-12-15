import type { Root } from "hast";
import { visit } from "unist-util-visit";

type Options = {
  /** Query param name (default: "ref") */
  param?: string;
  /** Value for the ref param (default: "caulk.lol") */
  value?: string;
  /** Domains to exclude from transformation */
  exclude?: string[];
};

/**
 * Rehype plugin that adds a ref query param to external URLs
 */
export function rehypeExternalRef(options: Options = {}) {
  const { param = "ref", value = "caulk.lol", exclude = [] } = options;

  return (tree: Root) => {
    visit(tree, "element", (node) => {
      if (node.tagName !== "a") return;

      const href = node.properties?.href;
      if (typeof href !== "string") return;

      // Skip non-http URLs, anchors, and relative paths
      if (!href.startsWith("http://") && !href.startsWith("https://")) return;

      try {
        const url = new URL(href);

        // Skip excluded domains
        if (exclude.some((d) => url.hostname.endsWith(d))) return;

        // Skip if param already exists
        if (url.searchParams.has(param)) return;

        url.searchParams.set(param, value);
        node.properties.href = url.toString();
      } catch {
        // Invalid URL, skip
      }
    });
  };
}
