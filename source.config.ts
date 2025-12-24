import {
  rehypeCodeDefaultOptions,
  rehypeToc,
  remarkHeading,
  remarkMdxMermaid,
} from "fumadocs-core/mdx-plugins";
import rehypeKatex from "rehype-katex";
import remarkMath from "remark-math";
import {
  applyMdxPreset,
  defineCollections,
  defineConfig,
  frontmatterSchema,
} from "fumadocs-mdx/config";
import { transformerTwoslash } from "fumadocs-twoslash";
import { createFileSystemTypesCache } from "fumadocs-twoslash/cache-fs";
import { z } from "zod";
import { monoGlowLightTheme, monoGlowTheme } from "./src/lib/monoglow-theme";
import { rehypeExternalRef } from "./src/lib/rehype-external-ref";

export const posts = defineCollections({
  type: "doc",
  dir: "content/posts",
  schema: frontmatterSchema.extend({
    author: z.string().optional(),
    date: z.coerce.date().optional(),
    updatedAt: z.coerce.date().optional(),
    draft: z.boolean(),
    tags: z.array(z.string().trim().toLowerCase()).default([]),
  }),
  postprocess: {
    includeProcessedMarkdown: true,
  },
  mdxOptions: applyMdxPreset({
    remarkPlugins: [remarkMath, remarkMdxMermaid, remarkHeading],
    rehypePlugins: [
      rehypeKatex,
      [rehypeToc, { exportToc: true }],
      [
        rehypeExternalRef,
        { exclude: ["caulk.lol", "localhost", "github.com"] },
      ],
    ],
    rehypeCodeOptions: {
      ...rehypeCodeDefaultOptions,
      themes: {
        light: monoGlowLightTheme,
        dark: monoGlowTheme,
      },
      transformers: [
        ...(rehypeCodeDefaultOptions.transformers ?? []),
        transformerTwoslash({
          typesCache: createFileSystemTypesCache(),
        }),
      ],
    },
  }),
});

export default defineConfig();
