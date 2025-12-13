import {
  rehypeToc,
  remarkHeading,
  remarkMdxMermaid,
  rehypeCodeDefaultOptions,
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

export const posts = defineCollections({
  type: "doc",
  dir: "content/posts",
  schema: frontmatterSchema.extend({
    author: z.string().optional(),
    date: z.coerce.date().optional(),
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
        light: "github-light",
        dark: "github-dark",
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
