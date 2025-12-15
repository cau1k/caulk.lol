import {
  rehypeCodeDefaultOptions,
  rehypeToc,
  remarkHeading,
  remarkMdxMermaid,
} from "fumadocs-core/mdx-plugins";
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
    remarkPlugins: [remarkMdxMermaid, remarkHeading],
    rehypePlugins: [[rehypeToc, { exportToc: true }]],
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
